import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

function readLocalEnv(name: string): string | undefined {
  if (process.env[name]) return process.env[name];

  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return undefined;

  const envText = readFileSync(envPath, "utf8");
  const line = envText
    .split(/\r?\n/)
    .find((candidate) => candidate.trimStart().startsWith(`${name}=`));

  return line?.slice(line.indexOf("=") + 1).trim().replace(/^(["'])(.*)\1$/, "$2");
}

function databaseName(connectionString: string): string {
  const url = new URL(connectionString);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("Database URLs must use PostgreSQL");
  }

  const name = decodeURIComponent(url.pathname.replace(/^\/+/, "")).trim().toLowerCase();
  if (!name) throw new Error("Database URL must include a database name");
  return name;
}

function withSchema(connectionString: string, schema: string): string {
  const url = new URL(connectionString);
  url.searchParams.set("schema", schema);
  return url.toString();
}

const developmentDatabaseUrl = readLocalEnv("DATABASE_URL");
const testDatabaseUrl = readLocalEnv("TEST_DATABASE_URL");
let prisma: PrismaClient;
let adminPrisma: PrismaClient;
let isolatedTestDatabaseUrl = "";
let migrationSchemaName = "";
let migrationTargetWasClean = false;

function runPrisma(databaseUrl: string, ...args: string[]) {
  const prismaCli = resolve(process.cwd(), "node_modules/prisma/build/index.js");
  execFileSync(process.execPath, [prismaCli, ...args], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "pipe",
  });
}

beforeAll(async () => {
  if (!testDatabaseUrl) {
    throw new Error("TEST_DATABASE_URL is required for Lab 2 database integration tests");
  }
  if (!developmentDatabaseUrl) {
    throw new Error("DATABASE_URL is required for Lab 2 database integration tests");
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

  migrationSchemaName = `lab2_api19_${process.pid}_${Date.now()}`;
  adminPrisma = new PrismaClient({ datasources: { db: { url: testDatabaseUrl } } });
  await adminPrisma.$connect();
  await adminPrisma.$executeRawUnsafe(`CREATE SCHEMA "${migrationSchemaName}"`);

  isolatedTestDatabaseUrl = withSchema(testDatabaseUrl, migrationSchemaName);
  const migrationProbe = new PrismaClient({
    datasources: { db: { url: isolatedTestDatabaseUrl } },
  });
  try {
    await migrationProbe.$connect();
    const existingTables = await migrationProbe.$queryRaw<Array<{ table_count: bigint }>>`
      SELECT COUNT(*)::bigint AS table_count
      FROM information_schema.tables
      WHERE table_schema = current_schema()
    `;
    const migrationTable = await migrationProbe.$queryRaw<Array<{ table_name: string | null }>>`
      SELECT to_regclass('"_prisma_migrations"')::text AS table_name
    `;
    migrationTargetWasClean = Number(existingTables[0]?.table_count ?? -1) === 0
      && migrationTable[0]?.table_name === null;
  } finally {
    await migrationProbe.$disconnect();
  }

  runPrisma(isolatedTestDatabaseUrl, "migrate", "deploy", "--schema", "prisma/schema.prisma");
  prisma = new PrismaClient({ datasources: { db: { url: isolatedTestDatabaseUrl } } });
  await prisma.$connect();
}, 60_000);

afterAll(async () => {
  try {
    await prisma?.$disconnect();
  } finally {
    try {
      if (adminPrisma && migrationSchemaName) {
        await adminPrisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${migrationSchemaName}" CASCADE`);
      }
    } finally {
      await adminPrisma?.$disconnect();
    }
  }
}, 60_000);

describe("Lab 2 database migration and seed", () => {
  it("deploys the complete additive Lab 2 schema foundation", async () => {
    expect(migrationTargetWasClean).toBe(true);

    const migrations = await prisma.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name
      FROM "_prisma_migrations"
      WHERE finished_at IS NOT NULL
      ORDER BY migration_name
    `;
    expect(migrations.map(({ migration_name }) => migration_name)).toContainEqual(
      expect.stringMatching(/lab2_schema_foundation$/),
    );

    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = current_schema()
        AND table_name IN ('Category', 'RequesterUser', 'RelatedSystem', 'Ticket', 'Attachment')
      ORDER BY table_name
    `;
    expect(tables.map(({ table_name }) => table_name)).toEqual([
      "Attachment",
      "Category",
      "RelatedSystem",
      "RequesterUser",
      "Ticket",
    ]);

    const enumValues = await prisma.$queryRaw<Array<{ enum_name: string; enum_value: string }>>`
      SELECT type.typname AS enum_name, enum.enumlabel AS enum_value
      FROM pg_type AS type
      JOIN pg_enum AS enum ON type.oid = enum.enumtypid
      JOIN pg_namespace AS namespace ON namespace.oid = type.typnamespace
      WHERE namespace.nspname = current_schema()
        AND type.typname IN ('RequestedPriority', 'TicketStatus')
      ORDER BY type.typname, enum.enumsortorder
    `;
    expect(enumValues).toEqual([
      { enum_name: "RequestedPriority", enum_value: "LOW" },
      { enum_name: "RequestedPriority", enum_value: "MEDIUM" },
      { enum_name: "RequestedPriority", enum_value: "HIGH" },
      { enum_name: "TicketStatus", enum_value: "NEW" },
    ]);

    const columns = await prisma.$queryRaw<
      Array<{ table_name: string; column_name: string; is_nullable: "YES" | "NO" }>
    >`
      SELECT table_name, column_name, is_nullable
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name IN ('Category', 'RequesterUser', 'RelatedSystem', 'Ticket', 'Attachment')
      ORDER BY table_name, ordinal_position
    `;
    const columnContract = Object.fromEntries(
      columns.map(({ table_name, column_name, is_nullable }) => [
        `${table_name}.${column_name}`,
        is_nullable,
      ]),
    );
    expect(columnContract).toEqual({
      "Attachment.id": "NO",
      "Attachment.ticketId": "NO",
      "Attachment.originalName": "NO",
      "Attachment.storedName": "NO",
      "Attachment.mimeType": "NO",
      "Attachment.sizeBytes": "NO",
      "Attachment.createdAt": "NO",
      "Attachment.removedAt": "YES",
      "Attachment.removalReason": "YES",
      "Category.id": "NO",
      "Category.name": "NO",
      "Category.active": "NO",
      "Category.createdAt": "NO",
      "Category.updatedAt": "NO",
      "RequesterUser.id": "NO",
      "RequesterUser.name": "NO",
      "RequesterUser.email": "NO",
      "RequesterUser.active": "NO",
      "RequesterUser.createdAt": "NO",
      "RequesterUser.updatedAt": "NO",
      "RelatedSystem.id": "NO",
      "RelatedSystem.name": "NO",
      "RelatedSystem.active": "NO",
      "RelatedSystem.createdAt": "NO",
      "RelatedSystem.updatedAt": "NO",
      "Ticket.id": "NO",
      "Ticket.ticketNumber": "NO",
      "Ticket.clientRequestId": "NO",
      "Ticket.requesterId": "NO",
      "Ticket.categoryId": "NO",
      "Ticket.relatedSystemId": "NO",
      "Ticket.summary": "NO",
      "Ticket.description": "NO",
      "Ticket.requestedPriority": "NO",
      "Ticket.currentStatus": "NO",
      "Ticket.createdAt": "NO",
      "Ticket.updatedAt": "NO",
    });

    const indexes = await prisma.$queryRaw<
      Array<{ tablename: string; indexname: string; indexdef: string }>
    >`
      SELECT tablename, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = current_schema()
        AND tablename IN ('Category', 'RequesterUser', 'RelatedSystem', 'Ticket', 'Attachment')
    `;
    const normalizedIndexes = indexes.map(({ tablename, indexdef }) => ({
      tablename,
      definition: indexdef.replaceAll('"', "").replaceAll(/\s/g, ""),
    }));
    function hasIndex(table: string, columns: string, unique = false) {
      return normalizedIndexes.some(({ tablename, definition }) => (
        tablename === table
        && definition.includes(`(${columns})`)
        && (!unique || definition.includes("UNIQUE"))
      ));
    }
    expect(hasIndex("Category", "active,name")).toBe(true);
    expect(hasIndex("Category", "name", true)).toBe(true);
    expect(hasIndex("RequesterUser", "active,name")).toBe(true);
    expect(hasIndex("RequesterUser", "email", true)).toBe(true);
    expect(hasIndex("RelatedSystem", "active,name")).toBe(true);
    expect(hasIndex("RelatedSystem", "name", true)).toBe(true);
    expect(hasIndex("Ticket", "ticketNumber", true)).toBe(true);
    expect(hasIndex("Ticket", "clientRequestId", true)).toBe(true);
    expect(hasIndex("Ticket", "requesterId,updatedAt,id")).toBe(true);
    expect(hasIndex("Ticket", "requesterId,createdAt,id")).toBe(true);
    expect(hasIndex("Ticket", "requesterId,categoryId")).toBe(true);
    expect(hasIndex("Ticket", "requesterId,requestedPriority")).toBe(true);
    expect(hasIndex("Ticket", "requesterId,currentStatus")).toBe(true);
    expect(hasIndex("Attachment", "storedName", true)).toBe(true);
    expect(hasIndex("Attachment", "ticketId,removedAt,createdAt")).toBe(true);
    expect(hasIndex("Attachment", "ticketId,id")).toBe(true);

    const foreignKeys = await prisma.$queryRaw<
      Array<{ table_name: string; foreign_table_name: string; delete_rule: string }>
    >`
      SELECT
        constraint_table.table_name,
        foreign_table.table_name AS foreign_table_name,
        referential.delete_rule
      FROM information_schema.referential_constraints AS referential
      JOIN information_schema.table_constraints AS constraint_table
        ON constraint_table.constraint_catalog = referential.constraint_catalog
       AND constraint_table.constraint_schema = referential.constraint_schema
       AND constraint_table.constraint_name = referential.constraint_name
      JOIN information_schema.table_constraints AS foreign_table
        ON foreign_table.constraint_catalog = referential.unique_constraint_catalog
       AND foreign_table.constraint_schema = referential.unique_constraint_schema
       AND foreign_table.constraint_name = referential.unique_constraint_name
      WHERE constraint_table.constraint_schema = current_schema()
        AND constraint_table.table_name IN ('Ticket', 'Attachment')
      ORDER BY constraint_table.table_name, foreign_table.table_name
    `;
    expect(foreignKeys).toEqual([
      { table_name: "Attachment", foreign_table_name: "Ticket", delete_rule: "RESTRICT" },
      { table_name: "Ticket", foreign_table_name: "Category", delete_rule: "RESTRICT" },
      { table_name: "Ticket", foreign_table_name: "RelatedSystem", delete_rule: "RESTRICT" },
      { table_name: "Ticket", foreign_table_name: "RequesterUser", delete_rule: "RESTRICT" },
    ]);
  });

  it("seeds the required reference data idempotently without deleting unrelated rows", async () => {
    const categoryNames = ["Account and Access", "Hardware", "Software", "Network"];
    const relatedSystemNames = [
      "Student Portal",
      "Learning Management System",
      "Campus Wi-Fi",
      "University Email",
      "Library System",
      "Finance and Registration",
    ];
    const requesterFixtures = [
      { name: "Anan Student", email: "anan.student@example.test", active: true },
      { name: "Mali Student", email: "mali.student@example.test", active: true },
      { name: "Niran Student", email: "niran.student@example.test", active: true },
      { name: "Ploy Student", email: "ploy.student@example.test", active: true },
      { name: "Somchai Former Student", email: "somchai.former@example.test", active: false },
    ];
    const unrelatedCategoryName = "API-19 Unrelated Category";
    const unrelatedSystemName = "API-19 Unrelated System";
    const unrelatedRequesterEmail = "api-19-unrelated@example.test";
    const originalCategories = new Map<string, { id: number; name: string; active: boolean } | null>();
    const originalRelatedSystems = new Map<string, { id: number; name: string; active: boolean } | null>();
    const originalRequesters = new Map<string, { id: number; name: string; email: string; active: boolean } | null>();
    for (const name of categoryNames) {
      originalCategories.set(name, await prisma.category.findUnique({
        where: { name },
        select: { id: true, name: true, active: true },
      }));
    }
    for (const name of relatedSystemNames) {
      originalRelatedSystems.set(name, await prisma.relatedSystem.findUnique({
        where: { name },
        select: { id: true, name: true, active: true },
      }));
    }
    for (const requester of requesterFixtures) {
      originalRequesters.set(requester.email, await prisma.requesterUser.findUnique({
        where: { email: requester.email },
        select: { id: true, name: true, email: true, active: true },
      }));
    }
    const originalUnrelatedCategory = await prisma.category.findUnique({
      where: { name: unrelatedCategoryName },
      select: { id: true, name: true, active: true },
    });
    const originalUnrelatedSystem = await prisma.relatedSystem.findUnique({
      where: { name: unrelatedSystemName },
      select: { id: true, name: true, active: true },
    });
    const originalUnrelatedRequester = await prisma.requesterUser.findUnique({
      where: { email: unrelatedRequesterEmail },
      select: { id: true, name: true, email: true, active: true },
    });
    let createdUnrelatedCategoryId: number | undefined;
    let createdUnrelatedSystemId: number | undefined;
    let createdUnrelatedRequesterId: number | undefined;

    try {
      runPrisma(isolatedTestDatabaseUrl, "db", "seed", "--schema", "prisma/schema.prisma");

      expect(
        await prisma.category.findMany({
          where: { name: { in: categoryNames } },
          orderBy: { name: "asc" },
          select: { name: true, active: true },
        }),
      ).toEqual([...categoryNames].sort().map((name) => ({ name, active: true })));
      expect(
        await prisma.relatedSystem.findMany({
          where: { name: { in: relatedSystemNames } },
          orderBy: { name: "asc" },
          select: { name: true, active: true },
        }),
      ).toEqual([...relatedSystemNames].sort().map((name) => ({ name, active: true })));
      expect(
        await prisma.requesterUser.findMany({
          where: { email: { in: requesterFixtures.map(({ email }) => email) } },
          orderBy: { email: "asc" },
          select: { name: true, email: true, active: true },
        }),
      ).toEqual([...requesterFixtures].sort((a, b) => a.email.localeCompare(b.email)));

      await prisma.category.update({
        where: { name: "Hardware" },
        data: { active: false },
      });
      await prisma.relatedSystem.update({
        where: { name: "Campus Wi-Fi" },
        data: { active: false },
      });
      await prisma.requesterUser.update({
        where: { email: "anan.student@example.test" },
        data: { name: "Changed Name", active: false },
      });

      await prisma.category.upsert({
        where: { name: unrelatedCategoryName },
        update: {},
        create: { name: unrelatedCategoryName },
      });
      const unrelatedCategory = await prisma.category.findUnique({ where: { name: unrelatedCategoryName } });
      if (!originalUnrelatedCategory && unrelatedCategory) createdUnrelatedCategoryId = unrelatedCategory.id;
      await prisma.relatedSystem.upsert({
        where: { name: unrelatedSystemName },
        update: {},
        create: { name: unrelatedSystemName },
      });
      const unrelatedSystem = await prisma.relatedSystem.findUnique({ where: { name: unrelatedSystemName } });
      if (!originalUnrelatedSystem && unrelatedSystem) createdUnrelatedSystemId = unrelatedSystem.id;
      await prisma.requesterUser.upsert({
        where: { email: unrelatedRequesterEmail },
        update: {},
        create: { name: "API-19 Unrelated Requester", email: unrelatedRequesterEmail },
      });
      const unrelatedRequester = await prisma.requesterUser.findUnique({
        where: { email: unrelatedRequesterEmail },
      });
      if (!originalUnrelatedRequester && unrelatedRequester) {
        createdUnrelatedRequesterId = unrelatedRequester.id;
      }

      runPrisma(isolatedTestDatabaseUrl, "db", "seed", "--schema", "prisma/schema.prisma");

      expect(await prisma.category.count({ where: { name: { in: categoryNames } } })).toBe(4);
      expect(await prisma.relatedSystem.count({
        where: { name: { in: relatedSystemNames } },
      })).toBe(6);
      expect(await prisma.requesterUser.count({
        where: { email: { in: requesterFixtures.map(({ email }) => email) } },
      })).toBe(5);

      expect(await prisma.category.findUnique({ where: { name: "Hardware" } })).toMatchObject({
        name: "Hardware",
        active: true,
      });
      expect(
        await prisma.relatedSystem.findUnique({ where: { name: "Campus Wi-Fi" } }),
      ).toMatchObject({ name: "Campus Wi-Fi", active: true });
      expect(
        await prisma.requesterUser.findUnique({
          where: { email: "anan.student@example.test" },
        }),
      ).toMatchObject({
        name: "Anan Student",
        email: "anan.student@example.test",
        active: true,
      });

      expect(await prisma.category.findUnique({
        where: { name: unrelatedCategoryName },
      })).not.toBeNull();
      expect(await prisma.relatedSystem.findUnique({
        where: { name: unrelatedSystemName },
      })).not.toBeNull();
      expect(await prisma.requesterUser.findUnique({
        where: { email: unrelatedRequesterEmail },
      })).not.toBeNull();
    } finally {
      for (const original of originalRequesters.values()) {
        if (original) {
          await prisma.requesterUser.update({
            where: { id: original.id },
            data: { name: original.name, email: original.email, active: original.active },
          });
        }
      }
      for (const original of originalRelatedSystems.values()) {
        if (original) {
          await prisma.relatedSystem.update({
            where: { id: original.id },
            data: { name: original.name, active: original.active },
          });
        }
      }
      for (const original of originalCategories.values()) {
        if (original) {
          await prisma.category.update({
            where: { id: original.id },
            data: { name: original.name, active: original.active },
          });
        }
      }
      if (originalUnrelatedRequester) {
        await prisma.requesterUser.update({
          where: { id: originalUnrelatedRequester.id },
          data: {
            name: originalUnrelatedRequester.name,
            email: originalUnrelatedRequester.email,
            active: originalUnrelatedRequester.active,
          },
        });
      } else if (createdUnrelatedRequesterId) {
        await prisma.requesterUser.deleteMany({ where: { id: createdUnrelatedRequesterId } });
      }
      if (originalUnrelatedSystem) {
        await prisma.relatedSystem.update({
          where: { id: originalUnrelatedSystem.id },
          data: { name: originalUnrelatedSystem.name, active: originalUnrelatedSystem.active },
        });
      } else if (createdUnrelatedSystemId) {
        await prisma.relatedSystem.deleteMany({ where: { id: createdUnrelatedSystemId } });
      }
      if (originalUnrelatedCategory) {
        await prisma.category.update({
          where: { id: originalUnrelatedCategory.id },
          data: { name: originalUnrelatedCategory.name, active: originalUnrelatedCategory.active },
        });
      } else if (createdUnrelatedCategoryId) {
        await prisma.category.deleteMany({ where: { id: createdUnrelatedCategoryId } });
      }
    }
  }, 30_000);
});
