import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ActionsFixture } from "./support/actions-fixture.js";
import {
  agentFor,
  createActionsFixture,
  createActionTicket,
  createStoredAction,
  destroyActionsFixture,
  postJson,
} from "./support/actions-fixture.js";

let fixture: ActionsFixture;

beforeAll(async () => {
  fixture = await createActionsFixture();
});

afterAll(async () => {
  await destroyActionsFixture(fixture);
});

describe("FLOW-05 Ticket workflow history read access", () => {
  it("returns a truthful Lab 4 empty state, stable public events, and ownership-safe Requester access", async () => {
    const ticket = await createActionTicket(fixture, { status: "NEW" });
    const staff = await agentFor(fixture, fixture.staff.email);
    const empty = await staff.get(`/api/tickets/${ticket.id}/workflow-events?page=1&pageSize=20`);
    expect(empty.status).toBe(200);
    expect(empty.body).toEqual({
      items: [],
      page: 1,
      pageSize: 20,
      totalItems: 0,
      totalPages: 0,
      historyRecordedSince: "LAB_4",
    });

    const opened = await postJson(fixture, staff, `/api/staff/tickets/${ticket.id}/status`, {
      status: "OPEN",
      expectedVersion: ticket.version,
    });
    expect(opened.status).toBe(200);
    const waiting = await postJson(fixture, staff, `/api/staff/tickets/${ticket.id}/status`, {
      status: "WAITING_FOR_REQUESTER",
      expectedVersion: opened.body.ticket.version,
    });
    expect(waiting.status).toBe(200);

    const owner = await agentFor(fixture, fixture.normalRequester.email);
    const visible = await owner.get(`/api/tickets/${ticket.id}/workflow-events?page=1&pageSize=20`);
    expect(visible.status).toBe(200);
    expect(visible.body.historyRecordedSince).toBe("LAB_4");
    expect(visible.body.items).toHaveLength(2);
    expect(visible.body.items.map((event: { fromStatus: string; toStatus: string }) => [event.fromStatus, event.toStatus])).toEqual([
      ["NEW", "OPEN"],
      ["OPEN", "WAITING_FOR_REQUESTER"],
    ]);
    expect(visible.body.items[0].actor).toMatchObject({ id: fixture.staff.id, role: "IT_STAFF" });
    expect(visible.body.items[0]).not.toHaveProperty("actorId");

    const foreign = await agentFor(fixture, fixture.requester.email);
    const denied = await foreign.get(`/api/tickets/${ticket.id}/workflow-events?page=1&pageSize=20`);
    expect(denied.status).toBe(404);
  });

  it("does not append a workflow event for a rejected transition", async () => {
    const ticket = await createActionTicket(fixture, { status: "OPEN" });
    const staff = await agentFor(fixture, fixture.staff.email);
    const rejected = await postJson(fixture, staff, `/api/staff/tickets/${ticket.id}/status`, {
      status: "CLOSED",
      expectedVersion: ticket.version,
      confirmed: true,
    });
    expect(rejected.status).toBe(409);
    expect(await fixture.prisma.ticketWorkflowEvent.count({ where: { ticketId: ticket.id } })).toBe(0);
  });

  it("pages workflow history by resulting Ticket version before event time", async () => {
    const ticket = await createActionTicket(fixture, { status: "NEW" });
    const staff = await agentFor(fixture, fixture.staff.email);
    const opened = await postJson(fixture, staff, `/api/staff/tickets/${ticket.id}/status`, {
      status: "OPEN",
      expectedVersion: ticket.version,
    });
    expect(opened.status).toBe(200);
    const waiting = await postJson(fixture, staff, `/api/staff/tickets/${ticket.id}/status`, {
      status: "WAITING_FOR_REQUESTER",
      expectedVersion: opened.body.ticket.version,
    });
    expect(waiting.status).toBe(200);

    const events = await fixture.prisma.ticketWorkflowEvent.findMany({
      where: { ticketId: ticket.id },
      orderBy: { ticketVersion: "asc" },
      select: { id: true, ticketVersion: true },
    });
    expect(events).toHaveLength(2);
    await fixture.prisma.ticketWorkflowEvent.update({
      where: { id: events[0].id },
      data: { createdAt: new Date("2026-09-30T08:00:00.000Z") },
    });
    await fixture.prisma.ticketWorkflowEvent.update({
      where: { id: events[1].id },
      data: { createdAt: new Date("2026-09-30T07:00:00.000Z") },
    });

    const firstPage = await staff.get(`/api/tickets/${ticket.id}/workflow-events?page=1&pageSize=1`);
    const secondPage = await staff.get(`/api/tickets/${ticket.id}/workflow-events?page=2&pageSize=1`);
    expect(firstPage.status).toBe(200);
    expect(secondPage.status).toBe(200);
    expect(firstPage.body.items.map((event: { ticketVersion: number }) => event.ticketVersion)).toEqual([events[0].ticketVersion]);
    expect(secondPage.body.items.map((event: { ticketVersion: number }) => event.ticketVersion)).toEqual([events[1].ticketVersion]);
  });
});

describe("FLOW-05 atomic Ticket cancellation fan-out", () => {
  it("cancels only outstanding current-cycle Actions, appends per-Action revisions and one Ticket event, and bumps parent once", async () => {
    const ticket = await createActionTicket(fixture, { status: "OPEN", workflowCycle: 2 });
    const pending = await createStoredAction(fixture, ticket, { status: "PENDING", workflowCycle: 2 });
    const inProgress = await createStoredAction(fixture, ticket, { status: "IN_PROGRESS", workflowCycle: 2 });
    const completed = await createStoredAction(fixture, ticket, { status: "COMPLETED", workflowCycle: 2 });
    const alreadyCancelled = await createStoredAction(fixture, ticket, { status: "CANCELLED", workflowCycle: 2 });
    const historical = await createStoredAction(fixture, ticket, { status: "PENDING", workflowCycle: 1 });
    const staff = await agentFor(fixture, fixture.staff.email);

    const cancelled = await postJson(fixture, staff, `/api/staff/tickets/${ticket.id}/status`, {
      status: "CANCELLED",
      expectedVersion: ticket.version,
      confirmed: true,
      cancelReason: "Duplicate service request",
    });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.ticket).toMatchObject({
      currentStatus: "CANCELLED",
      version: ticket.version + 1,
      cancelReason: "Duplicate service request",
    });

    const rows = await fixture.prisma.actionTaken.findMany({ where: { id: { in: [pending.id, inProgress.id, completed.id, alreadyCancelled.id, historical.id] } } });
    const byId = new Map(rows.map((row) => [row.id, row]));
    for (const id of [pending.id, inProgress.id]) {
      expect(byId.get(id)).toMatchObject({
        status: "CANCELLED",
        version: 2,
        cancelledById: fixture.staff.id,
        updatedById: fixture.staff.id,
        cancellationReason: "Duplicate service request",
      });
      expect(await fixture.prisma.actionTakenRevision.count({ where: { actionId: id, eventType: "CANCELLED", actionVersion: 2 } })).toBe(1);
    }
    expect(byId.get(completed.id)).toMatchObject({ status: "COMPLETED", version: 1 });
    expect(byId.get(alreadyCancelled.id)).toMatchObject({ status: "CANCELLED", version: 1 });
    expect(byId.get(historical.id)).toMatchObject({ status: "PENDING", workflowCycle: 1, version: 1 });
    expect(await fixture.prisma.ticketWorkflowEvent.count({ where: { ticketId: ticket.id } })).toBe(1);
  });

  it("rolls back parent, children and Ticket history when one cancellation revision write fails", async () => {
    const ticket = await createActionTicket(fixture, { status: "OPEN" });
    const first = await createStoredAction(fixture, ticket, { status: "PENDING" });
    const second = await createStoredAction(fixture, ticket, { status: "IN_PROGRESS" });
    await fixture.prisma.actionTakenRevision.create({
      data: {
        actionId: second.id,
        actionVersion: 2,
        eventType: "INJECTED_FUTURE_COLLISION",
        actorId: fixture.staff.id,
        snapshot: { status: "IN_PROGRESS" },
      },
    });
    const staff = await agentFor(fixture, fixture.staff.email);

    const response = await postJson(fixture, staff, `/api/staff/tickets/${ticket.id}/status`, {
      status: "CANCELLED",
      expectedVersion: ticket.version,
      confirmed: true,
      cancelReason: "Rollback probe",
    });
    expect(response.status).toBe(500);
    expect(response.body.error).toEqual({ code: "INTERNAL_ERROR", message: "Unable to update Ticket status" });

    expect(await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).toMatchObject({
      currentStatus: "OPEN",
      version: ticket.version,
      cancelReason: null,
      cancelledAt: null,
    });
    expect(await fixture.prisma.actionTaken.findUniqueOrThrow({ where: { id: first.id } })).toMatchObject({ status: "PENDING", version: 1 });
    expect(await fixture.prisma.actionTaken.findUniqueOrThrow({ where: { id: second.id } })).toMatchObject({ status: "IN_PROGRESS", version: 1 });
    expect(await fixture.prisma.ticketWorkflowEvent.count({ where: { ticketId: ticket.id } })).toBe(0);
  });
});
