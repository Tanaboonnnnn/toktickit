import express from "express";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { attachmentStorage } from "../../src/attachment-storage.js";
import { createAuthRouter } from "../../src/auth/auth-routes.js";
import { getPrisma } from "../../src/prisma.js";
import { createAuthFixture, destroyAuthFixture, login, type AuthFixture } from "./support/auth-fixture.js";

let fixture: AuthFixture;
let ticketId = 0;
let attachmentId = 0;
let categoryId = 0;
let systemId = 0;

function expectSafe500(response: request.Response, expectedMessage: string) {
  expect(response.status).toBe(500);
  expect(response.body).toEqual({ error: { code: "INTERNAL_ERROR", message: expectedMessage } });
  expect(JSON.stringify(response.body)).not.toMatch(/prisma|sql|postgres|database_url|filesystem|storedName|stack|error:|password|hash|session|secret|[A-Z]:\\/i);
}

beforeAll(async () => {
  fixture = await createAuthFixture();
  const category = await fixture.prisma.category.create({ data: { name: `SAFE-51 Category ${randomUUID()}`, active: true } });
  const system = await fixture.prisma.relatedSystem.create({ data: { name: `SAFE-51 System ${randomUUID()}`, active: true } });
  categoryId = category.id;
  systemId = system.id;
  const ticket = await fixture.prisma.ticket.create({ data: {
    ticketNumber: `TKT-20995102-${randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase()}`,
    clientRequestId: randomUUID(), requesterId: fixture.normalRequester.id, categoryId, relatedSystemId: systemId,
    summary: "Issue 51 safe error ticket", description: "Safe error integration fixture",
    requestedPriority: "LOW", itPriority: "LOW",
  }, select: { id: true } });
  ticketId = ticket.id;
  attachmentId = (await fixture.prisma.attachment.create({ data: {
    ticketId, originalName: "safe-error.pdf", storedName: `${randomUUID()}.pdf`, mimeType: "application/pdf", sizeBytes: 12,
  }, select: { id: true } })).id;
});

afterAll(async () => {
  if (!fixture) return;
  await fixture.prisma.attachment.deleteMany({ where: { ticketId } });
  await fixture.prisma.ticket.deleteMany({ where: { id: ticketId } });
  await fixture.prisma.category.deleteMany({ where: { id: categoryId } });
  await fixture.prisma.relatedSystem.deleteMany({ where: { id: systemId } });
  await destroyAuthFixture(fixture);
});

describe("SAFE-01 representative unexpected failures", () => {
  it("hides shared reference-data database internals", async () => {
    const agent = request.agent(fixture.app);
    expect((await login(agent, fixture, fixture.normalRequester.email)).status).toBe(200);
    const spy = vi.spyOn(getPrisma().category, "findMany").mockRejectedValueOnce(new Error("DATABASE_URL postgres Prisma stack secret"));
    const response = await agent.get("/api/categories");
    expectSafe500(response, "Unable to load categories");
    spy.mockRestore();
  });

  it("hides private storage details when Attachment bytes are unavailable", async () => {
    const agent = request.agent(fixture.app);
    expect((await login(agent, fixture, fixture.normalRequester.email)).status).toBe(200);
    const spy = vi.spyOn(attachmentStorage, "read").mockRejectedValueOnce(new Error("filesystem C:\\private\\uploads secret storedName"));
    const response = await agent.get(`/api/tickets/${ticketId}/attachments/${attachmentId}/download`);
    expectSafe500(response, "Attachment is temporarily unavailable");
    spy.mockRestore();
  });

  // Keep the User-delegate fault injection after the tests that need fresh
  // logins. Prisma delegates are proxy-backed and a restored spy is not a
  // useful prerequisite for another authentication assertion in this file.
  it("hides authentication/database internals", async () => {
    const agent = request.agent(fixture.app);
    expect((await login(agent, fixture, fixture.normalRequester.email)).status).toBe(200);
    const spy = vi.spyOn(getPrisma().user, "findUnique").mockRejectedValueOnce(new Error("Prisma SQL postgres password=secret C:\\private\\auth"));
    const response = await agent.get("/api/auth/me");
    expectSafe500(response, "Unable to process authentication request");
    spy.mockRestore();
  });

  it("returns a safe 500 when a live session cannot be destroyed", async () => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      Object.defineProperty(req, "session", { configurable: true, value: {
        userId: fixture.normalRequester.id,
        csrfToken: "safe-session-csrf",
        destroy: (callback: (error?: Error) => void) => callback(new Error("session-store SQL password=secret")),
      } });
      next();
    });
    app.use("/api/auth", createAuthRouter({ infrastructureMounted: true }));
    const response = await request(app).post("/api/auth/logout")
      .set("Origin", fixture.origin)
      .set("X-CSRF-Token", "safe-session-csrf");
    expectSafe500(response, "Unable to process authentication request");
  });
});
