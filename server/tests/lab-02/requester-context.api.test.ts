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
const activeEmail = "api-02-active@example.test";
const inactiveEmail = "api-02-inactive@example.test";
let app: Express;
let prisma: PrismaClient;
let activeRequesterId: number;
let inactiveRequesterId: number;

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
  const active = await prisma.requesterUser.upsert({
    where: { email: activeEmail },
    update: { name: "API-02 Active Requester", active: true },
    create: { name: "API-02 Active Requester", email: activeEmail, active: true },
  });
  const inactive = await prisma.requesterUser.upsert({
    where: { email: inactiveEmail },
    update: { name: "API-02 Inactive Requester", active: false },
    create: { name: "API-02 Inactive Requester", email: inactiveEmail, active: false },
  });
  activeRequesterId = active.id;
  inactiveRequesterId = inactive.id;
  ({ app } = await import("../../src/app.js"));
});

afterAll(async () => {
  if (prisma) {
    await prisma.requesterUser.deleteMany({
      where: { email: { in: [activeEmail, inactiveEmail] } },
    });
  }
  await prisma?.$disconnect();
});

describe("API-02 requester context", () => {
  it("rejects a missing requester context with the safe 400 envelope", async () => {
    const response = await request(app).post("/api/tickets").send({});

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_REQUESTER_CONTEXT");
  });

  it.each(["abc", "0", "-1", "1.5", "1,2"])(
    "rejects syntactically invalid requester context %s",
    async (headerValue) => {
      const response = await request(app)
        .post("/api/tickets")
        .set("X-Development-Requester-Id", headerValue)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INVALID_REQUESTER_CONTEXT");
    },
  );

  it("returns the same non-disclosing 404 for an unknown requester", async () => {
    const response = await request(app)
      .post("/api/tickets")
      .set("X-Development-Requester-Id", "2147483647")
      .send({});

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: "RESOURCE_NOT_FOUND", message: "Development Requester not found" },
    });
  });

  it("returns the same non-disclosing 404 for an inactive requester", async () => {
    const response = await request(app)
      .post("/api/tickets")
      .set("X-Development-Requester-Id", String(inactiveRequesterId))
      .send({});

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: "RESOURCE_NOT_FOUND", message: "Development Requester not found" },
    });
  });

  it("allows an active requester context to reach Ticket request validation", async () => {
    const response = await request(app)
      .post("/api/tickets")
      .set("X-Development-Requester-Id", String(activeRequesterId))
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.fieldErrors).toBeDefined();
  });
});
