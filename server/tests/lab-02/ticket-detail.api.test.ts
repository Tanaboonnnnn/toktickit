import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Express } from "express";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

function readLocalEnv(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return undefined;
  const line = readFileSync(envPath, "utf8").split(/\r?\n/)
    .find((candidate) => candidate.trimStart().startsWith(`${name}=`));
  return line?.slice(line.indexOf("=") + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
}

function databaseName(connectionString: string): string {
  const url = new URL(connectionString);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("Database URLs must use PostgreSQL");
  const name = decodeURIComponent(url.pathname.replace(/^\/+/, "")).trim().toLowerCase();
  if (!name) throw new Error("Database URL must include a database name");
  return name;
}

const developmentDatabaseUrl = readLocalEnv("DATABASE_URL");
const testDatabaseUrl = readLocalEnv("TEST_DATABASE_URL");
const fixtureTag = `api10-${process.pid}-${Date.now()}`;
const requesterAEmail = `${fixtureTag}-a@example.test`;
const requesterBEmail = `${fixtureTag}-b@example.test`;
const categoryName = `${fixtureTag} category`;
const systemName = `${fixtureTag} system`;
let app: Express;
let prisma: PrismaClient;
let routePrisma: PrismaClient;
let requesterAId: number;
let requesterBId: number;
let categoryId: number;
let systemId: number;
let ownedTicketId: number;
let foreignTicketId: number;

beforeAll(async () => {
  if (!developmentDatabaseUrl || !testDatabaseUrl) throw new Error("DATABASE_URL and TEST_DATABASE_URL are required for Lab 2 API tests");
  if (databaseName(developmentDatabaseUrl) === databaseName(testDatabaseUrl)) throw new Error("TEST_DATABASE_URL must not resolve to the development database");
  process.env.DATABASE_URL = testDatabaseUrl;
  prisma = new PrismaClient({ datasources: { db: { url: testDatabaseUrl } } });
  await prisma.$connect();

  const requesterA = await prisma.requesterUser.create({ data: { name: `${fixtureTag} Requester A`, email: requesterAEmail, active: true } });
  const requesterB = await prisma.requesterUser.create({ data: { name: `${fixtureTag} Requester B`, email: requesterBEmail, active: true } });
  const category = await prisma.category.create({ data: { name: categoryName, active: true } });
  const system = await prisma.relatedSystem.create({ data: { name: systemName, active: true } });
  requesterAId = requesterA.id;
  requesterBId = requesterB.id;
  categoryId = category.id;
  systemId = system.id;

  const owned = await prisma.ticket.create({
    data: {
      ticketNumber: `TKT-20990101-${String(requesterAId).padStart(6, "0")}`,
      clientRequestId: `${fixtureTag}-owned`,
      requesterId: requesterAId,
      categoryId,
      relatedSystemId: systemId,
      summary: `${fixtureTag} owned ticket`,
      description: "A detailed description for the owned Ticket fixture.",
      requestedPriority: "HIGH",
      createdAt: new Date("2026-01-01T09:00:00.000Z"),
      updatedAt: new Date("2026-01-02T09:00:00.000Z"),
    },
  });
  const foreign = await prisma.ticket.create({
    data: {
      ticketNumber: `TKT-20990102-${String(requesterBId).padStart(6, "0")}`,
      clientRequestId: `${fixtureTag}-foreign`,
      requesterId: requesterBId,
      categoryId,
      relatedSystemId: systemId,
      summary: `${fixtureTag} foreign ticket`,
      description: "A foreign Ticket fixture must never be disclosed.",
      requestedPriority: "LOW",
    },
  });
  ownedTicketId = owned.id;
  foreignTicketId = foreign.id;

  await prisma.attachment.createMany({
    data: [
      {
        ticketId: ownedTicketId,
        originalName: "later.pdf",
        storedName: `${fixtureTag}-later.bin`,
        mimeType: "application/pdf",
        sizeBytes: 2048,
        createdAt: new Date("2026-01-03T09:00:00.000Z"),
      },
      {
        ticketId: ownedTicketId,
        originalName: "early.png",
        storedName: `${fixtureTag}-early.bin`,
        mimeType: "image/png",
        sizeBytes: 1024,
        createdAt: new Date("2026-01-02T09:00:00.000Z"),
      },
      {
        ticketId: ownedTicketId,
        originalName: "removed.jpg",
        storedName: `${fixtureTag}-removed.bin`,
        mimeType: "image/jpeg",
        sizeBytes: 512,
        createdAt: new Date("2026-01-02T09:00:00.000Z"),
        removedAt: new Date("2026-01-04T09:00:00.000Z"),
        removalReason: "Outdated supporting image",
      },
    ],
  });

  ({ app } = await import("../../src/app.js"));
  const { getPrisma } = await import("../../src/prisma.js");
  routePrisma = getPrisma();
});

afterAll(async () => {
  await prisma?.attachment.deleteMany({ where: { ticket: { clientRequestId: { startsWith: fixtureTag } } } });
  await prisma?.ticket.deleteMany({ where: { clientRequestId: { startsWith: fixtureTag } } });
  await prisma?.category.deleteMany({ where: { id: categoryId } });
  await prisma?.relatedSystem.deleteMany({ where: { id: systemId } });
  await prisma?.requesterUser.deleteMany({ where: { id: { in: [requesterAId, requesterBId] } } });
  await prisma?.$disconnect();
});

describe("API-10 Requester Ticket Detail", () => {
  it("returns the owned Ticket and active/removed Attachment metadata in deterministic order", async () => {
    const response = await request(app).get(`/api/tickets/${ownedTicketId}`)
      .set("X-Development-Requester-Id", String(requesterAId));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ticket: expect.objectContaining({
      id: ownedTicketId,
      ticketNumber: expect.stringMatching(/^TKT-/),
      requester: { id: requesterAId, name: `${fixtureTag} Requester A`, email: requesterAEmail },
      category: { id: categoryId, name: categoryName },
      relatedSystem: { id: systemId, name: systemName },
      summary: `${fixtureTag} owned ticket`,
      requestedPriority: "HIGH",
      currentStatus: "NEW",
      createdAt: "2026-01-01T09:00:00.000Z",
      updatedAt: "2026-01-02T09:00:00.000Z",
      description: "A detailed description for the owned Ticket fixture.",
      attachments: [
        expect.objectContaining({ originalName: "early.png", state: "ACTIVE", mimeType: "image/png", sizeBytes: 1024, removedAt: null, removalReason: null, downloadUrl: expect.stringContaining("/download") }),
        expect.objectContaining({ originalName: "removed.jpg", state: "REMOVED", mimeType: "image/jpeg", sizeBytes: 512, removedAt: "2026-01-04T09:00:00.000Z", removalReason: "Outdated supporting image", downloadUrl: null }),
        expect.objectContaining({ originalName: "later.pdf", state: "ACTIVE", mimeType: "application/pdf", sizeBytes: 2048 }),
      ],
    }) });
    expect(Object.keys(response.body)).toEqual(["ticket"]);
    expect(Object.keys(response.body.ticket).sort()).toEqual([
      "attachments", "category", "createdAt", "currentStatus", "description", "id",
      "relatedSystem", "requestedPriority", "requester", "summary", "ticketNumber", "updatedAt",
    ]);
    for (const attachment of response.body.ticket.attachments) {
      expect(Object.keys(attachment).sort()).toEqual([
        "createdAt", "downloadUrl", "id", "mimeType", "originalName", "removalReason",
        "removedAt", "sizeBytes", "state", "ticketId",
      ]);
    }
    expect(JSON.stringify(response.body)).not.toMatch(/storedName|filesystem|database|Prisma/i);
  });

  it.each(["abc", "0", "-2", "1.5", "12abc", "9007199254740992"])("rejects invalid ticketId %s", async (ticketId) => {
    const response = await request(app).get(`/api/tickets/${ticketId}`).set("X-Development-Requester-Id", String(requesterAId));
    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(response.body.error.fieldErrors).toHaveProperty("ticketId");
  });

  it("uses the same non-disclosing 404 for missing and foreign-owned Tickets", async () => {
    const missing = await request(app).get("/api/tickets/2147483647").set("X-Development-Requester-Id", String(requesterAId));
    const foreign = await request(app).get(`/api/tickets/${foreignTicketId}`).set("X-Development-Requester-Id", String(requesterAId));
    expect(missing.status).toBe(404);
    expect(foreign.status).toBe(404);
    expect(missing.body).toEqual({ error: { code: "RESOURCE_NOT_FOUND", message: "Ticket not found" } });
    expect(foreign.body).toEqual(missing.body);
    expect(JSON.stringify(foreign.body)).not.toMatch(new RegExp(`${fixtureTag}|Requester B|foreign`, "i"));
  });

  it("returns a safe 500 when Ticket-detail persistence fails", async () => {
    const findFirstSpy = vi.spyOn(routePrisma.ticket, "findFirst").mockRejectedValueOnce(new Error("Prisma password=secret C:\\private\\db"));
    const response = await request(app).get(`/api/tickets/${ownedTicketId}`).set("X-Development-Requester-Id", String(requesterAId));
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: { code: "INTERNAL_ERROR", message: "Unable to load ticket" } });
    expect(JSON.stringify(response.body)).not.toMatch(/Prisma|secret|private|db/i);
    findFirstSpy.mockRestore();
  });
});
