import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Express } from "express";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { authenticatedRequester, configureAuthenticatedTestRuntime, deleteSessionsForUsers } from "../lab-02/support/authenticated-requester.js";

function env(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return undefined;
  const line = readFileSync(envPath, "utf8").split(/\r?\n/)
    .find((entry) => entry.trimStart().startsWith(`${name}=`));
  return line?.slice(line.indexOf("=") + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
}

let app: Express;
let prisma: PrismaClient;
let requesterId = 0;
let session: Awaited<ReturnType<typeof authenticatedRequester>>;

beforeAll(async () => {
  const testDatabaseUrl = env("TEST_DATABASE_URL");
  if (!testDatabaseUrl) throw new Error("TEST_DATABASE_URL is required for the Lab 1 category regression");
  configureAuthenticatedTestRuntime();
  process.env.DATABASE_URL = testDatabaseUrl;
  prisma = new PrismaClient({ datasources: { db: { url: testDatabaseUrl } } });
  await prisma.$connect();
  const requester = await prisma.user.create({
    data: { name: "Lab 1 Category Regression Requester", email: `lab1-category-${process.pid}-${Date.now()}@example.test`, active: true },
  });
  requesterId = requester.id;
  ({ app } = await import("../../src/app.js"));
  session = await authenticatedRequester(app, prisma, requesterId);
});

afterAll(async () => {
  if (prisma && requesterId) await deleteSessionsForUsers(prisma, [requesterId]);
  if (prisma && requesterId) await prisma.user.deleteMany({ where: { id: requesterId } });
  await prisma?.$disconnect();
});

describe("GET /api/categories", () => {
  it("retains the original four seeded categories in id order for an authenticated Requester", async () => {
    const res = await session.agent.get("/api/categories");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const names = res.body.map((category: { name: string }) => category.name);
    expect(names).toEqual(expect.arrayContaining([
      "Account and Access", "Hardware", "Software", "Network",
    ]));
    expect(res.body.map((category: { id: number }) => category.id)).toEqual(
      [...res.body.map((category: { id: number }) => category.id)].sort((a, b) => a - b),
    );
    expect(res.body.every((category: Record<string, unknown>) => (
      Object.keys(category).sort().join(",") === "id,name"
    ))).toBe(true);
  });
});
