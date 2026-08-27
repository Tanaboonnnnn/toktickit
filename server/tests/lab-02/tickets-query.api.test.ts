import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Express } from "express";

function env(name: string) {
  if (process.env[name]) return process.env[name];
  const path = resolve(process.cwd(), ".env");
  if (!existsSync(path)) return undefined;
  const line = readFileSync(path, "utf8").split(/\r?\n/).find((entry) => entry.trimStart().startsWith(`${name}=`));
  return line?.slice(line.indexOf("=") + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
}
function dbName(value: string) {
  const url = new URL(value);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("Database URLs must use PostgreSQL");
  return decodeURIComponent(url.pathname.replace(/^\/+/, "")).toLowerCase();
}

const developmentDatabaseUrl = env("DATABASE_URL");
const testDatabaseUrl = env("TEST_DATABASE_URL");
const tag = `api08-${process.pid}-${Date.now()}`;
const requesterEmail = `${tag}@example.test`;
const categoryOneName = `${tag} category one`;
const categoryTwoName = `${tag} category two`;
const systemName = `${tag} system`;
const clientRequestIds = ["one", "two", "three", "four"].map((suffix) => `${tag}-${suffix}`);
let app: Express;
let prisma: PrismaClient;
let requesterId: number;
let categoryOneId: number;
let categoryTwoId: number;
let systemId: number;

beforeAll(async () => {
  if (!developmentDatabaseUrl || !testDatabaseUrl) throw new Error("DATABASE_URL and TEST_DATABASE_URL are required for Lab 2 API tests");
  if (dbName(developmentDatabaseUrl) === dbName(testDatabaseUrl)) throw new Error("TEST_DATABASE_URL must not resolve to the development database");
  process.env.DATABASE_URL = testDatabaseUrl;
  prisma = new PrismaClient({ datasources: { db: { url: testDatabaseUrl } } });
  await prisma.$connect();
  const requester = await prisma.requesterUser.create({ data: { name: `${tag} Requester`, email: requesterEmail, active: true } });
  const categoryOne = await prisma.category.create({ data: { name: categoryOneName, active: true } });
  const categoryTwo = await prisma.category.create({ data: { name: categoryTwoName, active: true } });
  const system = await prisma.relatedSystem.create({ data: { name: systemName, active: true } });
  requesterId = requester.id;
  categoryOneId = categoryOne.id;
  categoryTwoId = categoryTwo.id;
  systemId = system.id;
  await prisma.ticket.createMany({
    data: [
      { ticketNumber: `TKT-20990201-${String(requesterId).padStart(6, "0")}`, clientRequestId: clientRequestIds[0], requesterId, categoryId: categoryOneId, relatedSystemId: systemId, summary: "University email access denied", description: "Email access is denied for this ownership fixture.", requestedPriority: "HIGH" },
      { ticketNumber: `TKT-20990202-${String(requesterId + 1).padStart(6, "0")}`, clientRequestId: clientRequestIds[1], requesterId, categoryId: categoryTwoId, relatedSystemId: systemId, summary: "Laptop keyboard is broken", description: "The keyboard does not respond to several keys.", requestedPriority: "LOW" },
      { ticketNumber: `TKT-20990203-${String(requesterId + 2).padStart(6, "0")}`, clientRequestId: clientRequestIds[2], requesterId, categoryId: categoryOneId, relatedSystemId: systemId, summary: "Portal password reset", description: "The student portal password reset needs assistance.", requestedPriority: "MEDIUM" },
      { ticketNumber: `TKT-20990204-${String(requesterId + 3).padStart(6, "0")}`, clientRequestId: clientRequestIds[3], requesterId, categoryId: categoryTwoId, relatedSystemId: systemId, summary: "Wireless signal issue", description: "Campus wireless signal drops in the lab.", requestedPriority: "HIGH" },
    ],
  });
  ({ app } = await import("../../src/app.js"));
});

afterAll(async () => {
  await prisma?.ticket.deleteMany({ where: { clientRequestId: { in: clientRequestIds } } });
  await prisma?.category.deleteMany({ where: { id: { in: [categoryOneId, categoryTwoId] } } });
  await prisma?.relatedSystem.deleteMany({ where: { id: systemId } });
  await prisma?.requesterUser.deleteMany({ where: { id: requesterId } });
  await prisma?.$disconnect();
});

async function list(query = "") {
  return request(app).get(`/api/tickets${query}`).set("X-Development-Requester-Id", String(requesterId));
}

describe("API-08 My Tickets search and filters", () => {
  it("searches Ticket Number or Summary case-insensitively with substring and trimming", async () => {
    expect((await list("?search=  EMAIL ACCESS  ")).body.items.map((item: { ticketNumber: string }) => item.ticketNumber)).toHaveLength(1);
    expect((await list("?search=tkt-20990201")).body.items.map((item: { ticketNumber: string }) => item.ticketNumber)).toHaveLength(1);
    expect((await list("?search=PASSWORD")).body.items[0].summary).toBe("Portal password reset");
    expect((await list("?search=does-not-exist")).body.items).toEqual([]);
    expect((await list("?search=%20%20%20")).body.totalItems).toBe(4);
  });

  it("combines Category, Requested Priority, and Current Status filters with AND", async () => {
    expect((await list(`?categoryId=${categoryOneId}`)).body.items).toHaveLength(2);
    expect((await list("?requestedPriority=HIGH")).body.items).toHaveLength(2);
    expect((await list("?currentStatus=NEW")).body.items).toHaveLength(4);
    expect((await list(`?categoryId=${categoryOneId}&requestedPriority=HIGH&currentStatus=NEW`)).body.items.map((item: { summary: string }) => item.summary)).toEqual(["University email access denied"]);
    expect((await list(`?search=issue&requestedPriority=HIGH`)).body.items.map((item: { summary: string }) => item.summary)).toEqual(["Wireless signal issue"]);
    expect((await list(`?search=portal&categoryId=${categoryTwoId}`)).body.items).toEqual([]);
  });

  it("rejects an overlong search safely", async () => {
    const response = await list(`?search=${"x".repeat(121)}`);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.fieldErrors.search).toBeDefined();
  });
});
