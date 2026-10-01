import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
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
  const development = readLocalEnv("DATABASE_URL");
  const testUrl = readLocalEnv("TEST_DATABASE_URL");
  if (!development || !testUrl) throw new Error("DATABASE_URL and TEST_DATABASE_URL are required for Ticket workflow E2E");
  const developmentName = decodeURIComponent(new URL(development).pathname.replace(/^\/+/, "")).toLowerCase();
  const testName = decodeURIComponent(new URL(testUrl).pathname.replace(/^\/+/, "")).toLowerCase();
  if (!developmentName || developmentName === testName) throw new Error("Ticket workflow E2E requires a distinct test database");
  return testUrl;
}

const password = "Ticket-Workflow-E2E-75!";
let prisma: PrismaClient;
let staff: { id: number; email: string };
let requester: { id: number; email: string };
let categoryId = 0;
let relatedSystemId = 0;
const ticketIds: number[] = [];

async function login(page: Page, email: string, expectedHome: "Ticket Queue" | "My Tickets") {
  await page.goto("/#/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("heading", { name: expectedHome })).toBeVisible();
}

async function csrf(request: APIRequestContext): Promise<string> {
  const response = await request.get("http://127.0.0.1:4311/api/auth/csrf");
  expect(response.status()).toBe(200);
  return (await response.json()).csrfToken as string;
}

async function createTicket(status: "IN_PROGRESS" | "OPEN" = "IN_PROGRESS") {
  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber: `TKT-75-${randomUUID()}`,
      clientRequestId: randomUUID(),
      requesterId: requester.id,
      ownerId: staff.id,
      categoryId,
      relatedSystemId,
      summary: "Lab 4 final Ticket workflow browser fixture",
      description: "Issue #75 verifies server-authoritative resolution behavior.",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: status,
    },
  });
  ticketIds.push(ticket.id);
  return ticket;
}

async function createAction(ticket: { id: number; workflowCycle: number }, status: "PENDING" | "COMPLETED", followUpRequired = false) {
  return prisma.actionTaken.create({
    data: {
      ticketId: ticket.id,
      workflowCycle: ticket.workflowCycle,
      recordedById: staff.id,
      assigneeId: staff.id,
      performedById: status === "COMPLETED" ? staff.id : null,
      description: "Issue #75 browser fixture Action",
      result: status === "COMPLETED" ? "Verified work completed" : null,
      followUpRequired,
      followUpNote: followUpRequired ? "One follow-up remains" : null,
      status,
      updatedById: staff.id,
      completedAt: status === "COMPLETED" ? new Date() : null,
      clientRequestId: randomUUID(),
      createFingerprint: `e2e75-${randomUUID()}`,
    },
  });
}

test.beforeAll(async () => {
  prisma = new PrismaClient({ datasources: { db: { url: testDatabaseUrl() } } });
  await prisma.$connect();
  const passwordHash = await hashPassword(password);
  const tag = `issue75-e2e-${process.pid}-${Date.now()}`;
  staff = await prisma.user.create({
    data: { name: "Issue 75 Staff", email: `${tag}-staff@example.test`, active: true, role: "IT_STAFF", passwordHash, mustChangePassword: false },
    select: { id: true, email: true },
  });
  requester = await prisma.user.create({
    data: { name: "Issue 75 Requester", email: `${tag}-requester@example.test`, active: true, role: "REQUESTER", passwordHash, mustChangePassword: false },
    select: { id: true, email: true },
  });
  const category = await prisma.category.create({ data: { name: `${tag}-category`, active: true } });
  const system = await prisma.relatedSystem.create({ data: { name: `${tag}-system`, active: true } });
  categoryId = category.id;
  relatedSystemId = system.id;
});

test.afterAll(async () => {
  if (!prisma) return;
  const actions = await prisma.actionTaken.findMany({ where: { ticketId: { in: ticketIds } }, select: { id: true } });
  const actionIds = actions.map((row) => row.id);
  if (actionIds.length > 0) {
    await prisma.actionTakenRevision.deleteMany({ where: { actionId: { in: actionIds } } });
    await prisma.actionTaken.deleteMany({ where: { id: { in: actionIds } } });
  }
  await prisma.ticketWorkflowEvent.deleteMany({ where: { ticketId: { in: ticketIds } } });
  await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
  const sessions = await prisma.session.findMany({ select: { sid: true, sess: true } });
  const ids = [staff?.id, requester?.id].filter((id): id is number => Number.isSafeInteger(id));
  const sessionIds = sessions.filter((row) => ids.includes(Number((row.sess as Record<string, unknown>).userId))).map((row) => row.sid);
  if (sessionIds.length > 0) await prisma.session.deleteMany({ where: { sid: { in: sessionIds } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.category.deleteMany({ where: { id: categoryId } });
  await prisma.relatedSystem.deleteMany({ where: { id: relatedSystemId } });
  await prisma.$disconnect();
});

test("E2E-02 blocks premature resolution, preserves Requester advisory independence, then resolves only after qualifying work", async ({ page }) => {
  const ticket = await createTicket();
  await createAction(ticket, "PENDING");
  await login(page, staff.email, "Ticket Queue");
  await page.goto(`/#/staff/tickets/${ticket.id}`);
  await expect(page.getByRole("heading", { name: "Staff Ticket Detail" })).toBeVisible();
  await expect(page.getByLabel("Next status").locator("option[value=RESOLVED]")).toHaveCount(0);
  await expect(page.getByText(/complete or cancel all outstanding current-cycle actions/i)).toBeVisible();

  await page.getByRole("button", { name: "Logout" }).click();
  await login(page, requester.email, "My Tickets");
  const requesterCsrf = await csrf(page.request);
  const advisory = await page.request.post(`http://127.0.0.1:4311/api/tickets/${ticket.id}/resolution-indication`, {
    headers: { Origin: "http://127.0.0.1:4312", "X-CSRF-Token": requesterCsrf },
    data: { expectedVersion: ticket.version, confirmed: true },
  });
  expect(advisory.status()).toBe(200);
  expect((await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).currentStatus).toBe("IN_PROGRESS");

  await prisma.actionTaken.deleteMany({ where: { ticketId: ticket.id } });
  await createAction(ticket, "COMPLETED");
  const current = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
  await page.getByRole("button", { name: "Logout" }).click();
  await login(page, staff.email, "Ticket Queue");
  await page.goto(`/#/staff/tickets/${ticket.id}`);
  await expect(page.getByLabel("Next status").locator("option[value=RESOLVED]")).toHaveCount(1);
  await page.getByLabel("Next status").selectOption("RESOLVED");
  await page.getByLabel("Resolution Summary").fill("Verified current-cycle completed work restored service");
  await page.getByRole("checkbox", { name: /confirm transition/i }).check();
  await page.getByRole("button", { name: "Confirm status change" }).click();
  await expect(page.getByText("Resolved", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ticket workflow history" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "In Progress → Resolved" })).toBeVisible();
  await expect(page.getByText(/Verified current-cycle completed work restored service/)).toBeVisible();

  const stored = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
  expect(stored.currentStatus).toBe("RESOLVED");
  expect(stored.version).toBe(current.version + 1);
  expect(await prisma.ticketWorkflowEvent.count({ where: { ticketId: ticket.id, toStatus: "RESOLVED" } })).toBe(1);
});

test("E2E-02 direct API bypass is rejected while server-advertised blocker feedback remains safe", async ({ page }) => {
  const ticket = await createTicket();
  await createAction(ticket, "COMPLETED", true);
  await login(page, staff.email, "Ticket Queue");
  await page.goto(`/#/staff/tickets/${ticket.id}`);
  await expect(page.getByText(/clear required follow-up/i)).toBeVisible();
  await expect(page.getByLabel("Next status").locator("option[value=RESOLVED]")).toHaveCount(0);

  const token = await csrf(page.request);
  const bypass = await page.request.post(`http://127.0.0.1:4311/api/staff/tickets/${ticket.id}/status`, {
    headers: { Origin: "http://127.0.0.1:4312", "X-CSRF-Token": token },
    data: {
      status: "RESOLVED",
      expectedVersion: ticket.version,
      confirmed: true,
      resolutionSummary: "Attempted direct API bypass must not resolve",
    },
  });
  expect(bypass.status()).toBe(409);
  expect((await bypass.json()).error.code).toBe("CONFLICT");
  expect((await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).currentStatus).toBe("IN_PROGRESS");
});
