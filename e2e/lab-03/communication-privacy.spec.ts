import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "../../server/node_modules/@prisma/client/index.js";
import { hashPassword } from "../../server/dist/src/password.js";
import { assertNoHorizontalOverflow } from "../lab-02/support/ui.js";

function readLocalEnv(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  const envPath = resolve(process.cwd(), "server/.env");
  if (!existsSync(envPath)) return undefined;
  const line = readFileSync(envPath, "utf8").split(/\r?\n/).find((candidate) => candidate.trimStart().startsWith(`${name}=`));
  return line?.slice(line.indexOf("=") + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
}

function testDatabaseUrl(): string {
  const development = readLocalEnv("DATABASE_URL");
  const testUrl = readLocalEnv("TEST_DATABASE_URL");
  if (!development || !testUrl) throw new Error("DATABASE_URL and TEST_DATABASE_URL are required for communication E2E");
  const developmentName = decodeURIComponent(new URL(development).pathname.replace(/^\/+/, "")).toLowerCase();
  const testName = decodeURIComponent(new URL(testUrl).pathname.replace(/^\/+/, "")).toLowerCase();
  if (!developmentName || developmentName === testName) throw new Error("Communication E2E requires a distinct test database");
  return testUrl;
}

const password = "Communication-E2E-Password-49!";
let prisma: PrismaClient;
let tag = "";
let staff: { id: number; email: string };
let requester: { id: number; email: string };
let categoryId = 0;
let relatedSystemId = 0;
let ticketId = 0;

async function login(page: Page, email: string, home: "Ticket Queue" | "My Tickets") {
  await page.goto("/#/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("heading", { name: home })).toBeVisible();
}

test.beforeAll(async () => {
  prisma = new PrismaClient({ datasources: { db: { url: testDatabaseUrl() } } });
  await prisma.$connect();
  tag = `e2e-communication-${process.pid}-${Date.now()}-${randomUUID().slice(0, 6)}`;
  const passwordHash = await hashPassword(password);
  staff = await prisma.user.create({ data: { name: `${tag} Staff`, email: `${tag}-staff@example.test`, active: true, role: "IT_STAFF", passwordHash, mustChangePassword: false }, select: { id: true, email: true } });
  requester = await prisma.user.create({ data: { name: `${tag} Requester`, email: `${tag}-requester@example.test`, active: true, role: "REQUESTER", passwordHash, mustChangePassword: false }, select: { id: true, email: true } });
  const category = await prisma.category.create({ data: { name: `${tag} Category`, active: true } });
  const system = await prisma.relatedSystem.create({ data: { name: `${tag} System`, active: true } });
  categoryId = category.id; relatedSystemId = system.id;
  const ticket = await prisma.ticket.create({ data: {
    ticketNumber: `TKT-20991118-${randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase()}`,
    clientRequestId: randomUUID(), requesterId: requester.id, categoryId, relatedSystemId,
    summary: `${tag} communication privacy`, description: `${tag} communication privacy journey`,
    requestedPriority: "MEDIUM", itPriority: "MEDIUM", currentStatus: "IN_PROGRESS", ownerId: staff.id,
  }, select: { id: true } });
  ticketId = ticket.id;
});

test.afterAll(async () => {
  if (!prisma) return;
  await prisma.internalNote.deleteMany({ where: { ticketId } });
  await prisma.publicComment.deleteMany({ where: { ticketId } });
  await prisma.attachment.deleteMany({ where: { ticketId } });
  await prisma.ticket.deleteMany({ where: { id: ticketId } });
  const ids = [staff?.id, requester?.id].filter((id): id is number => Number.isSafeInteger(id));
  const sessions = await prisma.session.findMany({ select: { sid: true, sess: true } });
  const sessionIds = sessions.filter((row) => ids.includes(Number((row.sess as Record<string, unknown>).userId))).map((row) => row.sid);
  if (sessionIds.length) await prisma.session.deleteMany({ where: { sid: { in: sessionIds } } });
  await prisma.category.deleteMany({ where: { id: categoryId } });
  await prisma.relatedSystem.deleteMany({ where: { id: relatedSystemId } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
});

test("E2E-04 Staff public/private communication stays separated and Requester indication never resolves formally", async ({ page }) => {
  await login(page, staff.email, "Ticket Queue");
  await page.goto(`/#/staff/tickets/${ticketId}`);
  await expect(page.getByRole("heading", { name: "Public Comments" })).toBeVisible();
  await page.getByRole("textbox", { name: "Public Comment", exact: true }).fill(`${tag} public reply`);
  await page.getByRole("button", { name: "Post Public Comment" }).click();
  await expect(page.getByText(`${tag} public reply`)).toBeVisible();
  await page.getByRole("textbox", { name: "Internal Note", exact: true }).fill(`${tag} private diagnostic`);
  await page.getByRole("button", { name: "Add Internal Note" }).click();
  await expect(page.getByText(`${tag} private diagnostic`)).toBeVisible();
  await expect(page.getByText("Internal / Staff only")).toBeVisible();

  await page.getByRole("button", { name: "Logout" }).click();
  await login(page, requester.email, "My Tickets");
  await page.goto(`/#/tickets/${ticketId}`);
  await expect(page.getByRole("heading", { name: "Public Comments" })).toBeVisible();
  await expect(page.getByText(`${tag} public reply`)).toBeVisible();
  await expect(page.getByText(`${tag} private diagnostic`)).toHaveCount(0);
  await expect(page.getByText(/Internal \/ Staff only/i)).toHaveCount(0);

  await page.getByRole("button", { name: "Problem Appears Resolved" }).click();
  await expect(page.getByText(/does not formally resolve or close/i)).toBeVisible();
  await page.getByRole("button", { name: "Confirm Problem Appears Resolved" }).click();
  await expect(page.getByText(/Resolution indication sent/i)).toBeVisible();
  const stored = await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } });
  expect(stored.currentStatus).toBe("IN_PROGRESS");
  expect(stored.resolutionSummary).toBeNull();
  expect(stored.requesterResolutionIndicatedAt).not.toBeNull();
});

test("Issue #49 communication sections remain usable without page overflow on required viewports", async ({ page }) => {
  await login(page, staff.email, "Ticket Queue");
  await page.goto(`/#/staff/tickets/${ticketId}`);
  for (const viewport of [{ width: 1440, height: 900 }, { width: 834, height: 1112 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await expect(page.getByRole("heading", { name: "Public Comments" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Internal Notes" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Public Comment", exact: true })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Internal Note", exact: true })).toBeVisible();
    await assertNoHorizontalOverflow(page);
  }
});
