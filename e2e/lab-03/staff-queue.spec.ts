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
  const line = readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((candidate) => candidate.trimStart().startsWith(`${name}=`));
  return line?.slice(line.indexOf("=") + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
}

function testDatabaseUrl(): string {
  const development = readLocalEnv("DATABASE_URL");
  const testUrl = readLocalEnv("TEST_DATABASE_URL");
  if (!development || !testUrl) throw new Error("DATABASE_URL and TEST_DATABASE_URL are required for Staff Queue E2E");
  const developmentName = decodeURIComponent(new URL(development).pathname.replace(/^\/+/, "")).toLowerCase();
  const testName = decodeURIComponent(new URL(testUrl).pathname.replace(/^\/+/, "")).toLowerCase();
  if (!developmentName || developmentName === testName) throw new Error("Staff Queue E2E requires a distinct test database");
  return testUrl;
}

const password = "Staff-Queue-E2E-Password-47!";
let prisma: PrismaClient;
let tag = "";
let staff: { id: number; email: string };
let requester: { id: number };
let categoryId = 0;
let relatedSystemId = 0;

async function loginStaff(page: Page): Promise<void> {
  await page.goto("/#/staff/tickets");
  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
  await page.getByLabel("Email").fill(staff.email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible();
}

async function applyFixtureSearch(page: Page): Promise<void> {
  const search = page.getByRole("searchbox", { name: /search ticket number, summary, or requester/i });
  await search.fill(tag);
  await search.press("Enter");
  await expect(page.getByText(`${tag} ticket 12`).first()).toBeVisible();
}

test.beforeAll(async () => {
  prisma = new PrismaClient({ datasources: { db: { url: testDatabaseUrl() } } });
  await prisma.$connect();
  tag = `e2e-staff-queue-${process.pid}-${Date.now()}-${randomUUID().slice(0, 6)}`;
  const passwordHash = await hashPassword(password);
  staff = await prisma.user.create({
    data: { name: `${tag} Staff`, email: `${tag}-staff@example.test`, active: true, role: "IT_STAFF", passwordHash, mustChangePassword: false },
    select: { id: true, email: true },
  });
  requester = await prisma.user.create({
    data: { name: `${tag} Requester`, email: `${tag}-requester@example.test`, active: true, role: "REQUESTER", passwordHash, mustChangePassword: false },
    select: { id: true },
  });
  const category = await prisma.category.create({ data: { name: `${tag} Category`, active: true }, select: { id: true } });
  const relatedSystem = await prisma.relatedSystem.create({ data: { name: `${tag} System`, active: true }, select: { id: true } });
  categoryId = category.id;
  relatedSystemId = relatedSystem.id;

  for (let index = 1; index <= 12; index += 1) {
    await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-20990917-${randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase()}`,
        clientRequestId: randomUUID(),
        requesterId: requester.id,
        ownerId: index % 2 === 0 ? staff.id : null,
        categoryId,
        relatedSystemId,
        summary: `${tag} ticket ${String(index).padStart(2, "0")}`,
        description: `${tag} read-only Staff Queue detail ${index}.`,
        requestedPriority: index % 3 === 0 ? "HIGH" : index % 3 === 1 ? "LOW" : "MEDIUM",
        itPriority: index % 3 === 0 ? "MEDIUM" : index % 3 === 1 ? "HIGH" : "LOW",
        currentStatus: index % 2 === 0 ? "OPEN" : "NEW",
        createdAt: new Date(Date.UTC(2026, 8, 16, 9, index, 0)),
        updatedAt: new Date(Date.UTC(2026, 8, 17, 9, index, 0)),
      },
    });
  }
});

test.afterAll(async () => {
  if (!prisma) return;
  const ticketIds = (await prisma.ticket.findMany({ where: { summary: { startsWith: tag } }, select: { id: true } })).map(({ id }) => id);
  if (ticketIds.length > 0) await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
  const sessions = await prisma.session.findMany({ select: { sid: true, sess: true } });
  const ownedUserIds = new Set([staff?.id, requester?.id].filter((id): id is number => Number.isSafeInteger(id)));
  const sessionIds = sessions.filter((row) => ownedUserIds.has(Number((row.sess as Record<string, unknown>).userId))).map((row) => row.sid);
  if (sessionIds.length > 0) await prisma.session.deleteMany({ where: { sid: { in: sessionIds } } });
  await prisma.category.deleteMany({ where: { id: categoryId } });
  await prisma.relatedSystem.deleteMany({ where: { id: relatedSystemId } });
  await prisma.user.deleteMany({ where: { id: { in: [...ownedUserIds] } } });
  await prisma.$disconnect();
});

test("Issue #47 Staff can search/page the shared queue and return from evolved Detail with context", async ({ page }) => {
  await loginStaff(page);
  await applyFixtureSearch(page);

  await expect(page.getByText(/Page 1 of 2 \(12 total\)/)).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText(/Page 2 of 2 \(12 total\)/)).toBeVisible();
  await page.getByRole("button", { name: "Previous" }).click();
  await expect(page.getByText(/Page 1 of 2 \(12 total\)/)).toBeVisible();

  await page.getByLabel("Owner").selectOption("me");
  await expect(page.getByText(/\(6 total\)/)).toBeVisible();
  await expect(page.locator(".lab3-staff-table tbody").getByText(`${tag} Staff`).first()).toBeVisible();

  await page.locator(".lab3-staff-table").getByRole("button", { name: "View ticket" }).first().click();
  await expect(page.getByRole("heading", { name: "Staff Ticket Detail" })).toBeVisible();
  await expect(page.getByText(`${tag} Requester`, { exact: false })).toBeVisible();
  await expect(page.getByText(/read-only Staff Queue detail/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ticket operations" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /public comments|internal notes/i })).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`#\\/staff\\/tickets\\/\\d+\\?.*search=${encodeURIComponent(tag)}.*owner=me`));

  await page.getByRole("button", { name: "Back to Ticket Queue" }).click();
  await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible();
  await expect(page.getByRole("searchbox", { name: /search ticket number, summary, or requester/i })).toHaveValue(tag);
  await expect(page.getByLabel("Owner")).toHaveValue("me");
  await expect(page.getByText(/\(6 total\)/)).toBeVisible();
});

test("Issue #47 Queue uses desktop table and tablet/mobile cards without page-level overflow", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginStaff(page);
  await applyFixtureSearch(page);
  await expect(page.locator(".lab3-staff-table")).toBeVisible();
  await expect(page.locator(".lab3-staff-cards")).toBeHidden();
  await assertNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 834, height: 1112 });
  await expect(page.locator(".lab3-staff-table")).toBeHidden();
  await expect(page.locator(".lab3-staff-cards")).toBeVisible();
  await assertNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".lab3-staff-table")).toBeHidden();
  await expect(page.locator(".lab3-staff-cards")).toBeVisible();
  await assertNoHorizontalOverflow(page);
});
