import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "../../server/node_modules/@prisma/client/index.js";
import { hashPassword } from "../../server/dist/src/password.js";

function readLocalEnv(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  const envPath = resolve(process.cwd(), "server/.env");
  if (!existsSync(envPath)) return undefined;
  const line = readFileSync(envPath, "utf8").split(/\r?\n/).find((candidate) => candidate.trimStart().startsWith(`${name}=`));
  return line?.slice(line.indexOf("=") + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
}
function testDatabaseUrl(): string {
  const development = readLocalEnv("DATABASE_URL"); const testUrl = readLocalEnv("TEST_DATABASE_URL");
  if (!development || !testUrl) throw new Error("DATABASE_URL and TEST_DATABASE_URL are required for Dashboard E2E");
  const developmentName = decodeURIComponent(new URL(development).pathname.replace(/^\/+/, "")).toLowerCase();
  const testName = decodeURIComponent(new URL(testUrl).pathname.replace(/^\/+/, "")).toLowerCase();
  if (!developmentName || developmentName === testName) throw new Error("Dashboard E2E requires a distinct test database");
  return testUrl;
}

const password = "Dashboard-Flow-E2E-78!";
let prisma: PrismaClient;
let requester: { id: number; email: string };
let staff: { id: number; email: string };
let otherStaff: { id: number };
let administrator: { id: number; email: string };
let categoryId = 0; let systemId = 0;
let requesterTicketId = 0; let actionTicketId = 0;
let targetActionId = 0;
const ticketIds: number[] = [];

async function login(page: Page, email: string, heading: string) {
  await page.goto("/#/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("heading", { name: heading })).toBeVisible();
}
async function makeTicket(data: { ownerId: number | null; requesterId: number; summary: string; itPriority?: "LOW" | "MEDIUM" | "HIGH"; currentStatus?: "OPEN" | "WAITING_FOR_REQUESTER" | "RESOLVED" }) {
  const ticket = await prisma.ticket.create({ data: {
    ticketNumber: `TKT-DASH-${randomUUID()}`, clientRequestId: randomUUID(), requesterId: data.requesterId, ownerId: data.ownerId,
    categoryId, relatedSystemId: systemId, summary: data.summary, description: `Dashboard E2E: ${data.summary}`,
    requestedPriority: "MEDIUM", itPriority: data.itPriority ?? "MEDIUM", currentStatus: data.currentStatus ?? "OPEN",
  } });
  ticketIds.push(ticket.id);
  return ticket;
}

test.beforeAll(async () => {
  prisma = new PrismaClient({ datasources: { db: { url: testDatabaseUrl() } } });
  await prisma.$connect();
  const passwordHash = await hashPassword(password);
  const tag = `dash-${process.pid}-${Date.now()}-${randomUUID().slice(0, 8)}`;
  requester = await prisma.user.create({ data: { name: "Dashboard Requester", email: `${tag}-requester@example.test`, active: true, role: "REQUESTER", passwordHash, mustChangePassword: false }, select: { id: true, email: true } });
  staff = await prisma.user.create({ data: { name: "Dashboard Staff", email: `${tag}-staff@example.test`, active: true, role: "IT_STAFF", passwordHash, mustChangePassword: false }, select: { id: true, email: true } });
  otherStaff = await prisma.user.create({ data: { name: "Other Dashboard Staff", email: `${tag}-other@example.test`, active: true, role: "IT_STAFF", passwordHash, mustChangePassword: false }, select: { id: true } });
  administrator = await prisma.user.create({ data: { name: "Dashboard Administrator", email: `${tag}-admin@example.test`, active: true, role: "ADMINISTRATOR", passwordHash, mustChangePassword: false }, select: { id: true, email: true } });
  const category = await prisma.category.create({ data: { name: `${tag}-category`, active: true } });
  const system = await prisma.relatedSystem.create({ data: { name: `${tag}-system`, active: true } });
  categoryId = category.id; systemId = system.id;
  const owned = await makeTicket({ ownerId: staff.id, requesterId: requester.id, summary: "My dashboard VPN request" });
  requesterTicketId = owned.id;
  const unassigned = await makeTicket({ ownerId: null, requesterId: requester.id, summary: "Unassigned dashboard request", itPriority: "HIGH" });
  void unassigned;
  const waiting = await makeTicket({ ownerId: staff.id, requesterId: requester.id, summary: "Waiting for Requester dashboard task", currentStatus: "WAITING_FOR_REQUESTER" });
  void waiting;
  const resolved = await makeTicket({ ownerId: staff.id, requesterId: requester.id, summary: "Recently resolved dashboard request", currentStatus: "RESOLVED" });
  await prisma.ticket.update({ where: { id: resolved.id }, data: { resolvedAt: new Date() } });
  const actionTicket = await makeTicket({ ownerId: staff.id, requesterId: requester.id, summary: "Deep Action target dashboard task" });
  actionTicketId = actionTicket.id;
  const now = Date.now();
  const actions = Array.from({ length: 21 }, (_, index) => {
    const isTarget = index === 20;
    const createdAt = new Date(now - (21 - index) * 60_000);
    return {
      ticketId: actionTicketId, workflowCycle: 1, createdAt, updatedAt: createdAt,
      recordedById: otherStaff.id, assigneeId: isTarget ? staff.id : otherStaff.id, performedById: null,
      description: isTarget ? "Deep page Action target" : `Earlier dashboard Action ${index}`,
      result: null, followUpRequired: false, followUpNote: null, attachmentNotes: null,
      status: "PENDING" as const, version: 1, updatedById: otherStaff.id, completedAt: null, cancelledAt: null,
      cancelledById: null, cancellationReason: null, clientRequestId: randomUUID(), createFingerprint: randomUUID(),
    };
  });
  await prisma.actionTaken.createMany({ data: actions });
  const target = await prisma.actionTaken.findFirst({ where: { ticketId: actionTicketId, assigneeId: staff.id }, select: { id: true } });
  targetActionId = target!.id;
});

test.afterAll(async () => {
  if (!prisma) return;
  const actions = await prisma.actionTaken.findMany({ where: { ticketId: { in: ticketIds } }, select: { id: true } });
  const actionIds = actions.map(({ id }) => id);
  if (actionIds.length) {
    await prisma.actionTakenRevision.deleteMany({ where: { actionId: { in: actionIds } } });
    await prisma.actionTaken.deleteMany({ where: { id: { in: actionIds } } });
  }
  const ids = [requester?.id, staff?.id, otherStaff?.id, administrator?.id].filter((id): id is number => Number.isSafeInteger(id));
  const sessions = await prisma.session.findMany({ select: { sid: true, sess: true } });
  const sessionIds = sessions.filter(({ sess }) => ids.includes(Number((sess as Record<string, unknown>).userId))).map(({ sid }) => sid);
  if (sessionIds.length) await prisma.session.deleteMany({ where: { sid: { in: sessionIds } } });
  await prisma.publicComment.deleteMany({ where: { ticketId: { in: ticketIds } } });
  await prisma.internalNote.deleteMany({ where: { ticketId: { in: ticketIds } } });
  await prisma.ticketWorkflowEvent.deleteMany({ where: { ticketId: { in: ticketIds } } });
  await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.category.deleteMany({ where: { id: categoryId } });
  await prisma.relatedSystem.deleteMany({ where: { id: systemId } });
  await prisma.$disconnect();
});

test("E2E-03 follows backend Dashboard drill-downs and locates a My Action beyond page one", async ({ page }) => {
  await login(page, requester.email, "Dashboard");
  await expect(page.getByRole("link", { name: /View my active tickets/i })).toBeVisible();
  const activeStatuses = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"] as const;
  const expectedRequesterCounts = await Promise.all([
    prisma.ticket.count({ where: { requesterId: requester.id, currentStatus: { in: activeStatuses } } }),
    prisma.ticket.count({ where: { requesterId: requester.id, currentStatus: "WAITING_FOR_REQUESTER" } }),
    prisma.ticket.count({ where: { requesterId: requester.id, currentStatus: "RESOLVED", resolvedAt: { gte: new Date(Date.now() - 168 * 60 * 60 * 1000), lt: new Date() } } }),
  ]);
  for (let i = 0; i < expectedRequesterCounts.length; i += 1) await expect(page.locator(".lab4-dashboard-metric").nth(i)).toContainText(String(expectedRequesterCounts[i]));
  await page.getByRole("link", { name: /View my active tickets/i }).click();
  await expect(page).toHaveURL(/statusGroup=active/);
  await expect(page.getByRole("cell", { name: "My dashboard VPN request" })).toBeVisible();
  await page.getByRole("button", { name: "View ticket" }).first().click();
  await expect(page.getByRole("heading", { name: "Ticket Detail" })).toBeVisible();
  await page.getByRole("button", { name: "Back to My Tickets" }).click();
  await expect(page).toHaveURL(/statusGroup=active/);
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Ticket Detail" })).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/statusGroup=active/);
  await page.reload();
  await expect(page.getByRole("cell", { name: "My dashboard VPN request" })).toBeVisible();

  await page.getByRole("button", { name: "Dashboard" }).click();
  await page.getByRole("link", { name: /View recently resolved/i }).click();
  await expect(page).toHaveURL(/statusGroup=resolved.*resolvedFrom=.*resolvedBefore=/);
  await expect(page.getByRole("cell", { name: "Recently resolved dashboard request" })).toBeVisible();
  await page.getByRole("button", { name: "View ticket" }).first().click();
  await expect(page.getByRole("heading", { name: "Ticket Detail" })).toBeVisible();
  await page.getByRole("button", { name: "Back to My Tickets" }).click();
  await expect(page).toHaveURL(/statusGroup=resolved.*resolvedFrom=.*resolvedBefore=/);

  await page.getByRole("button", { name: "Logout" }).click();
  await login(page, staff.email, "Staff Dashboard");
  const expectedStaffCounts = await Promise.all([
    prisma.ticket.count({ where: { ownerId: null, currentStatus: { in: activeStatuses } } }),
    prisma.ticket.count({ where: { ownerId: staff.id, currentStatus: { in: activeStatuses } } }),
    prisma.ticket.count({ where: { itPriority: "HIGH", currentStatus: { in: activeStatuses } } }),
    prisma.ticket.count({ where: { currentStatus: "WAITING_FOR_REQUESTER" } }),
  ]);
  for (let i = 0; i < expectedStaffCounts.length; i += 1) await expect(page.locator(".lab4-dashboard-metric").nth(i)).toContainText(String(expectedStaffCounts[i]));
  await page.getByRole("link", { name: /View unassigned active/i }).click();
  await expect(page).toHaveURL(/(?=.*owner=unassigned)(?=.*statusGroup=active)/);
  await expect(page.getByText("Unassigned dashboard request").first()).toBeVisible();
  await page.getByRole("button", { name: "View ticket" }).first().click();
  await expect(page.getByRole("heading", { name: "Staff Ticket Detail" })).toBeVisible();
  await page.getByRole("button", { name: "Back to Ticket Queue" }).click();
  await expect(page).toHaveURL(/(?=.*owner=unassigned)(?=.*statusGroup=active)/);
  await page.getByRole("button", { name: "Dashboard" }).click();
  const targetLink = page.getByRole("link", { name: /Deep page Action target/ });
  await expect(targetLink).toHaveAttribute("href", `#/staff/tickets/${actionTicketId}?actionId=${targetActionId}`);
  await targetLink.click();
  await expect(page).toHaveURL(new RegExp(`staff/tickets/${actionTicketId}\\?actionId=${targetActionId}`));
  const targetCard = page.getByRole("article", { name: new RegExp(`Target Action ${targetActionId}`) });
  await expect(targetCard).toBeVisible();
  await expect(targetCard).toBeFocused();
  expect(await page.getByLabel("Actions Taken pagination").innerText()).toContain("Page 2 of 2 (21 total)");

  await page.getByRole("button", { name: "Logout" }).click();
  await login(page, administrator.email, "Staff Dashboard");
  await expect(page.getByRole("button", { name: "Users" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create Ticket" })).toHaveCount(0);
});
