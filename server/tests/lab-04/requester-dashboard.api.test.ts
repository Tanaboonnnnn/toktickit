import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { agentFor, createActionsFixture, createActionTicket, destroyActionsFixture, type ActionsFixture } from "./support/actions-fixture.js";
import { getPrisma } from "../../src/prisma.js";

let fixture: ActionsFixture;
beforeAll(async () => { fixture = await createActionsFixture(); });
afterAll(async () => { vi.restoreAllMocks(); await destroyActionsFixture(fixture); });

describe("DASH-01 / DASH-05 Requester dashboard", () => {
  it("returns numeric zeros and empty arrays for a Requester with no Tickets", async () => {
    const actor = await agentFor(fixture, fixture.normalRequester.email);
    const response = await actor.get("/api/dashboard/requester").expect(200);
    expect(response.headers["cache-control"]).toBe("private, no-store");
    expect(response.body).toMatchObject({ metrics: { myActiveTickets: 0, waitingForMe: 0, recentlyResolved: 0 }, recentTickets: [], attentionTickets: [] });
    expect(new Date(response.body.resolvedWindow.before).getTime() - new Date(response.body.resolvedWindow.from).getTime()).toBe(168 * 3600000);
    expect(response.body.resolvedWindow.before).toBe(response.body.asOf);
  });

  it("counts beyond page one while bounding and ordering owned-only previews", async () => {
    const tied = new Date("2030-01-01T00:00:00Z");
    const ids: number[] = [];
    for (let i = 0; i < 23; i++) {
      const ticket = await createActionTicket(fixture, { status: i < 6 ? "WAITING_FOR_REQUESTER" : "OPEN" });
      await fixture.prisma.ticket.update({ where: { id: ticket.id }, data: { updatedAt: tied, description: "PRIVATE-LONG-DESCRIPTION" } });
      ids.push(ticket.id);
    }
    const foreign = await createActionTicket(fixture, { requesterId: fixture.requester.id, status: "WAITING_FOR_REQUESTER" });
    await fixture.prisma.ticket.update({ where: { id: foreign.id }, data: { updatedAt: new Date("2031-01-01") } });
    await fixture.prisma.internalNote.create({ data: { ticketId: ids[0], authorId: fixture.staff.id, body: "PRIVATE-NOTE-MARKER" } });
    const actor = await agentFor(fixture, fixture.normalRequester.email);
    const result = (await actor.get("/api/dashboard/requester").expect(200)).body;
    expect(result.metrics).toEqual({ myActiveTickets: 23, waitingForMe: 6, recentlyResolved: 0 });
    expect(result.recentTickets.map((row: { id: number }) => row.id)).toEqual(ids.slice(-5).reverse());
    expect(result.attentionTickets.map((row: { id: number }) => row.id)).toEqual(ids.slice(1, 6).reverse());
    expect(JSON.stringify(result)).not.toMatch(/PRIVATE-|passwordHash|authVersion|internalNote|description|storedName|sessionId|createFingerprint/);
    const other = await agentFor(fixture, fixture.requester.email);
    const otherResult = (await other.get("/api/dashboard/requester").expect(200)).body;
    expect(otherResult.metrics.myActiveTickets).toBe(1);
    expect(otherResult.recentTickets.map((row: { id: number }) => row.id)).toEqual([foreign.id]);
    const unchanged = await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: ids[0] } });
    expect(unchanged.version).toBe(1);
    expect(unchanged.updatedAt).toEqual(tied);
  });

  it("rejects unauthenticated, wrong-role and forged query requests before returning data", async () => {
    await request(fixture.app).get("/api/dashboard/requester").expect(401);
    for (const user of [fixture.staff, fixture.administrator]) {
      const actor = await agentFor(fixture, user.email);
      await actor.get("/api/dashboard/requester").expect(403);
    }
    const actor = await agentFor(fixture, fixture.normalRequester.email);
    for (const query of ["requesterId=1", "userId=1", "page=1", "statusGroup=active", "asOf=2030-01-01", "userId=1&userId=2"]) {
      expect((await actor.get(`/api/dashboard/requester?${query}`).expect(400)).body.error.code).toBe("VALIDATION_ERROR");
    }
    await fixture.prisma.user.update({ where: { id: fixture.normalRequester.id }, data: { mustChangePassword: true } });
    expect((await actor.get("/api/dashboard/requester").expect(403)).body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
    await fixture.prisma.user.update({ where: { id: fixture.normalRequester.id }, data: { mustChangePassword: false, active: false } });
    await actor.get("/api/dashboard/requester").expect(401);
    await fixture.prisma.user.update({ where: { id: fixture.normalRequester.id }, data: { active: true } });
    await actor.get("/api/dashboard/requester").expect(401);
  });

  it("keeps counts and previews on one snapshot while a concurrent writer changes a Ticket", async () => {
    const ticket = await createActionTicket(fixture, { requesterId: fixture.requesterWorker.id, status: "OPEN" });
    const actor = await agentFor(fixture, fixture.requesterWorker.email);
    let changed = false;
    let enabled = true;
    getPrisma().$use(async (params, next) => {
      const result = await next(params);
      if (enabled && !changed && params.model === "Ticket" && params.action === "count"
        && params.args?.where?.requesterId === fixture.requesterWorker.id) {
        changed = true;
        await fixture.prisma.ticket.update({ where: { id: ticket.id }, data: { currentStatus: "WAITING_FOR_REQUESTER" } });
      }
      return result;
    });
    try {
      const response = await actor.get("/api/dashboard/requester").expect(200);
      expect(changed).toBe(true);
      expect(response.body.metrics).toEqual({ myActiveTickets: 1, waitingForMe: 0, recentlyResolved: 0 });
      expect(response.body.recentTickets[0].currentStatus).toBe("OPEN");
      expect(response.body.attentionTickets).toEqual([]);
      expect((await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).currentStatus).toBe("WAITING_FOR_REQUESTER");
    } finally { enabled = false; }
  });

  it("returns only the documented safe error when the database snapshot fails", async () => {
    const actor = await agentFor(fixture, fixture.normalRequester.email);
    const failure = vi.spyOn(getPrisma(), "$transaction").mockRejectedValueOnce(new Error("Prisma SQL passwordHash SECRET C:\\uploads"));
    try {
      const response = await actor.get("/api/dashboard/requester").expect(500);
      expect(response.body).toEqual({ error: { code: "INTERNAL_ERROR", message: "Unable to load dashboard" } });
      expect(response.headers["cache-control"]).toBe("private, no-store");
    } finally { failure.mockRestore(); }
  });
});
