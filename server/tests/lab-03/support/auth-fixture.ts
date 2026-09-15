import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient, UserRole } from "@prisma/client";
import type { Express } from "express";
import request from "supertest";
import { hashPassword } from "../../../src/password.js";
import { assertDistinctTestDatabase } from "./database.js";

const origin = "http://localhost:5173";
const prefix = `issue44-${process.pid}-${Date.now()}`;

function readLocalEnv(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return undefined;
  const line = readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((candidate) => candidate.trimStart().startsWith(`${name}=`));
  return line?.slice(line.indexOf("=") + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
}

export interface AuthFixture {
  app: Express;
  prisma: PrismaClient;
  origin: string;
  password: string;
  requester: { id: number; email: string };
  normalRequester: { id: number; email: string };
  inactiveRequester: { id: number; email: string };
  unprovisionedRequester: { id: number; email: string };
  staff: { id: number; email: string };
  administrator: { id: number; email: string };
}

export async function createAuthFixture(): Promise<AuthFixture> {
  const developmentUrl = readLocalEnv("DATABASE_URL");
  const testUrl = readLocalEnv("TEST_DATABASE_URL");
  assertDistinctTestDatabase({ developmentUrl, testUrl });
  process.env.DATABASE_URL = testUrl;
  process.env.NODE_ENV = "test";
  process.env.FRONTEND_ORIGIN = origin;
  process.env.SESSION_SECRET = "issue44-test-only-session-secret-at-least-32-bytes";

  const prisma = new PrismaClient({ datasources: { db: { url: testUrl! } } });
  await prisma.$connect();
  const password = "Initial-Password-44!";
  const passwordHash = await hashPassword(password);

  async function upsertUser(label: string, role: UserRole, active: boolean, provisioned = true, mustChangePassword = true) {
    const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const email = `${prefix}-${slug}@example.test`;
    const user = await prisma.user.upsert({
      where: { email },
      update: { name: label, role, active, passwordHash: provisioned ? passwordHash : null, mustChangePassword, authVersion: 1 },
      create: { name: label, email, role, active, passwordHash: provisioned ? passwordHash : null, mustChangePassword, authVersion: 1 },
      select: { id: true, email: true },
    });
    return user;
  }

  const requester = await upsertUser("Requester Initial", UserRole.REQUESTER, true, true, true);
  const normalRequester = await upsertUser("Requester Normal", UserRole.REQUESTER, true, true, false);
  const inactiveRequester = await upsertUser("Requester Inactive", UserRole.REQUESTER, false, true, true);
  const unprovisionedRequester = await upsertUser("Requester Unprovisioned", UserRole.REQUESTER, true, false, true);
  const staff = await upsertUser("IT Staff", UserRole.IT_STAFF, true, true, false);
  const administrator = await upsertUser("Administrator", UserRole.ADMINISTRATOR, true, true, false);

  const { app } = await import("../../../src/app.js");
  return { app, prisma, origin, password, requester, normalRequester, inactiveRequester, unprovisionedRequester, staff, administrator };
}

export async function destroyAuthFixture(fixture: AuthFixture): Promise<void> {
  const ownedUserIds = [
    fixture.requester.id,
    fixture.normalRequester.id,
    fixture.inactiveRequester.id,
    fixture.unprovisionedRequester.id,
    fixture.staff.id,
    fixture.administrator.id,
  ];
  const sessions = await fixture.prisma.session.findMany({ select: { sid: true, sess: true } });
  const ownedSessionIds = sessions
    .filter((row) => ownedUserIds.includes(Number((row.sess as Record<string, unknown>).userId)))
    .map((row) => row.sid);
  if (ownedSessionIds.length > 0) {
    await fixture.prisma.session.deleteMany({ where: { sid: { in: ownedSessionIds } } });
  }
  await fixture.prisma.user.deleteMany({ where: { id: { in: ownedUserIds } } });
  await fixture.prisma.$disconnect();
}

export async function csrf(agent: ReturnType<typeof request.agent>, fixture: AuthFixture): Promise<string> {
  const response = await agent.get("/api/auth/csrf").set("Origin", fixture.origin);
  if (response.status !== 200 || typeof response.body.csrfToken !== "string") {
    throw new Error(`Unable to establish CSRF session: ${response.status}`);
  }
  return response.body.csrfToken;
}

export async function login(
  agent: ReturnType<typeof request.agent>,
  fixture: AuthFixture,
  email: string,
  password = fixture.password,
) {
  const token = await csrf(agent, fixture);
  return agent.post("/api/auth/login")
    .set("Origin", fixture.origin)
    .set("X-CSRF-Token", token)
    .send({ email, password });
}
