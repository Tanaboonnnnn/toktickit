import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import type { Express } from "express";
import { attachmentStorage } from "../../src/attachment-storage.js";

function readEnv(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  const envPath = path.resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return undefined;
  const line = readFileSync(envPath, "utf8").split(/\r?\n/).find((value) => value.trimStart().startsWith(`${name}=`));
  return line?.slice(line.indexOf("=") + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
}

function databaseName(connectionString: string): string {
  const url = new URL(connectionString);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("Attachment tests require PostgreSQL URLs");
  return decodeURIComponent(url.pathname.replace(/^\/+/, "")).toLowerCase();
}

export interface AttachmentFixture {
  prisma: PrismaClient;
  app: Express;
  requesterA: { id: number; name: string; email: string };
  requesterB: { id: number; name: string; email: string };
  categoryId: number;
  systemId: number;
  ticketId: number;
  foreignTicketId: number;
  root: string;
  tag: string;
}

export async function createAttachmentFixture(prefix: string): Promise<AttachmentFixture> {
  const development = readEnv("DATABASE_URL");
  const test = readEnv("TEST_DATABASE_URL");
  if (!development || !test) throw new Error("DATABASE_URL and TEST_DATABASE_URL are required for Attachment API tests");
  if (databaseName(development) === databaseName(test)) throw new Error("TEST_DATABASE_URL must not resolve to the development database");
  process.env.DATABASE_URL = test;
  const root = await mkdtemp(path.join(os.tmpdir(), `toktickit-${prefix}-`));
  attachmentStorage.configure(root);
  const { app } = await import("../../src/app.js");
  const prisma = new PrismaClient({ datasources: { db: { url: test } } });
  await prisma.$connect();
  const tag = `${prefix}-${process.pid}-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const requesterA = await prisma.requesterUser.create({ data: { name: `${tag} A`, email: `${tag}-a@example.test` } });
  const requesterB = await prisma.requesterUser.create({ data: { name: `${tag} B`, email: `${tag}-b@example.test` } });
  const category = await prisma.category.create({ data: { name: `${tag} Category` } });
  const system = await prisma.relatedSystem.create({ data: { name: `${tag} System` } });
  const ticket = await prisma.ticket.create({ data: { ticketNumber: `TKT-20990101-${requesterA.id.toString().padStart(6, "0")}`, clientRequestId: randomUUID(), requesterId: requesterA.id, categoryId: category.id, relatedSystemId: system.id, summary: `${tag} ticket`, description: "A sufficiently detailed attachment fixture ticket.", requestedPriority: "LOW" } });
  const foreignTicket = await prisma.ticket.create({ data: { ticketNumber: `TKT-20990102-${requesterB.id.toString().padStart(6, "0")}`, clientRequestId: randomUUID(), requesterId: requesterB.id, categoryId: category.id, relatedSystemId: system.id, summary: `${tag} foreign ticket`, description: "A foreign attachment fixture ticket.", requestedPriority: "LOW" } });
  return { prisma, app, requesterA, requesterB, categoryId: category.id, systemId: system.id, ticketId: ticket.id, foreignTicketId: foreignTicket.id, root, tag };
}

export async function destroyAttachmentFixture(fixture: AttachmentFixture): Promise<void> {
  await fixture.prisma.attachment.deleteMany({ where: { ticketId: { in: [fixture.ticketId, fixture.foreignTicketId] } } });
  await fixture.prisma.ticket.deleteMany({ where: { id: { in: [fixture.ticketId, fixture.foreignTicketId] } } });
  await fixture.prisma.category.deleteMany({ where: { id: fixture.categoryId } });
  await fixture.prisma.relatedSystem.deleteMany({ where: { id: fixture.systemId } });
  await fixture.prisma.requesterUser.deleteMany({ where: { id: { in: [fixture.requesterA.id, fixture.requesterB.id] } } });
  await fixture.prisma.$disconnect();
  await rm(fixture.root, { recursive: true, force: true });
}

export const bytes = {
  jpeg: Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01]),
  png: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
  webp: Buffer.from("RIFFxxxxWEBPdata"),
  pdf: Buffer.from("%PDF-1.7\nfixture"),
};

export function upload(fixture: AttachmentFixture, requesterId: number, ticketId: number, data: Buffer, filename: string, mimeType?: string) {
  const req = request(fixture.app).post(`/api/tickets/${ticketId}/attachments`).set("X-Development-Requester-Id", String(requesterId));
  return req.attach("file", data, { filename, contentType: mimeType });
}

export async function storedFiles(root: string): Promise<string[]> {
  return (await readdir(root)).filter((name) => !name.startsWith(".staging-"));
}
