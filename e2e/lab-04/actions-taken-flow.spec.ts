import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { PrismaClient } from "../../server/node_modules/@prisma/client/index.js";
import { hashPassword } from "../../server/dist/src/password.js";
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
  if (!development || !testUrl) throw new Error("DATABASE_URL and TEST_DATABASE_URL are required for Actions Taken E2E");
  const developmentName = decodeURIComponent(new URL(development).pathname.replace(/^\/+/, "")).toLowerCase();
  const testName = decodeURIComponent(new URL(testUrl).pathname.replace(/^\/+/, "")).toLowerCase();
  if (!developmentName || developmentName === testName) throw new Error("Actions Taken E2E requires a distinct test database");
  return testUrl;
}

const password = "Actions-Flow-E2E-76!";
let prisma: PrismaClient;
let recorder: { id: number; email: string; name: string };
let assignee: { id: number; email: string; name: string };
let completer: { id: number; email: string; name: string };
let requester: { id: number; email: string; name: string };
let categoryId = 0;
let relatedSystemId = 0;
const ticketIds: number[] = [];

async function login(page: Page, email: string, expectedHome: "Ticket Queue" | "My Tickets" | "User Management") {
  await page.goto("/#/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("heading", { name: expectedHome === "My Tickets" ? "Dashboard" : "Staff Dashboard" })).toBeVisible();
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: expectedHome === "User Management" ? "Users" : expectedHome }).click();
  await expect(page.getByRole("heading", { name: expectedHome })).toBeVisible();
}

async function logout(page: Page) {
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
}

async function csrf(request: APIRequestContext): Promise<string> {
  const response = await request.get("http://127.0.0.1:4311/api/auth/csrf");
  expect(response.status()).toBe(200);
  return (await response.json()).csrfToken as string;
}

async function createTicket() {
  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber: `TKT-ACTIONS-${randomUUID()}`,
      clientRequestId: randomUUID(),
      requesterId: requester.id,
      ownerId: recorder.id,
      categoryId,
      relatedSystemId,
      summary: "Campus access point investigation",
      description: "Investigate intermittent connectivity and document the service work.",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: "OPEN",
    },
  });
  ticketIds.push(ticket.id);
  return ticket;
}

test.beforeAll(async () => {
  prisma = new PrismaClient({ datasources: { db: { url: testDatabaseUrl() } } });
  await prisma.$connect();
  const passwordHash = await hashPassword(password);
  const tag = `actions-${process.pid}-${Date.now()}-${randomUUID().slice(0, 8)}`;
  recorder = await prisma.user.create({
    data: { name: "Narin Service Desk", email: `${tag}-recorder@example.test`, active: true, role: "IT_STAFF", passwordHash, mustChangePassword: false },
    select: { id: true, email: true, name: true },
  });
  assignee = await prisma.user.create({
    data: { name: "Mali Network Staff", email: `${tag}-assignee@example.test`, active: true, role: "IT_STAFF", passwordHash, mustChangePassword: false },
    select: { id: true, email: true, name: true },
  });
  completer = await prisma.user.create({
    data: { name: "Ploy Service Administrator", email: `${tag}-admin@example.test`, active: true, role: "ADMINISTRATOR", passwordHash, mustChangePassword: false },
    select: { id: true, email: true, name: true },
  });
  requester = await prisma.user.create({
    data: { name: "Mina Requester", email: `${tag}-requester@example.test`, active: true, role: "REQUESTER", passwordHash, mustChangePassword: false },
    select: { id: true, email: true, name: true },
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
  await prisma.publicComment.deleteMany({ where: { ticketId: { in: ticketIds } } });
  await prisma.internalNote.deleteMany({ where: { ticketId: { in: ticketIds } } });
  await prisma.ticketWorkflowEvent.deleteMany({ where: { ticketId: { in: ticketIds } } });
  await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
  const ids = [recorder?.id, assignee?.id, completer?.id, requester?.id].filter((id): id is number => Number.isSafeInteger(id));
  const sessions = await prisma.session.findMany({ select: { sid: true, sess: true } });
  const sessionIds = sessions.filter((row) => ids.includes(Number((row.sess as Record<string, unknown>).userId))).map((row) => row.sid);
  if (sessionIds.length > 0) await prisma.session.deleteMany({ where: { sid: { in: sessionIds } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.category.deleteMany({ where: { id: categoryId } });
  await prisma.relatedSystem.deleteMany({ where: { id: relatedSystemId } });
  await prisma.$disconnect();
});

test("E2E-01 reconciles a lost create response, preserves attribution, completes through distinct actors, and stays read-only for the Requester", async ({ page }) => {
  const ticket = await createTicket();
  await login(page, recorder.email, "Ticket Queue");
  await page.goto(`/#/staff/tickets/${ticket.id}`);
  await expect(page.getByRole("heading", { name: "Staff Ticket Detail" })).toBeVisible();

  let interceptedCreates = 0;
  await page.route(`**/api/staff/tickets/${ticket.id}/actions-taken`, async (route) => {
    if (route.request().method() !== "POST" || interceptedCreates > 0) {
      await route.continue();
      return;
    }
    interceptedCreates += 1;
    const committed = await route.fetch();
    expect(committed.ok()).toBe(true);
    await route.abort("failed");
  });

  await page.getByRole("button", { name: "Create Action" }).click();
  await expect(page.getByLabel("Assigned to")).toHaveValue(String(recorder.id));
  await page.getByRole("button", { name: "Save Action" }).click();
  await expect(page.getByText("Action Description is required.")).toBeVisible();
  await expect(page.getByLabel("Action Description")).toBeFocused();
  await captureReleaseEvidence(page, {
    file: "actions-taken/staff-create-validation.png",
    role: "IT Staff",
    route: `#/staff/tickets/${ticket.id}`,
    scenario: "Staff Action create validation keeps the editor open and focuses the first invalid field",
    scenarioId: "L4-STF-ACTIONS",
    mapping: ["AC-03", "AC-25"],
    testId: "E2E-01",
    rubricPart: "P6",
  });
  await page.getByLabel("Action Description").fill("Inspect the access point uplink and replace the damaged patch cable");
  await page.getByLabel("Assigned to").selectOption(String(assignee.id));
  await page.getByLabel("Attachment Notes").fill("Reference the Ticket attachment when validating the switch port");
  await page.getByRole("button", { name: "Save Action" }).click();
  await expect(page.getByRole("alert")).toContainText(/result is uncertain/i);
  await expect(page.getByLabel("Action Description")).toBeDisabled();
  await captureReleaseEvidence(page, {
    file: "actions-taken/staff-ambiguous-retry.png",
    role: "IT Staff",
    route: `#/staff/tickets/${ticket.id}`,
    scenario: "Lost Action-create response freezes the original draft and offers same-request reconciliation",
    scenarioId: "L4-STF-ACTIONS",
    mapping: ["AC-07", "AC-24"],
    testId: "E2E-01",
    rubricPart: "P6",
  });

  const committedAfterLoss = await prisma.actionTaken.findMany({ where: { ticketId: ticket.id } });
  expect(committedAfterLoss).toHaveLength(1);
  const logicalId = committedAfterLoss[0].clientRequestId;
  expect(committedAfterLoss[0].recordedById).toBe(recorder.id);
  expect(committedAfterLoss[0].assigneeId).toBe(assignee.id);
  expect(committedAfterLoss[0].performedById).toBeNull();

  await page.getByRole("button", { name: "Retry same Action" }).click();
  await expect(page.getByText(/saved successfully after reconciling/i)).toBeVisible();
  const actionsAfterReplay = await prisma.actionTaken.findMany({ where: { ticketId: ticket.id } });
  expect(actionsAfterReplay).toHaveLength(1);
  expect(actionsAfterReplay[0].clientRequestId).toBe(logicalId);
  expect(await prisma.actionTakenRevision.count({ where: { actionId: actionsAfterReplay[0].id, eventType: "CREATED" } })).toBe(1);

  const actionId = actionsAfterReplay[0].id;
  await page.getByRole("button", { name: `Edit Action #${actionId}` }).click();
  await page.getByLabel("Edit Action Description").fill("Inspect the access point uplink, replace the damaged cable, and verify packet loss");
  await captureReleaseEvidence(page, {
    file: "actions-taken/staff-edit.png",
    role: "IT Staff",
    route: `#/staff/tickets/${ticket.id}`,
    scenario: "Staff edits current-cycle Action content while provenance remains read-only",
    scenarioId: "L4-STF-ACTIONS",
    mapping: ["AC-02", "AC-03"],
    testId: "E2E-01",
    rubricPart: "P6",
  });
  await page.getByRole("button", { name: "Save Action changes" }).click();
  await expect(page.getByText(/verify packet loss/i)).toBeVisible();

  await page.getByRole("button", { name: `Edit Action #${actionId}` }).click();
  const conflictDraft = "Preserve this draft while reconciling a concurrent Action update";
  await page.getByLabel("Edit Action Description").fill(conflictDraft);
  await prisma.actionTaken.update({
    where: { id: actionId },
    data: {
      description: "Authoritative concurrent Action update",
      version: { increment: 1 },
      updatedById: assignee.id,
    },
  });
  await page.getByRole("button", { name: "Save Action changes" }).click();
  await expect(page.getByText(/Action or Ticket changed or the operation is no longer available/i)).toBeVisible();
  await expect(page.getByLabel("Edit Action Description")).toHaveValue(conflictDraft);
  await expect(page.getByText("Authoritative concurrent Action update", { exact: true })).toBeVisible();
  await captureReleaseEvidence(page, {
    file: "actions-taken/staff-conflict-draft.png",
    role: "IT Staff",
    route: `#/staff/tickets/${ticket.id}`,
    scenario: "Stale Action edit preserves the entered draft beside refreshed authoritative state without blind retry",
    scenarioId: "L4-STF-ACTIONS",
    mapping: ["AC-08", "AC-24"],
    testId: "E2E-01",
    rubricPart: "P6",
  });
  await page.getByRole("button", { name: "Save Action changes" }).click();
  await expect(page.getByText(conflictDraft, { exact: true })).toBeVisible();

  await logout(page);
  await login(page, assignee.email, "Ticket Queue");
  await page.goto(`/#/staff/tickets/${ticket.id}`);
  await page.getByRole("button", { name: `Start Action #${actionId}` }).click();
  await expect(page.getByRole("article", { name: `Action #${actionId}` }).getByText("In Progress", { exact: true })).toBeVisible();

  await logout(page);
  await login(page, completer.email, "User Management");
  await page.goto(`/#/staff/tickets/${ticket.id}`);
  await page.getByRole("button", { name: `Complete Action #${actionId}` }).click();
  await page.getByLabel("Completion Result").fill("Connectivity restored and packet loss is no longer observed");
  await page.getByRole("checkbox", { name: "Confirm Action completion" }).check();
  await page.getByRole("button", { name: "Confirm complete Action" }).click();
  await expect(page.getByText("Completed", { exact: true })).toBeVisible();
  const card = page.getByRole("article", { name: `Action #${actionId}` });
  await expect(card.getByText(recorder.name, { exact: true })).toBeVisible();
  await expect(card.getByText(new RegExp(assignee.name))).toBeVisible();
  await expect(card.getByText(completer.name, { exact: true })).toBeVisible();
  await captureReleaseEvidence(page, {
    file: "actions-taken/staff-completed.png",
    role: "Administrator",
    route: `#/staff/tickets/${ticket.id}`,
    scenario: "Completed Action with distinct recorder, assignee, and actual performer",
    scenarioId: "L4-STF-ACTIONS",
    mapping: ["AC-02", "AC-05", "AC-07"],
    testId: "E2E-01",
    rubricPart: "P6",
  });

  const storedCompleted = await prisma.actionTaken.findUniqueOrThrow({ where: { id: actionId } });
  expect(storedCompleted.recordedById).toBe(recorder.id);
  expect(storedCompleted.assigneeId).toBe(assignee.id);
  expect(storedCompleted.performedById).toBe(completer.id);

  await logout(page);
  await login(page, requester.email, "My Tickets");
  await page.goto(`/#/tickets/${ticket.id}`);
  await expect(page.getByRole("heading", { name: "Actions Taken" })).toBeVisible();
  await expect(page.getByText(conflictDraft, { exact: true })).toBeVisible();
  await expect(page.getByText("Connectivity restored and packet loss is no longer observed")).toBeVisible();
  await expect(page.getByText(completer.name, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create Action" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: `Edit Action #${actionId}` })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Internal Notes" })).toHaveCount(0);

  await page.getByRole("button", { name: `History for Action #${actionId}` }).click();
  await expect(page.getByText(/Created by Narin Service Desk/i)).toBeVisible();
  await expect(page.getByText(/Completed by Ploy Service Administrator/i)).toBeVisible();

  const requesterToken = await csrf(page.request);
  const denied = await page.request.post(`http://127.0.0.1:4311/api/staff/tickets/${ticket.id}/actions-taken/${actionId}/status`, {
    headers: { Origin: "http://127.0.0.1:4312", "X-CSRF-Token": requesterToken },
    data: { expectedTicketVersion: 999, expectedActionVersion: 999, status: "CANCELLED", cancellationReason: "Denied Requester attempt", confirmation: true },
  });
  expect(denied.status()).toBe(403);

  await captureReleaseEvidence(page, {
    file: "actions-taken/requester-read-only.png",
    role: "Requester",
    route: `#/tickets/${ticket.id}`,
    scenario: "Owning Requester sees public completed Action and revision history without mutation controls",
    scenarioId: "L4-REQ-ACTIONS",
    mapping: ["AC-06", "AC-07"],
    testId: "E2E-01",
    rubricPart: "P8",
  });
});
