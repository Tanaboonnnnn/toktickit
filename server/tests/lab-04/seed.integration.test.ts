import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertDistinctTestDatabase } from "../lab-03/support/database.js";

function readLocalEnv(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return undefined;
  const line = readFileSync(envPath, "utf8").split(/\r?\n/).find((candidate) => candidate.trimStart().startsWith(`${name}=`));
  return line?.slice(line.indexOf("=") + 1).trim().replace(/^(["'])(.*)\1$/, "$2");
}

function withSchema(connectionString: string, schema: string): string {
  const url = new URL(connectionString); url.searchParams.set("schema", schema); return url.toString();
}

function runPrismaWithEnv(databaseUrl: string, envOverrides: Record<string, string>, ...args: string[]) {
  const cli = resolve(process.cwd(), "node_modules/prisma/build/index.js");
  return execFileSync(process.execPath, [cli, ...args, "--schema", "prisma/schema.prisma"], {
    cwd: process.cwd(),
    env: { ...process.env, ...envOverrides, DATABASE_URL: databaseUrl },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function runPrisma(databaseUrl: string, ...args: string[]) {
  return runPrismaWithEnv(databaseUrl, {}, ...args);
}

const developmentDatabaseUrl = readLocalEnv("DATABASE_URL");
const testDatabaseUrl = readLocalEnv("TEST_DATABASE_URL");
let admin: PrismaClient; let prisma: PrismaClient; let schema = ""; let isolatedUrl = "";

beforeAll(async () => {
  assertDistinctTestDatabase({ developmentUrl: developmentDatabaseUrl, testUrl: testDatabaseUrl });
  schema = `lab4_seed_${process.pid}_${Date.now()}_${randomUUID().slice(0, 6)}`.replaceAll("-", "_");
  admin = new PrismaClient({ datasources: { db: { url: testDatabaseUrl! } } }); await admin.$connect();
  await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`); isolatedUrl = withSchema(testDatabaseUrl!, schema);
  runPrisma(isolatedUrl, "migrate", "deploy"); prisma = new PrismaClient({ datasources: { db: { url: isolatedUrl } } }); await prisma.$connect();
}, 60_000);

afterAll(async () => { try { await prisma?.$disconnect(); if (schema) await admin?.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); } finally { await admin?.$disconnect(); } }, 60_000);

describe("SEED-01 Lab 4 repeat-safe demo data", () => {
  it("creates the Lab 4 matrix once and preserves deliberate user/ticket/action edits on rerun", async () => {
    const localSeedOutput = runPrismaWithEnv(isolatedUrl, { CI: "", GITHUB_ACTIONS: "" }, "db", "seed");
    expect(localSeedOutput).toMatch(/\[local-only seed credential\] empty\.dashboard\.lab4@example\.test \S+/);
    const tickets = await prisma.ticket.findMany({ where: { ticketNumber: { startsWith: "TKT-20260929-L4" } }, orderBy: { ticketNumber: "asc" } });
    expect(tickets).toHaveLength(8);
    expect(new Set(tickets.map((ticket) => ticket.currentStatus))).toEqual(new Set(["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"]));
    expect(new Set(tickets.map((ticket) => ticket.itPriority))).toEqual(new Set(["LOW", "MEDIUM", "HIGH"]));
    expect(tickets.some((ticket) => ticket.ownerId === null)).toBe(true);
    expect(tickets.some((ticket) => ticket.ownerId !== null)).toBe(true);
    const actions = await prisma.actionTaken.findMany({ where: { ticket: { ticketNumber: { startsWith: "TKT-20260929-L4" } } }, orderBy: { id: "asc" } });
    expect(actions.length).toBeGreaterThanOrEqual(8);
    expect(new Set(actions.map((action) => action.status))).toEqual(new Set(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]));
    expect(actions.some((action) => action.followUpRequired)).toBe(true);
    expect(actions.some((action) => action.recordedById !== action.assigneeId)).toBe(true);
    expect(actions.some((action) => action.performedById !== null && action.performedById !== action.recordedById)).toBe(true);
    const actionCounts = await Promise.all(tickets.map((ticket) => prisma.actionTaken.count({ where: { ticketId: ticket.id } })));
    expect(actionCounts).toContain(0); expect(actionCounts).toContain(1); expect(actionCounts.some((count) => count > 1)).toBe(true);
    expect(await prisma.actionTakenRevision.count({ where: { action: { ticket: { ticketNumber: { startsWith: "TKT-20260929-L4" } } } } })).toBe(actions.length);
    const emptyRequester = await prisma.user.findUniqueOrThrow({ where: { email: "empty.dashboard.lab4@example.test" } });
    expect(emptyRequester).toMatchObject({ active: true, role: "REQUESTER" });
    expect(await prisma.ticket.count({ where: { requesterId: emptyRequester.id } })).toBe(0);
    await prisma.user.delete({ where: { id: emptyRequester.id } });
    const hostedSeedOutput = runPrismaWithEnv(isolatedUrl, { CI: "true", GITHUB_ACTIONS: "true" }, "db", "seed");
    expect(hostedSeedOutput).not.toContain("empty.dashboard.lab4@example.test");
    const recreatedEmptyRequester = await prisma.user.findUniqueOrThrow({ where: { email: "empty.dashboard.lab4@example.test" } });
    expect(await prisma.ticket.count({ where: { requesterId: recreatedEmptyRequester.id } })).toBe(0);

    const legacyTerminalTicketIds = (await prisma.ticket.findMany({
      where: { ticketNumber: { startsWith: "TKT-20260915-L3" }, currentStatus: { in: ["RESOLVED", "CLOSED"] } },
      select: { id: true },
    })).map(({ id }) => id);
    expect(legacyTerminalTicketIds.length).toBeGreaterThanOrEqual(2);
    expect(await prisma.actionTaken.count({ where: { ticketId: { in: legacyTerminalTicketIds } } })).toBe(0);

    runPrisma(isolatedUrl, "db", "seed");
    expect(await prisma.ticket.count({ where: { ticketNumber: { startsWith: "TKT-20260929-L4" } } })).toBe(8);
    expect(await prisma.actionTaken.count({ where: { ticket: { ticketNumber: { startsWith: "TKT-20260929-L4" } } } })).toBe(actions.length);
    expect(await prisma.actionTakenRevision.count({ where: { action: { ticket: { ticketNumber: { startsWith: "TKT-20260929-L4" } } } } })).toBe(actions.length);

    const editedUser = await prisma.user.findUniqueOrThrow({ where: { email: "admin.lab3@example.test" } });
    const editedTicket = tickets.find((ticket) => ticket.currentStatus === "IN_PROGRESS")!;
    const editedAction = actions.find((action) => action.status === "IN_PROGRESS")!;
    const assignedToEditedUserBefore = await prisma.actionTaken.count({ where: { assigneeId: editedUser.id } });
    await prisma.user.update({ where: { id: editedUser.id }, data: { name: "Issue 73 preserved edit", role: "REQUESTER", active: false, passwordHash: "preserved-hash", authVersion: 9, version: 8 } });
    await prisma.ticket.update({ where: { id: editedTicket.id }, data: { currentStatus: "CANCELLED", ownerId: null, itPriority: "LOW", version: 11 } });
    await prisma.actionTaken.update({ where: { id: editedAction.id }, data: { description: "Preserved edited action", status: "CANCELLED", cancelledAt: new Date("2026-09-29T12:00:00Z"), cancelledById: editedAction.recordedById, cancellationReason: "Preserved local edit", version: 6 } });
    runPrisma(isolatedUrl, "db", "seed");
    expect(await prisma.user.findUniqueOrThrow({ where: { id: editedUser.id } })).toMatchObject({ name: "Issue 73 preserved edit", role: "REQUESTER", active: false, passwordHash: "preserved-hash", authVersion: 9, version: 8 });
    expect(await prisma.ticket.findUniqueOrThrow({ where: { id: editedTicket.id } })).toMatchObject({ currentStatus: "CANCELLED", ownerId: null, itPriority: "LOW", version: 11 });
    expect(await prisma.actionTaken.findUniqueOrThrow({ where: { id: editedAction.id } })).toMatchObject({ description: "Preserved edited action", status: "CANCELLED", version: 6 });
    expect(await prisma.ticket.count({ where: { ticketNumber: { startsWith: "TKT-20260929-L4" } } })).toBe(8);
    expect(await prisma.actionTaken.count({ where: { ticket: { ticketNumber: { startsWith: "TKT-20260929-L4" } } } })).toBe(actions.length);
    expect(await prisma.actionTakenRevision.count({ where: { action: { ticket: { ticketNumber: { startsWith: "TKT-20260929-L4" } } } } })).toBe(actions.length);
    expect(await prisma.actionTaken.count({ where: { assigneeId: editedUser.id } })).toBe(assignedToEditedUserBefore);

    const missingFixtureAction = await prisma.actionTaken.findFirstOrThrow({
      where: { clientRequestId: "20000000-0000-4000-8000-000000000001" },
    });
    const ineligibleAssignee = await prisma.user.findUniqueOrThrow({ where: { email: "korn.it@example.test" } });
    expect(missingFixtureAction.assigneeId).toBe(ineligibleAssignee.id);
    const assignedBeforeRemoval = await prisma.actionTaken.count({ where: { assigneeId: ineligibleAssignee.id } });
    await prisma.actionTakenRevision.deleteMany({ where: { actionId: missingFixtureAction.id } });
    await prisma.actionTaken.delete({ where: { id: missingFixtureAction.id } });
    await prisma.user.update({
      where: { id: ineligibleAssignee.id },
      data: { active: false, role: "REQUESTER", passwordHash: "preserved-ineligible-hash", authVersion: 13, version: 12 },
    });

    runPrisma(isolatedUrl, "db", "seed");

    expect(await prisma.actionTaken.findFirst({
      where: { clientRequestId: "20000000-0000-4000-8000-000000000001" },
    })).toBeNull();
    expect(await prisma.actionTaken.count({ where: { assigneeId: ineligibleAssignee.id } })).toBe(assignedBeforeRemoval - 1);
    expect(await prisma.user.findUniqueOrThrow({ where: { id: ineligibleAssignee.id } })).toMatchObject({
      active: false,
      role: "REQUESTER",
      passwordHash: "preserved-ineligible-hash",
      authVersion: 13,
      version: 12,
    });
  }, 60_000);
});
