import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AuthFixture } from "./support/auth-fixture.js";
import { createAuthFixture, csrf, destroyAuthFixture, login } from "./support/auth-fixture.js";

let fixture: AuthFixture;
let categoryId = 0;
let systemId = 0;
const ticketIds: number[] = [];
const tag = `issue48-${process.pid}-${Date.now()}`;

async function ticket(overrides: Partial<{
  ownerId: number | null;
  currentStatus: "NEW" | "OPEN" | "IN_PROGRESS" | "WAITING_FOR_REQUESTER" | "RESOLVED" | "CLOSED" | "REOPENED" | "CANCELLED";
  requestedPriority: "LOW" | "MEDIUM" | "HIGH";
  itPriority: "LOW" | "MEDIUM" | "HIGH";
  resolutionSummary: string | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  requesterResolutionIndicatedAt: Date | null;
  cancelReason: string | null;
  cancelledAt: Date | null;
}> = {}) {
  const created = await fixture.prisma.ticket.create({
    data: {
      ticketNumber: `TKT-209912${String(ticketIds.length + 1).padStart(2, "0")}-${String(fixture.normalRequester.id).padStart(6, "0")}`,
      clientRequestId: randomUUID(), requesterId: fixture.normalRequester.id, categoryId, relatedSystemId: systemId,
      summary: `${tag} operational ticket ${ticketIds.length + 1}`, description: `${tag} description for operational workflow`,
      requestedPriority: "MEDIUM", itPriority: "MEDIUM", currentStatus: "NEW", ownerId: null,
      ...overrides,
    },
  });
  ticketIds.push(created.id);
  return created;
}

async function staffAgent() {
  const agent = request.agent(fixture.app);
  expect((await login(agent, fixture, fixture.staff.email)).status).toBe(200);
  return agent;
}

async function mutate(agent: ReturnType<typeof request.agent>, method: "post" | "patch", path: string, body: Record<string, unknown>) {
  const token = await csrf(agent, fixture);
  return agent[method](path).set("Origin", fixture.origin).set("X-CSRF-Token", token).send(body);
}

beforeAll(async () => {
  fixture = await createAuthFixture();
  const [category, system] = await Promise.all([
    fixture.prisma.category.create({ data: { name: `${tag} category`, active: true } }),
    fixture.prisma.relatedSystem.create({ data: { name: `${tag} system`, active: true } }),
  ]);
  categoryId = category.id; systemId = system.id;
});

afterAll(async () => {
  if (!fixture) return;
  await fixture.prisma.internalNote.deleteMany({ where: { ticketId: { in: ticketIds } } });
  await fixture.prisma.publicComment.deleteMany({ where: { ticketId: { in: ticketIds } } });
  await fixture.prisma.attachment.deleteMany({ where: { ticketId: { in: ticketIds } } });
  await fixture.prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
  await fixture.prisma.category.deleteMany({ where: { id: categoryId || -1 } });
  await fixture.prisma.relatedSystem.deleteMany({ where: { id: systemId || -1 } });
  await destroyAuthFixture(fixture);
});

describe("FLOW-02 Staff Ticket operations API", () => {
  it("claims an unassigned Ticket without changing status and rejects stale/already-assigned claims", async () => {
    const created = await ticket({ currentStatus: "NEW", ownerId: null });
    const agent = await staffAgent();
    const claimed = await mutate(agent, "post", `/api/staff/tickets/${created.id}/claim`, { expectedVersion: created.version });
    expect(claimed.status).toBe(200);
    expect(claimed.body.ticket).toMatchObject({ owner: { id: fixture.staff.id }, currentStatus: "NEW", version: created.version + 1 });

    const stale = await mutate(agent, "post", `/api/staff/tickets/${created.id}/claim`, { expectedVersion: created.version });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe("CONFLICT");
  });

  it("reassigns only to an active eligible account, requires confirmation, and unassigns only in allowed states", async () => {
    const created = await ticket({ currentStatus: "OPEN", ownerId: fixture.staff.id });
    const agent = await staffAgent();
    const missingConfirm = await mutate(agent, "patch", `/api/staff/tickets/${created.id}/owner`, { ownerId: fixture.administrator.id, expectedVersion: created.version, confirmed: false });
    expect(missingConfirm.status).toBe(400);

    const reassigned = await mutate(agent, "patch", `/api/staff/tickets/${created.id}/owner`, { ownerId: fixture.administrator.id, expectedVersion: created.version, confirmed: true });
    expect(reassigned.status).toBe(200);
    expect(reassigned.body.ticket.owner.id).toBe(fixture.administrator.id);

    const badOwner = await mutate(agent, "patch", `/api/staff/tickets/${created.id}/owner`, { ownerId: fixture.normalRequester.id, expectedVersion: created.version + 1, confirmed: true });
    expect(badOwner.status).toBe(409);
    expect(badOwner.body.error.code).toBe("CONFLICT");

    const forbiddenUnassign = await mutate(agent, "patch", `/api/staff/tickets/${created.id}/owner`, { ownerId: null, expectedVersion: created.version + 1, confirmed: true });
    expect(forbiddenUnassign.status).toBe(409);

    const closed = await ticket({ currentStatus: "CLOSED", ownerId: fixture.staff.id });
    const unassigned = await mutate(agent, "patch", `/api/staff/tickets/${closed.id}/owner`, { ownerId: null, expectedVersion: closed.version, confirmed: true });
    expect(unassigned.status).toBe(200);
    expect(unassigned.body.ticket.owner).toBeNull();
  });

  it("updates IT Priority without changing Requested Priority and rejects Closed/stale edits", async () => {
    const created = await ticket({ currentStatus: "OPEN", ownerId: fixture.staff.id, requestedPriority: "LOW", itPriority: "LOW" });
    const agent = await staffAgent();
    const changed = await mutate(agent, "patch", `/api/staff/tickets/${created.id}/priority`, { itPriority: "HIGH", expectedVersion: created.version });
    expect(changed.status).toBe(200);
    expect(changed.body.ticket).toMatchObject({ requestedPriority: "LOW", itPriority: "HIGH", version: created.version + 1 });

    const stale = await mutate(agent, "patch", `/api/staff/tickets/${created.id}/priority`, { itPriority: "MEDIUM", expectedVersion: created.version });
    expect(stale.status).toBe(409);
    const closed = await ticket({ currentStatus: "CLOSED", ownerId: fixture.staff.id });
    expect((await mutate(agent, "patch", `/api/staff/tickets/${closed.id}/priority`, { itPriority: "HIGH", expectedVersion: closed.version })).status).toBe(409);
  });

  it("enforces status matrix, owner, confirmation and resolution/cancel validation atomically", async () => {
    const created = await ticket({ currentStatus: "IN_PROGRESS", ownerId: fixture.staff.id });
    const agent = await staffAgent();
    const noConfirm = await mutate(agent, "post", `/api/staff/tickets/${created.id}/status`, { status: "RESOLVED", expectedVersion: created.version, resolutionSummary: "A valid resolution summary" });
    expect(noConfirm.status).toBe(400);
    expect((await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: created.id } })).currentStatus).toBe("IN_PROGRESS");

    const resolved = await mutate(agent, "post", `/api/staff/tickets/${created.id}/status`, { status: "RESOLVED", expectedVersion: created.version, confirmed: true, resolutionSummary: "  A valid resolution summary  " });
    expect(resolved.status).toBe(200);
    expect(resolved.body.ticket.currentStatus).toBe("RESOLVED");
    expect(resolved.body.ticket.resolutionSummary).toBe("A valid resolution summary");
    expect(resolved.body.ticket.resolvedAt).toEqual(expect.any(String));

    const closed = await mutate(agent, "post", `/api/staff/tickets/${created.id}/status`, { status: "CLOSED", expectedVersion: created.version + 1, confirmed: true });
    expect(closed.status).toBe(200);
    expect(closed.body.ticket.closedAt).toEqual(expect.any(String));

    const reopened = await mutate(agent, "post", `/api/staff/tickets/${created.id}/status`, { status: "REOPENED", expectedVersion: created.version + 2, confirmed: true });
    expect(reopened.status).toBe(200);
    expect(reopened.body.ticket).toMatchObject({ currentStatus: "REOPENED", resolutionSummary: null, resolvedAt: null, closedAt: null, requesterResolutionIndicatedAt: null });

    const invalidEdge = await mutate(agent, "post", `/api/staff/tickets/${created.id}/status`, { status: "CLOSED", expectedVersion: created.version + 3, confirmed: true });
    expect(invalidEdge.status).toBe(409);
  });

  it("allows cancellation without an owner but preserves formal cancellation fields", async () => {
    const created = await ticket({ currentStatus: "OPEN", ownerId: null });
    const agent = await staffAgent();
    const cancelled = await mutate(agent, "post", `/api/staff/tickets/${created.id}/status`, { status: "CANCELLED", expectedVersion: created.version, confirmed: true, cancelReason: "  Duplicate request  " });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.ticket).toMatchObject({ currentStatus: "CANCELLED", cancelReason: "Duplicate request", cancelledAt: expect.any(String) });
  });

  it("denies Requester direct mutations and rejects missing CSRF without changing the Ticket", async () => {
    const created = await ticket({ currentStatus: "NEW", ownerId: null });
    const requesterAgent = request.agent(fixture.app);
    expect((await login(requesterAgent, fixture, fixture.normalRequester.email)).status).toBe(200);
    const token = await csrf(requesterAgent, fixture);
    const denied = await requesterAgent.post(`/api/staff/tickets/${created.id}/claim`).set("Origin", fixture.origin).set("X-CSRF-Token", token).send({ expectedVersion: created.version });
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe("FORBIDDEN");

    const staff = await staffAgent();
    const noCsrf = await staff.post(`/api/staff/tickets/${created.id}/claim`).send({ expectedVersion: created.version });
    expect(noCsrf.status).toBe(403);
    expect(noCsrf.body.error.code).toBe("CSRF_INVALID");
    expect((await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: created.id } })).ownerId).toBeNull();
  });
});

