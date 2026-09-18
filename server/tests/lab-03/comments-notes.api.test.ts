import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AuthFixture } from "./support/auth-fixture.js";
import { createAuthFixture, csrf, destroyAuthFixture, login } from "./support/auth-fixture.js";

let fixture: AuthFixture;
let categoryId = 0;
let systemId = 0;
const ticketIds: number[] = [];
const tag = `issue49-${process.pid}-${Date.now()}`;

async function createTicket(requesterId = fixture.normalRequester.id, status: "NEW" | "OPEN" | "IN_PROGRESS" | "WAITING_FOR_REQUESTER" | "RESOLVED" | "CLOSED" | "REOPENED" | "CANCELLED" = "OPEN") {
  const created = await fixture.prisma.ticket.create({
    data: {
      ticketNumber: `TKT-209913${String(ticketIds.length + 1).padStart(2, "0")}-${String(requesterId).padStart(6, "0")}`,
      clientRequestId: randomUUID(), requesterId, categoryId, relatedSystemId: systemId,
      summary: `${tag} communication ${ticketIds.length + 1}`,
      description: `${tag} communication description`, requestedPriority: "MEDIUM", itPriority: "MEDIUM", currentStatus: status,
    },
  });
  ticketIds.push(created.id);
  return created;
}

async function agentFor(email: string) {
  const agent = request.agent(fixture.app);
  expect((await login(agent, fixture, email)).status).toBe(200);
  return agent;
}

async function post(agent: ReturnType<typeof request.agent>, path: string, body: Record<string, unknown>) {
  const token = await csrf(agent, fixture);
  return agent.post(path).set("Origin", fixture.origin).set("X-CSRF-Token", token).send(body);
}

beforeAll(async () => {
  fixture = await createAuthFixture();
  await fixture.prisma.user.update({ where: { id: fixture.requester.id }, data: { mustChangePassword: false } });
  const [category, system] = await Promise.all([
    fixture.prisma.category.create({ data: { name: `${tag} category`, active: true } }),
    fixture.prisma.relatedSystem.create({ data: { name: `${tag} system`, active: true } }),
  ]);
  categoryId = category.id;
  systemId = system.id;
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

describe("COM-01 / COM-02 Public Comments and Internal Notes", () => {
  it("shares append-only Public Comments with authentic backend author/time in deterministic order", async () => {
    const ticket = await createTicket();
    const requester = await agentFor(fixture.normalRequester.email);
    const staff = await agentFor(fixture.staff.email);

    const first = await post(requester, `/api/tickets/${ticket.id}/comments`, { body: "  Requester update  " });
    expect(first.status).toBe(201);
    expect(first.body.comment).toMatchObject({ ticketId: ticket.id, body: "Requester update", author: { id: fixture.normalRequester.id, role: "REQUESTER" } });
    expect(first.body.comment.createdAt).toEqual(expect.any(String));

    const second = await post(staff, `/api/tickets/${ticket.id}/comments`, { body: "Staff reply" });
    expect(second.status).toBe(201);
    const listed = await requester.get(`/api/tickets/${ticket.id}/comments`);
    expect(listed.status).toBe(200);
    expect(listed.body.items.map((item: { body: string }) => item.body)).toEqual(["Requester update", "Staff reply"]);
    expect(JSON.stringify(listed.body)).not.toMatch(/passwordHash|authVersion|sess/i);
  });

  it("rejects forged comment metadata, blank/too-long text, missing CSRF, and foreign Requester scope", async () => {
    const ticket = await createTicket();
    const owner = await agentFor(fixture.normalRequester.email);
    const foreign = await agentFor(fixture.requester.email);

    expect((await post(owner, `/api/tickets/${ticket.id}/comments`, { body: "hello", authorId: fixture.staff.id })).status).toBe(400);
    expect((await post(owner, `/api/tickets/${ticket.id}/comments`, { body: "   " })).status).toBe(400);
    expect((await post(owner, `/api/tickets/${ticket.id}/comments`, { body: "x".repeat(2001) })).status).toBe(400);
    expect((await owner.post(`/api/tickets/${ticket.id}/comments`).send({ body: "no csrf" })).status).toBe(403);
    expect((await foreign.get(`/api/tickets/${ticket.id}/comments`)).status).toBe(404);
    expect((await post(foreign, `/api/tickets/${ticket.id}/comments`, { body: "foreign" })).status).toBe(404);
    expect(await fixture.prisma.publicComment.count({ where: { ticketId: ticket.id } })).toBe(0);
  });

  it("allows Staff/Admin Internal Notes while Requester learns no private-note metadata", async () => {
    const ticket = await createTicket();
    const requester = await agentFor(fixture.normalRequester.email);
    const staff = await agentFor(fixture.staff.email);
    const admin = await agentFor(fixture.administrator.email);

    const note = await post(staff, `/api/staff/tickets/${ticket.id}/internal-notes`, { body: "  Staff-only diagnostic  " });
    expect(note.status).toBe(201);
    expect(note.body.note).toMatchObject({ ticketId: ticket.id, body: "Staff-only diagnostic", author: { id: fixture.staff.id, role: "IT_STAFF" } });

    const adminList = await admin.get(`/api/staff/tickets/${ticket.id}/internal-notes`);
    expect(adminList.status).toBe(200);
    expect(adminList.body.items).toHaveLength(1);

    const requesterGet = await requester.get(`/api/staff/tickets/${ticket.id}/internal-notes`);
    expect(requesterGet.status).toBe(403);
    expect(JSON.stringify(requesterGet.body)).not.toMatch(/Staff-only diagnostic|internalNote|noteId/i);
    const requesterPost = await post(requester, `/api/staff/tickets/${ticket.id}/internal-notes`, { body: "probe" });
    expect(requesterPost.status).toBe(403);
    expect(JSON.stringify(requesterPost.body)).not.toMatch(/Staff-only diagnostic|internalNote|noteId/i);

    const requesterDetail = await requester.get(`/api/tickets/${ticket.id}`);
    expect(requesterDetail.status).toBe(200);
    expect(JSON.stringify(requesterDetail.body)).not.toMatch(/Staff-only diagnostic|internalNote/i);
  });
});

describe("COM-03 Requester resolution indication", () => {
  it("sets only the indication timestamp, is repeat-idempotent, and preserves formal status/resolution", async () => {
    const ticket = await createTicket(fixture.normalRequester.id, "IN_PROGRESS");
    const requester = await agentFor(fixture.normalRequester.email);
    const first = await post(requester, `/api/tickets/${ticket.id}/resolution-indication`, { expectedVersion: ticket.version, confirmed: true });
    expect(first.status).toBe(200);
    expect(first.body.ticket).toMatchObject({ id: ticket.id, requesterResolutionIndicatedAt: expect.any(String), version: ticket.version + 1 });
    const afterFirst = await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(afterFirst.currentStatus).toBe("IN_PROGRESS");
    expect(afterFirst.resolutionSummary).toBeNull();

    const repeat = await post(requester, `/api/tickets/${ticket.id}/resolution-indication`, { expectedVersion: ticket.version, confirmed: true });
    expect(repeat.status).toBe(200);
    expect(repeat.body.ticket.version).toBe(ticket.version + 1);
    expect(repeat.body.ticket.requesterResolutionIndicatedAt).toBe(first.body.ticket.requesterResolutionIndicatedAt);
  });

  it("clears the current-cycle indication when Staff formally resolves, closes, and reopens the Ticket", async () => {
    const ticket = await createTicket(fixture.normalRequester.id, "IN_PROGRESS");
    await fixture.prisma.ticket.update({ where: { id: ticket.id }, data: { ownerId: fixture.staff.id } });
    const requester = await agentFor(fixture.normalRequester.email);
    const indicated = await post(requester, `/api/tickets/${ticket.id}/resolution-indication`, { expectedVersion: ticket.version, confirmed: true });
    expect(indicated.status).toBe(200);

    const staff = await agentFor(fixture.staff.email);
    const resolved = await post(staff, `/api/staff/tickets/${ticket.id}/status`, { status: "RESOLVED", expectedVersion: ticket.version + 1, confirmed: true, resolutionSummary: "Requester confirmed the service is restored." });
    expect(resolved.status).toBe(200);
    const closed = await post(staff, `/api/staff/tickets/${ticket.id}/status`, { status: "CLOSED", expectedVersion: ticket.version + 2, confirmed: true });
    expect(closed.status).toBe(200);
    const reopened = await post(staff, `/api/staff/tickets/${ticket.id}/status`, { status: "REOPENED", expectedVersion: ticket.version + 3, confirmed: true });
    expect(reopened.status).toBe(200);
    expect(reopened.body.ticket.requesterResolutionIndicatedAt).toBeNull();
    expect((await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).requesterResolutionIndicatedAt).toBeNull();
  });

  it("rejects foreign, stale, unconfirmed, and formally resolved indication attempts without mutation", async () => {
    const ticket = await createTicket(fixture.normalRequester.id, "RESOLVED");
    const owner = await agentFor(fixture.normalRequester.email);
    const foreign = await agentFor(fixture.requester.email);
    expect((await post(foreign, `/api/tickets/${ticket.id}/resolution-indication`, { expectedVersion: ticket.version, confirmed: true })).status).toBe(404);
    expect((await post(owner, `/api/tickets/${ticket.id}/resolution-indication`, { expectedVersion: ticket.version, confirmed: false })).status).toBe(400);
    expect((await post(owner, `/api/tickets/${ticket.id}/resolution-indication`, { expectedVersion: ticket.version, confirmed: true })).status).toBe(409);
    expect((await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).requesterResolutionIndicatedAt).toBeNull();
  });
});
