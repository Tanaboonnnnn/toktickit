import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Express } from "express";
import { authenticatedRequester, configureAuthenticatedTestRuntime, deleteSessionsForUsers } from "./support/authenticated-requester.js";

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
const fixtureTag = `api07-${process.pid}-${Date.now()}`;
const requesterAEmail = `${fixtureTag}-a@example.test`;
const requesterBEmail = `${fixtureTag}-b@example.test`;
const categoryName = `${fixtureTag} category`;
const systemName = `${fixtureTag} system`;
let app: Express;
let prisma: PrismaClient;
let requesterAId: number;
let requesterBId: number;
let categoryId: number;
let systemId: number;
const clientRequestIds = [`${fixtureTag}-a1`, `${fixtureTag}-a2`, `${fixtureTag}-b1`, `${fixtureTag}-b2`];
let requesterASession: Awaited<ReturnType<typeof authenticatedRequester>>;
let requesterBSession: Awaited<ReturnType<typeof authenticatedRequester>>;

beforeAll(async () => {
  if (!developmentDatabaseUrl || !testDatabaseUrl) throw new Error("DATABASE_URL and TEST_DATABASE_URL are required for Lab 2 API tests");
  if (databaseName(developmentDatabaseUrl) === databaseName(testDatabaseUrl)) throw new Error("TEST_DATABASE_URL must not resolve to the development database");
  configureAuthenticatedTestRuntime();
  process.env.DATABASE_URL = testDatabaseUrl;
  prisma = new PrismaClient({ datasources: { db: { url: testDatabaseUrl } } });
  await prisma.$connect();
  const requesterA = await prisma.user.create({ data: { name: `${fixtureTag} Requester A`, email: requesterAEmail, active: true } });
  const requesterB = await prisma.user.create({ data: { name: `${fixtureTag} Requester B`, email: requesterBEmail, active: true } });
  const category = await prisma.category.create({ data: { name: categoryName, active: true } });
  const system = await prisma.relatedSystem.create({ data: { name: systemName, active: true } });
  requesterAId = requesterA.id;
  requesterBId = requesterB.id;
  categoryId = category.id;
  systemId = system.id;
  await prisma.ticket.createMany({
    data: [
      { ticketNumber: `TKT-20990101-${String(requesterAId).padStart(6, "0")}`, clientRequestId: clientRequestIds[0], requesterId: requesterAId, categoryId, relatedSystemId: systemId, summary: `${fixtureTag} A ticket one`, description: "Ownership fixture description A one", requestedPriority: "LOW", itPriority: "LOW" },
      { ticketNumber: `TKT-20990102-${String(requesterAId).padStart(6, "0")}`, clientRequestId: clientRequestIds[1], requesterId: requesterAId, categoryId, relatedSystemId: systemId, summary: `${fixtureTag} A ticket two`, description: "Ownership fixture description A two", requestedPriority: "MEDIUM", itPriority: "MEDIUM" },
      { ticketNumber: `TKT-20990101-${String(requesterBId).padStart(6, "0")}`, clientRequestId: clientRequestIds[2], requesterId: requesterBId, categoryId, relatedSystemId: systemId, summary: `${fixtureTag} B ticket one`, description: "Ownership fixture description B one", requestedPriority: "HIGH", itPriority: "HIGH" },
      { ticketNumber: `TKT-20990102-${String(requesterBId).padStart(6, "0")}`, clientRequestId: clientRequestIds[3], requesterId: requesterBId, categoryId, relatedSystemId: systemId, summary: `${fixtureTag} B ticket two`, description: "Ownership fixture description B two", requestedPriority: "LOW", itPriority: "LOW" },
    ],
  });
  ({ app } = await import("../../src/app.js"));
  requesterASession = await authenticatedRequester(app, prisma, requesterAId);
  requesterBSession = await authenticatedRequester(app, prisma, requesterBId);
});

afterAll(async () => {
  await prisma?.ticket.deleteMany({ where: { clientRequestId: { in: clientRequestIds } } });
  if (prisma) await deleteSessionsForUsers(prisma, [requesterAId, requesterBId].filter(Boolean));
  await prisma?.category.deleteMany({ where: { id: categoryId } });
  await prisma?.relatedSystem.deleteMany({ where: { id: systemId } });
  await prisma?.user.deleteMany({ where: { id: { in: [requesterAId, requesterBId] } } });
  await prisma?.$disconnect();
});

describe("API-07 My Tickets ownership", () => {
  it("enforces requester ownership in the database query and exposes only TicketListItem fields", async () => {
    const responseA = await requesterASession.agent.get("/api/tickets");
    expect(responseA.status).toBe(200);
    expect(responseA.body.totalItems).toBe(2);
    expect(responseA.body.items.map((item: { summary: string }) => item.summary).sort()).toEqual([
      `${fixtureTag} A ticket one`, `${fixtureTag} A ticket two`,
    ].sort());
    const firstATicket = responseA.body.items.find((item: { summary: string }) => item.summary === `${fixtureTag} A ticket one`);
    expect(firstATicket).toEqual(expect.objectContaining({
      ticketNumber: expect.stringMatching(/^TKT-/),
      category: { id: categoryId, name: categoryName },
      relatedSystem: { id: systemId, name: systemName },
      requestedPriority: "LOW",
      currentStatus: "NEW",
    }));
    expect(Object.keys(responseA.body.items[0]).sort()).toEqual([
      "category", "createdAt", "currentStatus", "id", "relatedSystem",
      "requestedPriority", "summary", "ticketNumber", "updatedAt",
    ]);
    expect(JSON.stringify(responseA.body)).not.toMatch(/requesterId|clientRequestId|description|storedName|Prisma/i);

    const responseB = await requesterBSession.agent.get("/api/tickets");
    expect(responseB.status).toBe(200);
    expect(responseB.body.totalItems).toBe(2);
    expect(responseB.body.items.map((item: { summary: string }) => item.summary).sort()).toEqual([
      `${fixtureTag} B ticket one`, `${fixtureTag} B ticket two`,
    ].sort());
    expect(responseB.body.items).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ summary: `${fixtureTag} A ticket one` }),
    ]));
  });
});
