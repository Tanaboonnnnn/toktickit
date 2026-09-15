import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hashPassword } from "../../src/password.js";
import {
  AUTH_ABSOLUTE_SESSION_MS,
  AUTH_IDLE_SESSION_MS,
  PREAUTH_SESSION_MS,
} from "../../src/auth/session.js";
import {
  createAuthFixture,
  csrf,
  destroyAuthFixture,
  login,
  type AuthFixture,
} from "./support/auth-fixture.js";

let fixture: AuthFixture;

beforeAll(async () => {
  fixture = await createAuthFixture();
});

afterAll(async () => {
  await destroyAuthFixture(fixture);
});

describe("AUTH-01 / AUTH-02 login and current-user API", () => {
  it("authenticates an active user and returns only the safe CurrentUser projection", async () => {
    const agent = request.agent(fixture.app);
    const response = await login(agent, fixture, fixture.staff.email);
    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      id: fixture.staff.id,
      email: fixture.staff.email,
      role: "IT_STAFF",
      mustChangePassword: false,
    });
    expect(Object.keys(response.body.user).sort()).toEqual([
      "email",
      "id",
      "mustChangePassword",
      "name",
      "role",
    ]);
    expect(JSON.stringify(response.body)).not.toMatch(/passwordHash|authVersion|session|secret/i);
    expect(String(response.headers["set-cookie"])).toMatch(/toktickit\.lab3\.sid=.*HttpOnly.*SameSite=Lax/i);

    const me = await agent.get("/api/auth/me").expect(200);
    expect(me.body).toEqual(response.body);
    expect(me.headers["cache-control"]).toBe("no-store");
  });

  it("uses one invalid-credential response for wrong, unknown, and unprovisioned credentials", async () => {
    const attempts = [
      [fixture.normalRequester.email, "wrong-password-value"],
      [`missing-${Date.now()}@example.test`, "wrong-password-value"],
      [fixture.unprovisionedRequester.email, fixture.password],
    ] as const;
    for (const [email, password] of attempts) {
      const response = await login(request.agent(fixture.app), fixture, email, password);
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" },
      });
      expect(JSON.stringify(response.body)).not.toMatch(/role|active|hash|prisma|sql|session/i);
    }
  });

  it("reveals inactive status only after the inactive account supplied the correct credential", async () => {
    const wrong = await login(
      request.agent(fixture.app),
      fixture,
      fixture.inactiveRequester.email,
      "wrong-password-value",
    );
    expect(wrong.status).toBe(401);
    expect(wrong.body.error.code).toBe("INVALID_CREDENTIALS");

    const correct = await login(request.agent(fixture.app), fixture, fixture.inactiveRequester.email);
    expect(correct.status).toBe(403);
    expect(correct.body.error.code).toBe("ACCOUNT_INACTIVE");
    expect(JSON.stringify(correct.body)).not.toMatch(/password|hash|role|prisma|sql/i);
  });
});

describe("AUTH-03 mandatory password change", () => {
  it("permits me/change-password, rotates credentials, and clears mustChangePassword", async () => {
    const agent = request.agent(fixture.app);
    const staleAgent = request.agent(fixture.app);
    const signedIn = await login(agent, fixture, fixture.requester.email);
    expect(signedIn.status).toBe(200);
    expect(signedIn.body.user.mustChangePassword).toBe(true);
    expect((await login(staleAgent, fixture, fixture.requester.email)).status).toBe(200);
    await agent.get("/api/auth/me").expect(200);

    const token = await csrf(agent, fixture);
    const changed = await agent
      .post("/api/auth/change-password")
      .set("Origin", fixture.origin)
      .set("X-CSRF-Token", token)
      .send({
        currentPassword: fixture.password,
        newPassword: "Replacement-Password-44!",
        confirmPassword: "Replacement-Password-44!",
      })
      .expect(200);
    expect(changed.body.user.mustChangePassword).toBe(false);
    expect(JSON.stringify(changed.body)).not.toMatch(/passwordHash|authVersion|session|secret/i);

    const stale = await staleAgent.get("/api/auth/me");
    expect(stale.status).toBe(401);
    expect(stale.body.error.code).toBe("AUTHENTICATION_REQUIRED");

    expect((await login(request.agent(fixture.app), fixture, fixture.requester.email)).status).toBe(401);
    expect((await login(
      request.agent(fixture.app),
      fixture,
      fixture.requester.email,
      "Replacement-Password-44!",
    )).status).toBe(200);
  });

  it("rejects wrong-current and same-as-current password changes without updating the account", async () => {
    const agent = request.agent(fixture.app);
    expect((await login(agent, fixture, fixture.normalRequester.email)).status).toBe(200);

    let token = await csrf(agent, fixture);
    const wrong = await agent
      .post("/api/auth/change-password")
      .set("Origin", fixture.origin)
      .set("X-CSRF-Token", token)
      .send({
        currentPassword: "Wrong-Current-Password!",
        newPassword: "Replacement-Password-44!",
        confirmPassword: "Replacement-Password-44!",
      });
    expect(wrong.status).toBe(400);
    expect(wrong.body.error.fieldErrors.currentPassword).toBeDefined();

    token = await csrf(agent, fixture);
    const same = await agent
      .post("/api/auth/change-password")
      .set("Origin", fixture.origin)
      .set("X-CSRF-Token", token)
      .send({
        currentPassword: fixture.password,
        newPassword: fixture.password,
        confirmPassword: fixture.password,
      });
    expect(same.status).toBe(400);
    expect(same.body.error.fieldErrors.newPassword).toBeDefined();
    expect((await login(request.agent(fixture.app), fixture, fixture.normalRequester.email)).status).toBe(200);
  });
});

describe("AUTH-04 session lifecycle", () => {
  it("destroys the authenticated session on logout and keeps repeated logged-out logout harmless", async () => {
    const agent = request.agent(fixture.app);
    expect((await login(agent, fixture, fixture.administrator.email)).status).toBe(200);
    const token = await csrf(agent, fixture);
    await agent
      .post("/api/auth/logout")
      .set("Origin", fixture.origin)
      .set("X-CSRF-Token", token)
      .expect(204);
    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(401);
    expect(me.body.error.code).toBe("AUTHENTICATION_REQUIRED");
    await agent.post("/api/auth/logout").expect(204);
  });

  it("re-reads reset/role/email/authVersion and activation on every protected request", async () => {
    const agent = request.agent(fixture.app);
    expect((await login(agent, fixture, fixture.staff.email)).status).toBe(200);
    await fixture.prisma.user.update({
      where: { id: fixture.staff.id },
      data: {
        authVersion: { increment: 1 },
        email: `changed-${fixture.staff.email}`,
        role: "ADMINISTRATOR",
      },
    });
    const stale = await agent.get("/api/auth/me");
    expect(stale.status).toBe(401);
    expect(stale.body.error.code).toBe("AUTHENTICATION_REQUIRED");

    const requesterAgent = request.agent(fixture.app);
    expect((await login(requesterAgent, fixture, fixture.normalRequester.email)).status).toBe(200);
    const resetPassword = "Reset-Password-For-Auth04!";
    await fixture.prisma.user.update({
      where: { id: fixture.normalRequester.id },
      data: {
        passwordHash: await hashPassword(resetPassword),
        mustChangePassword: true,
        authVersion: { increment: 1 },
      },
    });
    const resetStale = await requesterAgent.get("/api/auth/me");
    expect(resetStale.status).toBe(401);
    expect(resetStale.body.error.code).toBe("AUTHENTICATION_REQUIRED");

    const resetAgent = request.agent(fixture.app);
    expect((await login(resetAgent, fixture, fixture.normalRequester.email, resetPassword)).status).toBe(200);
    await fixture.prisma.user.update({ where: { id: fixture.normalRequester.id }, data: { active: false } });
    const inactive = await resetAgent.get("/api/auth/me");
    expect(inactive.status).toBe(401);
    expect(inactive.body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("rejects a session whose absolute expiry is already in the past", async () => {
    const agent = request.agent(fixture.app);
    expect((await login(agent, fixture, fixture.administrator.email)).status).toBe(200);
    const sessions = await fixture.prisma.session.findMany();
    const owned = sessions.find((row) =>
      Number((row.sess as Record<string, unknown>).userId) === fixture.administrator.id,
    );
    expect(owned).toBeDefined();
    await fixture.prisma.session.update({
      where: { sid: owned!.sid },
      data: { sess: { ...(owned!.sess as Record<string, unknown>), absoluteExpiresAt: Date.now() - 1 } },
    });
    const response = await agent.get("/api/auth/me");
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("stores authenticated sessions with a 30-minute idle expiry and rejects an expired store row", async () => {
    const agent = request.agent(fixture.app);
    const beforeIds = new Set((await fixture.prisma.session.findMany({ select: { sid: true } })).map((row) => row.sid));
    const startedAt = Date.now();
    expect((await login(agent, fixture, fixture.administrator.email)).status).toBe(200);
    const stored = (await fixture.prisma.session.findMany({ select: { sid: true, sess: true, expire: true } }))
      .find((row) => !beforeIds.has(row.sid) && Number((row.sess as Record<string, unknown>).userId) === fixture.administrator.id);
    expect(stored).toBeDefined();
    expect(stored!.expire.getTime()).toBeGreaterThanOrEqual(startedAt + AUTH_IDLE_SESSION_MS - 2_000);
    expect(stored!.expire.getTime()).toBeLessThanOrEqual(Date.now() + AUTH_IDLE_SESSION_MS + 2_000);

    await fixture.prisma.session.update({
      where: { sid: stored!.sid },
      data: { expire: new Date(Date.now() - 1) },
    });
    const expired = await agent.get("/api/auth/me");
    expect(expired.status).toBe(401);
    expect(expired.body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("refreshes authenticated idle expiry but never beyond the remaining absolute lifetime", async () => {
    const agent = request.agent(fixture.app);
    const beforeIds = new Set((await fixture.prisma.session.findMany({ select: { sid: true } })).map((row) => row.sid));
    expect((await login(agent, fixture, fixture.administrator.email)).status).toBe(200);
    let stored = (await fixture.prisma.session.findMany({ select: { sid: true, sess: true, expire: true } }))
      .find((row) => !beforeIds.has(row.sid) && Number((row.sess as Record<string, unknown>).userId) === fixture.administrator.id);
    expect(stored).toBeDefined();
    const payload = stored!.sess as Record<string, unknown>;
    expect(Number(payload.absoluteExpiresAt)).toBeGreaterThanOrEqual(Date.now() + AUTH_ABSOLUTE_SESSION_MS - 2_000);

    await fixture.prisma.session.update({
      where: { sid: stored!.sid },
      data: { expire: new Date(Date.now() + 60_000) },
    });
    const refreshedAt = Date.now();
    await agent.get("/api/auth/me").expect(200);
    stored = await fixture.prisma.session.findUniqueOrThrow({ where: { sid: stored!.sid } });
    expect(stored.expire.getTime()).toBeGreaterThanOrEqual(refreshedAt + AUTH_IDLE_SESSION_MS - 2_000);
    expect(stored.expire.getTime()).toBeLessThanOrEqual(Date.now() + AUTH_IDLE_SESSION_MS + 2_000);

    const absoluteCap = Date.now() + 90_000;
    await fixture.prisma.session.update({
      where: { sid: stored.sid },
      data: {
        sess: { ...(stored.sess as Record<string, unknown>), absoluteExpiresAt: absoluteCap },
        expire: new Date(Date.now() + AUTH_IDLE_SESSION_MS),
      },
    });
    await agent.get("/api/auth/me").expect(200);
    const capped = await fixture.prisma.session.findUniqueOrThrow({ where: { sid: stored.sid } });
    expect(capped.expire.getTime()).toBeGreaterThan(Date.now());
    expect(capped.expire.getTime()).toBeLessThanOrEqual(absoluteCap + 2_000);
  });
});

describe("AUTH-05 CSRF, Origin and exact CORS", () => {
  it("stores pre-authentication CSRF sessions with a 10-minute lifetime", async () => {
    const agent = request.agent(fixture.app);
    const startedAt = Date.now();
    const token = await csrf(agent, fixture);
    const stored = (await fixture.prisma.session.findMany({ select: { sid: true, sess: true, expire: true } }))
      .find((row) => (row.sess as Record<string, unknown>).csrfToken === token);
    expect(stored).toBeDefined();
    expect(stored!.expire.getTime()).toBeGreaterThanOrEqual(startedAt + PREAUTH_SESSION_MS - 2_000);
    expect(stored!.expire.getTime()).toBeLessThanOrEqual(Date.now() + PREAUTH_SESSION_MS + 2_000);
    await fixture.prisma.session.delete({ where: { sid: stored!.sid } });
  });

  it("returns credentialed CORS only for the configured frontend origin", async () => {
    const allowed = await request(fixture.app).get("/api/auth/csrf").set("Origin", fixture.origin).expect(200);
    expect(allowed.headers["access-control-allow-origin"]).toBe(fixture.origin);
    expect(allowed.headers["access-control-allow-credentials"]).toBe("true");

    const denied = await request(fixture.app).get("/api/auth/csrf").set("Origin", "http://evil.example.test").expect(200);
    expect(denied.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("rejects login before credential evaluation when Origin or CSRF is invalid", async () => {
    const agent = request.agent(fixture.app);
    const token = await csrf(agent, fixture);
    const responses = [
      await agent.post("/api/auth/login").set("Origin", fixture.origin).send({ email: fixture.administrator.email, password: fixture.password }),
      await agent.post("/api/auth/login").set("Origin", fixture.origin).set("X-CSRF-Token", "wrong-token").send({ email: fixture.administrator.email, password: fixture.password }),
      await agent.post("/api/auth/login").set("Origin", "http://evil.example.test").set("X-CSRF-Token", token).send({ email: fixture.administrator.email, password: fixture.password }),
    ];
    for (const response of responses) {
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe("CSRF_INVALID");
    }
    expect((await agent.get("/api/auth/me")).status).toBe(401);
  });

  it("keeps malformed auth JSON inside the safe no-store auth error contract", async () => {
    const agent = request.agent(fixture.app);
    const token = await csrf(agent, fixture);
    const response = await agent
      .post("/api/auth/login")
      .set("Origin", fixture.origin)
      .set("X-CSRF-Token", token)
      .set("Content-Type", "application/json")
      .send('{"email":');
    expect(response.status).toBe(400);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers["access-control-allow-origin"]).toBe(fixture.origin);
    expect(response.body).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        fieldErrors: { body: "Request body must be valid JSON" },
      },
    });
  });
});
