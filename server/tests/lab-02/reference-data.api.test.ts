import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Express } from "express";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { authenticatedRequester, configureAuthenticatedTestRuntime, deleteSessionsForUsers } from "./support/authenticated-requester.js";

function readLocalEnv(name: string): string | undefined {
  if (process.env[name]) return process.env[name];

  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return undefined;

  const line = readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((candidate) => candidate.trimStart().startsWith(`${name}=`));

  return line?.slice(line.indexOf("=") + 1).trim().replace(/^(["'])(.*)\1$/, "$2");
}

function databaseName(connectionString: string): string {
  const url = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error("Database URLs must use PostgreSQL");
  }

  const name = decodeURIComponent(url.pathname.replace(/^\/+/, "")).trim().toLowerCase();
  if (!name) throw new Error("Database URL must include a database name");
  return name;
}

const developmentDatabaseUrl = readLocalEnv("DATABASE_URL");
const testDatabaseUrl = readLocalEnv("TEST_DATABASE_URL");
const categoryNames = {
  active: "API-01 Active Category",
  inactive: "API-01 Inactive Category",
};
const relatedSystemNames = {
  first: "API-01 Alpha System",
  second: "API-01 Zulu System",
  inactive: "API-01 Inactive System",
};
const requesterFixtures = {
  first: {
    name: "API-01 Alpha Requester",
    email: "api-01-alpha@example.test",
    active: true,
  },
  second: {
    name: "API-01 Shared Requester",
    email: "api-01-zulu@example.test",
    active: true,
  },
  inactive: {
    name: "API-01 Inactive Requester",
    email: "api-01-inactive@example.test",
    active: false,
  },
};

let app: Express;
let prisma: PrismaClient;
let routePrisma: PrismaClient;
const originalCategories = new Map<string, { id: number; name: string; active: boolean } | null>();
const originalRelatedSystems = new Map<string, { id: number; name: string; active: boolean } | null>();
const originalRequesters = new Map<string, { id: number; name: string; email: string; active: boolean } | null>();
const createdCategoryIds = new Map<string, number>();
const createdRelatedSystemIds = new Map<string, number>();
const createdRequesterIds = new Map<string, number>();
const authRequesterEmail = `api-01-auth-${process.pid}-${Date.now()}@example.test`;
let authRequesterId = 0;
let authSession: Awaited<ReturnType<typeof authenticatedRequester>>;

beforeAll(async () => {
  if (!testDatabaseUrl) {
    throw new Error("TEST_DATABASE_URL is required for Lab 2 API integration tests");
  }
  if (!developmentDatabaseUrl) {
    throw new Error("DATABASE_URL is required for Lab 2 API integration tests");
  }
  let testName: string;
  let developmentName: string;
  try {
    testName = databaseName(testDatabaseUrl);
    developmentName = databaseName(developmentDatabaseUrl);
  } catch {
    throw new Error("DATABASE_URL and TEST_DATABASE_URL must be valid PostgreSQL URLs");
  }
  if (testName === developmentName) {
    throw new Error("TEST_DATABASE_URL must not resolve to the development database");
  }

  configureAuthenticatedTestRuntime();
  process.env.DATABASE_URL = testDatabaseUrl;
  prisma = new PrismaClient({ datasources: { db: { url: testDatabaseUrl } } });
  await prisma.$connect();

  for (const name of Object.values(categoryNames)) {
    originalCategories.set(name, await prisma.category.findUnique({
      where: { name },
      select: { id: true, name: true, active: true },
    }));
  }
  for (const name of Object.values(relatedSystemNames)) {
    originalRelatedSystems.set(name, await prisma.relatedSystem.findUnique({
      where: { name },
      select: { id: true, name: true, active: true },
    }));
  }
  for (const requesterFixture of Object.values(requesterFixtures)) {
    originalRequesters.set(requesterFixture.email, await prisma.user.findUnique({
      where: { email: requesterFixture.email },
      select: { id: true, name: true, email: true, active: true },
    }));
  }

  await prisma.category.upsert({
    where: { name: categoryNames.active },
    update: { active: true },
    create: { name: categoryNames.active, active: true },
  });
  const activeCategory = await prisma.category.findUnique({ where: { name: categoryNames.active } });
  if (!originalCategories.get(categoryNames.active) && activeCategory) {
    createdCategoryIds.set(categoryNames.active, activeCategory.id);
  }
  await prisma.category.upsert({
    where: { name: categoryNames.inactive },
    update: { active: false },
    create: { name: categoryNames.inactive, active: false },
  });
  const inactiveCategory = await prisma.category.findUnique({ where: { name: categoryNames.inactive } });
  if (!originalCategories.get(categoryNames.inactive) && inactiveCategory) {
    createdCategoryIds.set(categoryNames.inactive, inactiveCategory.id);
  }
  for (const [key, name] of Object.entries(relatedSystemNames)) {
    await prisma.relatedSystem.upsert({
      where: { name },
      update: { active: key !== "inactive" },
      create: { name, active: key !== "inactive" },
    });
    const relatedSystem = await prisma.relatedSystem.findUnique({ where: { name } });
    if (!originalRelatedSystems.get(name) && relatedSystem) {
      createdRelatedSystemIds.set(name, relatedSystem.id);
    }
  }
  for (const requesterFixture of Object.values(requesterFixtures)) {
    await prisma.user.upsert({
      where: { email: requesterFixture.email },
      update: requesterFixture,
      create: requesterFixture,
    });
    const requester = await prisma.user.findUnique({
      where: { email: requesterFixture.email },
    });
    if (!originalRequesters.get(requesterFixture.email) && requester) {
      createdRequesterIds.set(requesterFixture.email, requester.id);
    }
  }

  const authRequester = await prisma.user.create({
    data: { name: "API-01 Authenticated Requester", email: authRequesterEmail, active: true },
  });
  authRequesterId = authRequester.id;

  ({ app } = await import("../../src/app.js"));
  const { getPrisma } = await import("../../src/prisma.js");
  routePrisma = getPrisma();
  authSession = await authenticatedRequester(app, prisma, authRequesterId);
});

afterAll(async () => {
  if (prisma) {
    if (authRequesterId) await deleteSessionsForUsers(prisma, [authRequesterId]);
    if (authRequesterId) await prisma.user.deleteMany({ where: { id: authRequesterId } });
    for (const [email, original] of originalRequesters) {
      if (original) {
        await prisma.user.update({
          where: { id: original.id },
          data: { name: original.name, email: original.email, active: original.active },
        });
      } else {
        const createdId = createdRequesterIds.get(email);
        if (createdId) await prisma.user.deleteMany({ where: { id: createdId } });
      }
    }
    for (const [name, original] of originalRelatedSystems) {
      if (original) {
        await prisma.relatedSystem.update({
          where: { id: original.id },
          data: { name: original.name, active: original.active },
        });
      } else {
        const createdId = createdRelatedSystemIds.get(name);
        if (createdId) await prisma.relatedSystem.deleteMany({ where: { id: createdId } });
      }
    }
    for (const [name, original] of originalCategories) {
      if (original) {
        await prisma.category.update({
          where: { id: original.id },
          data: { name: original.name, active: original.active },
        });
      } else {
        const createdId = createdCategoryIds.get(name);
        if (createdId) await prisma.category.deleteMany({ where: { id: createdId } });
      }
    }
  }
  await prisma?.$disconnect();
});

describe("API-01 reference data", () => {
  it("returns active Categories only as id/name pairs ordered by ascending id", async () => {
    const response = await authSession.agent.get("/api/categories");

    expect(response.status).toBe(200);
    expect(response.body.some(({ name }: { name: string }) => name === categoryNames.active)).toBe(true);
    expect(response.body.some(({ name }: { name: string }) => name === categoryNames.inactive)).toBe(false);
    expect(response.body.map(({ id }: { id: number }) => id)).toEqual(
      [...response.body.map(({ id }: { id: number }) => id)].sort((left, right) => left - right),
    );
    expect(response.body.every((item: Record<string, unknown>) => (
      Object.keys(item).sort().join(",") === "id,name"
    ))).toBe(true);
  });

  it("returns active Related Systems only as id/name pairs ordered by name then id", async () => {
    const response = await authSession.agent.get("/api/related-systems");

    expect(response.status).toBe(200);
    expect(response.body.some(({ name }: { name: string }) => name === relatedSystemNames.inactive)).toBe(false);
    const sorted = [...response.body].sort((left, right) => (
      left.name.localeCompare(right.name) || left.id - right.id
    ));
    expect(response.body).toEqual(sorted);
    expect(response.body.every((item: Record<string, unknown>) => (
      Object.keys(item).sort().join(",") === "id,name"
    ))).toBe(true);
  });

  it("keeps the Development Requester lookup retired after authenticated activation", async () => {
    const response = await authSession.agent.get("/api/development-requesters");
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: { code: "RESOURCE_NOT_FOUND", message: "Resource not found" } });
  });

  it("returns the exact safe Category failure envelope without leaking internal details", async () => {
    vi.spyOn(routePrisma.category, "findMany").mockRejectedValueOnce(
      new Error("Prisma secret at C:\\private\\database with password=hunter2"),
    );

    const response = await authSession.agent.get("/api/categories");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: { code: "INTERNAL_ERROR", message: "Unable to load categories" },
    });
    expect(JSON.stringify(response.body)).not.toMatch(/Prisma|private|hunter2|password/i);
  });

  it("returns valid empty arrays when reference queries find no active rows", async () => {
    vi.spyOn(routePrisma.category, "findMany").mockResolvedValueOnce([]);
    vi.spyOn(routePrisma.relatedSystem, "findMany").mockResolvedValueOnce([]);

    const [categories, relatedSystems] = await Promise.all([
      authSession.agent.get("/api/categories"),
      authSession.agent.get("/api/related-systems"),
    ]);

    for (const response of [categories, relatedSystems]) {
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    }
  });

  it("returns the exact safe Related System failure envelope", async () => {
    vi.spyOn(routePrisma.relatedSystem, "findMany").mockRejectedValueOnce(
      new Error("SQL connection details must not escape"),
    );

    const response = await authSession.agent.get("/api/related-systems");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: { code: "INTERNAL_ERROR", message: "Unable to load related systems" },
    });
    expect(JSON.stringify(response.body)).not.toMatch(/SQL|connection details/i);
  });

  it("does not consult a retired Development Requester query path", async () => {
    const spy = vi.spyOn(routePrisma.user, "findMany");
    const response = await authSession.agent.get("/api/development-requesters");
    expect(response.status).toBe(404);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
