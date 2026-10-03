import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ActionStatus } from "@prisma/client";
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

async function resolveTicket(
  ticket: { id: number; version: number },
  expectedVersion = ticket.version,
  resolutionSummary = "Verified current-cycle work restored the service",
) {
  const staff = await agentFor(fixture, fixture.staff.email);
  return postJson(fixture, staff, `/api/staff/tickets/${ticket.id}/status`, {
    status: "RESOLVED",
    expectedVersion,
    confirmed: true,
    resolutionSummary,
  });
}

async function makeActionState(status: ActionStatus, followUpRequired = false) {
  const ticket = await createActionTicket(fixture, { status: "IN_PROGRESS" });
  const action = await createStoredAction(fixture, ticket, {
    status,
    followUpRequired,
    followUpNote: followUpRequired ? "Verify the next login" : null,
  });
  return { ticket, action };
}

describe("FLOW-02 current-cycle resolution gate", () => {
  it("rejects zero-work, all-cancelled, outstanding, and unresolved-follow-up current cycles", async () => {
    const zero = await createActionTicket(fixture, { status: "IN_PROGRESS" });
    expect((await resolveTicket(zero)).status).toBe(409);

    const allCancelled = await makeActionState("CANCELLED");
    expect((await resolveTicket(allCancelled.ticket)).status).toBe(409);

    const outstanding = await makeActionState("PENDING");
    await createStoredAction(fixture, outstanding.ticket, { status: "COMPLETED" });
    expect((await resolveTicket(outstanding.ticket)).status).toBe(409);

    const followUp = await makeActionState("COMPLETED", true);
    const blocked = await resolveTicket(followUp.ticket);
    expect(blocked.status).toBe(409);
    expect(blocked.body.error).toMatchObject({
      code: "CONFLICT",
      fieldErrors: { status: expect.stringMatching(/follow-up/i) },
    });

    for (const ticketId of [zero.id, allCancelled.ticket.id, outstanding.ticket.id, followUp.ticket.id]) {
      const stored = await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } });
      expect(stored.currentStatus).toBe("IN_PROGRESS");
      expect(await fixture.prisma.ticketWorkflowEvent.count({ where: { ticketId } })).toBe(0);
    }
  });

  it("resolves only with qualifying completed current-cycle work and appends one authentic workflow event", async () => {
    const ticket = await createActionTicket(fixture, { status: "IN_PROGRESS" });
    await createStoredAction(fixture, ticket, { status: "COMPLETED", followUpRequired: false });
    await createStoredAction(fixture, ticket, { status: "CANCELLED" });

    const response = await resolveTicket(ticket, ticket.version, "  Verified repair and successful connectivity test  ");
    expect(response.status).toBe(200);
    expect(response.body.ticket).toMatchObject({
      currentStatus: "RESOLVED",
      version: ticket.version + 1,
      resolutionSummary: "Verified repair and successful connectivity test",
      workflowCycle: ticket.workflowCycle,
    });

    const events = await fixture.prisma.ticketWorkflowEvent.findMany({ where: { ticketId: ticket.id } });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      ticketVersion: ticket.version + 1,
      workflowCycle: ticket.workflowCycle,
      fromStatus: "IN_PROGRESS",
      toStatus: "RESOLVED",
      actorId: fixture.staff.id,
      resolutionSummary: "Verified repair and successful connectivity test",
      cancellationReason: null,
    });
  });

  it("lets an audited completed-Action correction clear follow-up, then resolve on the new parent version", async () => {
    const ticket = await createActionTicket(fixture, { status: "IN_PROGRESS" });
    const action = await createStoredAction(fixture, ticket, {
      status: "COMPLETED",
      followUpRequired: true,
      followUpNote: "Confirm the next login",
    });
    expect((await resolveTicket(ticket)).status).toBe(409);

    const staff = await agentFor(fixture, fixture.staff.email);
    const corrected = await patchJson(fixture, staff, `/api/staff/tickets/${ticket.id}/actions-taken/${action.id}`, {
      expectedTicketVersion: ticket.version,
      expectedActionVersion: action.version,
      followUpRequired: false,
      followUpNote: null,
    });
    expect(corrected.status).toBe(200);
    expect(corrected.body).toMatchObject({ changed: true, ticketVersion: ticket.version + 1 });
    expect(await fixture.prisma.actionTakenRevision.count({ where: { actionId: action.id, eventType: "CONTENT_CORRECTED" } })).toBe(1);

    const resolved = await resolveTicket(ticket, corrected.body.ticketVersion);
    expect(resolved.status).toBe(200);
    expect(resolved.body.ticket.currentStatus).toBe("RESOLVED");
  });
});

describe("FLOW-03 formal workflow independence", () => {
  it("keeps Requester advisory indication and Action completion separate from formal Ticket resolution", async () => {
    const advisoryTicket = await createActionTicket(fixture, { status: "IN_PROGRESS" });
    const requester = await agentFor(fixture, fixture.normalRequester.email);
    const advisory = await postJson(fixture, requester, `/api/tickets/${advisoryTicket.id}/resolution-indication`, {
      expectedVersion: advisoryTicket.version,
      confirmed: true,
    });
    expect(advisory.status).toBe(200);
    expect((await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: advisoryTicket.id } })).currentStatus).toBe("IN_PROGRESS");
    expect(await fixture.prisma.ticketWorkflowEvent.count({ where: { ticketId: advisoryTicket.id } })).toBe(0);

    const actionTicket = await createActionTicket(fixture, { status: "IN_PROGRESS" });
    const action = await createStoredAction(fixture, actionTicket, { status: "PENDING" });
    const staff = await agentFor(fixture, fixture.staff.email);
    const completed = await postJson(fixture, staff, `/api/staff/tickets/${actionTicket.id}/actions-taken/${action.id}/status`, {
      expectedTicketVersion: actionTicket.version,
      expectedActionVersion: action.version,
      status: "COMPLETED",
      result: "Verified complete",
      followUpRequired: false,
      confirmation: true,
    });
    expect(completed.status).toBe(200);
    expect((await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: actionTicket.id } })).currentStatus).toBe("IN_PROGRESS");
    expect(await fixture.prisma.ticketWorkflowEvent.count({ where: { ticketId: actionTicket.id } })).toBe(0);
  });
});

describe("FLOW-04 legacy terminals and reopen cycles", () => {
  it("allows a legacy zero-Action RESOLVED Ticket to close without fabricating work", async () => {
    const ticket = await createActionTicket(fixture, { status: "RESOLVED" });
    await fixture.prisma.ticket.update({
      where: { id: ticket.id },
      data: { resolutionSummary: "Legacy resolution before Lab 4", resolvedAt: new Date() },
    });
    const staff = await agentFor(fixture, fixture.staff.email);
    const closed = await postJson(fixture, staff, `/api/staff/tickets/${ticket.id}/status`, {
      status: "CLOSED",
      expectedVersion: ticket.version,
      confirmed: true,
    });
    expect(closed.status).toBe(200);
    expect(closed.body.ticket.currentStatus).toBe("CLOSED");
    expect(await fixture.prisma.actionTaken.count({ where: { ticketId: ticket.id } })).toBe(0);
  });

  it("increments workflowCycle on every reopen and never lets old-cycle completion satisfy a new resolution", async () => {
    const ticket = await createActionTicket(fixture, { status: "CLOSED", workflowCycle: 1 });
    await fixture.prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        resolutionSummary: "Old-cycle resolution",
        resolvedAt: new Date(Date.now() - 60_000),
        closedAt: new Date(),
      },
    });
    await createStoredAction(fixture, ticket, { status: "COMPLETED", workflowCycle: 1 });
    const staff = await agentFor(fixture, fixture.staff.email);

    const reopened = await postJson(fixture, staff, `/api/staff/tickets/${ticket.id}/status`, {
      status: "REOPENED",
      expectedVersion: ticket.version,
      confirmed: true,
    });
    expect(reopened.status).toBe(200);
    expect(reopened.body.ticket).toMatchObject({
      currentStatus: "REOPENED",
      workflowCycle: 2,
      resolutionSummary: null,
      resolvedAt: null,
      closedAt: null,
      requesterResolutionIndicatedAt: null,
    });

    const active = await postJson(fixture, staff, `/api/staff/tickets/${ticket.id}/status`, {
      status: "IN_PROGRESS",
      expectedVersion: reopened.body.ticket.version,
    });
    expect(active.status).toBe(200);
    expect((await resolveTicket(ticket, active.body.ticket.version)).status).toBe(409);

    const currentCycleAction = await createStoredAction(fixture, { id: ticket.id, workflowCycle: 2 }, { status: "COMPLETED", workflowCycle: 2 });
    expect(currentCycleAction.workflowCycle).toBe(2);
    const resolvedAgain = await resolveTicket(ticket, active.body.ticket.version);
    expect(resolvedAgain.status).toBe(200);

    const closedAgain = await postJson(fixture, staff, `/api/staff/tickets/${ticket.id}/status`, {
      status: "CLOSED",
      expectedVersion: resolvedAgain.body.ticket.version,
      confirmed: true,
    });
    const reopenedAgain = await postJson(fixture, staff, `/api/staff/tickets/${ticket.id}/status`, {
      status: "REOPENED",
      expectedVersion: closedAgain.body.ticket.version,
      confirmed: true,
    });
    expect(reopenedAgain.status).toBe(200);
    expect(reopenedAgain.body.ticket.workflowCycle).toBe(3);

    const oldActions = await fixture.prisma.actionTaken.findMany({ where: { ticketId: ticket.id }, orderBy: { workflowCycle: "asc" } });
    expect(oldActions.map((row) => row.workflowCycle)).toEqual([1, 2]);
  });

  it("rejects a stale parent version without changing state or appending history", async () => {
    const ticket = await createActionTicket(fixture, { status: "OPEN" });
    const staff = await agentFor(fixture, fixture.staff.email);
    await patchJson(fixture, staff, `/api/staff/tickets/${ticket.id}/priority`, {
      itPriority: "HIGH",
      expectedVersion: ticket.version,
    });
    const stale = await postJson(fixture, staff, `/api/staff/tickets/${ticket.id}/status`, {
      status: "IN_PROGRESS",
      expectedVersion: ticket.version,
    });
    expect(stale.status).toBe(409);
    expect((await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).currentStatus).toBe("OPEN");
    expect(await fixture.prisma.ticketWorkflowEvent.count({ where: { ticketId: ticket.id } })).toBe(0);
  });
});

describe("Issue #75 Staff Detail workflow projection", () => {
  it("returns backend-authoritative permitted transitions plus safe resolution blockers/counts", async () => {
    const ticket = await createActionTicket(fixture, { status: "IN_PROGRESS" });
    const staff = await agentFor(fixture, fixture.staff.email);
    const blocked = await staff.get(`/api/staff/tickets/${ticket.id}`);
    expect(blocked.status).toBe(200);
    expect(blocked.body.ticket.workflow).toEqual({
      permittedTransitions: ["WAITING_FOR_REQUESTER", "CANCELLED"],
      resolution: {
        completedCount: 0,
        outstandingCount: 0,
        unresolvedFollowUpCount: 0,
        blockers: ["COMPLETED_ACTION_REQUIRED"],
      },
    });

    await createStoredAction(fixture, ticket, { status: "COMPLETED" });
    const ready = await staff.get(`/api/staff/tickets/${ticket.id}`);
    expect(ready.status).toBe(200);
    expect(ready.body.ticket.workflow.permittedTransitions).toEqual(["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"]);
    expect(ready.body.ticket.workflow.resolution.blockers).toEqual([]);
  });
});
