import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "../../server/node_modules/@prisma/client/index.js";
import { hashPassword } from "../../server/dist/src/password.js";
import { assertNoHorizontalOverflow, assertTouchTargets, assertVisibleWithinViewport } from "../lab-02/support/ui.js";
import { captureReleaseEvidence } from "../lab-03/support/release-evidence.js";

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
  if (!development || !testUrl) throw new Error("DATABASE_URL and TEST_DATABASE_URL are required for Actions responsive E2E");
  const developmentName = decodeURIComponent(new URL(development).pathname.replace(/^\/+/, "")).toLowerCase();
  const testName = decodeURIComponent(new URL(testUrl).pathname.replace(/^\/+/, "")).toLowerCase();
  if (!developmentName || developmentName === testName) throw new Error("Actions responsive E2E requires a distinct test database");
  return testUrl;
}

const password = "Actions-Responsive-76!";
let prisma: PrismaClient;
let staff: { id: number; email: string };
let requester: { id: number; email: string };
let ticketId = 0;
let actionId = 0;
let categoryId = 0;
let relatedSystemId = 0;

async function login(page: Page, email: string, expectedHome: "Ticket Queue" | "My Tickets") {
  await page.goto("/#/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("heading", { name: expectedHome === "My Tickets" ? "Dashboard" : "Staff Dashboard" })).toBeVisible();
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: expectedHome }).click();
  await expect(page.getByRole("heading", { name: expectedHome })).toBeVisible();
}

test.beforeAll(async () => {
  prisma = new PrismaClient({ datasources: { db: { url: testDatabaseUrl() } } });
  await prisma.$connect();
  const passwordHash = await hashPassword(password);
  const tag = `${process.pid}-${Date.now()}`;
  staff = await prisma.user.create({
    data: { name: "Niran Staff", email: `responsive-${tag}-staff@example.test`, active: true, role: "IT_STAFF", passwordHash, mustChangePassword: false },
    select: { id: true, email: true },
  });
  requester = await prisma.user.create({
    data: { name: "Anan Requester", email: `responsive-${tag}-requester@example.test`, active: true, role: "REQUESTER", passwordHash, mustChangePassword: false },
    select: { id: true, email: true },
  });
  const category = await prisma.category.create({ data: { name: `Network Support ${tag}`, active: true } });
  const system = await prisma.relatedSystem.create({ data: { name: `Office Wi-Fi ${tag}`, active: true } });
  categoryId = category.id;
  relatedSystemId = system.id;
  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber: `TKT-76-R-${randomUUID()}`,
      clientRequestId: randomUUID(),
      requesterId: requester.id,
      ownerId: staff.id,
      categoryId,
      relatedSystemId,
      summary: "Long wireless connectivity summary that remains readable on narrow screens without page overflow",
      description: "A long diagnostic description verifies that the Ticket and Actions Taken surfaces wrap content instead of creating horizontal scrolling on desktop, tablet, or mobile layouts.",
      requestedPriority: "MEDIUM",
      itPriority: "HIGH",
      currentStatus: "IN_PROGRESS",
    },
  });
  ticketId = ticket.id;
  const action = await prisma.actionTaken.create({
    data: {
      ticketId,
      workflowCycle: ticket.workflowCycle,
      recordedById: staff.id,
      assigneeId: staff.id,
      performedById: staff.id,
      description: "Inspect the access point, verify the switch port, and document the cable path for follow-up",
      result: "Signal and uplink are stable after reseating the cable and checking the access point",
      followUpRequired: false,
      followUpNote: null,
      attachmentNotes: "Review the existing access-point photograph and the long filename shown in Ticket attachments if present",
      status: "COMPLETED",
      updatedById: staff.id,
      completedAt: new Date(),
      clientRequestId: randomUUID(),
      createFingerprint: `responsive-${randomUUID()}`,
    },
  });
  actionId = action.id;
});

test.afterAll(async () => {
  if (!prisma) return;
  await prisma.actionTakenRevision.deleteMany({ where: { actionId } });
  await prisma.actionTaken.deleteMany({ where: { id: actionId } });
  await prisma.ticketWorkflowEvent.deleteMany({ where: { ticketId } });
  await prisma.ticket.deleteMany({ where: { id: ticketId } });
  const ids = [staff?.id, requester?.id].filter((id): id is number => Number.isSafeInteger(id));
  const sessions = await prisma.session.findMany({ select: { sid: true, sess: true } });
  const sessionIds = sessions.filter((row) => ids.includes(Number((row.sess as Record<string, unknown>).userId))).map((row) => row.sid);
  if (sessionIds.length > 0) await prisma.session.deleteMany({ where: { sid: { in: sessionIds } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.category.deleteMany({ where: { id: categoryId } });
  await prisma.relatedSystem.deleteMany({ where: { id: relatedSystemId } });
  await prisma.$disconnect();
});

const cases = [
  { id: "RESP-01", name: "desktop", width: 1440, height: 900 },
  { id: "RESP-02", name: "tablet", width: 834, height: 1112 },
  { id: "RESP-03", name: "mobile", width: 390, height: 844 },
] as const;

for (const viewport of cases) {
  test(`${viewport.id} ${viewport.name} Actions Taken remains readable and operable without page overflow`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await login(page, staff.email, "Ticket Queue");
    await page.goto(`/#/staff/tickets/${ticketId}`);
    await expect(page.getByRole("heading", { name: "Actions Taken" })).toBeVisible();
    await expect(page.getByText("Signal and uplink are stable after reseating the cable and checking the access point")).toBeVisible();
    await page.getByRole("button", { name: "Create Action" }).click();
    await expect(page.getByLabel("Action Description")).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await assertVisibleWithinViewport(page, [".lab4-actions", ".lab4-action-card", ".lab4-action-editor"]);
    await assertTouchTargets(page, [".lab4-actions button"], 40);

    await captureReleaseEvidence(page, {
      file: `actions-taken/${viewport.name}-staff.png`,
      role: "IT Staff",
      route: `#/staff/tickets/${ticketId}`,
      scenario: `${viewport.name} Staff Actions Taken list and create editor`,
      scenarioId: "L4-STF-ACTIONS",
      mapping: ["AC-25"],
      testId: viewport.id,
      rubricPart: "P9",
      viewport: `${viewport.width}x${viewport.height}`,
    });

    await page.getByRole("button", { name: "Logout" }).click();
    await login(page, requester.email, "My Tickets");
    await page.goto(`/#/tickets/${ticketId}`);
    await expect(page.getByRole("heading", { name: "Actions Taken" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create Action" })).toHaveCount(0);
    await assertNoHorizontalOverflow(page);
    await assertVisibleWithinViewport(page, [".lab4-actions", ".lab4-action-card"]);

    await captureReleaseEvidence(page, {
      file: `actions-taken/${viewport.name}-requester.png`,
      role: "Requester",
      route: `#/tickets/${ticketId}`,
      scenario: `${viewport.name} Requester read-only Actions Taken`,
      scenarioId: "L4-REQ-ACTIONS",
      mapping: ["AC-06", "AC-25"],
      testId: viewport.id,
      rubricPart: "P9",
      viewport: `${viewport.width}x${viewport.height}`,
    });
  });
}
