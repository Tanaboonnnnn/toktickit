import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Express } from "express";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertDistinctTestDatabase } from "./support/database.js";

function readLocalEnv(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return undefined;
  const line = readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((candidate) => candidate.trimStart().startsWith(`${name}=`));
  return line?.slice(line.indexOf("=") + 1).trim().replace(/^(["'])(.*)\1$/, "$2");
}

const developmentDatabaseUrl = readLocalEnv("DATABASE_URL");
const testDatabaseUrl = readLocalEnv("TEST_DATABASE_URL");
const tag = `lab3-requester-${process.pid}-${Date.now()}`;
let prisma: PrismaClient;
let app: Express;
let requesterId = 0;
let staffId = 0;
let adminId = 0;

beforeAll(async () => {
  assertDistinctTestDatabase({ developmentUrl: developmentDatabaseUrl, testUrl: testDatabaseUrl });
  process.env.DATABASE_URL = testDatabaseUrl!;
  prisma = new PrismaClient({ datasources: { db: { url: testDatabaseUrl! } } });
  await prisma.$connect();
  const requester = await prisma.user.create({ data: { name: `${tag} Requester`, email: `${tag}-r@example.test`, role: "REQUESTER", active: true } });
  const staff = await prisma.user.create({ data: { name: `${tag} Staff`, email: `${tag}-s@example.test`, role: "IT_STAFF", active: true } });
  const admin = await prisma.user.create({ data: { name: `${tag} Admin`, email: `${tag}-a@example.test`, role: "ADMINISTRATOR", active: true } });
  requesterId = requester.id;
  staffId = staff.id;
  adminId = admin.id;
  ({ app } = await import("../../src/app.js"));
});

afterAll(async () => {
  await prisma?.user.deleteMany({ where: { id: { in: [requesterId, staffId, adminId] } } });
  await prisma?.$disconnect();
});

describe("REQ-01 transitional Development Requester safety", () => {
  it("lists only active REQUESTER accounts while the temporary selector exists", async () => {
    const response = await request(app).get("/api/development-requesters");
    expect(response.status).toBe(200);
    const ids = response.body.map((user: { id: number }) => user.id);
    expect(ids).toContain(requesterId);
    expect(ids).not.toContain(staffId);
    expect(ids).not.toContain(adminId);
  });

  it.each([
    ["IT Staff", () => staffId],
    ["Administrator", () => adminId],
  ])("does not accept an active %s account as Requester identity", async (_label, id) => {
    const response = await request(app)
      .post("/api/tickets")
      .set("X-Development-Requester-Id", String(id()))
      .send({});
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("RESOURCE_NOT_FOUND");
  });
});
