import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertDistinctTestDatabase } from "./support/database.js";

const LAB3_MIGRATION = "20260915173000_lab3_users_workflow";
const HISTORICAL_MIGRATIONS = [
  "20260805193129_init",
  "20260825002000_lab2_schema_foundation",
] as const;

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

function checksum(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function runPrisma(databaseUrl: string, schemaPath: string, ...args: string[]): void {
  const prismaCli = resolve(process.cwd(), "node_modules/prisma/build/index.js");
  execFileSync(process.execPath, [prismaCli, ...args, "--schema", schemaPath], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "pipe",
  });
}

function prepareMigrationProject(includeLab3: boolean): { root: string; schemaPath: string } {
  const root = mkdtempSync(join(tmpdir(), "toktickit-lab3-migration-"));
  const prismaDir = join(root, "prisma");
  const migrationsDir = join(prismaDir, "migrations");
  mkdirSync(migrationsDir, { recursive: true });
  cpSync(resolve(process.cwd(), "prisma/schema.prisma"), join(prismaDir, "schema.prisma"));

  for (const name of HISTORICAL_MIGRATIONS) {
    cpSync(
      resolve(process.cwd(), "prisma/migrations", name),
      join(migrationsDir, name),
      { recursive: true },
    );
  }
  const lock = resolve(process.cwd(), "prisma/migrations/migration_lock.toml");
  if (existsSync(lock)) cpSync(lock, join(migrationsDir, "migration_lock.toml"));

  if (includeLab3) {
    const source = resolve(process.cwd(), "prisma/migrations", LAB3_MIGRATION);
    expect(existsSync(source), `Expected Lab 3 migration ${LAB3_MIGRATION}`).toBe(true);
    cpSync(source, join(migrationsDir, LAB3_MIGRATION), { recursive: true });
  }
  return { root, schemaPath: join(prismaDir, "schema.prisma") };
}

async function createSchema(admin: PrismaClient, prefix: string): Promise<string> {
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
    for (const schema of schemas) {
      await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    }
  } finally {
    await admin?.$disconnect();
    for (const root of tempRoots) rmSync(root, { recursive: true, force: true });
  }
}, 60_000);

describe("MIG-01 / MIG-02 Lab 2 -> Lab 3 forward migration", () => {
  it("preserves populated Lab 2 records and Attachment bytes while backfilling Lab 3 state", async () => {
    const schema = await createSchema(admin, "lab3_mig01");
    schemas.push(schema);
    const url = withSchema(testDatabaseUrl!, schema);
    const historical = prepareMigrationProject(false);
    tempRoots.push(historical.root);
    runPrisma(url, historical.schemaPath, "migrate", "deploy");

    const db = new PrismaClient({ datasources: { db: { url } } });
    const uploadRoot = mkdtempSync(join(tmpdir(), "toktickit-lab3-upload-"));
    tempRoots.push(uploadRoot);
    const storedName = `${randomUUID()}.pdf`;
    const attachmentBytes = Buffer.from("%PDF-1.7\nLab 2 preserved attachment bytes\n", "utf8");
    writeFileSync(join(uploadRoot, storedName), attachmentBytes);
    const beforeChecksum = checksum(readFileSync(join(uploadRoot, storedName)));

    try {
      const category = await db.$queryRawUnsafe<Array<{ id: number }>>(
        `INSERT INTO "Category" ("name", "active", "createdAt", "updatedAt") VALUES ('Migration Hardware', true, NOW(), NOW()) RETURNING id`,
      );
      const system = await db.$queryRawUnsafe<Array<{ id: number }>>(
        `INSERT INTO "RelatedSystem" ("name", "active", "createdAt", "updatedAt") VALUES ('Migration Email', true, NOW(), NOW()) RETURNING id`,
      );
      const requester = await db.$queryRawUnsafe<Array<{ id: number }>>(
        `INSERT INTO "RequesterUser" ("name", "email", "active", "createdAt", "updatedAt") VALUES ('Legacy Requester', '  Legacy.User@Example.Test  ', false, NOW(), NOW()) RETURNING id`,
      );
      const ticket = await db.$queryRawUnsafe<Array<{ id: number }>>(
        `INSERT INTO "Ticket" ("ticketNumber", "clientRequestId", "requesterId", "categoryId", "relatedSystemId", "summary", "description", "requestedPriority", "currentStatus", "createdAt", "updatedAt") VALUES ('TKT-20990115-MIG001', '${randomUUID()}', ${requester[0].id}, ${category[0].id}, ${system[0].id}, 'Preserve me', 'Historical Lab 2 migration fixture description.', 'HIGH', 'NEW', NOW(), NOW()) RETURNING id`,
      );
      const attachment = await db.$queryRawUnsafe<Array<{ id: number }>>(
        `INSERT INTO "Attachment" ("ticketId", "originalName", "storedName", "mimeType", "sizeBytes", "createdAt") VALUES (${ticket[0].id}, 'legacy-proof.pdf', '${storedName}', 'application/pdf', ${attachmentBytes.length}, NOW()) RETURNING id`,
      );

      const before = {
        requesterId: requester[0].id,
        categoryId: category[0].id,
        systemId: system[0].id,
        ticketId: ticket[0].id,
        attachmentId: attachment[0].id,
      };

      const upgraded = prepareMigrationProject(true);
      tempRoots.push(upgraded.root);
      runPrisma(url, upgraded.schemaPath, "migrate", "deploy");

      const userRows = await db.$queryRawUnsafe<Array<{
        id: number; name: string; email: string; active: boolean; role: string;
        passwordHash: string | null; mustChangePassword: boolean; authVersion: number; version: number;
      }>>(`SELECT id, name, email, active, role::text, "passwordHash", "mustChangePassword", "authVersion", version FROM "RequesterUser" WHERE id = ${before.requesterId}`);
      expect(userRows).toEqual([{
        id: before.requesterId,
        name: "Legacy Requester",
        email: "legacy.user@example.test",
        active: false,
        role: "REQUESTER",
        passwordHash: null,
        mustChangePassword: true,
        authVersion: 1,
        version: 1,
      }]);

      const ticketRows = await db.$queryRawUnsafe<Array<{
        id: number; requesterId: number; categoryId: number; relatedSystemId: number;
        summary: string; requestedPriority: string; itPriority: string; currentStatus: string;
        ownerId: number | null; version: number;
      }>>(`SELECT id, "requesterId", "categoryId", "relatedSystemId", summary, "requestedPriority"::text, "itPriority"::text, "currentStatus"::text, "ownerId", version FROM "Ticket" WHERE id = ${before.ticketId}`);
      expect(ticketRows).toEqual([{
        id: before.ticketId,
        requesterId: before.requesterId,
        categoryId: before.categoryId,
        relatedSystemId: before.systemId,
        summary: "Preserve me",
        requestedPriority: "HIGH",
        itPriority: "HIGH",
        currentStatus: "NEW",
        ownerId: null,
        version: 1,
      }]);

      const attachmentRows = await db.$queryRawUnsafe<Array<{
        id: number; ticketId: number; originalName: string; storedName: string; sizeBytes: number;
      }>>(`SELECT id, "ticketId", "originalName", "storedName", "sizeBytes" FROM "Attachment" WHERE id = ${before.attachmentId}`);
      expect(attachmentRows).toEqual([{
        id: before.attachmentId,
        ticketId: before.ticketId,
        originalName: "legacy-proof.pdf",
        storedName,
        sizeBytes: attachmentBytes.length,
      }]);
      expect(checksum(readFileSync(join(uploadRoot, storedName)))).toBe(beforeChecksum);

      const enumValues = await db.$queryRawUnsafe<Array<{ enumlabel: string }>>(`
        SELECT e.enumlabel FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = current_schema() AND t.typname = 'TicketStatus'
        ORDER BY e.enumsortorder
      `);
      expect(enumValues.map(({ enumlabel }) => enumlabel)).toEqual([
        "NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER",
        "RESOLVED", "CLOSED", "REOPENED", "CANCELLED",
      ]);

      const tables = await db.$queryRawUnsafe<Array<{ table_name: string }>>(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = current_schema()
          AND table_name IN ('PublicComment', 'InternalNote', 'session')
        ORDER BY table_name
      `);
      expect(tables.map(({ table_name }) => table_name)).toEqual(["InternalNote", "PublicComment", "session"]);
    } finally {
      await db.$disconnect();
    }
  }, 60_000);

  it("aborts a canonical-email collision before changing product schema or data", async () => {
    const schema = await createSchema(admin, "lab3_mig02");
    schemas.push(schema);
    const url = withSchema(testDatabaseUrl!, schema);
    const historical = prepareMigrationProject(false);
    tempRoots.push(historical.root);
    runPrisma(url, historical.schemaPath, "migrate", "deploy");
    const db = new PrismaClient({ datasources: { db: { url } } });

    try {
      await db.$executeRawUnsafe(`
        INSERT INTO "RequesterUser" ("name", "email", "active", "createdAt", "updatedAt") VALUES
          ('Collision One', 'Case@Example.Test', true, NOW(), NOW()),
          ('Collision Two', ' case@example.test ', true, NOW(), NOW())
      `);
      const beforeEmails = await db.$queryRawUnsafe<Array<{ id: number; email: string }>>(
        `SELECT id, email FROM "RequesterUser" ORDER BY id`,
      );

      const upgraded = prepareMigrationProject(true);
      tempRoots.push(upgraded.root);
      expect(() => runPrisma(url, upgraded.schemaPath, "migrate", "deploy")).toThrow();

      const roleColumn = await db.$queryRawUnsafe<Array<{ count: bigint }>>(`
        SELECT COUNT(*)::bigint AS count FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'RequesterUser' AND column_name = 'role'
      `);
      expect(Number(roleColumn[0].count)).toBe(0);
      expect(await db.$queryRawUnsafe<Array<{ id: number; email: string }>>(
        `SELECT id, email FROM "RequesterUser" ORDER BY id`,
      )).toEqual(beforeEmails);

      const enumValues = await db.$queryRawUnsafe<Array<{ enumlabel: string }>>(`
        SELECT e.enumlabel FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = current_schema() AND t.typname = 'TicketStatus'
        ORDER BY e.enumsortorder
      `);
      expect(enumValues.map(({ enumlabel }) => enumlabel)).toEqual(["NEW"]);
    } finally {
      await db.$disconnect();
    }
  }, 60_000);
});
