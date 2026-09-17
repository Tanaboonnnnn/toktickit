import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AuthFixture } from "./support/auth-fixture.js";
import {
  createAuthFixture,
  csrf,
  destroyAuthFixture,
  login,
} from "./support/auth-fixture.js";

let fixture: AuthFixture;
let categoryId = 0;
let inactiveCategoryId = 0;
let relatedSystemId = 0;
let inactiveRelatedSystemId = 0;
let ownTicketId = 0;
let foreignTicketId = 0;
const tag = `issue45-requester-${process.pid}-${Date.now()}`;

beforeAll(async () => {
  fixture = await createAuthFixture();

  const [category, inactiveCategory, relatedSystem, inactiveRelatedSystem] = await Promise.all([
    fixture.prisma.category.create({ data: { name: `${tag} Category`, active: true } }),
    fixture.prisma.category.create({ data: { name: `${tag} Inactive Category`, active: false } }),
    fixture.prisma.relatedSystem.create({ data: { name: `${tag} System`, active: true } }),
    fixture.prisma.relatedSystem.create({ data: { name: `${tag} Inactive System`, active: false } }),
  ]);
  categoryId = category.id;
  inactiveCategoryId = inactiveCategory.id;
  relatedSystemId = relatedSystem.id;
  inactiveRelatedSystemId = inactiveRelatedSystem.id;

  const [ownTicket, foreignTicket] = await Promise.all([
    fixture.prisma.ticket.create({
      data: {
        ticketNumber: `TKT-20991231-${String(fixture.normalRequester.id).padStart(6, "0")}`,
        clientRequestId: randomUUID(),
        requesterId: fixture.normalRequester.id,
        categoryId,
        relatedSystemId,
        summary: `${tag} own ticket`,
        description: "Authenticated Requester ownership fixture.",
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        currentStatus: "OPEN",
      },
    }),
    fixture.prisma.ticket.create({
      data: {
        ticketNumber: `TKT-20991230-${String(fixture.requester.id).padStart(6, "0")}`,
        clientRequestId: randomUUID(),
        requesterId: fixture.requester.id,
        categoryId,
        relatedSystemId,
        summary: `${tag} foreign ticket`,
        description: "Foreign Requester ownership fixture.",
        requestedPriority: "LOW",
        itPriority: "LOW",
        currentStatus: "NEW",
      },
    }),
  ]);
  ownTicketId = ownTicket.id;
  foreignTicketId = foreignTicket.id;
});

afterAll(async () => {
  await fixture?.prisma.ticket.deleteMany({
    where: {
      OR: [
        { id: { in: [ownTicketId, foreignTicketId].filter(Boolean) } },
        { categoryId: { in: [categoryId, inactiveCategoryId].filter(Boolean) } },
        { relatedSystemId: { in: [relatedSystemId, inactiveRelatedSystemId].filter(Boolean) } },
      ],
    },
  });
  if (categoryId || inactiveCategoryId) {
    await fixture?.prisma.category.deleteMany({ where: { id: { in: [categoryId, inactiveCategoryId].filter(Boolean) } } });
  }
  if (relatedSystemId || inactiveRelatedSystemId) {
    await fixture?.prisma.relatedSystem.deleteMany({ where: { id: { in: [relatedSystemId, inactiveRelatedSystemId].filter(Boolean) } } });
  }
  if (fixture) await destroyAuthFixture(fixture);
});

describe("REQ-01 / REQ-02 post-#45 authenticated Requester activation", () => {
  it("protects retained reference data behind completed authentication", async () => {
    const unauthenticated = await request(fixture.app).get("/api/categories");
    expect(unauthenticated.status).toBe(401);
    expect(unauthenticated.body.error.code).toBe("AUTHENTICATION_REQUIRED");

    const pendingAgent = request.agent(fixture.app);
    expect((await login(pendingAgent, fixture, fixture.requester.email)).status).toBe(200);
    const pending = await pendingAgent.get("/api/related-systems");
    expect(pending.status).toBe(403);
    expect(pending.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
  });

  it("returns only active deterministic reference rows to a completed authenticated user", async () => {
    const agent = request.agent(fixture.app);
    expect((await login(agent, fixture, fixture.normalRequester.email)).status).toBe(200);

    const categories = await agent.get("/api/categories").expect(200);
    const categoryIds = categories.body.map((item: { id: number }) => item.id);
    expect(categoryIds).toContain(categoryId);
    expect(categoryIds).not.toContain(inactiveCategoryId);
    expect(categoryIds).toEqual([...categoryIds].sort((a, b) => a - b));

    const systems = await agent.get("/api/related-systems").expect(200);
    const systemIds = systems.body.map((item: { id: number }) => item.id);
    expect(systemIds).toContain(relatedSystemId);
    expect(systemIds).not.toContain(inactiveRelatedSystemId);
    const systemNames = systems.body.map((item: { name: string }) => item.name);
    expect(systemNames).toEqual([...systemNames].sort((a, b) => a.localeCompare(b)));
  });

  it("rejects unknown reference-data query parameters", async () => {
    const agent = request.agent(fixture.app);
    expect((await login(agent, fixture, fixture.normalRequester.email)).status).toBe(200);
    const response = await agent.get("/api/categories?unexpected=1");
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("retires the Development Requester lookup with the safe authenticated 404", async () => {
    const agent = request.agent(fixture.app);
    expect((await login(agent, fixture, fixture.normalRequester.email)).status).toBe(200);
    const response = await agent.get("/api/development-requesters");
    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: "RESOURCE_NOT_FOUND", message: "Resource not found" },
    });
  });

  it("derives My Tickets ownership from the session and ignores a forged legacy header", async () => {
    const agent = request.agent(fixture.app);
    expect((await login(agent, fixture, fixture.normalRequester.email)).status).toBe(200);
    const response = await agent
      .get("/api/tickets?page=1&pageSize=50")
      .set("X-Development-Requester-Id", String(fixture.requester.id))
      .expect(200);

    const ids = response.body.items.map((item: { id: number }) => item.id);
    expect(ids).toContain(ownTicketId);
    expect(ids).not.toContain(foreignTicketId);
  });

  it("uses the authenticated Requester for create even when the retired legacy header is forged", async () => {
    const agent = request.agent(fixture.app);
    expect((await login(agent, fixture, fixture.normalRequester.email)).status).toBe(200);
    const token = await csrf(agent, fixture);
    const response = await agent
      .post("/api/tickets")
      .set("Origin", fixture.origin)
      .set("X-CSRF-Token", token)
      .set("X-Development-Requester-Id", String(fixture.requester.id))
      .send({
        clientRequestId: randomUUID(),
        categoryId,
        relatedSystemId,
        summary: `${tag} authenticated create`,
        requestedPriority: "HIGH",
        description: "The server must derive Requester ownership from the authenticated session.",
      })
      .expect(201);

    expect(response.body.ticket.requester.id).toBe(fixture.normalRequester.id);
    await fixture.prisma.ticket.delete({ where: { id: response.body.ticket.id } });
  });

  it("rejects privileged Ticket fields when a Requester overposts server-owned authority", async () => {
    const agent = request.agent(fixture.app);
    expect((await login(agent, fixture, fixture.normalRequester.email)).status).toBe(200);
    const token = await csrf(agent, fixture);
    const beforeCount = await fixture.prisma.ticket.count({ where: { requesterId: fixture.normalRequester.id } });
    const response = await agent
      .post("/api/tickets")
      .set("Origin", fixture.origin)
      .set("X-CSRF-Token", token)
      .send({
        clientRequestId: randomUUID(),
        categoryId,
        relatedSystemId,
        summary: `${tag} overpost guard`,
        requestedPriority: "MEDIUM",
        description: "Privileged Ticket fields in this payload must never become client authority.",
        requesterId: fixture.requester.id,
        ticketNumber: "TKT-20000101-CLIENT",
        ownerId: fixture.staff.id,
        role: "ADMINISTRATOR",
        currentStatus: "CLOSED",
        itPriority: "HIGH",
        authorId: fixture.staff.id,
        author: { id: fixture.staff.id },
        createdAt: "2000-01-01T00:00:00.000Z",
        updatedAt: "2000-01-01T00:00:00.000Z",
      })
      .expect(400);

    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.fieldErrors).toMatchObject({
      requesterId: expect.any(String),
      ticketNumber: expect.any(String),
      ownerId: expect.any(String),
      role: expect.any(String),
      currentStatus: expect.any(String),
      itPriority: expect.any(String),
      authorId: expect.any(String),
      author: expect.any(String),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
    expect(await fixture.prisma.ticket.count({ where: { requesterId: fixture.normalRequester.id } })).toBe(beforeCount);
  });

  it("uses the same non-disclosing 404 for a missing and another Requester's Ticket detail", async () => {
    const agent = request.agent(fixture.app);
    expect((await login(agent, fixture, fixture.normalRequester.email)).status).toBe(200);
    const foreign = await agent.get(`/api/tickets/${foreignTicketId}`);
    const missing = await agent.get("/api/tickets/2147483647");
    expect(foreign.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(foreign.body).toEqual(missing.body);
    expect(foreign.body.error.code).toBe("RESOURCE_NOT_FOUND");
  });

  it("requires CSRF for authenticated Requester mutations", async () => {
    const agent = request.agent(fixture.app);
    expect((await login(agent, fixture, fixture.normalRequester.email)).status).toBe(200);
    const response = await agent.post("/api/tickets").send({
      clientRequestId: randomUUID(),
      categoryId,
      relatedSystemId,
      summary: `${tag} no csrf`,
      requestedPriority: "LOW",
      description: "This mutation must be rejected before Ticket creation without CSRF.",
    });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("CSRF_INVALID");
  });

  it("denies wrong-role and mandatory-change sessions on Requester Ticket routes", async () => {
    const staffAgent = request.agent(fixture.app);
    expect((await login(staffAgent, fixture, fixture.staff.email)).status).toBe(200);
    const wrongRole = await staffAgent.get("/api/tickets");
    expect(wrongRole.status).toBe(403);
    expect(wrongRole.body.error.code).toBe("FORBIDDEN");

    const pendingAgent = request.agent(fixture.app);
    expect((await login(pendingAgent, fixture, fixture.requester.email)).status).toBe(200);
    const pending = await pendingAgent.get("/api/tickets");
    expect(pending.status).toBe(403);
    expect(pending.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
  });

  it("checks authentication before multipart validation on Requester uploads", async () => {
    const response = await request(fixture.app).post(`/api/tickets/${ownTicketId}/attachments`);
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });
});

describe("REQ-03 authenticated Ticket idempotency continuity", () => {
  function createPayload(clientRequestId: string) {
    return {
      clientRequestId,
      categoryId,
      relatedSystemId,
      summary: `${tag} idempotent ticket`,
      requestedPriority: "LOW" as const,
      description: "An exact authenticated replay must preserve later operational Ticket state.",
    };
  }

  it("returns the current logical Ticket on exact replay without resetting Staff operational state", async () => {
    const agent = request.agent(fixture.app);
    expect((await login(agent, fixture, fixture.normalRequester.email)).status).toBe(200);
    const token = await csrf(agent, fixture);
    const clientRequestId = randomUUID();
    const payload = createPayload(clientRequestId);
    const created = await agent.post("/api/tickets").set("Origin", fixture.origin).set("X-CSRF-Token", token).send(payload).expect(201);
    const operationalUpdatedAt = new Date("2026-09-17T00:00:00.000Z");
    await fixture.prisma.ticket.update({
      where: { id: created.body.ticket.id },
      data: {
        ownerId: fixture.staff.id,
        currentStatus: "IN_PROGRESS",
        itPriority: "HIGH",
        version: 7,
        updatedAt: operationalUpdatedAt,
      },
    });

    const replay = await agent.post("/api/tickets").set("Origin", fixture.origin).set("X-CSRF-Token", token).send(payload).expect(200);
    expect(replay.body.replayed).toBe(true);
    expect(replay.body.ticket.id).toBe(created.body.ticket.id);
    expect(replay.body.ticket.currentStatus).toBe("IN_PROGRESS");
    const stored = await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: created.body.ticket.id } });
    expect(stored.ownerId).toBe(fixture.staff.id);
    expect(stored.currentStatus).toBe("IN_PROGRESS");
    expect(stored.itPriority).toBe("HIGH");
    expect(stored.version).toBe(7);
    expect(stored.updatedAt.toISOString()).toBe(operationalUpdatedAt.toISOString());
  });

  it("rejects a conflicting payload or authenticated Requester for the same clientRequestId", async () => {
    const ownerAgent = request.agent(fixture.app);
    expect((await login(ownerAgent, fixture, fixture.normalRequester.email)).status).toBe(200);
    const ownerToken = await csrf(ownerAgent, fixture);
    const clientRequestId = randomUUID();
    const payload = createPayload(clientRequestId);
    await ownerAgent.post("/api/tickets").set("Origin", fixture.origin).set("X-CSRF-Token", ownerToken).send(payload).expect(201);

    const changed = await ownerAgent
      .post("/api/tickets")
      .set("Origin", fixture.origin)
      .set("X-CSRF-Token", ownerToken)
      .send({ ...payload, summary: `${payload.summary} changed` });
    expect(changed.status).toBe(409);
    expect(changed.body.error.code).toBe("DUPLICATE_REQUEST_CONFLICT");

    const otherAgent = request.agent(fixture.app);
    expect((await login(otherAgent, fixture, fixture.requester.email)).status).toBe(200);
    // fixture.requester is intentionally still on an initial password and cannot exercise normal mutations.
    expect((await otherAgent.post("/api/tickets").send(payload)).status).toBe(403);
    expect(await fixture.prisma.ticket.count({ where: { clientRequestId } })).toBe(1);
  });

  it("serializes concurrent identical creates into one logical Ticket", async () => {
    const agent = request.agent(fixture.app);
    expect((await login(agent, fixture, fixture.normalRequester.email)).status).toBe(200);
    const token = await csrf(agent, fixture);
    const clientRequestId = randomUUID();
    const payload = createPayload(clientRequestId);
    const send = () => agent.post("/api/tickets").set("Origin", fixture.origin).set("X-CSRF-Token", token).send(payload);
    const [a, b] = await Promise.all([send(), send()]);
    expect([a.status, b.status].sort()).toEqual([200, 201]);
    expect(a.body.ticket.id).toBe(b.body.ticket.id);
    expect(await fixture.prisma.ticket.count({ where: { clientRequestId } })).toBe(1);
  });
});
