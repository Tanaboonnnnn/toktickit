import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertDistinctTestDatabase } from "../lab-03/support/database.js";

const HISTORICAL_MIGRATIONS = [
  "20260805193129_init",
  "20260825002000_lab2_schema_foundation",
  "20260915173000_lab3_users_workflow",
] as const;
const LAB4_MIGRATION = "20260929193000_lab4_actions_data_foundation";

function readLocalEnv(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return undefined;
  const line = readFileSync(envPath, "utf8").split(/\r?\n/)
    .find((candidate) => candidate.trimStart().startsWith(`${name}=`));
  return line?.slice(line.indexOf("=") + 1).trim().replace(/^(["'])(.*)\1$/, "$2");
}

function withSchema(connectionString: string, schema: string): string {
  const url = new URL(connectionString);
  url.searchParams.set("schema", schema);
  return url.toString();
}

function checksum(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function runPrisma(databaseUrl: string, schemaPath: string, ...args: string[]): string {
  const prismaCli = resolve(process.cwd(), "node_modules/prisma/build/index.js");
  return execFileSync(process.execPath, [prismaCli, ...args, "--schema", schemaPath], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function runPrismaDiff(databaseUrl: string, ...args: string[]): string {
  const prismaCli = resolve(process.cwd(), "node_modules/prisma/build/index.js");
  return execFileSync(process.execPath, [prismaCli, ...args], {
    cwd: process.cwd(), env: { ...process.env, DATABASE_URL: databaseUrl }, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  });
}

function prepareProject(includeLab4: boolean, injectLateFailure = false) {
  const root = mkdtempSync(join(tmpdir(), "toktickit-lab4-migration-"));
  const prismaDir = join(root, "prisma");
  const migrationsDir = join(prismaDir, "migrations");
  mkdirSync(migrationsDir, { recursive: true });
  cpSync(resolve(process.cwd(), "prisma/schema.prisma"), join(prismaDir, "schema.prisma"));
  for (const migration of HISTORICAL_MIGRATIONS) {
    cpSync(resolve(process.cwd(), "prisma/migrations", migration), join(migrationsDir, migration), { recursive: true });
  }
  const lock = resolve(process.cwd(), "prisma/migrations/migration_lock.toml");
  if (existsSync(lock)) cpSync(lock, join(migrationsDir, "migration_lock.toml"));
  if (includeLab4) {
    const source = resolve(process.cwd(), "prisma/migrations", LAB4_MIGRATION);
    expect(existsSync(source), `Expected Lab 4 migration ${LAB4_MIGRATION}`).toBe(true);
    cpSync(source, join(migrationsDir, LAB4_MIGRATION), { recursive: true });
    if (injectLateFailure) {
      const sqlPath = join(migrationsDir, LAB4_MIGRATION, "migration.sql");
      const sql = readFileSync(sqlPath, "utf8");
      writeFileSync(sqlPath, `${sql}\n-- test-only late failure\nSELECT 1 / 0;\n`, "utf8");
    }
  }
  return { root, schemaPath: join(prismaDir, "schema.prisma") };
}

async function createSchema(admin: PrismaClient, prefix: string) {
  const name = `${prefix}_${process.pid}_${Date.now()}_${randomUUID().slice(0, 6)}`.replaceAll("-", "_");
  await admin.$executeRawUnsafe(`CREATE SCHEMA "${name}"`);
  return name;
}

const developmentDatabaseUrl = readLocalEnv("DATABASE_URL");
const testDatabaseUrl = readLocalEnv("TEST_DATABASE_URL");
let admin: PrismaClient;
const schemas: string[] = [];
const tempRoots: string[] = [];

beforeAll(async () => {
  assertDistinctTestDatabase({ developmentUrl: developmentDatabaseUrl, testUrl: testDatabaseUrl });
  admin = new PrismaClient({ datasources: { db: { url: testDatabaseUrl! } } });
  await admin.$connect();
});

afterAll(async () => {
  try {
    for (const schema of schemas) await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  } finally {
    await admin?.$disconnect();
    for (const root of tempRoots) rmSync(root, { recursive: true, force: true });
  }
}, 60_000);

describe("MIG-01/MIG-02/MIG-03 Lab 3 -> Lab 4 data foundation", () => {
  it("preserves populated Lab 3 data and attachment bytes while adding empty Lab 4 history", async () => {
    const schema = await createSchema(admin, "lab4_mig01"); schemas.push(schema);
    const url = withSchema(testDatabaseUrl!, schema);
    const historical = prepareProject(false); tempRoots.push(historical.root);
    runPrisma(url, historical.schemaPath, "migrate", "deploy");
    const db = new PrismaClient({ datasources: { db: { url } } });
    const uploadRoot = mkdtempSync(join(tmpdir(), "toktickit-lab4-upload-")); tempRoots.push(uploadRoot);
    const activeStored = `${randomUUID()}.pdf`;
    const removedStored = `${randomUUID()}.png`;
    const activeBytes = Buffer.from("%PDF-1.7\nLab 3 active bytes\n");
    const removedBytes = Buffer.from("\x89PNG\r\n\x1a\nLab 3 removed bytes", "binary");
    writeFileSync(join(uploadRoot, activeStored), activeBytes);
    writeFileSync(join(uploadRoot, removedStored), removedBytes);
    const beforeActiveHash = checksum(readFileSync(join(uploadRoot, activeStored)));
    const beforeRemovedHash = checksum(readFileSync(join(uploadRoot, removedStored)));
    try {
      const category = await db.category.create({ data: { name: `L4 Migration Category ${randomUUID()}` } });
      const system = await db.relatedSystem.create({ data: { name: `L4 Migration System ${randomUUID()}` } });
      const requester = await db.user.create({ data: { name: "Legacy Requester", email: `legacy-${randomUUID()}@example.test`, active: true, role: "REQUESTER", passwordHash: "preserved-hash", mustChangePassword: false, authVersion: 3, version: 4 } });
      const staff = await db.user.create({ data: { name: "Legacy Staff", email: `staff-${randomUUID()}@example.test`, active: true, role: "IT_STAFF", passwordHash: "staff-hash", mustChangePassword: false, authVersion: 2, version: 5 } });
      const ticketRows = await db.$queryRawUnsafe<Array<{ id: number }>>(`INSERT INTO "Ticket" ("ticketNumber","clientRequestId","requesterId","ownerId","categoryId","relatedSystemId",summary,description,"requestedPriority","itPriority","currentStatus",version,"resolutionSummary","resolvedAt","createdAt","updatedAt") VALUES ('TKT-L4-MIG-${randomUUID()}','${randomUUID()}',${requester.id},${staff.id},${category.id},${system.id},'Preserve Lab 3 ticket','Preserve every Lab 3 field','HIGH','MEDIUM','RESOLVED',7,'Legacy resolution remains valid.',TIMESTAMP '2026-09-20 03:00:00',TIMESTAMP '2026-09-19 01:02:03',TIMESTAMP '2026-09-20 04:05:06') RETURNING id`);
      const ticket = { id: ticketRows[0].id };
      await db.publicComment.create({ data: { ticketId: ticket.id, authorId: requester.id, body: "Preserve public comment" } });
      await db.internalNote.create({ data: { ticketId: ticket.id, authorId: staff.id, body: "Preserve private note" } });
      await db.session.create({ data: { sid: `l4-${randomUUID()}`, sess: { passport: { user: requester.id } }, expire: new Date("2026-10-01T00:00:00Z") } });
      await db.attachment.createMany({ data: [
        { ticketId: ticket.id, originalName: "active.pdf", storedName: activeStored, mimeType: "application/pdf", sizeBytes: activeBytes.length },
        { ticketId: ticket.id, originalName: "removed.png", storedName: removedStored, mimeType: "image/png", sizeBytes: removedBytes.length, removedAt: new Date("2026-09-21T00:00:00Z"), removalReason: "Legacy removal" },
      ] });
      const beforeTicket = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT id,"ticketNumber","clientRequestId","requesterId","ownerId","categoryId","relatedSystemId",summary,description,"requestedPriority"::text,"itPriority"::text,"currentStatus"::text,version,"resolutionSummary","resolvedAt","closedAt","cancelReason","cancelledAt","requesterResolutionIndicatedAt","createdAt","updatedAt" FROM "Ticket" WHERE id=${ticket.id}`);
      const before = {
        users: await db.user.findMany({ where: { id: { in: [requester.id, staff.id] } }, orderBy: { id: "asc" } }),
        category: await db.category.findUniqueOrThrow({ where: { id: category.id } }),
        system: await db.relatedSystem.findUniqueOrThrow({ where: { id: system.id } }),
        comments: await db.publicComment.findMany({ where: { ticketId: ticket.id } }),
        notes: await db.internalNote.findMany({ where: { ticketId: ticket.id } }),
        attachments: await db.attachment.findMany({ where: { ticketId: ticket.id }, orderBy: { id: "asc" } }),
        sessions: await db.session.findMany({ where: { sid: { startsWith: "l4-" } } }),
      };
      const upgraded = prepareProject(true); tempRoots.push(upgraded.root);
      runPrisma(url, upgraded.schemaPath, "migrate", "deploy");
      const workflowCycle = await db.$queryRawUnsafe<Array<{ workflowCycle: number }>>(`SELECT "workflowCycle" FROM "Ticket" WHERE id = ${ticket.id}`);
      expect(workflowCycle).toEqual([{ workflowCycle: 1 }]);
      expect(await db.user.findMany({ where: { id: { in: [requester.id, staff.id] } }, orderBy: { id: "asc" } })).toEqual(before.users);
      expect(await db.category.findUniqueOrThrow({ where: { id: category.id } })).toEqual(before.category);
      expect(await db.relatedSystem.findUniqueOrThrow({ where: { id: system.id } })).toEqual(before.system);
      const afterTicket = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT id,"ticketNumber","clientRequestId","requesterId","ownerId","categoryId","relatedSystemId",summary,description,"requestedPriority"::text,"itPriority"::text,"currentStatus"::text,version,"resolutionSummary","resolvedAt","closedAt","cancelReason","cancelledAt","requesterResolutionIndicatedAt","createdAt","updatedAt" FROM "Ticket" WHERE id=${ticket.id}`);
      expect(afterTicket).toEqual(beforeTicket);
      expect(await db.publicComment.findMany({ where: { ticketId: ticket.id } })).toEqual(before.comments);
      expect(await db.internalNote.findMany({ where: { ticketId: ticket.id } })).toEqual(before.notes);
      expect(await db.attachment.findMany({ where: { ticketId: ticket.id }, orderBy: { id: "asc" } })).toEqual(before.attachments);
      expect(await db.session.findMany({ where: { sid: { startsWith: "l4-" } } })).toEqual(before.sessions);
      expect(checksum(readFileSync(join(uploadRoot, activeStored)))).toBe(beforeActiveHash);
      expect(checksum(readFileSync(join(uploadRoot, removedStored)))).toBe(beforeRemovedHash);
      const counts = await db.$queryRawUnsafe<Array<{ actions: bigint; revisions: bigint; events: bigint }>>(`SELECT (SELECT COUNT(*) FROM "ActionTaken") actions, (SELECT COUNT(*) FROM "ActionTakenRevision") revisions, (SELECT COUNT(*) FROM "TicketWorkflowEvent") events`);
      expect(counts.map(({ actions, revisions, events }) => [Number(actions), Number(revisions), Number(events)])).toEqual([[0, 0, 0]]);
    } finally { await db.$disconnect(); }
  }, 60_000);

  it("is repeat-deploy safe, keeps legacy terminal zero-action tickets valid, and has no schema drift", async () => {
    const schema = await createSchema(admin, "lab4_mig02"); schemas.push(schema);
    const url = withSchema(testDatabaseUrl!, schema);
    const project = prepareProject(true); tempRoots.push(project.root);
    runPrisma(url, project.schemaPath, "migrate", "deploy");
    runPrisma(url, project.schemaPath, "migrate", "deploy");
    const db = new PrismaClient({ datasources: { db: { url } } });
    try {
      const category = await db.category.create({ data: { name: `Terminal Category ${randomUUID()}` } });
      const system = await db.relatedSystem.create({ data: { name: `Terminal System ${randomUUID()}` } });
      const requester = await db.user.create({ data: { name: "Terminal Requester", email: `terminal-${randomUUID()}@example.test` } });
      const terminal = await db.ticket.create({ data: { ticketNumber: `TKT-L4-TERM-${randomUUID()}`, clientRequestId: randomUUID(), requesterId: requester.id, categoryId: category.id, relatedSystemId: system.id, summary: "Legacy terminal remains", description: "No fabricated action", requestedPriority: "LOW", itPriority: "LOW", currentStatus: "CLOSED", resolutionSummary: "Legacy resolution remains valid.", resolvedAt: new Date(), closedAt: new Date() } });
      expect(await db.$queryRawUnsafe<Array<{ count: bigint }>>(`SELECT COUNT(*)::bigint count FROM "ActionTaken" WHERE "ticketId" = ${terminal.id}`)).toEqual([{ count: 0n }]);
      const drift = runPrismaDiff(url, "migrate", "diff", "--from-url", url, "--to-schema-datamodel", project.schemaPath, "--script");
      expect(drift.trim()).toBe("-- This is an empty migration.");
    } finally { await db.$disconnect(); }
  }, 60_000);

  it("rolls back a late Lab 4 failure and succeeds on forward recovery in the disposable schema", async () => {
    const schema = await createSchema(admin, "lab4_mig03"); schemas.push(schema);
    const url = withSchema(testDatabaseUrl!, schema);
    const historical = prepareProject(false); tempRoots.push(historical.root);
    runPrisma(url, historical.schemaPath, "migrate", "deploy");
    const db = new PrismaClient({ datasources: { db: { url } } });
    try {
      const beforeTables = await db.$queryRawUnsafe<Array<{ table_name: string }>>(`SELECT table_name FROM information_schema.tables WHERE table_schema=current_schema() ORDER BY table_name`);
      const broken = prepareProject(true, true); tempRoots.push(broken.root);
      expect(() => runPrisma(url, broken.schemaPath, "migrate", "deploy")).toThrow();
      const afterFailureTables = await db.$queryRawUnsafe<Array<{ table_name: string }>>(`SELECT table_name FROM information_schema.tables WHERE table_schema=current_schema() ORDER BY table_name`);
      expect(afterFailureTables).toEqual(beforeTables);
      const actionTable = await db.$queryRawUnsafe<Array<{ count: bigint }>>(`SELECT COUNT(*)::bigint count FROM information_schema.tables WHERE table_schema=current_schema() AND table_name='ActionTaken'`);
      expect(actionTable).toEqual([{ count: 0n }]);
      runPrisma(url, broken.schemaPath, "migrate", "resolve", "--rolled-back", LAB4_MIGRATION);
      const recovered = prepareProject(true); tempRoots.push(recovered.root);
      runPrisma(url, recovered.schemaPath, "migrate", "deploy");
      expect(await db.$queryRawUnsafe<Array<{ count: bigint }>>(`SELECT COUNT(*)::bigint count FROM information_schema.tables WHERE table_schema=current_schema() AND table_name='ActionTaken'`)).toEqual([{ count: 1n }]);
    } finally { await db.$disconnect(); }
  }, 60_000);
});
