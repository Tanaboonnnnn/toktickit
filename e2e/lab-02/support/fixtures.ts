import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "../../../server/node_modules/@prisma/client/index.js";

function readLocalEnv(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  const envPath = resolve(process.cwd(), "server/.env");
  if (!existsSync(envPath)) return undefined;
  const line = readFileSync(envPath, "utf8").split(/\r?\n/).find((candidate) => candidate.trimStart().startsWith(`${name}=`));
  return line?.slice(line.indexOf("=") + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
}

function databaseName(connectionString: string): string {
  const url = new URL(connectionString);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("E2E databases must use PostgreSQL URLs");
  const name = decodeURIComponent(url.pathname.replace(/^\/+/, "")).trim().toLowerCase();
  if (!name) throw new Error("E2E database URL must include a database name");
  return name;
}

function testDatabaseUrl(): string {
  const development = readLocalEnv("DATABASE_URL");
  const test = readLocalEnv("TEST_DATABASE_URL");
  if (!development || !test) throw new Error("DATABASE_URL and TEST_DATABASE_URL are required for E2E fixtures");
  if (databaseName(development) === databaseName(test)) throw new Error("TEST_DATABASE_URL must not resolve to the development database");
  return test;
}

export interface E2eFixture {
  prisma: PrismaClient;
  tag: string;
  requesterA: { id: number; name: string; email: string };
  requesterB: { id: number; name: string; email: string };
  category: { id: number; name: string };
  secondCategory: { id: number; name: string };
  relatedSystem: { id: number; name: string };
  tickets: Array<{ id: number; ticketNumber: string; summary: string }>;
}

function ticketNumber(): string {
  return `TKT-20990105-${randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase()}`;
}

export async function createE2eFixture(prefix: string, ticketCount = 1): Promise<E2eFixture> {
  const url = testDatabaseUrl();
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  await prisma.$connect();
  const tag = `e2e-${prefix}-${process.pid}-${Date.now()}-${randomUUID().slice(0, 6)}`;
  const requesterA = await prisma.requesterUser.create({ data: { name: `${tag} Requester A`, email: `${tag}-a@example.test`, active: true } });
  const requesterB = await prisma.requesterUser.create({ data: { name: `${tag} Requester B`, email: `${tag}-b@example.test`, active: true } });
  const category = await prisma.category.findFirst({ where: { name: "Hardware", active: true }, select: { id: true, name: true } });
  const relatedSystem = await prisma.relatedSystem.findFirst({ where: { name: "University Email", active: true }, select: { id: true, name: true } });
  if (!category || !relatedSystem) throw new Error("E2E fixtures require seeded Hardware and University Email reference data");
  const secondCategory = await prisma.category.create({ data: { name: `${tag} Software`, active: true }, select: { id: true, name: true } });
  const tickets = [];
  for (let i = 0; i < ticketCount; i += 1) {
    const summary = `${tag} ticket ${String(i + 1).padStart(2, "0")}`;
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: ticketNumber(),
        clientRequestId: randomUUID(),
        requesterId: requesterA.id,
        categoryId: i % 2 === 0 ? category.id : secondCategory.id,
        relatedSystemId: relatedSystem.id,
        summary,
        description: `${tag} detailed description ${i + 1}.`,
        requestedPriority: (i % 3 === 0 ? "LOW" : i % 3 === 1 ? "MEDIUM" : "HIGH"),
        createdAt: new Date(Date.UTC(2026, 0, 1, 9, i, 0)),
        updatedAt: new Date(Date.UTC(2026, 0, 2, 9, i, 0)),
      },
      select: { id: true, ticketNumber: true, summary: true },
    });
    tickets.push(ticket);
  }
  return { prisma, tag, requesterA, requesterB, category, secondCategory, relatedSystem, tickets };
}

export async function createOwnedTicket(fixture: E2eFixture, requesterId = fixture.requesterA.id, summary = `${fixture.tag} extra ticket`) {
  return fixture.prisma.ticket.create({
    data: {
      ticketNumber: ticketNumber(), clientRequestId: randomUUID(), requesterId,
      categoryId: fixture.category.id, relatedSystemId: fixture.relatedSystem.id,
      summary, description: `${fixture.tag} additional detailed description.`, requestedPriority: "LOW",
    },
    select: { id: true, ticketNumber: true, summary: true },
  });
}

export async function countFixtureTickets(fixture: E2eFixture, requesterId = fixture.requesterA.id): Promise<number> {
  return fixture.prisma.ticket.count({ where: { requesterId, summary: { startsWith: fixture.tag } } });
}

export async function createFixtureAttachment(fixture: E2eFixture, ticketId = fixture.tickets[0].id, removed = false, originalName = `${fixture.tag}-removed.pdf`) {
  return fixture.prisma.attachment.create({
    data: {
      ticketId,
      originalName,
      storedName: `${randomUUID()}.pdf`,
      mimeType: "application/pdf",
      sizeBytes: validBytes.pdf.length,
      removedAt: removed ? new Date("2026-01-04T09:00:00.000Z") : null,
      removalReason: removed ? "Superseded evidence" : null,
    },
  });
}

export async function destroyE2eFixture(fixture: E2eFixture): Promise<void> {
  const ticketIds = (await fixture.prisma.ticket.findMany({ where: { summary: { startsWith: fixture.tag } }, select: { id: true } })).map(({ id }) => id);
  if (ticketIds.length > 0) await fixture.prisma.attachment.deleteMany({ where: { ticketId: { in: ticketIds } } });
  await fixture.prisma.ticket.deleteMany({ where: { summary: { startsWith: fixture.tag } } });
  await fixture.prisma.category.deleteMany({ where: { id: fixture.secondCategory.id } });
  await fixture.prisma.requesterUser.deleteMany({ where: { id: { in: [fixture.requesterA.id, fixture.requesterB.id] } } });
  await fixture.prisma.$disconnect();
}

export const validBytes = {
  png: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
  jpeg: Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01]),
  webp: Buffer.from("RIFFxxxxWEBPdata"),
  pdf: Buffer.from("%PDF-1.7\nfixture"),
};
