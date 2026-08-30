import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import type { Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

function readLocalEnv(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return undefined;
  const line = readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((candidate) => candidate.trimStart().startsWith(`${name}=`));
  return line?.slice(line.indexOf("=") + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
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

const developmentDatabaseUrl = readLocalEnv("DATABASE_URL");
const testDatabaseUrl = readLocalEnv("TEST_DATABASE_URL");
const tag = `api20-${process.pid}-${Date.now()}-${randomUUID().slice(0, 8)}`;

let app: Express;
let prisma: PrismaClient;
let routePrisma: PrismaClient;
let requesterId: number;
let ticketId: number;
let attachmentId: number;
let categoryId: number;
let systemId: number;

function expectSafe500(response: request.Response, message: string): void {
  expect(response.status).toBe(500);
  expect(response.body).toEqual({ error: { code: "INTERNAL_ERROR", message } });
  expect(JSON.stringify(response.body)).not.toMatch(
    /Prisma|SQL|postgres|DATABASE_URL|filesystem|storedName|stack|Error:|[A-Z]:\\|password|secret/i,
  );
}

beforeAll(async () => {
  if (!developmentDatabaseUrl || !testDatabaseUrl) {
    throw new Error("DATABASE_URL and TEST_DATABASE_URL are required for Lab 2 API tests");
  }
  if (databaseName(developmentDatabaseUrl) === databaseName(testDatabaseUrl)) {
    throw new Error("TEST_DATABASE_URL must not resolve to the development database");
  }

  process.env.DATABASE_URL = testDatabaseUrl;
  prisma = new PrismaClient({ datasources: { db: { url: testDatabaseUrl } } });
  await prisma.$connect();
  const requester = await prisma.requesterUser.create({
    data: { name: `${tag} Requester`, email: `${tag}@example.test`, active: true },
  });
  const category = await prisma.category.create({ data: { name: `${tag} Category`, active: true } });
  const system = await prisma.relatedSystem.create({ data: { name: `${tag} System`, active: true } });
  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber: `TKT-20990103-${String(requester.id).padStart(6, "0")}`,
      clientRequestId: randomUUID(),
      requesterId: requester.id,
      categoryId: category.id,
      relatedSystemId: system.id,
      summary: `${tag} ticket`,
      description: "A sufficiently detailed API-20 failure fixture ticket.",
      requestedPriority: "LOW",
    },
  });
  const attachment = await prisma.attachment.create({
    data: {
      ticketId: ticket.id,
      originalName: "api20.png",
      storedName: `${randomUUID()}.png`,
      mimeType: "image/png",
      sizeBytes: 8,
    },
  });
  requesterId = requester.id;
  ticketId = ticket.id;
  attachmentId = attachment.id;
  categoryId = category.id;
  systemId = system.id;

  ({ app } = await import("../../src/app.js"));
  const { getPrisma } = await import("../../src/prisma.js");
  routePrisma = getPrisma();
});

afterAll(async () => {
  await prisma?.attachment.deleteMany({ where: { id: attachmentId } });
  await prisma?.ticket.deleteMany({ where: { id: ticketId } });
  await prisma?.category.deleteMany({ where: { id: categoryId } });
  await prisma?.relatedSystem.deleteMany({ where: { id: systemId } });
  await prisma?.requesterUser.deleteMany({ where: { id: requesterId } });
  await prisma?.$disconnect();
});

describe("API-20 safe unexpected failures", () => {
  it("serializes a reference-data failure without internals", async () => {
    const spy = vi.spyOn(routePrisma.category, "findMany").mockRejectedValueOnce(
      new Error("Prisma SQL postgres://user:secret@host/db C:\\private\\categories"),
    );
    const response = await request(app).get("/api/categories");
    expectSafe500(response, "Unable to load categories");
    spy.mockRestore();
  });

  it("serializes a My Tickets failure without internals", async () => {
    const spy = vi.spyOn(routePrisma.ticket, "count").mockRejectedValueOnce(
      new Error("DATABASE_URL=postgresql://user:secret@host/db Prisma stack"),
    );
    const response = await request(app)
      .get("/api/tickets")
      .set("X-Development-Requester-Id", String(requesterId));
    expectSafe500(response, "Unable to load tickets");
    spy.mockRestore();
  });

  it("serializes a Ticket Detail failure without internals", async () => {
    const spy = vi.spyOn(routePrisma.ticket, "findFirst").mockRejectedValueOnce(
      new Error("Prisma query failed at C:\\private\\ticket.sql"),
    );
    const response = await request(app)
      .get(`/api/tickets/${ticketId}`)
      .set("X-Development-Requester-Id", String(requesterId));
    expectSafe500(response, "Unable to load ticket");
    spy.mockRestore();
  });

  it("serializes Attachment metadata failure without internals", async () => {
    const spy = vi.spyOn(routePrisma.attachment, "findMany").mockRejectedValueOnce(
      new Error("storedName /var/private/secret Prisma error"),
    );
    const response = await request(app)
      .get(`/api/tickets/${ticketId}/attachments`)
      .set("X-Development-Requester-Id", String(requesterId));
    expectSafe500(response, "Unable to load attachments");
    spy.mockRestore();
  });

  it("serializes Attachment removal failure without internals", async () => {
    const spy = vi.spyOn(routePrisma, "$transaction").mockRejectedValueOnce(
      new Error("Prisma SQL password=secret C:\\private\\remove"),
    );
    const response = await request(app)
      .delete(`/api/tickets/${ticketId}/attachments/${attachmentId}`)
      .set("X-Development-Requester-Id", String(requesterId))
      .send({ removalReason: "valid removal reason" });
    expectSafe500(response, "Unable to remove attachment");
    spy.mockRestore();
  });
});
