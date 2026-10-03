import { Prisma, type PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ActionsFixture } from "./support/actions-fixture.js";
import {
  agentFor,
  createActionsFixture,
  createActionTicket,
  createStoredAction,
  destroyActionsFixture,
  patchJson,
} from "./support/actions-fixture.js";

let fixture: ActionsFixture;
const ADMIN_SAFETY_ADVISORY_LOCK = 50_334;

beforeAll(async () => {
  fixture = await createActionsFixture();
});

afterAll(async () => {
  await destroyActionsFixture(fixture);
});

async function candidate(role: "IT_STAFF" | "ADMINISTRATOR" = "IT_STAFF") {
  const user = await fixture.prisma.user.create({
    data: {
      name: `Issue 74 ${role} candidate`,
      email: `issue74-race-${role.toLowerCase()}-${process.pid}-${Date.now()}-${fixture.extraUserIds.length}@example.test`,
      role,
      active: true,
      mustChangePassword: false,
    },
  });
  fixture.extraUserIds.push(user.id);
  return user;
}

async function adminUpdate(user: Awaited<ReturnType<typeof candidate>>, active: boolean, role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR" = user.role) {
  const admin = await agentFor(fixture, fixture.administrator.email);
  return patchJson(fixture, admin, `/api/admin/users/${user.id}`, {
    name: user.name,
    email: user.email,
    role,
    active,
    expectedVersion: user.version,
  });
}

function controlledTransaction(lock: (tx: Prisma.TransactionClient) => Promise<void>) {
  let release!: () => void;
  let locked!: () => void;
  const released = new Promise<void>((resolve) => { release = resolve; });
  const ready = new Promise<void>((resolve) => { locked = resolve; });
  const done = fixture.prisma.$transaction(async (tx) => {
    await lock(tx);
    locked();
    await released;
  }, { timeout: 15_000 });
  return { ready, release, done };
}

async function waitUntilUserLocked(prisma: PrismaClient, userId: number): Promise<void> {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    try {
      await prisma.$queryRaw`SELECT id FROM "RequesterUser" WHERE id = ${userId} FOR UPDATE NOWAIT`;
    } catch (error) {
      const text = String(error);
      if (/could not obtain lock|55P03|lock not available/i.test(text)) return;
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Timed out waiting for User ${userId} row lock`);
}

describe("RACE-02 outstanding Action assignee account safety", () => {
  it("blocks deactivation and Requester demotion while PENDING/IN_PROGRESS work is assigned, but permits terminal history", async () => {
    const pendingUser = await candidate();
    const pendingTicket = await createActionTicket(fixture);
    await createStoredAction(fixture, pendingTicket, { assigneeId: pendingUser.id, status: "PENDING" });
    const deactivated = await adminUpdate(pendingUser, false, "IT_STAFF");
    expect(deactivated.status).toBe(409);
    expect(deactivated.body.error.code).toBe("CONFLICT");
    const demoted = await adminUpdate(pendingUser, true, "REQUESTER");
    expect(demoted.status).toBe(409);

    const terminalUser = await candidate();
    const terminalTicket = await createActionTicket(fixture);
    await createStoredAction(fixture, terminalTicket, { assigneeId: terminalUser.id, status: "COMPLETED" });
    await createStoredAction(fixture, terminalTicket, { assigneeId: terminalUser.id, status: "CANCELLED" });
    const allowed = await adminUpdate(terminalUser, false, "IT_STAFF");
    expect(allowed.status).toBe(200);
    expect(allowed.body.user).toMatchObject({ id: terminalUser.id, active: false, role: "IT_STAFF" });
  });

  it("forces assignment-first serialization: assignment commits, then deactivation observes outstanding work and conflicts", async () => {
    const target = await candidate("IT_STAFF");
    const ticket = await createActionTicket(fixture);
    const action = await createStoredAction(fixture, ticket, { assigneeId: fixture.extraStaff.id, status: "PENDING" });
    const blocker = controlledTransaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Ticket" WHERE id = ${ticket.id} FOR UPDATE`;
    });
    await blocker.ready;

    const staff = await agentFor(fixture, fixture.staff.email);
    const assignPromise = patchJson(fixture, staff, `/api/staff/tickets/${ticket.id}/actions-taken/${action.id}`, {
      expectedTicketVersion: ticket.version,
      expectedActionVersion: action.version,
      assigneeId: target.id,
    });
    await waitUntilUserLocked(fixture.prisma, target.id);
    const deactivatePromise = adminUpdate(target, false, "IT_STAFF");
    blocker.release();
    await blocker.done;
    const [assign, deactivate] = await Promise.all([assignPromise, deactivatePromise]);

    expect(assign.status).toBe(200);
    expect(deactivate.status).toBe(409);
    expect((await fixture.prisma.actionTaken.findUniqueOrThrow({ where: { id: action.id } })).assigneeId).toBe(target.id);
    expect((await fixture.prisma.user.findUniqueOrThrow({ where: { id: target.id } })).active).toBe(true);
  });

  it("forces admin-first serialization: deactivation commits, then assignment rechecks eligibility and conflicts", async () => {
    const target = await candidate("ADMINISTRATOR");
    const ticket = await createActionTicket(fixture);
    const action = await createStoredAction(fixture, ticket, { assigneeId: fixture.extraStaff.id, status: "PENDING" });
    const blocker = controlledTransaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ADMIN_SAFETY_ADVISORY_LOCK})`;
    });
    await blocker.ready;

    const deactivatePromise = adminUpdate(target, false, "ADMINISTRATOR");
    await waitUntilUserLocked(fixture.prisma, target.id);
    const staff = await agentFor(fixture, fixture.staff.email);
    const assignPromise = patchJson(fixture, staff, `/api/staff/tickets/${ticket.id}/actions-taken/${action.id}`, {
      expectedTicketVersion: ticket.version,
      expectedActionVersion: action.version,
      assigneeId: target.id,
    });
    blocker.release();
    await blocker.done;
    const [deactivate, assign] = await Promise.all([deactivatePromise, assignPromise]);

    expect(deactivate.status).toBe(200);
    expect(assign.status).toBe(409);
    expect((await fixture.prisma.user.findUniqueOrThrow({ where: { id: target.id } })).active).toBe(false);
    expect((await fixture.prisma.actionTaken.findUniqueOrThrow({ where: { id: action.id } })).assigneeId).toBe(fixture.extraStaff.id);
  });

  it("forces assignment-first serialization against demotion: assignment commits, then demotion conflicts", async () => {
    const target = await candidate("IT_STAFF");
    const ticket = await createActionTicket(fixture);
    const action = await createStoredAction(fixture, ticket, { assigneeId: fixture.extraStaff.id, status: "IN_PROGRESS" });
    const blocker = controlledTransaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Ticket" WHERE id = ${ticket.id} FOR UPDATE`;
    });
    await blocker.ready;

    const staff = await agentFor(fixture, fixture.staff.email);
    const assignPromise = patchJson(fixture, staff, `/api/staff/tickets/${ticket.id}/actions-taken/${action.id}`, {
      expectedTicketVersion: ticket.version,
      expectedActionVersion: action.version,
      assigneeId: target.id,
    });
    await waitUntilUserLocked(fixture.prisma, target.id);
    const demotePromise = adminUpdate(target, true, "REQUESTER");
    blocker.release();
    await blocker.done;
    const [assign, demote] = await Promise.all([assignPromise, demotePromise]);

    expect(assign.status).toBe(200);
    expect(demote.status).toBe(409);
    expect((await fixture.prisma.actionTaken.findUniqueOrThrow({ where: { id: action.id } })).assigneeId).toBe(target.id);
    expect((await fixture.prisma.user.findUniqueOrThrow({ where: { id: target.id } }))).toMatchObject({ active: true, role: "IT_STAFF" });
  });

  it("forces admin-first serialization against demotion: demotion commits, then assignment rechecks eligibility and conflicts", async () => {
    const target = await candidate("ADMINISTRATOR");
    const ticket = await createActionTicket(fixture);
    const action = await createStoredAction(fixture, ticket, { assigneeId: fixture.extraStaff.id, status: "PENDING" });
    const blocker = controlledTransaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ADMIN_SAFETY_ADVISORY_LOCK})`;
    });
    await blocker.ready;

    const demotePromise = adminUpdate(target, true, "REQUESTER");
    await waitUntilUserLocked(fixture.prisma, target.id);
    const staff = await agentFor(fixture, fixture.staff.email);
    const assignPromise = patchJson(fixture, staff, `/api/staff/tickets/${ticket.id}/actions-taken/${action.id}`, {
      expectedTicketVersion: ticket.version,
      expectedActionVersion: action.version,
      assigneeId: target.id,
    });
    blocker.release();
    await blocker.done;
    const [demote, assign] = await Promise.all([demotePromise, assignPromise]);

    expect(demote.status).toBe(200);
    expect(assign.status).toBe(409);
    expect((await fixture.prisma.user.findUniqueOrThrow({ where: { id: target.id } }))).toMatchObject({ active: true, role: "REQUESTER" });
    expect((await fixture.prisma.actionTaken.findUniqueOrThrow({ where: { id: action.id } })).assigneeId).toBe(fixture.extraStaff.id);
  });
});
