import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import { agentFor, createActionsFixture, createActionTicket, createStoredAction, destroyActionsFixture, type ActionsFixture } from "./support/actions-fixture.js";

let fixture: ActionsFixture;
beforeAll(async () => { fixture = await createActionsFixture(); });
afterAll(async () => { vi.restoreAllMocks(); await destroyActionsFixture(fixture); });

async function sqlMetrics(actorId: number) {
  const [row] = await fixture.prisma.$queryRaw<Array<{ unassignedActive: number; myActiveTickets: number; highPriorityActive: number; waitingForRequester: number }>>`
    SELECT count(*) FILTER (WHERE "ownerId" IS NULL AND "currentStatus" IN ('NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','REOPENED'))::int AS "unassignedActive",
      count(*) FILTER (WHERE "ownerId" = ${actorId} AND "currentStatus" IN ('NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','REOPENED'))::int AS "myActiveTickets",
      count(*) FILTER (WHERE "itPriority" = 'HIGH' AND "currentStatus" IN ('NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','REOPENED'))::int AS "highPriorityActive",
      count(*) FILTER (WHERE "currentStatus" = 'WAITING_FOR_REQUESTER')::int AS "waitingForRequester" FROM "Ticket"`;
  return row;
}

describe("DASH-02 / DASH-05 Staff/Admin dashboard", () => {
  it("shows empty current-user work and independently verified operational metrics", async () => {
    const actor = await agentFor(fixture, fixture.staff.email);
    const response = await actor.get("/api/dashboard/staff").expect(200);
    expect(response.body.metrics).toEqual(await sqlMetrics(fixture.staff.id));
    expect(response.body.metrics.myActiveTickets).toBe(0);
    expect(response.body.myActions).toEqual([]);
    expect(response.headers["cache-control"]).toBe("private, no-store");
  });

  it("includes all matching recorder/assignee/performer roles once, including terminal and old-cycle history", async () => {
    const ticketIds: number[] = [];
    for (const status of ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED", "RESOLVED", "CLOSED", "CANCELLED"] as const) {
      const ticket = await createActionTicket(fixture, { status, ownerId: ticketIds.length % 2 ? null : fixture.staff.id, workflowCycle: 2 });
      await fixture.prisma.ticket.update({ where: { id: ticket.id }, data: { updatedAt: new Date("2035-01-01"), itPriority: "HIGH", requestedPriority: "LOW" } });
      ticketIds.push(ticket.id);
    }
    const parent = { id: ticketIds[0], workflowCycle: 2 };
    const recorder = await createStoredAction(fixture, parent, { recordedById: fixture.staff.id, assigneeId: fixture.extraStaff.id });
    const assigned = await createStoredAction(fixture, parent, { recordedById: fixture.extraStaff.id, assigneeId: fixture.staff.id, status: "IN_PROGRESS" });
    const performer = await createStoredAction(fixture, parent, { recordedById: fixture.extraStaff.id, assigneeId: fixture.extraStaff.id, performedById: fixture.staff.id, status: "COMPLETED" });
    const triple = await createStoredAction(fixture, parent, { recordedById: fixture.staff.id, assigneeId: fixture.staff.id, performedById: fixture.staff.id, status: "COMPLETED" });
    const historical = await createStoredAction(fixture, parent, { recordedById: fixture.inactiveStaff.id, assigneeId: fixture.staff.id, status: "CANCELLED", workflowCycle: 1 });
    for (const row of [recorder, assigned, performer, triple, historical]) {
      await fixture.prisma.actionTaken.update({ where: { id: row.id }, data: { updatedAt: new Date("2035-01-01") } });
    }
    const unrelated = await createStoredAction(fixture, parent, { recordedById: fixture.extraStaff.id, assigneeId: fixture.extraStaff.id, status: "COMPLETED", performedById: fixture.administrator.id });
    await fixture.prisma.actionTaken.update({ where: { id: unrelated.id }, data: { updatedAt: new Date("2036-01-01") } });
    await fixture.prisma.internalNote.create({ data: { ticketId: parent.id, authorId: fixture.staff.id, body: "PRIVATE-DASHBOARD-NOTE" } });
    const actor = await agentFor(fixture, fixture.staff.email);
    const result = (await actor.get("/api/dashboard/staff").expect(200)).body;
    expect(result.metrics).toEqual(await sqlMetrics(fixture.staff.id));
    expect(result.recentTickets.map((row: { id: number }) => row.id)).toEqual(ticketIds.slice(-5).reverse());
    expect(result.myActions.map((row: { action: { id: number }; attribution: string[] }) => [row.action.id, row.attribution])).toEqual([
      [historical.id, ["ASSIGNED"]], [triple.id, ["RECORDED", "ASSIGNED", "PERFORMED"]],
      [performer.id, ["PERFORMED"]], [assigned.id, ["ASSIGNED"]], [recorder.id, ["RECORDED"]],
    ]);
    expect(result.myActions[0].action).toMatchObject({ status: "CANCELLED", workflowCycle: 1, recordedBy: { id: fixture.inactiveStaff.id } });
    expect(result.myActions.every((row: { ticket: { id: number }; action: { ticketId: number } }) => row.ticket.id === row.action.ticketId)).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/PRIVATE-|createFingerprint|passwordHash|authVersion|storedName|internalNote|requesterId/);
    const administrator = await agentFor(fixture, fixture.administrator.email);
    const adminResult = (await administrator.get("/api/dashboard/staff").expect(200)).body;
    expect(adminResult.metrics).toEqual(await sqlMetrics(fixture.administrator.id));
    expect(adminResult.myActions.map((row: { action: { id: number } }) => row.action.id)).toContain(unrelated.id);
    expect(adminResult).not.toHaveProperty("accountCounts");
  });

  it("keeps the current-user Action preview bounded when there are more than five matches", async () => {
    const parent = await createActionTicket(fixture);
    const ids: number[] = [];
    for (let i = 0; i < 7; i++) {
      const action = await createStoredAction(fixture, parent);
      await fixture.prisma.actionTaken.update({ where: { id: action.id }, data: { updatedAt: new Date("2037-01-01") } });
      ids.push(action.id);
    }
    const actor = await agentFor(fixture, fixture.staff.email);
    const result = (await actor.get("/api/dashboard/staff").expect(200)).body;
    expect(result.myActions.map((row: { action: { id: number } }) => row.action.id)).toEqual(ids.slice(-5).reverse());
  });

  it("enforces role/session/query gates and returns a safe failure instead of fake zeros", async () => {
    await request(fixture.app).get("/api/dashboard/staff").expect(401);
    const requester = await agentFor(fixture, fixture.normalRequester.email);
    await requester.get("/api/dashboard/staff").expect(403);
    const actor = await agentFor(fixture, fixture.staff.email);
    for (const query of ["userId=1", "requesterId=1", "owner=me", "page=1", "userId=1&userId=2"]) {
      await actor.get(`/api/dashboard/staff?${query}`).expect(400);
    }
    const failure = vi.spyOn(getPrisma(), "$transaction").mockRejectedValueOnce(new Error("Prisma SQL passwordHash session SECRET C:\\private\\uploads"));
    try {
      const response = await actor.get("/api/dashboard/staff").expect(500);
      expect(response.body).toEqual({ error: { code: "INTERNAL_ERROR", message: "Unable to load dashboard" } });
      expect(response.headers["cache-control"]).toBe("private, no-store");
    } finally { failure.mockRestore(); }
    await fixture.prisma.user.update({ where: { id: fixture.staff.id }, data: { mustChangePassword: true } });
    await actor.get("/api/dashboard/staff").expect(403);
    await fixture.prisma.user.update({ where: { id: fixture.staff.id }, data: { mustChangePassword: false, authVersion: { increment: 1 } } });
    await actor.get("/api/dashboard/staff").expect(401);
  });
});
