import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AuthFixture } from "./support/auth-fixture.js";
import { createAuthFixture, destroyAuthFixture, login } from "./support/auth-fixture.js";

let fixture: AuthFixture;
let categoryA = 0;
let categoryB = 0;
let systemId = 0;
let ticketIds: number[] = [];
const tag = `issue47-${process.pid}-${Date.now()}`;

async function createTicket(input: {
  requesterId: number; summary: string; ticketNumber: string; categoryId: number;
  requestedPriority: "LOW" | "MEDIUM" | "HIGH"; itPriority: "LOW" | "MEDIUM" | "HIGH";
  currentStatus: "NEW" | "OPEN" | "IN_PROGRESS" | "WAITING_FOR_REQUESTER" | "RESOLVED" | "CLOSED" | "REOPENED" | "CANCELLED";
  ownerId?: number | null; updatedAt: Date; createdAt: Date;
}) {
  const ticket = await fixture.prisma.ticket.create({
    data: {
      ...input,
      clientRequestId: randomUUID(),
      relatedSystemId: systemId,
      description: `${tag} staff queue fixture description`,
    },
  });
  ticketIds.push(ticket.id);
  return ticket;
}

beforeAll(async () => {
  fixture = await createAuthFixture();
  const [a, b, system] = await Promise.all([
    fixture.prisma.category.create({ data: { name: `${tag} Hardware`, active: true } }),
    fixture.prisma.category.create({ data: { name: `${tag} Network`, active: true } }),
    fixture.prisma.relatedSystem.create({ data: { name: `${tag} Campus Wi-Fi`, active: true } }),
  ]);
  categoryA = a.id; categoryB = b.id; systemId = system.id;

  await createTicket({ requesterId: fixture.normalRequester.id, summary: `${tag} shared alpha`, ticketNumber: `TKT-20990101-${String(fixture.normalRequester.id).padStart(6, "0")}`, categoryId: categoryA, requestedPriority: "HIGH", itPriority: "MEDIUM", currentStatus: "OPEN", ownerId: fixture.staff.id, createdAt: new Date("2026-09-01T01:00:00Z"), updatedAt: new Date("2026-09-10T01:00:00Z") });
  await createTicket({ requesterId: fixture.requester.id, summary: `${tag} shared beta`, ticketNumber: `TKT-20990102-${String(fixture.requester.id).padStart(6, "0")}`, categoryId: categoryB, requestedPriority: "LOW", itPriority: "HIGH", currentStatus: "IN_PROGRESS", ownerId: null, createdAt: new Date("2026-09-02T01:00:00Z"), updatedAt: new Date("2026-09-11T01:00:00Z") });
  await createTicket({ requesterId: fixture.normalRequester.id, summary: `${tag} shared gamma`, ticketNumber: `TKT-20990103-${String(fixture.normalRequester.id).padStart(6, "0")}`, categoryId: categoryA, requestedPriority: "MEDIUM", itPriority: "LOW", currentStatus: "WAITING_FOR_REQUESTER", ownerId: fixture.administrator.id, createdAt: new Date("2026-09-03T01:00:00Z"), updatedAt: new Date("2026-09-09T01:00:00Z") });
});

afterAll(async () => {
  if (!fixture) return;
  await fixture.prisma.internalNote.deleteMany({ where: { ticketId: { in: ticketIds } } });
  await fixture.prisma.publicComment.deleteMany({ where: { ticketId: { in: ticketIds } } });
  await fixture.prisma.attachment.deleteMany({ where: { ticketId: { in: ticketIds } } });
  await fixture.prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
  await fixture.prisma.category.deleteMany({ where: { id: { in: [categoryA, categoryB].filter(Boolean) } } });
  await fixture.prisma.relatedSystem.deleteMany({ where: { id: systemId || -1 } });
  await destroyAuthFixture(fixture);
});

describe("QUEUE-02 shared Staff Ticket Queue API", () => {
  it("returns a shared deterministic queue to IT Staff without private fields", async () => {
    const agent = request.agent(fixture.app);
    expect((await login(agent, fixture, fixture.staff.email)).status).toBe(200);
    const response = await agent.get(`/api/staff/tickets?search=${encodeURIComponent(tag)}&page=1&pageSize=10`).expect(200);
    expect(response.body).toMatchObject({ page: 1, pageSize: 10, totalItems: 3, totalPages: 1 });
    expect(response.body.items.map((item: { summary: string }) => item.summary)).toEqual([
      `${tag} shared beta`, `${tag} shared alpha`, `${tag} shared gamma`,
    ]);
    expect(response.body.items[0]).toEqual(expect.objectContaining({
      requester: expect.objectContaining({ id: expect.any(Number), name: expect.any(String), email: expect.any(String) }),
      category: expect.objectContaining({ id: expect.any(Number), name: expect.any(String) }),
      requestedPriority: "LOW", itPriority: "HIGH", currentStatus: "IN_PROGRESS", owner: null,
      version: expect.any(Number), createdAt: expect.any(String), updatedAt: expect.any(String),
    }));
    expect(JSON.stringify(response.body)).not.toMatch(/passwordHash|authVersion|mustChangePassword|internalNote|sess/i);
  });

  it("supports combined filters, owner me/unassigned/specific, priority sort, totals and empty out-of-range pages", async () => {
    const agent = request.agent(fixture.app);
    expect((await login(agent, fixture, fixture.staff.email)).status).toBe(200);

    const mine = await agent.get(`/api/staff/tickets?search=${encodeURIComponent(tag)}&owner=me`).expect(200);
    expect(mine.body.items.map((item: { owner: { id: number } | null }) => item.owner?.id)).toEqual([fixture.staff.id]);

    const unassigned = await agent.get(`/api/staff/tickets?search=${encodeURIComponent(tag)}&owner=unassigned`).expect(200);
    expect(unassigned.body.items).toHaveLength(1);
    expect(unassigned.body.items[0].owner).toBeNull();

    const specific = await agent.get(`/api/staff/tickets?search=${encodeURIComponent(tag)}&owner=${fixture.administrator.id}`).expect(200);
    expect(specific.body.items).toHaveLength(1);
    expect(specific.body.items[0].owner.id).toBe(fixture.administrator.id);

    const combined = await agent.get(`/api/staff/tickets?search=${encodeURIComponent(tag)}&categoryId=${categoryA}&currentStatus=OPEN&requestedPriority=HIGH&itPriority=MEDIUM`).expect(200);
    expect(combined.body.items.map((item: { summary: string }) => item.summary)).toEqual([`${tag} shared alpha`]);

    const sorted = await agent.get(`/api/staff/tickets?search=${encodeURIComponent(tag)}&sortBy=itPriority&sortDirection=asc`).expect(200);
    expect(sorted.body.items.map((item: { itPriority: string }) => item.itPriority)).toEqual(["LOW", "MEDIUM", "HIGH"]);

    const beyond = await agent.get(`/api/staff/tickets?search=${encodeURIComponent(tag)}&page=9&pageSize=10`).expect(200);
    expect(beyond.body).toMatchObject({ items: [], page: 9, pageSize: 10, totalItems: 3, totalPages: 1 });
  });

  it("allows Administrator, denies Requester and mandatory-change sessions, and rejects invalid queries", async () => {
    const admin = request.agent(fixture.app);
    expect((await login(admin, fixture, fixture.administrator.email)).status).toBe(200);
    expect((await admin.get(`/api/staff/tickets?search=${encodeURIComponent(tag)}`)).status).toBe(200);

    const requesterAgent = request.agent(fixture.app);
    expect((await login(requesterAgent, fixture, fixture.normalRequester.email)).status).toBe(200);
    const denied = await requesterAgent.get("/api/staff/tickets");
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe("FORBIDDEN");
    const deniedDetail = await requesterAgent.get(`/api/staff/tickets/${ticketIds[0]}`);
    expect(deniedDetail.status).toBe(403);
    expect(deniedDetail.body.error.code).toBe("FORBIDDEN");

    const pending = request.agent(fixture.app);
    expect((await login(pending, fixture, fixture.requester.email)).status).toBe(200);
    const pendingResult = await pending.get("/api/staff/tickets");
    expect(pendingResult.status).toBe(403);
    expect(pendingResult.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");

    const invalid = await admin.get("/api/staff/tickets?page=0&sortBy=summary");
    expect(invalid.status).toBe(400);
    expect(invalid.body.error).toEqual(expect.objectContaining({ code: "VALIDATION_ERROR", fieldErrors: expect.objectContaining({ page: expect.any(String), sortBy: expect.any(String) }) }));
  });

  it("returns active eligible assignees for the owner filter", async () => {
    const agent = request.agent(fixture.app);
    expect((await login(agent, fixture, fixture.staff.email)).status).toBe(200);
    const response = await agent.get("/api/staff/assignees").expect(200);
    const ids = response.body.items.map((item: { id: number }) => item.id);
    expect(ids).toContain(fixture.staff.id);
    expect(ids).toContain(fixture.administrator.id);
    expect(ids).not.toContain(fixture.normalRequester.id);
    expect(response.body.items.every((item: Record<string, unknown>) => Object.keys(item).sort().join(",") === "id,name,role")).toBe(true);
  });

  it("returns read-only Staff Ticket Detail with attachments and no communication/private auth data", async () => {
    const target = ticketIds[0];
    await fixture.prisma.internalNote.create({ data: { ticketId: target, authorId: fixture.staff.id, body: `${tag} private note must not be projected` } });
    const agent = request.agent(fixture.app);
    expect((await login(agent, fixture, fixture.staff.email)).status).toBe(200);
    const response = await agent.get(`/api/staff/tickets/${target}`).expect(200);
    expect(response.body.ticket).toEqual(expect.objectContaining({
      id: target,
      relatedSystem: expect.objectContaining({ id: systemId }),
      description: expect.any(String),
      attachments: expect.any(Array),
      resolutionSummary: null,
      owner: expect.objectContaining({ id: fixture.staff.id }),
    }));
    expect(JSON.stringify(response.body)).not.toMatch(/private note must not be projected|internalNote|passwordHash|authVersion|sess/i);

    const missing = await agent.get("/api/staff/tickets/999999999");
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("RESOURCE_NOT_FOUND");
    const invalid = await agent.get("/api/staff/tickets/not-a-number");
    expect(invalid.status).toBe(400);
  });
});
