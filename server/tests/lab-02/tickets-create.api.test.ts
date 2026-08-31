import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Express } from "express";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

function readLocalEnv(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return undefined;
  const line = readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((candidate) => candidate.trimStart().startsWith(`${name}=`));
  return line?.slice(line.indexOf("=") + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
}

function databaseName(connectionString: string): string {
  const url = new URL(connectionString);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("Database URLs must use PostgreSQL");
  }
  const name = decodeURIComponent(url.pathname.replace(/^\/+/, "")).trim().toLowerCase();
  if (!name) throw new Error("Database URL must include a database name");
  return name;
}

const developmentDatabaseUrl = readLocalEnv("DATABASE_URL");
const testDatabaseUrl = readLocalEnv("TEST_DATABASE_URL");
const requesterEmail = "api-03-create@example.test";
const categoryName = "API-03 Create Category";
const relatedSystemName = "API-03 Create System";
const clientRequestId = "4b6c2d6a-0c73-4bfb-9a36-9e6fb2f2a6e1";
let app: Express;
let prisma: PrismaClient;
let requesterId: number;
let categoryId: number;
let relatedSystemId: number;

beforeAll(async () => {
  if (!developmentDatabaseUrl || !testDatabaseUrl) {
    throw new Error("DATABASE_URL and TEST_DATABASE_URL are required for Lab 2 API tests");
  }
  if (databaseName(developmentDatabaseUrl) === databaseName(testDatabaseUrl)) {
    throw new Error("TEST_DATABASE_URL must not resolve to the development database");
  }

  process.env.DATABASE_URL = testDatabaseUrl;
  prisma = new PrismaClient({ datasources: { db: { url: testDatabaseUrl } } });
  await prisma.$connect();
  await prisma.ticket.deleteMany({ where: { clientRequestId } });
  const requester = await prisma.requesterUser.upsert({
    where: { email: requesterEmail },
    update: { name: "API-03 Create Requester", active: true },
    create: { name: "API-03 Create Requester", email: requesterEmail, active: true },
  });
  const category = await prisma.category.upsert({
    where: { name: categoryName },
    update: { active: true },
    create: { name: categoryName, active: true },
  });
  const relatedSystem = await prisma.relatedSystem.upsert({
    where: { name: relatedSystemName },
    update: { active: true },
    create: { name: relatedSystemName, active: true },
  });
  requesterId = requester.id;
  categoryId = category.id;
  relatedSystemId = relatedSystem.id;
  ({ app } = await import("../../src/app.js"));
});

afterAll(async () => {
  await prisma?.ticket.deleteMany({ where: { clientRequestId } });
  await prisma?.category.deleteMany({ where: { id: categoryId } });
  await prisma?.relatedSystem.deleteMany({ where: { id: relatedSystemId } });
  await prisma?.requesterUser.deleteMany({ where: { id: requesterId } });
  await prisma?.$disconnect();
});

describe("API-03 Ticket creation", () => {
  it("creates exactly one Ticket with backend-controlled values and the documented shape", async () => {
    const beforeCount = await prisma.ticket.count({ where: { requesterId } });
    const response = await request(app)
      .post("/api/tickets")
      .set("X-Development-Requester-Id", String(requesterId))
      .send({
        clientRequestId,
        categoryId,
        relatedSystemId,
        summary: "  Cannot access university email  ",
        requestedPriority: "HIGH",
        description: "  Sign-in repeatedly returns an access denied message.  ",
        requesterId: 999999,
        ticketNumber: "TKT-20000101-CLIENT1",
        currentStatus: "CLOSED",
        createdAt: "2000-01-01T00:00:00.000Z",
        updatedAt: "2000-01-01T00:00:00.000Z",
      });

    expect(response.status).toBe(201);
    expect(response.body.replayed).toBe(false);
    expect(response.body.ticket).toMatchObject({
      id: expect.any(Number),
      ticketNumber: expect.stringMatching(/^TKT-\d{8}-[A-Z0-9]{6}$/),
      requester: {
        id: requesterId,
        name: "API-03 Create Requester",
        email: requesterEmail,
      },
      category: { id: categoryId, name: categoryName },
      relatedSystem: { id: relatedSystemId, name: relatedSystemName },
      summary: "Cannot access university email",
      requestedPriority: "HIGH",
      currentStatus: "NEW",
      description: "Sign-in repeatedly returns an access denied message.",
      attachments: [],
    });
    expect(response.body.ticket.createdAt).toEqual(expect.any(String));
    expect(response.body.ticket.updatedAt).toEqual(expect.any(String));
    expect(Object.keys(response.body.ticket).sort()).toEqual([
      "attachments",
      "category",
      "createdAt",
      "currentStatus",
      "description",
      "id",
      "relatedSystem",
      "requestedPriority",
      "requester",
      "summary",
      "ticketNumber",
      "updatedAt",
    ]);
    expect(JSON.stringify(response.body)).not.toMatch(/clientRequestId|requesterId|storedName|password|Prisma/i);

    const stored = await prisma.ticket.findUnique({ where: { clientRequestId } });
    expect(stored).toMatchObject({
      requesterId,
      categoryId,
      relatedSystemId,
      summary: "Cannot access university email",
      description: "Sign-in repeatedly returns an access denied message.",
      requestedPriority: "HIGH",
      currentStatus: "NEW",
    });
    expect(await prisma.ticket.count({ where: { requesterId } })).toBe(beforeCount + 1);
  });
});
