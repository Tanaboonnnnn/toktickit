import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { updateAdminUser } from "../../src/admin/user-service.js";
import type { AuthFixture } from "./support/auth-fixture.js";
import { createAuthFixture, csrf, destroyAuthFixture, login } from "./support/auth-fixture.js";

let fixture: AuthFixture;
const ticketIds: number[] = [];
const userIds: number[] = [];
let categoryId = 0;
let relatedSystemId = 0;

function readLocalEnv(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return undefined;
  const line = readFileSync(envPath, "utf8").split(/\r?\n/).find((candidate) => candidate.trimStart().startsWith(`${name}=`));
  return line?.slice(line.indexOf("=") + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
}

function withSchema(connectionString: string, schema: string): string {
  const url = new URL(connectionString);
  url.searchParams.set("schema", schema);
  return url.toString();
}

beforeAll(async () => {
  fixture = await createAuthFixture();
  const category = await fixture.prisma.category.create({ data: { name: `issue50-safety-${process.pid}-${Date.now()}`, active: true } });
  const system = await fixture.prisma.relatedSystem.create({ data: { name: `issue50-safety-system-${process.pid}-${Date.now()}`, active: true } });
  categoryId = category.id;
  relatedSystemId = system.id;
});

afterAll(async () => {
  if (!fixture) return;
  if (ticketIds.length) await fixture.prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
  if (userIds.length) await fixture.prisma.user.deleteMany({ where: { id: { in: userIds } } });
  if (categoryId) await fixture.prisma.category.deleteMany({ where: { id: categoryId } });
  if (relatedSystemId) await fixture.prisma.relatedSystem.deleteMany({ where: { id: relatedSystemId } });
  await destroyAuthFixture(fixture);
});

describe("USER-03 Administrator account safety", () => {
  it("prevents an Administrator from deactivating their own account without partial mutation", async () => {
    const administrator = request.agent(fixture.app);
    expect((await login(administrator, fixture, fixture.administrator.email)).status).toBe(200);
    const token = await csrf(administrator, fixture);
    const before = await fixture.prisma.user.findUniqueOrThrow({ where: { id: fixture.administrator.id } });

    const response = await administrator
      .patch(`/api/admin/users/${before.id}`)
      .set("Origin", fixture.origin)
      .set("X-CSRF-Token", token)
      .send({
        name: before.name,
        email: before.email,
        role: before.role,
        active: false,
        expectedVersion: before.version,
      });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CONFLICT");
    const after = await fixture.prisma.user.findUniqueOrThrow({ where: { id: before.id } });
    expect(after.active).toBe(true);
    expect(after.role).toBe(before.role);
    expect(after.version).toBe(before.version);
    expect(after.authVersion).toBe(before.authVersion);
  });

  it("prevents deactivation or Requester demotion while the User is a primary Ticket Owner", async () => {
    const owner = await fixture.prisma.user.create({
      data: { name: "Issue 50 Owner", email: `issue50-owner-${process.pid}-${Date.now()}@example.test`, role: "IT_STAFF", active: true, mustChangePassword: false },
    });
    userIds.push(owner.id);
    const ticket = await fixture.prisma.ticket.create({
      data: {
        ticketNumber: `TKT-20991250-${String(owner.id).padStart(6, "0")}`,
        clientRequestId: randomUUID(), requesterId: fixture.normalRequester.id, ownerId: owner.id,
        categoryId, relatedSystemId, summary: "Issue 50 owner safety", description: "Owner safety integration fixture.",
        requestedPriority: "MEDIUM", itPriority: "MEDIUM", currentStatus: "OPEN",
      },
    });
    ticketIds.push(ticket.id);
    const administrator = request.agent(fixture.app);
    expect((await login(administrator, fixture, fixture.administrator.email)).status).toBe(200);
    const token = await csrf(administrator, fixture);

    for (const change of [
      { active: false, role: "IT_STAFF" as const },
      { active: true, role: "REQUESTER" as const },
    ]) {
      const current = await fixture.prisma.user.findUniqueOrThrow({ where: { id: owner.id } });
      const response = await administrator.patch(`/api/admin/users/${owner.id}`)
        .set("Origin", fixture.origin).set("X-CSRF-Token", token)
        .send({ name: current.name, email: current.email, role: change.role, active: change.active, expectedVersion: current.version });
      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe("CONFLICT");
      const unchanged = await fixture.prisma.user.findUniqueOrThrow({ where: { id: owner.id } });
      expect(unchanged.active).toBe(true);
      expect(unchanged.role).toBe("IT_STAFF");
      expect(unchanged.version).toBe(current.version);
    }
  });

  it("preserves owner eligibility when assignment races deactivation", async () => {
    const candidate = await fixture.prisma.user.create({
      data: { name: "Issue 50 Race Owner", email: `issue50-race-owner-${process.pid}-${Date.now()}@example.test`, role: "IT_STAFF", active: true, mustChangePassword: false },
    });
    userIds.push(candidate.id);
    const ticket = await fixture.prisma.ticket.create({
      data: {
        ticketNumber: `TKT-20991251-${String(candidate.id).padStart(6, "0")}`,
        clientRequestId: randomUUID(), requesterId: fixture.normalRequester.id, ownerId: null,
        categoryId, relatedSystemId, summary: "Issue 50 owner race", description: "Assignment/account race fixture.",
        requestedPriority: "MEDIUM", itPriority: "MEDIUM", currentStatus: "NEW",
      },
    });
    ticketIds.push(ticket.id);

    const administrator = request.agent(fixture.app);
    const staff = request.agent(fixture.app);
    expect((await login(administrator, fixture, fixture.administrator.email)).status).toBe(200);
    expect((await login(staff, fixture, fixture.staff.email)).status).toBe(200);
    const [adminToken, staffToken] = await Promise.all([csrf(administrator, fixture), csrf(staff, fixture)]);

    const [deactivate, assign] = await Promise.all([
      administrator.patch(`/api/admin/users/${candidate.id}`)
        .set("Origin", fixture.origin).set("X-CSRF-Token", adminToken)
        .send({ name: candidate.name, email: candidate.email, role: candidate.role, active: false, expectedVersion: candidate.version }),
      staff.patch(`/api/staff/tickets/${ticket.id}/owner`)
        .set("Origin", fixture.origin).set("X-CSRF-Token", staffToken)
        .send({ ownerId: candidate.id, expectedVersion: ticket.version, confirmed: true }),
    ]);

    expect([deactivate.status, assign.status].sort()).toEqual([200, 409]);
    const [storedUser, storedTicket] = await Promise.all([
      fixture.prisma.user.findUniqueOrThrow({ where: { id: candidate.id } }),
      fixture.prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } }),
    ]);
    if (storedTicket.ownerId === candidate.id) {
      expect(storedUser.active).toBe(true);
      expect(["IT_STAFF", "ADMINISTRATOR"]).toContain(storedUser.role);
    } else {
      expect(storedTicket.ownerId).toBeNull();
      expect(storedUser.active).toBe(false);
    }
  });

  it("serializes last-active-Administrator demotion so exactly one of two concurrent self-demotions succeeds", async () => {
    const testUrl = readLocalEnv("TEST_DATABASE_URL");
    if (!testUrl) throw new Error("TEST_DATABASE_URL is required for USER-03");
    const adminDb = new PrismaClient({ datasources: { db: { url: testUrl } } });
    await adminDb.$connect();
    const schema = `issue50_last_admin_${process.pid}_${Date.now()}`;
    await adminDb.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    const isolated = new PrismaClient({ datasources: { db: { url: withSchema(testUrl, schema) } } });
    try {
      await adminDb.$executeRawUnsafe(`CREATE TYPE "${schema}"."UserRole" AS ENUM ('REQUESTER','IT_STAFF','ADMINISTRATOR')`);
      await adminDb.$executeRawUnsafe(`CREATE TABLE "${schema}"."RequesterUser" ("id" SERIAL PRIMARY KEY, "name" TEXT NOT NULL, "email" TEXT NOT NULL UNIQUE, "active" BOOLEAN NOT NULL DEFAULT true, "role" "${schema}"."UserRole" NOT NULL DEFAULT 'REQUESTER', "passwordHash" TEXT, "mustChangePassword" BOOLEAN NOT NULL DEFAULT true, "authVersion" INTEGER NOT NULL DEFAULT 1, "version" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
      await adminDb.$executeRawUnsafe(`CREATE TABLE "${schema}"."Ticket" ("id" SERIAL PRIMARY KEY, "ownerId" INTEGER)`);
      await isolated.$connect();
      const [a, b] = await Promise.all([
        isolated.user.create({ data: { name: "Admin A", email: "a@example.test", role: "ADMINISTRATOR", active: true, mustChangePassword: false } }),
        isolated.user.create({ data: { name: "Admin B", email: "b@example.test", role: "ADMINISTRATOR", active: true, mustChangePassword: false } }),
      ]);
      const change = (user: typeof a) => updateAdminUser(isolated, {
        id: user.id, name: user.name, email: user.email, role: "ADMINISTRATOR", mustChangePassword: false,
      }, user.id, { name: user.name, email: user.email, role: "REQUESTER", active: true, expectedVersion: user.version });
      const results = await Promise.allSettled([change(a), change(b)]);
      const diagnostics = results.map((result) => result.status === "fulfilled"
        ? "fulfilled"
        : result.reason instanceof Error ? `${result.reason.name}: ${result.reason.message}` : String(result.reason));
      expect(results.filter((result) => result.status === "fulfilled"), diagnostics.join("\n")).toHaveLength(1);
      expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
      expect(await isolated.user.count({ where: { role: "ADMINISTRATOR", active: true } })).toBe(1);
    } finally {
      await isolated.$disconnect().catch(() => undefined);
      await adminDb.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await adminDb.$disconnect();
    }
  });
});
