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
const tag = `api09-${process.pid}-${Date.now()}`;
const requesterEmail = `${tag}@example.test`;
const categoryName = `${tag} category`;
const systemName = `${tag} system`;
const clientRequestIds = Array.from({ length: 12 }, (_, index) => `${tag}-${index}`);
let app: Express;
let prisma: PrismaClient;
let requesterId: number;
let categoryId: number;
let systemId: number;
let expectedRows: Array<{ id: number; ticketNumber: string; summary: string; createdAt: Date; updatedAt: Date }> = [];

beforeAll(async () => {
  if (!developmentDatabaseUrl || !testDatabaseUrl) throw new Error("DATABASE_URL and TEST_DATABASE_URL are required for Lab 2 API tests");
  if (dbName(developmentDatabaseUrl) === dbName(testDatabaseUrl)) throw new Error("TEST_DATABASE_URL must not resolve to the development database");
  process.env.DATABASE_URL = testDatabaseUrl;
  prisma = new PrismaClient({ datasources: { db: { url: testDatabaseUrl } } });
  await prisma.$connect();
  const requester = await prisma.requesterUser.create({ data: { name: `${tag} Requester`, email: requesterEmail, active: true } });
  const category = await prisma.category.create({ data: { name: categoryName, active: true } });
  const system = await prisma.relatedSystem.create({ data: { name: systemName, active: true } });
  requesterId = requester.id;
  categoryId = category.id;
  systemId = system.id;
  const base = Date.parse("2026-01-01T00:00:00.000Z");
  for (let index = 0; index < 12; index += 1) {
    const createdAt = new Date(base + index * 60_000);
    const updatedAt = new Date(base + (11 - index) * 60_000);
    const row = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-209903${String(index + 1).padStart(2, "0")}-${String(index + 1).padStart(6, "0")}`,
        clientRequestId: clientRequestIds[index],
        requesterId,
        categoryId,
        relatedSystemId: systemId,
        // Deliberately repeat values so the id-desc tie-breaker is observable.
        summary: index % 2 === 0 ? "Alpha" : "Beta",
        description: `Pagination fixture description ${index}`,
        requestedPriority: index % 2 === 0 ? "LOW" : "HIGH",
        createdAt,
        updatedAt,
      },
      select: { id: true, ticketNumber: true, summary: true, createdAt: true, updatedAt: true },
    });
    expectedRows.push(row);
  }
  ({ app } = await import("../../src/app.js"));
});

afterAll(async () => {
  await prisma?.ticket.deleteMany({ where: { clientRequestId: { in: clientRequestIds } } });
  await prisma?.category.deleteMany({ where: { id: categoryId } });
  await prisma?.relatedSystem.deleteMany({ where: { id: systemId } });
  await prisma?.requesterUser.deleteMany({ where: { id: requesterId } });
  await prisma?.$disconnect();
});

function list(query = "") {
  return request(app).get(`/api/tickets${query}`).set("X-Development-Requester-Id", String(requesterId));
}

function ids(response: { body: { items: Array<{ id: number }> } }) {
  return response.body.items.map(({ id }) => id);
}

describe("API-09 My Tickets sorting and pagination", () => {
  it("uses updatedAt desc by default and id desc for equal primary values", async () => {
    const response = await list();
    expect(response.status).toBe(200);
    expect(response.body.totalItems).toBe(12);
    expect(response.body.totalPages).toBe(2);
    expect(ids(response)).toEqual([...expectedRows].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime() || b.id - a.id).slice(0, 10).map(({ id }) => id));
  });

  it.each([
    ["createdAt", "asc"], ["createdAt", "desc"],
    ["updatedAt", "asc"], ["updatedAt", "desc"],
    ["ticketNumber", "asc"], ["ticketNumber", "desc"],
    ["summary", "asc"], ["summary", "desc"],
  ] as const)("sorts by %s %s with deterministic tie handling", async (sortBy, sortDirection) => {
    const response = await list(`?sortBy=${sortBy}&sortDirection=${sortDirection}&pageSize=20`);
    expect(response.status).toBe(200);
    const sorted = [...expectedRows].sort((a, b) => {
      const aValue = sortBy === "createdAt" || sortBy === "updatedAt" ? (a[sortBy] as Date).getTime() : String(a[sortBy]);
      const bValue = sortBy === "createdAt" || sortBy === "updatedAt" ? (b[sortBy] as Date).getTime() : String(b[sortBy]);
      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return (sortDirection === "asc" ? comparison : -comparison) || b.id - a.id;
    });
    expect(ids(response)).toEqual(sorted.map(({ id }) => id));
  });

  it("returns valid pages, sizes, totals, and an empty positive out-of-range page", async () => {
    const pageOne = await list("?page=1&pageSize=10");
    expect(pageOne.body.page).toBe(1);
    expect(pageOne.body.pageSize).toBe(10);
    expect(pageOne.body.items).toHaveLength(10);
    const pageTwo = await list("?page=2&pageSize=10");
    expect(pageTwo.body.page).toBe(2);
    expect(pageTwo.body.items).toHaveLength(2);
    expect(pageTwo.body.totalItems).toBe(12);
    expect(pageTwo.body.totalPages).toBe(2);
    expect((await list("?page=1&pageSize=20")).body.totalPages).toBe(1);
    expect((await list("?page=1&pageSize=50")).body.items).toHaveLength(12);
    const outOfRange = await list("?page=3&pageSize=10");
    expect(outOfRange.status).toBe(200);
    expect(outOfRange.body).toMatchObject({ page: 3, pageSize: 10, totalItems: 12, totalPages: 2, items: [] });
  });

  it.each([
    "?page=0", "?page=1.5", "?pageSize=1", "?sortBy=id", "?sortDirection=sideways",
    "?categoryId=0", "?requestedPriority=URGENT", "?currentStatus=CLOSED", "?unknown=value",
  ])("rejects invalid query %s without falling back to unrestricted results", async (query) => {
    const response = await list(query);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects repeated scalar query parameters", async () => {
    const response = await list("?page=1&page=2");
    expect(response.status).toBe(400);
    expect(response.body.error.fieldErrors.page).toBeDefined();
  });
});
