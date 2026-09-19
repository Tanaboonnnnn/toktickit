import type { PrismaClient } from "@prisma/client";
import type { Express } from "express";
import request from "supertest";
import { hashPassword } from "../../../src/password.js";

export const testOrigin = "http://localhost:5173";
const testPassword = "Requester-Regression-Password-46!";
let passwordHashPromise: Promise<string> | undefined;

function passwordHash(): Promise<string> {
  passwordHashPromise ??= hashPassword(testPassword);
  return passwordHashPromise;
}

export function configureAuthenticatedTestRuntime(): void {
  process.env.NODE_ENV = "test";
  process.env.FRONTEND_ORIGIN = testOrigin;
  process.env.SESSION_SECRET ??= "requester-regression-test-session-secret-at-least-32-bytes";
}

export async function authenticatedRequester(
  app: Express,
  prisma: PrismaClient,
  requesterId: number,
): Promise<{ agent: ReturnType<typeof request.agent>; csrfToken: string }> {
  configureAuthenticatedTestRuntime();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: requesterId }, select: { email: true } });
  await prisma.user.update({
    where: { id: requesterId },
    data: {
      role: "REQUESTER",
      active: true,
      passwordHash: await passwordHash(),
      mustChangePassword: false,
    },
  });

  const agent = request.agent(app);
  const beforeLogin = await agent.get("/api/auth/csrf").set("Origin", testOrigin);
  if (beforeLogin.status !== 200 || typeof beforeLogin.body.csrfToken !== "string") {
    throw new Error(`Unable to establish pre-auth CSRF session: ${beforeLogin.status}`);
  }
  const login = await agent
    .post("/api/auth/login")
    .set("Origin", testOrigin)
    .set("X-CSRF-Token", beforeLogin.body.csrfToken)
    .send({ email: user.email, password: testPassword });
  if (login.status !== 200) throw new Error(`Authenticated Requester login failed: ${login.status}`);

  const afterLogin = await agent.get("/api/auth/csrf").set("Origin", testOrigin);
  if (afterLogin.status !== 200 || typeof afterLogin.body.csrfToken !== "string") {
    throw new Error(`Unable to establish authenticated CSRF session: ${afterLogin.status}`);
  }
  return { agent, csrfToken: afterLogin.body.csrfToken };
}

export async function deleteSessionsForUsers(prisma: PrismaClient, userIds: number[]): Promise<void> {
  if (userIds.length === 0) return;
  const sessions = await prisma.session.findMany({ select: { sid: true, sess: true } });
  const ids = sessions
    .filter((row) => userIds.includes(Number((row.sess as Record<string, unknown>).userId)))
    .map((row) => row.sid);
  if (ids.length > 0) await prisma.session.deleteMany({ where: { sid: { in: ids } } });
}
