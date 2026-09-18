import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAuthFixture, csrf, destroyAuthFixture, login, type AuthFixture } from "./support/auth-fixture.js";

let fixture: AuthFixture;
let categoryId = 0;
let systemId = 0;
let ticketId = 0;

beforeAll(async () => {
  fixture = await createAuthFixture();
  const category = await fixture.prisma.category.create({ data: { name: `SEC-51 Category ${randomUUID()}`, active: true } });
  const system = await fixture.prisma.relatedSystem.create({ data: { name: `SEC-51 System ${randomUUID()}`, active: true } });
  categoryId = category.id;
  systemId = system.id;
  const ticket = await fixture.prisma.ticket.create({
    data: {
      ticketNumber: `TKT-20995101-${randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase()}`,
      clientRequestId: randomUUID(),
      requesterId: fixture.normalRequester.id,
      categoryId,
      relatedSystemId: systemId,
      summary: "Issue 51 security matrix ticket",
      description: "A security-boundary fixture owned by the normal Requester.",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
    },
    select: { id: true },
  });
  ticketId = ticket.id;
});

afterAll(async () => {
  if (!fixture) return;
  await fixture.prisma.internalNote.deleteMany({ where: { ticketId } });
  await fixture.prisma.publicComment.deleteMany({ where: { ticketId } });
  await fixture.prisma.attachment.deleteMany({ where: { ticketId } });
  await fixture.prisma.ticket.deleteMany({ where: { id: ticketId } });
  await fixture.prisma.category.deleteMany({ where: { id: categoryId } });
  await fixture.prisma.relatedSystem.deleteMany({ where: { id: systemId } });
  await destroyAuthFixture(fixture);
});

describe("SEC-01 integrated backend security matrix", () => {
  it("denies representative Requester, Staff, Admin, and communication APIs without authentication", async () => {
    for (const path of ["/api/tickets", "/api/staff/tickets", "/api/admin/users", `/api/tickets/${ticketId}/comments`]) {
      const response = await request(fixture.app).get(path);
      expect(response.status, path).toBe(401);
      expect(response.body.error.code, path).toBe("AUTHENTICATION_REQUIRED");
    }
  });

  it("enforces role boundaries and never exposes Internal Notes to a Requester", async () => {
    const requester = request.agent(fixture.app);
    expect((await login(requester, fixture, fixture.normalRequester.email)).status).toBe(200);
    const staff = await requester.get("/api/staff/tickets");
    expect(staff.status).toBe(403);
    expect(staff.body.error.code).toBe("FORBIDDEN");
    const admin = await requester.get("/api/admin/users");
    expect(admin.status).toBe(403);
    expect(admin.body.error.code).toBe("FORBIDDEN");
    const notes = await requester.get(`/api/staff/tickets/${ticketId}/internal-notes`);
    expect(notes.status).toBe(403);
    expect(notes.body.error.code).toBe("FORBIDDEN");
    expect(JSON.stringify(notes.body)).not.toMatch(/internal|note|author|ticketId/i);

    const staffAgent = request.agent(fixture.app);
    expect((await login(staffAgent, fixture, fixture.staff.email)).status).toBe(200);
    const staffAdmin = await staffAgent.get("/api/admin/users");
    expect(staffAdmin.status).toBe(403);
    expect(staffAdmin.body.error.code).toBe("FORBIDDEN");
  });

  it("blocks normal capabilities while first-password change is pending", async () => {
    const agent = request.agent(fixture.app);
    expect((await login(agent, fixture, fixture.requester.email)).status).toBe(200);
    const blocked = await agent.get("/api/tickets");
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
  });

  it("ignores legacy identity spoofing and rejects the retired selector route", async () => {
    const agent = request.agent(fixture.app);
    expect((await login(agent, fixture, fixture.normalRequester.email)).status).toBe(200);
    const retired = await agent.get("/api/development-requesters").set("X-Development-Requester-Id", String(fixture.requester.id));
    expect(retired.status).toBe(404);
    expect(retired.body.error.code).toBe("RESOURCE_NOT_FOUND");

    const token = await csrf(agent, fixture);
    const created = await agent.post("/api/tickets")
      .set("Origin", fixture.origin)
      .set("X-CSRF-Token", token)
      .set("X-Development-Requester-Id", String(fixture.requester.id))
      .send({
        clientRequestId: randomUUID(), categoryId, relatedSystemId: systemId,
        summary: "Spoof-resistant Requester identity", requestedPriority: "LOW",
        description: "The server must derive Requester ownership from the authenticated session.",
      });
    expect(created.status).toBe(201);
    expect(created.body.ticket.requester.id).toBe(fixture.normalRequester.id);
    expect(created.body.ticket.requester.id).not.toBe(fixture.requester.id);
    await fixture.prisma.ticket.delete({ where: { id: created.body.ticket.id } });
  });

  it("rejects missing CSRF on an Admin mutation without creating a User", async () => {
    const agent = request.agent(fixture.app);
    expect((await login(agent, fixture, fixture.administrator.email)).status).toBe(200);
    const email = `sec51-no-csrf-${randomUUID()}@example.test`;
    const before = await fixture.prisma.user.count({ where: { email } });
    const response = await agent.post("/api/admin/users")
      .set("Origin", fixture.origin)
      .send({
        name: "CSRF Rejected User", email, role: "REQUESTER", active: true,
        initialPassword: "Initial-Security-51!", confirmPassword: "Initial-Security-51!",
      });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("CSRF_INVALID");
    expect(await fixture.prisma.user.count({ where: { email } })).toBe(before);
  });

  it("revokes a live session after account deactivation and rejects replay", async () => {
    const agent = request.agent(fixture.app);
    expect((await login(agent, fixture, fixture.normalRequester.email)).status).toBe(200);
    await fixture.prisma.user.update({ where: { id: fixture.normalRequester.id }, data: { active: false } });
    try {
      const denied = await agent.get("/api/tickets");
      expect(denied.status).toBe(401);
      expect(denied.body.error.code).toBe("AUTHENTICATION_REQUIRED");
      const replay = await agent.get("/api/tickets");
      expect(replay.status).toBe(401);
    } finally {
      await fixture.prisma.user.update({ where: { id: fixture.normalRequester.id }, data: { active: true } });
    }
  });
});
