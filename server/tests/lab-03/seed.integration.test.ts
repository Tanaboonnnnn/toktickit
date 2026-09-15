import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertDistinctTestDatabase } from "./support/database.js";
import { verifyPassword } from "../../src/password.js";

const requesterEmails = [
  "anan.student@example.test",
  "mali.student@example.test",
  "niran.student@example.test",
  "ploy.student@example.test",
  "somchai.former@example.test",
];
const staffEmails = [
  "nida.it@example.test",
  "korn.it@example.test",
  "dao.it@example.test",
  "som.it@example.test",
];
const adminEmails = ["admin.lab3@example.test"];
const seededEmails = [...requesterEmails, ...staffEmails, ...adminEmails];

function readLocalEnv(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return undefined;
  const line = readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((candidate) => candidate.trimStart().startsWith(`${name}=`));
  return line?.slice(line.indexOf("=") + 1).trim().replace(/^(["'])(.*)\1$/, "$2");
}

function withSchema(connectionString: string, schema: string): string {
  const url = new URL(connectionString);
  url.searchParams.set("schema", schema);
  return url.toString();
}

function runPrisma(databaseUrl: string, ...args: string[]): string {
  const prismaCli = resolve(process.cwd(), "node_modules/prisma/build/index.js");
  return execFileSync(process.execPath, [prismaCli, ...args, "--schema", "prisma/schema.prisma"], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

const developmentDatabaseUrl = readLocalEnv("DATABASE_URL");
const testDatabaseUrl = readLocalEnv("TEST_DATABASE_URL");
let admin: PrismaClient;
let prisma: PrismaClient;
let schema = "";
let isolatedUrl = "";
let scratchRoot = "";

beforeAll(async () => {
  assertDistinctTestDatabase({ developmentUrl: developmentDatabaseUrl, testUrl: testDatabaseUrl });
  schema = `lab3_seed_${process.pid}_${Date.now()}_${randomUUID().slice(0, 6)}`.replaceAll("-", "_");
  admin = new PrismaClient({ datasources: { db: { url: testDatabaseUrl! } } });
  await admin.$connect();
  await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  isolatedUrl = withSchema(testDatabaseUrl!, schema);
  runPrisma(isolatedUrl, "migrate", "deploy");
  prisma = new PrismaClient({ datasources: { db: { url: isolatedUrl } } });
  await prisma.$connect();
  scratchRoot = mkdtempSync(join(tmpdir(), "toktickit-seed-test-"));
}, 60_000);

afterAll(async () => {
  try {
    await prisma?.$disconnect();
    if (schema) await admin?.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  } finally {
    await admin?.$disconnect();
    if (scratchRoot) rmSync(scratchRoot, { recursive: true, force: true });
  }
}, 60_000);

describe("SEED-01 / SEED-02 Lab 3 seed and provisioning", () => {
  it("creates the required role mix and realistic mixed workflow fixtures", async () => {
    runPrisma(isolatedUrl, "db", "seed");

    const users = await prisma.user.findMany({
      where: { email: { in: seededEmails } },
      orderBy: { email: "asc" },
      select: {
        email: true,
        role: true,
        active: true,
        passwordHash: true,
        mustChangePassword: true,
      },
    });
    expect(users).toHaveLength(10);
    expect(users.filter(({ role, active }) => role === "REQUESTER" && active)).toHaveLength(4);
    expect(users.filter(({ role, active }) => role === "REQUESTER" && !active)).toHaveLength(1);
    expect(users.filter(({ role, active }) => role === "IT_STAFF" && active)).toHaveLength(3);
    expect(users.filter(({ role, active }) => role === "IT_STAFF" && !active)).toHaveLength(1);
    expect(users.filter(({ role, active }) => role === "ADMINISTRATOR" && active).length).toBeGreaterThanOrEqual(1);
    expect(users.every(({ passwordHash, mustChangePassword }) => (
      typeof passwordHash === "string" && passwordHash.startsWith("$argon2id$") && mustChangePassword
    ))).toBe(true);

    const tickets = await prisma.ticket.findMany({
      where: { ticketNumber: { startsWith: "TKT-20260915-L3" } },
      orderBy: { ticketNumber: "asc" },
      select: {
        ticketNumber: true,
        currentStatus: true,
        requestedPriority: true,
        itPriority: true,
        ownerId: true,
      },
    });
    expect(tickets).toHaveLength(8);
    expect(new Set(tickets.map(({ currentStatus }) => currentStatus))).toEqual(new Set([
      "NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER",
      "RESOLVED", "CLOSED", "REOPENED", "CANCELLED",
    ]));
    expect(tickets.some(({ requestedPriority, itPriority }) => requestedPriority !== itPriority)).toBe(true);
    expect(tickets.some(({ ownerId }) => ownerId === null)).toBe(true);
    expect(tickets.some(({ ownerId }) => ownerId !== null)).toBe(true);
    expect(await prisma.publicComment.count({ where: { ticket: { ticketNumber: { startsWith: "TKT-20260915-L3" } } } })).toBeGreaterThanOrEqual(2);
    expect(await prisma.internalNote.count({ where: { ticket: { ticketNumber: { startsWith: "TKT-20260915-L3" } } } })).toBeGreaterThanOrEqual(1);
  }, 60_000);

  it("does not reset edited user identity/auth state or Ticket workflow on rerun", async () => {
    const staff = await prisma.user.findUniqueOrThrow({ where: { email: "nida.it@example.test" } });
    const ticket = await prisma.ticket.findUniqueOrThrow({ where: { ticketNumber: "TKT-20260915-L30002" } });
    await prisma.user.update({
      where: { id: staff.id },
      data: {
        name: "Locally Edited Staff",
        role: "REQUESTER",
        active: false,
        passwordHash: "$argon2id$v=19$m=19456,t=2,p=1$cHJlc2VydmVk$cHJlc2VydmVk",
        authVersion: 7,
        version: 4,
      },
    });
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { currentStatus: "CLOSED", itPriority: "LOW", ownerId: null, version: 7 },
    });

    runPrisma(isolatedUrl, "db", "seed");

    expect(await prisma.user.findUniqueOrThrow({ where: { id: staff.id } })).toMatchObject({
      name: "Locally Edited Staff",
      role: "REQUESTER",
      active: false,
      passwordHash: "$argon2id$v=19$m=19456,t=2,p=1$cHJlc2VydmVk$cHJlc2VydmVk",
      authVersion: 7,
      version: 4,
    });
    expect(await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).toMatchObject({
      currentStatus: "CLOSED",
      itPriority: "LOW",
      ownerId: null,
      version: 7,
    });
    expect(await prisma.user.count({ where: { email: { in: seededEmails } } })).toBe(10);
    expect(await prisma.ticket.count({ where: { ticketNumber: { startsWith: "TKT-20260915-L3" } } })).toBe(8);
  }, 60_000);

  it("provisions only unprovisioned migrated Requesters once and never stores plaintext", async () => {
    const { provisionMigratedRequesters } = await import("../../src/provisioning.js");
    const migrated = await prisma.user.create({
      data: {
        name: "Migrated Null Requester",
        email: `migration-null-${randomUUID()}@example.test`,
        role: "REQUESTER",
        passwordHash: null,
        mustChangePassword: true,
      },
    });
    const staff = await prisma.user.create({
      data: {
        name: "Unprovisioned Staff",
        email: `staff-null-${randomUUID()}@example.test`,
        role: "IT_STAFF",
        passwordHash: null,
        mustChangePassword: true,
      },
    });
    const emitted: Array<{ email: string; password: string }> = [];
    const generated = "MigratedInitialPassword1!";

    const firstCount = await provisionMigratedRequesters(prisma, {
      generatePassword: () => generated,
      onCredential: (credential) => emitted.push(credential),
    });
    expect(firstCount).toBe(1);
    expect(emitted).toEqual([{ email: migrated.email, password: generated }]);
    const migratedAfter = await prisma.user.findUniqueOrThrow({ where: { id: migrated.id } });
    expect(migratedAfter.passwordHash).not.toBe(generated);
    expect(migratedAfter.passwordHash).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword(migratedAfter.passwordHash!, generated)).toBe(true);
    expect(migratedAfter.mustChangePassword).toBe(true);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: staff.id } })).passwordHash).toBeNull();

    emitted.length = 0;
    const secondCount = await provisionMigratedRequesters(prisma, {
      generatePassword: () => "DifferentPassword2!",
      onCredential: (credential) => emitted.push(credential),
    });
    expect(secondCount).toBe(0);
    expect(emitted).toEqual([]);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: migrated.id } })).passwordHash).toBe(migratedAfter.passwordHash);
  }, 60_000);
});
