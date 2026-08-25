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
const requesterAEmail = "api-05-a@example.test";
const requesterBEmail = "api-05-b@example.test";
const categoryName = "API-05 Idempotency Category";
const systemName = "API-05 Idempotency System";
const clientIds = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
  "33333333-3333-4333-8333-333333333333",
];
let app: Express;
let prisma: PrismaClient;
let requesterAId: number;
let requesterBId: number;
let categoryId: number;
let systemId: number;

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
  await prisma.ticket.deleteMany({ where: { clientRequestId: { in: clientIds } } });
  const requesterA = await prisma.requesterUser.upsert({
    where: { email: requesterAEmail },
    update: { name: "API-05 Requester A", active: true },
    create: { name: "API-05 Requester A", email: requesterAEmail, active: true },
  });
  const requesterB = await prisma.requesterUser.upsert({
    where: { email: requesterBEmail },
    update: { name: "API-05 Requester B", active: true },
    create: { name: "API-05 Requester B", email: requesterBEmail, active: true },
  });
  const category = await prisma.category.upsert({
    where: { name: categoryName },
    update: { active: true },
    create: { name: categoryName, active: true },
  });
  const system = await prisma.relatedSystem.upsert({
    where: { name: systemName },
    update: { active: true },
    create: { name: systemName, active: true },
  });
  requesterAId = requesterA.id;
  requesterBId = requesterB.id;
  categoryId = category.id;
  systemId = system.id;
  ({ app } = await import("../../src/app.js"));
});

afterAll(async () => {
  await prisma?.ticket.deleteMany({ where: { clientRequestId: { in: clientIds } } });
  await prisma?.category.deleteMany({ where: { id: categoryId } });
  await prisma?.relatedSystem.deleteMany({ where: { id: systemId } });
  await prisma?.requesterUser.deleteMany({ where: { id: { in: [requesterAId, requesterBId] } } });
  await prisma?.$disconnect();
});

function body(clientRequestId: string, overrides: Record<string, unknown> = {}) {
  return {
    clientRequestId,
    categoryId,
    relatedSystemId: systemId,
    summary: "Cannot access email",
    requestedPriority: "HIGH",
    description: "Sign-in repeatedly returns an access denied message.",
    ...overrides,
  };
}

async function create(requesterId: number, payload: Record<string, unknown>) {
  return request(app)
    .post("/api/tickets")
    .set("X-Development-Requester-Id", String(requesterId))
    .send(payload);
}

describe("API-05 Ticket idempotency", () => {
  it("replays the same normalized request without touching updatedAt, even after references deactivate", async () => {
    const first = await create(requesterAId, body(clientIds[0], {
      summary: "  Cannot access email  ",
      description: "  Sign-in repeatedly returns an access denied message.  ",
    }));
    expect(first.status).toBe(201);
    const originalUpdatedAt = first.body.ticket.updatedAt;

    await prisma.category.update({ where: { id: categoryId }, data: { active: false } });
    await prisma.relatedSystem.update({ where: { id: systemId }, data: { active: false } });
    const replay = await create(requesterAId, body(clientIds[0]));

    expect(replay.status).toBe(200);
    expect(replay.body.replayed).toBe(true);
    expect(replay.body.ticket.id).toBe(first.body.ticket.id);
    expect(replay.body.ticket.ticketNumber).toBe(first.body.ticket.ticketNumber);
    expect(replay.body.ticket.updatedAt).toBe(originalUpdatedAt);
    expect(await prisma.ticket.count({ where: { clientRequestId: clientIds[0] } })).toBe(1);

    await prisma.category.update({ where: { id: categoryId }, data: { active: true } });
    await prisma.relatedSystem.update({ where: { id: systemId }, data: { active: true } });
  });

  it("returns 409 and creates nothing for conflicting payload or requester reuse", async () => {
    const first = await create(requesterAId, body(clientIds[1]));
    expect(first.status).toBe(201);

    const changedPayload = await create(requesterAId, body(clientIds[1], { summary: "Different summary" }));
    expect(changedPayload.status).toBe(409);
    expect(changedPayload.body).toEqual({
      error: {
        code: "DUPLICATE_REQUEST_CONFLICT",
        message: "clientRequestId was already used for a different request",
      },
    });

    const changedRequester = await create(requesterBId, body(clientIds[1]));
    expect(changedRequester.status).toBe(409);
    expect(changedRequester.body.error.code).toBe("DUPLICATE_REQUEST_CONFLICT");
    expect(await prisma.ticket.count({ where: { clientRequestId: clientIds[1] } })).toBe(1);
  });

  it("resolves two concurrent identical creates to one Ticket and one replay", async () => {
    const responses = await Promise.all([
      create(requesterAId, body(clientIds[2])),
      create(requesterAId, body(clientIds[2])),
    ]);

    expect(responses.map(({ status }) => status).sort()).toEqual([200, 201]);
    expect(responses[0].body.ticket.id).toBe(responses[1].body.ticket.id);
    expect(responses[0].body.ticket.ticketNumber).toBe(responses[1].body.ticket.ticketNumber);
    expect(await prisma.ticket.count({ where: { clientRequestId: clientIds[2] } })).toBe(1);
  });
});
