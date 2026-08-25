import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Express } from "express";
import { Prisma, PrismaClient } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

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
const requesterEmail = "api-06-failure@example.test";
const categoryName = "API-06 Failure Category";
const systemName = "API-06 Failure System";
const clientRequestId = "66666666-6666-4666-8666-666666666666";
const collisionClientRequestId = "67676767-6767-4676-8676-676767676767";
let app: Express;
let prisma: PrismaClient;
let routePrisma: PrismaClient;
let requesterId: number;
let categoryId: number;
let systemId: number;
let originalTicketCreate: PrismaClient["ticket"]["create"];

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
  await prisma.ticket.deleteMany({ where: { clientRequestId: { in: [clientRequestId, collisionClientRequestId] } } });
  const requester = await prisma.requesterUser.upsert({
    where: { email: requesterEmail },
    update: { name: "API-06 Failure Requester", active: true },
    create: { name: "API-06 Failure Requester", email: requesterEmail, active: true },
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
  requesterId = requester.id;
  categoryId = category.id;
  systemId = system.id;
  ({ app } = await import("../../src/app.js"));
  const { getPrisma } = await import("../../src/prisma.js");
  routePrisma = getPrisma();
  originalTicketCreate = routePrisma.ticket.create.bind(routePrisma.ticket);
});

afterAll(async () => {
  await prisma?.ticket.deleteMany({
    where: { clientRequestId: { in: [clientRequestId, collisionClientRequestId] } },
  });
  await prisma?.category.deleteMany({ where: { id: categoryId } });
  await prisma?.relatedSystem.deleteMany({ where: { id: systemId } });
  await prisma?.requesterUser.deleteMany({ where: { id: requesterId } });
  await prisma?.$disconnect();
});

describe("API-06 Ticket creation failure behavior", () => {
  it("returns a safe 500, commits no Ticket, and permits retry with the same logical ID", async () => {
    const createSpy = vi.spyOn(routePrisma.ticket, "create").mockRejectedValueOnce(
      new Error("Prisma connection failed at C:\\private\\database password=hunter2"),
    );
    const body = {
      clientRequestId,
      categoryId,
      relatedSystemId: systemId,
      summary: "Cannot access email",
      requestedPriority: "HIGH",
      description: "Sign-in repeatedly returns an access denied message.",
    };

    const failed = await request(app)
      .post("/api/tickets")
      .set("X-Development-Requester-Id", String(requesterId))
      .send(body);

    expect(failed.status).toBe(500);
    expect(failed.body).toEqual({
      error: { code: "INTERNAL_ERROR", message: "Unable to create ticket" },
    });
    expect(JSON.stringify(failed.body)).not.toMatch(/Prisma|private|password|hunter2/i);
    expect(await prisma.ticket.findUnique({ where: { clientRequestId } })).toBeNull();

    createSpy.mockImplementation(originalTicketCreate);
    const retry = await request(app)
      .post("/api/tickets")
      .set("X-Development-Requester-Id", String(requesterId))
      .send(body);

    expect(retry.status).toBe(201);
    expect(retry.body.replayed).toBe(false);
    expect(await prisma.ticket.count({ where: { clientRequestId } })).toBe(1);
  });

  it("retries a real Prisma Ticket Number uniqueness collision with a fresh candidate", async () => {
    const createSpy = vi.spyOn(routePrisma.ticket, "create");
    createSpy.mockImplementation(originalTicketCreate);
    createSpy.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "5.22.0",
        meta: { target: ["ticketNumber"] },
      }),
    );
    const response = await request(app)
      .post("/api/tickets")
      .set("X-Development-Requester-Id", String(requesterId))
      .send({
        clientRequestId: collisionClientRequestId,
        categoryId,
        relatedSystemId: systemId,
        summary: "Cannot access email",
        requestedPriority: "HIGH",
        description: "Sign-in repeatedly returns an access denied message.",
      });

    expect(response.status).toBe(201);
    expect(createSpy).toHaveBeenCalledTimes(2);
    expect(response.body.ticket.ticketNumber).toMatch(/^TKT-\d{8}-[A-Z0-9]{6}$/);
    expect(await prisma.ticket.count({ where: { clientRequestId: collisionClientRequestId } })).toBe(1);
    createSpy.mockImplementation(originalTicketCreate);
  });
});
