import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "../../server/node_modules/@prisma/client/index.js";
import { hashPassword } from "../../server/dist/src/password.js";
import { assertNoHorizontalOverflow } from "../lab-02/support/ui.js";
import { captureReleaseEvidence } from "./support/release-evidence.js";

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
  if (!development || !testUrl) throw new Error("DATABASE_URL and TEST_DATABASE_URL are required for Staff Ticket E2E");
  const developmentName = decodeURIComponent(new URL(development).pathname.replace(/^\/+/, "")).toLowerCase();
  const testName = decodeURIComponent(new URL(testUrl).pathname.replace(/^\/+/, "")).toLowerCase();
  if (!developmentName || developmentName === testName) throw new Error("Staff Ticket E2E requires a distinct test database");
  return testUrl;
}

const password = "Staff-Ticket-E2E-Password-48!";
let prisma: PrismaClient;
let tag = "";
let staff: { id: number; email: string };
let requester: { id: number; email: string };
let categoryId = 0;
let relatedSystemId = 0;
let ticketId = 0;
let ticketNumber = "";

async function login(page: Page, email: string, expectedHome: "Ticket Queue" | "My Tickets"): Promise<void> {
  await page.goto("/#/login");
  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("heading", { name: expectedHome })).toBeVisible();
}
async function chooseStatus(page: Page, status: string): Promise<void> {
  await page.getByLabel("Next status").selectOption(status);
  if (["RESOLVED", "CLOSED", "REOPENED", "CANCELLED"].includes(status)) {
    await page.getByRole("checkbox", { name: /confirm transition/i }).check();
  }
  await page.getByRole("button", { name: "Confirm status change" }).click();
  await expect(page.getByText("Ticket status updated successfully")).toBeVisible();
}

test.beforeAll(async () => {
  prisma = new PrismaClient({ datasources: { db: { url: testDatabaseUrl() } } });
  await prisma.$connect();
  tag = `e2e-staff-flow-${process.pid}-${Date.now()}-${randomUUID().slice(0, 6)}`;
  const passwordHash = await hashPassword(password);
  staff = await prisma.user.create({ data: { name: `${tag} Staff`, email: `${tag}-staff@example.test`, active: true, role: "IT_STAFF", passwordHash, mustChangePassword: false }, select: { id: true, email: true } });
  requester = await prisma.user.create({ data: { name: `${tag} Requester`, email: `${tag}-requester@example.test`, active: true, role: "REQUESTER", passwordHash, mustChangePassword: false }, select: { id: true, email: true } });
  const category = await prisma.category.create({ data: { name: `${tag} Category`, active: true }, select: { id: true } });
  const system = await prisma.relatedSystem.create({ data: { name: `${tag} System`, active: true }, select: { id: true } });
  categoryId = category.id; relatedSystemId = system.id;
  ticketNumber = `TKT-20991018-${randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase()}`;
  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber, clientRequestId: randomUUID(), requesterId: requester.id, categoryId, relatedSystemId,
      summary: `${tag} operational journey`, description: `${tag} operational Staff Detail journey`,
      requestedPriority: "LOW", itPriority: "LOW", currentStatus: "NEW", ownerId: null,
    }, select: { id: true },
  });
  ticketId = ticket.id;
});

test.afterAll(async () => {
  if (!prisma) return;
  await prisma.internalNote.deleteMany({ where: { ticketId } });
  await prisma.publicComment.deleteMany({ where: { ticketId } });
  await prisma.attachment.deleteMany({ where: { ticketId } });
  await prisma.ticket.deleteMany({ where: { id: ticketId } });
  const userIds = [staff?.id, requester?.id].filter((id): id is number => Number.isSafeInteger(id));
  const sessions = await prisma.session.findMany({ select: { sid: true, sess: true } });
  const sessionIds = sessions.filter((row) => userIds.includes(Number((row.sess as Record<string, unknown>).userId))).map((row) => row.sid);
  if (sessionIds.length) await prisma.session.deleteMany({ where: { sid: { in: sessionIds } } });
  await prisma.category.deleteMany({ where: { id: categoryId } });
  await prisma.relatedSystem.deleteMany({ where: { id: relatedSystemId } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

test("E2E-03 Queue -> claim -> priority -> resolve -> close -> reopen follows the formal workflow", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, staff.email, "Ticket Queue");
  await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible();
  const search = page.getByRole("searchbox", { name: /search ticket number, summary, or requester/i });
  await search.fill(tag);
  await search.press("Enter");
  await expect(page.getByText(`${tag} operational journey`).first()).toBeVisible();
  await page.locator(".lab3-staff-table").getByRole("button", { name: "View ticket" }).click();
  await expect(page.getByRole("heading", { name: "Staff Ticket Detail" })).toBeVisible();
  await expect(page.getByText("Unassigned").first()).toBeVisible();
  await captureReleaseEvidence(page, {
    file: "states/staff/unassigned-claim-action.png",
    role: "IT Staff",
    route: "/#/staff/tickets/:id",
    scenario: "Unassigned Staff Ticket Detail exposes Claim while preserving Requested Priority and workflow context",
    mapping: ["E2E-03", "UI-04", "FLOW-02", "Answer Part 7"],
  });

  await page.getByRole("button", { name: "Claim ticket" }).click();
  await expect(page.getByText("Ticket claimed successfully")).toBeVisible();
  await expect(page.getByText(`${tag} Staff`).first()).toBeVisible();
  await expect(page.getByText("New", { exact: true }).first()).toBeVisible();

  await page.getByLabel("IT Priority").selectOption("HIGH");
  await page.getByRole("button", { name: "Save IT Priority" }).click();
  await expect(page.getByText("IT Priority updated successfully")).toBeVisible();
  await expect(page.getByText("Low", { exact: true }).first()).toBeVisible();

  await chooseStatus(page, "OPEN");
  await chooseStatus(page, "IN_PROGRESS");
  await page.getByLabel("Next status").selectOption("RESOLVED");
  await page.getByLabel("Resolution Summary").fill("Requester access restored and verified.");
  await page.getByRole("checkbox", { name: /confirm transition/i }).check();
  await captureReleaseEvidence(page, {
    file: "states/staff/resolve-confirmation.png",
    role: "IT Staff",
    route: "/#/staff/tickets/:id",
    scenario: "Formal Resolve transition shows required Resolution Summary and explicit confirmation",
    mapping: ["E2E-03", "FLOW-01", "FLOW-02", "Answer Part 7"],
  });
  await page.getByRole("button", { name: "Confirm status change" }).click();
  await expect(page.getByText("Resolved", { exact: true }).first()).toBeVisible();
  await chooseStatus(page, "CLOSED");
  await expect(page.getByText("Closed", { exact: true }).first()).toBeVisible();
  await chooseStatus(page, "REOPENED");
  await expect(page.getByText("Reopened", { exact: true }).first()).toBeVisible();

  const stored = await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } });
  expect(stored.ownerId).toBe(staff.id);
  expect(stored.requestedPriority).toBe("LOW");
  expect(stored.itPriority).toBe("HIGH");
  expect(stored.currentStatus).toBe("REOPENED");
  expect(stored.resolutionSummary).toBeNull();
  expect(stored.resolvedAt).toBeNull();
  expect(stored.closedAt).toBeNull();

  await page.getByRole("button", { name: "Logout" }).click();
  await login(page, requester.email, "My Tickets");
  await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
  const csrf = await page.request.get("http://127.0.0.1:4311/api/auth/csrf");
  expect(csrf.status()).toBe(200);
  const csrfToken = (await csrf.json()).csrfToken as string;
  const denied = await page.request.post(`http://127.0.0.1:4311/api/staff/tickets/${ticketId}/claim`, {
    headers: { Origin: "http://127.0.0.1:4312", "X-CSRF-Token": csrfToken },
    data: { expectedVersion: stored.version },
  });
  expect(denied.status()).toBe(403);
  expect((await denied.json()).error.code).toBe("FORBIDDEN");
});

test("Issue #48 Staff Detail operation controls remain usable without page overflow at required viewports", async ({ page }) => {
  await login(page, staff.email, "Ticket Queue");
  await page.goto(`/#/staff/tickets/${ticketId}`);
  await expect(page.getByRole("heading", { name: "Ticket operations" })).toBeVisible();
  for (const viewport of [{ width: 1440, height: 900 }, { width: 834, height: 1112 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await expect(page.getByLabel("Owner")).toBeVisible();
    await expect(page.getByLabel("IT Priority")).toBeVisible();
    await expect(page.getByLabel("Next status")).toBeVisible();
    await assertNoHorizontalOverflow(page);
  }
});
