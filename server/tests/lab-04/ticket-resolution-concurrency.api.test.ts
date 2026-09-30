import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ActionsFixture } from "./support/actions-fixture.js";
import {
  agentFor,
  createActionsFixture,
  createActionTicket,
  createStoredAction,
  destroyActionsFixture,
  patchJson,
  postJson,
} from "./support/actions-fixture.js";

let fixture: ActionsFixture;

beforeAll(async () => {
  fixture = await createActionsFixture();
});

afterAll(async () => {
  await destroyActionsFixture(fixture);
});

function holdUserRow(userId: number) {
  let release!: () => void;
  let locked!: () => void;
  const released = new Promise<void>((resolve) => { release = resolve; });
  const ready = new Promise<void>((resolve) => { locked = resolve; });
  const done = fixture.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.$queryRaw`SELECT id FROM "RequesterUser" WHERE id = ${userId} FOR UPDATE`;
    locked();
    await released;
  }, { timeout: 15_000 });
  return { ready, release, done };
}

async function readyToResolveTicket() {
  const ticket = await createActionTicket(fixture, { status: "IN_PROGRESS" });
  await createStoredAction(fixture, ticket, { status: "COMPLETED", followUpRequired: false });
  return ticket;
}

async function resolve(ticketId: number, expectedVersion: number) {
  const staff = await agentFor(fixture, fixture.staff.email);
  return postJson(fixture, staff, `/api/staff/tickets/${ticketId}/status`, {
    status: "RESOLVED",
    expectedVersion,
    confirmed: true,
    resolutionSummary: "Concurrent resolution with verified completed work",
  });
}

describe("RACE-04 resolve versus Action mutation", () => {
  it("forces Action-create-first serialization: create commits, then resolve safely conflicts", async () => {
    const ticket = await readyToResolveTicket();
    const blocker = holdUserRow(fixture.staff.id);
    await blocker.ready;

    const resolving = resolve(ticket.id, ticket.version);
    const admin = await agentFor(fixture, fixture.administrator.email);
    const created = await postJson(fixture, admin, `/api/staff/tickets/${ticket.id}/actions-taken`, {
      clientRequestId: randomUUID(),
      expectedTicketVersion: ticket.version,
      description: "Late concurrent work",
      assigneeId: fixture.administrator.id,
      followUpRequired: false,
    });
    expect(created.status).toBe(201);

    blocker.release();
    await blocker.done;
    const resolved = await resolving;
    expect(resolved.status).toBe(409);

    const stored = await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(stored.currentStatus).toBe("IN_PROGRESS");
    expect(await fixture.prisma.actionTaken.count({
      where: { ticketId: ticket.id, workflowCycle: stored.workflowCycle, status: { in: ["PENDING", "IN_PROGRESS"] } },
    })).toBe(1);
  });

  it("forces resolve-first serialization: resolve commits, then a blocked Action create safely conflicts", async () => {
    const ticket = await readyToResolveTicket();
    const blocker = holdUserRow(fixture.administrator.id);
    await blocker.ready;
    const admin = await agentFor(fixture, fixture.administrator.email);
    const creating = postJson(fixture, admin, `/api/staff/tickets/${ticket.id}/actions-taken`, {
      clientRequestId: randomUUID(),
      expectedTicketVersion: ticket.version,
      description: "Work that must not appear after resolution",
      assigneeId: fixture.administrator.id,
      followUpRequired: false,
    });

    const resolved = await resolve(ticket.id, ticket.version);
    expect(resolved.status).toBe(200);
    blocker.release();
    await blocker.done;
    const created = await creating;
    expect(created.status).toBe(409);

    const stored = await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(stored.currentStatus).toBe("RESOLVED");
    expect(await fixture.prisma.actionTaken.count({
      where: { ticketId: ticket.id, workflowCycle: stored.workflowCycle, status: { in: ["PENDING", "IN_PROGRESS"] } },
    })).toBe(0);
  });

  it("serializes completion and follow-up correction against resolution without committing an invalid resolved state", async () => {
    const completionTicket = await readyToResolveTicket();
    const pending = await createStoredAction(fixture, completionTicket, {
      status: "PENDING",
      assigneeId: fixture.administrator.id,
    });
    const admin = await agentFor(fixture, fixture.administrator.email);
    const [completion, resolveAttempt] = await Promise.all([
      postJson(fixture, admin, `/api/staff/tickets/${completionTicket.id}/actions-taken/${pending.id}/status`, {
        expectedTicketVersion: completionTicket.version,
        expectedActionVersion: pending.version,
        status: "COMPLETED",
        result: "Concurrent work completed",
        followUpRequired: false,
        confirmation: true,
      }),
      resolve(completionTicket.id, completionTicket.version),
    ]);
    expect([completion.status, resolveAttempt.status].sort()).toEqual([200, 409]);
    const afterCompletionRace = await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: completionTicket.id } });
    if (afterCompletionRace.currentStatus === "RESOLVED") {
      expect(await fixture.prisma.actionTaken.count({
        where: { ticketId: completionTicket.id, workflowCycle: afterCompletionRace.workflowCycle, status: { in: ["PENDING", "IN_PROGRESS"] } },
      })).toBe(0);
    }

    const followUpTicket = await createActionTicket(fixture, { status: "IN_PROGRESS" });
    const followed = await createStoredAction(fixture, followUpTicket, {
      status: "COMPLETED",
      assigneeId: fixture.administrator.id,
      followUpRequired: true,
      followUpNote: "Verify one more check",
    });
    const [correction, followUpResolve] = await Promise.all([
      patchJson(fixture, admin, `/api/staff/tickets/${followUpTicket.id}/actions-taken/${followed.id}`, {
        expectedTicketVersion: followUpTicket.version,
        expectedActionVersion: followed.version,
        followUpRequired: false,
        followUpNote: null,
      }),
      resolve(followUpTicket.id, followUpTicket.version),
    ]);
    expect([correction.status, followUpResolve.status].sort()).toEqual([200, 409]);
    const afterFollowUpRace = await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: followUpTicket.id } });
    expect(afterFollowUpRace.currentStatus).toBe("IN_PROGRESS");
  });

  it("serializes a competing Ticket-owner change against resolution through the shared parent version", async () => {
    const ticket = await readyToResolveTicket();
    const staff = await agentFor(fixture, fixture.staff.email);
    const [resolved, ownerChanged] = await Promise.all([
      resolve(ticket.id, ticket.version),
      patchJson(fixture, staff, `/api/staff/tickets/${ticket.id}/owner`, {
        ownerId: fixture.administrator.id,
        expectedVersion: ticket.version,
        confirmed: true,
      }),
    ]);
    expect([resolved.status, ownerChanged.status].sort()).toEqual([200, 409]);
    const stored = await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(stored.version).toBe(ticket.version + 1);
    if (stored.currentStatus === "RESOLVED") {
      expect(stored.ownerId).toBe(fixture.staff.id);
    } else {
      expect(stored.currentStatus).toBe("IN_PROGRESS");
      expect(stored.ownerId).toBe(fixture.administrator.id);
    }
  });
});

describe("RACE-05 Ticket cancel versus child Action mutation", () => {
  it("forces cancel-first serialization: parent/child cancellation commits and the delayed child edit conflicts", async () => {
    const ticket = await createActionTicket(fixture, { status: "OPEN" });
    const action = await createStoredAction(fixture, ticket, {
      status: "PENDING",
      assigneeId: fixture.administrator.id,
    });
    const blocker = holdUserRow(fixture.administrator.id);
    await blocker.ready;
    const admin = await agentFor(fixture, fixture.administrator.email);
    const editing = patchJson(fixture, admin, `/api/staff/tickets/${ticket.id}/actions-taken/${action.id}`, {
      expectedTicketVersion: ticket.version,
      expectedActionVersion: action.version,
      description: "This edit must lose to cancellation",
    });

    const staff = await agentFor(fixture, fixture.staff.email);
    const cancelled = await postJson(fixture, staff, `/api/staff/tickets/${ticket.id}/status`, {
      status: "CANCELLED",
      expectedVersion: ticket.version,
      confirmed: true,
      cancelReason: "Cancelled during race test",
    });
    expect(cancelled.status).toBe(200);
    blocker.release();
    await blocker.done;
    const edited = await editing;
    expect(edited.status).toBe(409);

    expect(await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).toMatchObject({ currentStatus: "CANCELLED", version: ticket.version + 1 });
    expect(await fixture.prisma.actionTaken.findUniqueOrThrow({ where: { id: action.id } })).toMatchObject({
      status: "CANCELLED",
      description: action.description,
      version: action.version + 1,
    });
  });

  it("forces child-edit-first serialization: edit commits and the delayed cancel conflicts without half-cancelling children", async () => {
    const ticket = await createActionTicket(fixture, { status: "OPEN" });
    const action = await createStoredAction(fixture, ticket, {
      status: "PENDING",
      assigneeId: fixture.administrator.id,
    });
    const blocker = holdUserRow(fixture.staff.id);
    await blocker.ready;
    const staff = await agentFor(fixture, fixture.staff.email);
    const cancelling = postJson(fixture, staff, `/api/staff/tickets/${ticket.id}/status`, {
      status: "CANCELLED",
      expectedVersion: ticket.version,
      confirmed: true,
      cancelReason: "Delayed cancel",
    });

    const admin = await agentFor(fixture, fixture.administrator.email);
    const edited = await patchJson(fixture, admin, `/api/staff/tickets/${ticket.id}/actions-taken/${action.id}`, {
      expectedTicketVersion: ticket.version,
      expectedActionVersion: action.version,
      description: "Child edit wins first",
    });
    expect(edited.status).toBe(200);
    blocker.release();
    await blocker.done;
    const cancelled = await cancelling;
    expect(cancelled.status).toBe(409);

    expect(await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).toMatchObject({ currentStatus: "OPEN", version: ticket.version + 1 });
    expect(await fixture.prisma.actionTaken.findUniqueOrThrow({ where: { id: action.id } })).toMatchObject({
      status: "PENDING",
      description: "Child edit wins first",
      version: action.version + 1,
    });
    expect(await fixture.prisma.ticketWorkflowEvent.count({ where: { ticketId: ticket.id } })).toBe(0);
  });
});
