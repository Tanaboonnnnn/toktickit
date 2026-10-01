import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as clock from "../../src/dashboard/dashboard-query.js";
import { agentFor, createActionsFixture, createActionTicket, destroyActionsFixture, postJson, type ActionsFixture } from "./support/actions-fixture.js";

const asOf = new Date("2030-01-08T08:00:00.000Z");
const from = new Date("2030-01-01T08:00:00.000Z");
let fixture: ActionsFixture;
beforeAll(async () => {
  fixture = await createActionsFixture();
  vi.spyOn(clock, "dashboardClock").mockReturnValue(asOf);
  for (const status of ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"] as const) {
    for (let i = 0; i < 3; i++) {
      const ticket = await createActionTicket(fixture, { status, ownerId: i === 0 ? null : fixture.staff.id });
      await fixture.prisma.ticket.update({ where: { id: ticket.id }, data: { itPriority: "HIGH", requestedPriority: "LOW", updatedAt: from } });
    }
  }
  for (const [status, resolvedAt] of [
    ["RESOLVED", new Date(from.getTime() - 1)], ["RESOLVED", from], ["RESOLVED", new Date(from.getTime() + 1)],
    ["RESOLVED", new Date(asOf.getTime() - 1)], ["RESOLVED", asOf], ["RESOLVED", new Date(asOf.getTime() + 1)],
    ["CLOSED", new Date("2030-01-04T08:00:00Z")], ["CLOSED", null], ["REOPENED", from], ["CANCELLED", from],
  ] as const) {
    const ticket = await createActionTicket(fixture, { status });
    await fixture.prisma.ticket.update({ where: { id: ticket.id }, data: { resolvedAt, updatedAt: from } });
  }
  const foreign = await createActionTicket(fixture, { requesterId: fixture.requester.id, status: "RESOLVED" });
  await fixture.prisma.ticket.update({ where: { id: foreign.id }, data: { resolvedAt: from } });
});
afterAll(async () => { vi.restoreAllMocks(); await destroyActionsFixture(fixture); });

describe("DASH-03 / DASH-04 fixed-clock card/list/SQL equality", () => {
  it("uses exactly [from,before) for resolved/closed and applies ownership before aggregation", async () => {
    const actor = await agentFor(fixture, fixture.normalRequester.email);
    const dashboard = (await actor.get("/api/dashboard/requester").expect(200)).body;
    expect(dashboard.asOf).toBe(asOf.toISOString());
    expect(dashboard.resolvedWindow).toEqual({ from: from.toISOString(), before: asOf.toISOString() });
    expect(dashboard.metrics).toEqual({ myActiveTickets: 16, waitingForMe: 3, recentlyResolved: 4 });
    const [sql] = await fixture.prisma.$queryRaw<Array<{ myActiveTickets: number; waitingForMe: number; recentlyResolved: number }>>`
      SELECT count(*) FILTER (WHERE "currentStatus" IN ('NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','REOPENED'))::int AS "myActiveTickets",
        count(*) FILTER (WHERE "currentStatus"='WAITING_FOR_REQUESTER')::int AS "waitingForMe",
        count(*) FILTER (WHERE "currentStatus" IN ('RESOLVED','CLOSED') AND "resolvedAt" >= ${from} AND "resolvedAt" < ${asOf})::int AS "recentlyResolved"
        FROM "Ticket" WHERE "requesterId"=${fixture.normalRequester.id}`;
    expect(dashboard.metrics).toEqual(sql);
    for (const [name, destination] of Object.entries(dashboard.drillDown) as Array<[keyof typeof sql, string]>) {
      const list = (await actor.get(`/api/tickets?${destination.split("?")[1]}`).expect(200)).body;
      expect(list.totalItems).toBe(sql[name]);
      expect(list.totalItems).toBe(dashboard.metrics[name]);
      if (name === "myActiveTickets") {
        expect(list.items).toHaveLength(10);
        const page2 = (await actor.get(`/api/tickets?${destination.split("?")[1]}&page=2`).expect(200)).body;
        expect(page2.items).toHaveLength(6);
        expect(page2.totalItems).toBe(16);
        expect(new Set([...list.items, ...page2.items].map((row: { id: number }) => row.id)).size).toBe(16);
        expect([...list.items, ...page2.items].map((row: { id: number }) => row.id)).toEqual([...list.items, ...page2.items].map((row: { id: number }) => row.id).sort((a, b) => b - a));
      }
    }
    const offset = new URLSearchParams({ statusGroup: "resolved", resolvedFrom: "2030-01-01T15:00:00+07:00", resolvedBefore: "2030-01-08T15:00:00+07:00" });
    expect((await actor.get(`/api/tickets?${offset}`).expect(200)).body.totalItems).toBe(4);
    const other = await agentFor(fixture, fixture.requester.email);
    expect((await other.get(`/api/tickets?${offset}`).expect(200)).body.totalItems).toBe(1);
  });

  it("reuses every Staff/Admin card predicate in the queue and preserves combined filters", async () => {
    for (const user of [fixture.staff, fixture.administrator]) {
      const actor = await agentFor(fixture, user.email);
      const dashboard = (await actor.get("/api/dashboard/staff").expect(200)).body;
      for (const [name, destination] of Object.entries(dashboard.drillDown) as Array<[string, string]>) {
        const query = destination.split("?")[1];
        const list = (await actor.get(`/api/staff/tickets?${query}`).expect(200)).body;
        expect(list.totalItems).toBe(dashboard.metrics[name]);
        const outOfRange = (await actor.get(`/api/staff/tickets?${query}&page=999999999`).expect(200)).body;
        expect(outOfRange.items).toEqual([]);
        expect(outOfRange.totalItems).toBe(dashboard.metrics[name]);
      }
    }
    const staff = await agentFor(fixture, fixture.staff.email);
    const query = `statusGroup=active&owner=me&itPriority=HIGH&requestedPriority=LOW&categoryId=${fixture.categoryId}&sortBy=createdAt&sortDirection=asc&pageSize=20`;
    const list = (await staff.get(`/api/staff/tickets?${query}`).expect(200)).body;
    expect(list.totalItems).toBe(10);
    expect(list.items.every((row: { owner: { id: number }; requestedPriority: string; itPriority: string }) => row.owner.id === fixture.staff.id && row.requestedPriority === "LOW" && row.itPriority === "HIGH")).toBe(true);
    const requester = await agentFor(fixture, fixture.normalRequester.email);
    expect((await requester.get(`/api/tickets?statusGroup=active&requestedPriority=LOW&categoryId=${fixture.categoryId}&sortBy=summary&sortDirection=asc&pageSize=50`).expect(200)).body.totalItems).toBe(15);
    await requester.get(`/api/staff/tickets?${query}`).expect(403);
  });

  it("rejects bad bounds, repetition, contradictions and unknown keys at both HTTP list boundaries", async () => {
    const requester = await agentFor(fixture, fixture.normalRequester.email);
    const staff = await agentFor(fixture, fixture.staff.email);
    for (const query of [
      "statusGroup=resolved", "statusGroup=active&currentStatus=OPEN", "statusGroup=active&statusGroup=active",
      `statusGroup=resolved&resolvedFrom=${from.toISOString()}`, `resolvedFrom=${from.toISOString()}&resolvedBefore=${asOf.toISOString()}`,
      `statusGroup=resolved&resolvedFrom=${asOf.toISOString()}&resolvedBefore=${from.toISOString()}`,
      `statusGroup=resolved&resolvedFrom=yesterday&resolvedBefore=${asOf.toISOString()}`,
      `statusGroup=resolved&resolvedFrom=${from.toISOString()}&resolvedBefore=${asOf.toISOString()}&resolvedBefore=${asOf.toISOString()}`,
      `statusGroup=active&requesterId=${fixture.requester.id}`,
    ]) {
      for (const [actor, path] of [[requester, "/api/tickets"], [staff, "/api/staff/tickets"]] as const) {
        expect((await actor.get(`${path}?${query}`).expect(400)).body.error.code).toBe("VALIDATION_ERROR");
      }
    }
  });

  it("uses Ticket updatedAt: Notes/Comments do not change it, accepted Actions do", async () => {
    const ticket = await createActionTicket(fixture, { requesterId: fixture.requesterWorker.id });
    await fixture.prisma.ticket.update({ where: { id: ticket.id }, data: { updatedAt: from } });
    const staff = await agentFor(fixture, fixture.staff.email);
    const requester = await agentFor(fixture, fixture.requesterWorker.email);
    expect((await postJson(fixture, staff, `/api/staff/tickets/${ticket.id}/internal-notes`, { body: "Private operational note" })).status).toBe(201);
    expect((await postJson(fixture, requester, `/api/tickets/${ticket.id}/comments`, { body: "Public update" })).status).toBe(201);
    expect((await requester.get("/api/dashboard/requester").expect(200)).body.recentTickets[0].updatedAt).toBe(from.toISOString());
    const beforeTicket = await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    const { randomUUID } = await import("node:crypto");
    const created = await postJson(fixture, staff, `/api/staff/tickets/${ticket.id}/actions-taken`, {
      clientRequestId: randomUUID(), expectedTicketVersion: beforeTicket.version, description: "Dashboard recency probe", followUpRequired: false,
    });
    expect(created.status).toBe(201);
    const afterTicket = await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(afterTicket.version).toBe(beforeTicket.version + 1);
    expect(afterTicket.updatedAt).not.toEqual(from);
    expect((await requester.get("/api/dashboard/requester").expect(200)).body.recentTickets[0].updatedAt).toBe(afterTicket.updatedAt.toISOString());
  });
});
