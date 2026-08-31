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
const requesterEmail = "api-04-validation@example.test";
const activeCategoryName = "API-04 Active Category";
const inactiveCategoryName = "API-04 Inactive Category";
const activeSystemName = "API-04 Active System";
const inactiveSystemName = "API-04 Inactive System";
const baseBody = {
  clientRequestId: "4b581b4f-cc4d-46f0-9e5b-7a2a2f9a09f6",
  categoryId: 0,
  relatedSystemId: 0,
  summary: "Valid summary",
  requestedPriority: "MEDIUM",
  description: "A valid description for validation tests.",
};
let app: Express;
let prisma: PrismaClient;
let requesterId: number;
let activeCategoryId: number;
let inactiveCategoryId: number;
let activeSystemId: number;
let inactiveSystemId: number;

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
  const requester = await prisma.requesterUser.upsert({
    where: { email: requesterEmail },
    update: { name: "API-04 Validation Requester", active: true },
    create: { name: "API-04 Validation Requester", email: requesterEmail, active: true },
  });
  const activeCategory = await prisma.category.upsert({
    where: { name: activeCategoryName },
    update: { active: true },
    create: { name: activeCategoryName, active: true },
  });
  const inactiveCategory = await prisma.category.upsert({
    where: { name: inactiveCategoryName },
    update: { active: false },
    create: { name: inactiveCategoryName, active: false },
  });
  const activeSystem = await prisma.relatedSystem.upsert({
    where: { name: activeSystemName },
    update: { active: true },
    create: { name: activeSystemName, active: true },
  });
  const inactiveSystem = await prisma.relatedSystem.upsert({
    where: { name: inactiveSystemName },
    update: { active: false },
    create: { name: inactiveSystemName, active: false },
  });
  requesterId = requester.id;
  activeCategoryId = activeCategory.id;
  inactiveCategoryId = inactiveCategory.id;
  activeSystemId = activeSystem.id;
  inactiveSystemId = inactiveSystem.id;
  ({ app } = await import("../../src/app.js"));
});

afterAll(async () => {
  await prisma?.ticket.deleteMany({ where: { requesterId } });
  await prisma?.category.deleteMany({ where: { id: { in: [activeCategoryId, inactiveCategoryId] } } });
  await prisma?.relatedSystem.deleteMany({ where: { id: { in: [activeSystemId, inactiveSystemId] } } });
  await prisma?.requesterUser.deleteMany({ where: { id: requesterId } });
  await prisma?.$disconnect();
});

describe("API-04 Ticket creation validation", () => {
  it("rejects malformed JSON with the safe validation envelope", async () => {
    const response = await request(app)
      .post("/api/tickets")
      .set("X-Development-Requester-Id", String(requesterId))
      .set("Content-Type", "application/json")
      .send("{ malformed");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        fieldErrors: { body: "Request body must be valid JSON" },
      },
    });
  });

  it("returns named 400 field errors and creates no Ticket for invalid input", async () => {
    const cases: Array<[string, Record<string, unknown>]> = [
      ["clientRequestId", { clientRequestId: "not-a-uuid" }],
      ["categoryId", { categoryId: 0 }],
      ["relatedSystemId", { relatedSystemId: 1.5 }],
      ["summary", { summary: "  " }],
      ["requestedPriority", { requestedPriority: "URGENT" }],
      ["description", { description: "short" }],
    ];
    const beforeCount = await prisma.ticket.count({ where: { requesterId } });

    for (const [index, [field, change]] of cases.entries()) {
      const response = await request(app)
        .post("/api/tickets")
        .set("X-Development-Requester-Id", String(requesterId))
        .send({
          ...baseBody,
          categoryId: activeCategoryId,
          relatedSystemId: activeSystemId,
          clientRequestId: `5f9f2d9c-0c36-4f48-9b83-${String(index + 1).padStart(12, "0")}`,
          ...change,
        });

      expect(response.status, field).toBe(400);
      expect(response.body.error.code, field).toBe("VALIDATION_ERROR");
      expect(response.body.error.fieldErrors, field).toHaveProperty(field);
    }

    expect(await prisma.ticket.count({ where: { requesterId } })).toBe(beforeCount);
  });

  it.each([
    ["inactive Category", "categoryId", "inactive"],
    ["unknown Category", "categoryId", "unknown"],
    ["inactive Related System", "relatedSystemId", "inactive"],
    ["unknown Related System", "relatedSystemId", "unknown"],
  ] as const)("rejects %s with no Ticket row", async (_label, field, kind) => {
    const suffix = field === "categoryId"
      ? (kind === "inactive" ? "000000000001" : "000000000002")
      : (kind === "inactive" ? "000000000003" : "000000000004");
    const clientId = `7a80a10e-7f96-4f0e-9c19-${suffix}`;
    const body: Record<string, unknown> = {
      ...baseBody,
      clientRequestId: clientId,
      categoryId: activeCategoryId,
      relatedSystemId: activeSystemId,
    };
    if (field === "categoryId") {
      body.categoryId = kind === "inactive" ? inactiveCategoryId : 2147483647;
    } else {
      body.relatedSystemId = kind === "inactive" ? inactiveSystemId : 2147483647;
    }

    const response = await request(app)
      .post("/api/tickets")
      .set("X-Development-Requester-Id", String(requesterId))
      .send(body);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.fieldErrors).toHaveProperty(field);
    expect(await prisma.ticket.findUnique({ where: { clientRequestId: clientId } })).toBeNull();
  });
});
