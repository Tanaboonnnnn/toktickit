import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { PrismaClient, UserRole } from "@prisma/client";
import request from "supertest";
import type { Express } from "express";
import { attachmentStorage } from "../../src/attachment-storage.js";
import { hashPassword } from "../../src/password.js";

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
  staff: { id: number; name: string; email: string };
  administrator: { id: number; name: string; email: string };
  categoryId: number;
  systemId: number;
  ticketId: number;
  foreignTicketId: number;
  root: string;
  tag: string;
  password: string;
}

const origin = "http://localhost:5173";

export async function createAttachmentFixture(prefix: string): Promise<AttachmentFixture> {
  const development = readEnv("DATABASE_URL");
  const test = readEnv("TEST_DATABASE_URL");
  if (!development || !test) throw new Error("DATABASE_URL and TEST_DATABASE_URL are required for Attachment API tests");
  if (databaseName(development) === databaseName(test)) throw new Error("TEST_DATABASE_URL must not resolve to the development database");
  process.env.DATABASE_URL = test;
  process.env.NODE_ENV = "test";
  process.env.FRONTEND_ORIGIN = origin;
  process.env.SESSION_SECRET = "attachment-test-only-session-secret-at-least-32-bytes";
  const root = await mkdtemp(path.join(os.tmpdir(), `toktickit-${prefix}-`));
  attachmentStorage.configure(root);
  const { app } = await import("../../src/app.js");
  const prisma = new PrismaClient({ datasources: { db: { url: test } } });
  await prisma.$connect();
  const tag = `${prefix}-${process.pid}-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const password = "Attachment-Test-Password-46!";
  const passwordHash = await hashPassword(password);
  const requesterA = await prisma.user.create({ data: { name: `${tag} A`, email: `${tag}-a@example.test`, role: UserRole.REQUESTER, active: true, passwordHash, mustChangePassword: false } });
  const requesterB = await prisma.user.create({ data: { name: `${tag} B`, email: `${tag}-b@example.test`, role: UserRole.REQUESTER, active: true, passwordHash, mustChangePassword: false } });
  const staff = await prisma.user.create({ data: { name: `${tag} Staff`, email: `${tag}-staff@example.test`, role: UserRole.IT_STAFF, active: true, passwordHash, mustChangePassword: false } });
  const administrator = await prisma.user.create({ data: { name: `${tag} Admin`, email: `${tag}-admin@example.test`, role: UserRole.ADMINISTRATOR, active: true, passwordHash, mustChangePassword: false } });
  const category = await prisma.category.create({ data: { name: `${tag} Category` } });
  const system = await prisma.relatedSystem.create({ data: { name: `${tag} System` } });
  const ticket = await prisma.ticket.create({ data: { ticketNumber: `TKT-20990101-${requesterA.id.toString().padStart(6, "0")}`, clientRequestId: randomUUID(), requesterId: requesterA.id, categoryId: category.id, relatedSystemId: system.id, summary: `${tag} ticket`, description: "A sufficiently detailed attachment fixture ticket.", requestedPriority: "LOW", itPriority: "LOW" } });
  const foreignTicket = await prisma.ticket.create({ data: { ticketNumber: `TKT-20990102-${requesterB.id.toString().padStart(6, "0")}`, clientRequestId: randomUUID(), requesterId: requesterB.id, categoryId: category.id, relatedSystemId: system.id, summary: `${tag} foreign ticket`, description: "A foreign attachment fixture ticket.", requestedPriority: "LOW", itPriority: "LOW" } });
  return { prisma, app, requesterA, requesterB, staff, administrator, categoryId: category.id, systemId: system.id, ticketId: ticket.id, foreignTicketId: foreignTicket.id, root, tag, password };
}

export async function destroyAttachmentFixture(fixture: AttachmentFixture): Promise<void> {
  await fixture.prisma.attachment.deleteMany({ where: { ticketId: { in: [fixture.ticketId, fixture.foreignTicketId] } } });
  await fixture.prisma.ticket.deleteMany({ where: { id: { in: [fixture.ticketId, fixture.foreignTicketId] } } });
  await fixture.prisma.category.deleteMany({ where: { name: { startsWith: fixture.tag } } });
  await fixture.prisma.relatedSystem.deleteMany({ where: { name: { startsWith: fixture.tag } } });
  const userIds = [fixture.requesterA.id, fixture.requesterB.id, fixture.staff.id, fixture.administrator.id];
  const sessions = await fixture.prisma.session.findMany({ select: { sid: true, sess: true } });
  const sessionIds = sessions
    .filter((row) => userIds.includes(Number((row.sess as Record<string, unknown>).userId)))
    .map((row) => row.sid);
  if (sessionIds.length > 0) await fixture.prisma.session.deleteMany({ where: { sid: { in: sessionIds } } });
  await fixture.prisma.user.deleteMany({ where: { email: { startsWith: fixture.tag } } });
  await fixture.prisma.$disconnect();
  await rm(fixture.root, { recursive: true, force: true });
}

export const bytes = {
  jpeg: Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01]),
  png: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
  webp: Buffer.from("RIFFxxxxWEBPdata"),
  pdf: Buffer.from("%PDF-1.7\nfixture"),
};

export async function authenticatedAgent(fixture: AttachmentFixture, user: { email: string }) {
  const agent = request.agent(fixture.app);
  const token = await csrf(agent);
  const loginResponse = await agent
    .post("/api/auth/login")
    .set("Origin", origin)
    .set("X-CSRF-Token", token)
    .send({ email: user.email, password: fixture.password });
  if (loginResponse.status !== 200) throw new Error(`Attachment test login failed: ${loginResponse.status}`);
  return agent;
}

export async function agentForRequester(fixture: AttachmentFixture, requesterId: number) {
  const user = requesterId === fixture.requesterA.id
    ? fixture.requesterA
    : requesterId === fixture.requesterB.id
      ? fixture.requesterB
      : undefined;
  if (!user) throw new Error(`Unknown Requester fixture id ${requesterId}`);
  return authenticatedAgent(fixture, user);
}

export async function csrf(agent: ReturnType<typeof request.agent>): Promise<string> {
  const response = await agent.get("/api/auth/csrf").set("Origin", origin);
  if (response.status !== 200 || typeof response.body.csrfToken !== "string") {
    throw new Error(`Unable to establish Attachment test CSRF session: ${response.status}`);
  }
  return response.body.csrfToken;
}

export async function upload(fixture: AttachmentFixture, requesterId: number, ticketId: number, data: Buffer, filename: string, mimeType?: string) {
  const agent = await agentForRequester(fixture, requesterId);
  const token = await csrf(agent);
  return agent
    .post(`/api/tickets/${ticketId}/attachments`)
    .set("Origin", origin)
    .set("X-CSRF-Token", token)
    .attach("file", data, { filename, contentType: mimeType });
}

export async function listAsRequester(fixture: AttachmentFixture, requesterId: number, ticketId: number) {
  const agent = await agentForRequester(fixture, requesterId);
  return agent.get(`/api/tickets/${ticketId}/attachments`);
}

export async function downloadAsRequester(fixture: AttachmentFixture, requesterId: number, ticketId: number, attachmentId: number) {
  const agent = await agentForRequester(fixture, requesterId);
  return agent.get(`/api/tickets/${ticketId}/attachments/${attachmentId}/download`);
}

export async function removeAsRequester(
  fixture: AttachmentFixture,
  requesterId: number,
  ticketId: number,
  attachmentId: number,
  removalReason: unknown,
) {
  const agent = await agentForRequester(fixture, requesterId);
  const token = await csrf(agent);
  return agent
    .delete(`/api/tickets/${ticketId}/attachments/${attachmentId}`)
    .set("Origin", origin)
    .set("X-CSRF-Token", token)
    .send({ removalReason });
}

export { origin };

export async function storedFiles(root: string): Promise<string[]> {
  return (await readdir(root)).filter((name) => !name.startsWith(".staging-"));
}

export async function storageEntries(root: string): Promise<string[]> {
  return readdir(root);
}
