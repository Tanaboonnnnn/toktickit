import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../../src/password.js";
import type { AuthFixture } from "./support/auth-fixture.js";
import { createAuthFixture, csrf, destroyAuthFixture, login } from "./support/auth-fixture.js";

let fixture: AuthFixture;
const createdUserIds: number[] = [];

async function loggedIn(email: string) {
  const agent = request.agent(fixture.app);
  expect((await login(agent, fixture, email)).status).toBe(200);
  return agent;
}

beforeAll(async () => {
  fixture = await createAuthFixture();
});

afterAll(async () => {
  if (!fixture) return;
  if (createdUserIds.length > 0) await fixture.prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await destroyAuthFixture(fixture);
});

describe("USER-01 Administrator User Management API", () => {
  it("lists safe users with documented search/role filtering and denies non-Administrators", async () => {
    const administrator = await loggedIn(fixture.administrator.email);
    const response = await administrator
      .get("/api/admin/users")
      .query({ search: fixture.staff.email, role: "IT_STAFF" });

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]).toEqual({
      id: fixture.staff.id,
      name: "IT Staff",
      email: fixture.staff.email,
      role: "IT_STAFF",
      mustChangePassword: false,
      active: true,
      version: expect.any(Number),
    });
    expect(response.body.items[0]).not.toHaveProperty("passwordHash");
    expect(response.body.items[0]).not.toHaveProperty("authVersion");

    const repeated = await administrator.get("/api/admin/users?role=IT_STAFF&role=REQUESTER");
    expect(repeated.status).toBe(400);
    expect(repeated.body.error.code).toBe("VALIDATION_ERROR");

    const requester = await loggedIn(fixture.normalRequester.email);
    const denied = await requester.get("/api/admin/users");
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe("FORBIDDEN");

    const staffAgent = await loggedIn(fixture.staff.email);
    const staffDenied = await staffAgent.get("/api/admin/users");
    expect(staffDenied.status).toBe(403);
    expect(staffDenied.body.error.code).toBe("FORBIDDEN");

    const pendingAdmin = await fixture.prisma.user.create({
      data: {
        name: "Issue 50 Pending Admin",
        email: `issue50-pending-admin-${process.pid}-${Date.now()}@example.test`,
        role: "ADMINISTRATOR",
        active: true,
        passwordHash: await hashPassword(fixture.password),
        mustChangePassword: true,
      },
      select: { id: true, email: true },
    });
    createdUserIds.push(pendingAdmin.id);
    const pendingAgent = request.agent(fixture.app);
    expect((await login(pendingAgent, fixture, pendingAdmin.email)).status).toBe(200);
    const pendingDenied = await pendingAgent.get("/api/admin/users");
    expect(pendingDenied.status).toBe(403);
    expect(pendingDenied.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
  });

  it("creates a canonical User with one role, a hashed initial password, and no secret fields", async () => {
    const administrator = await loggedIn(fixture.administrator.email);
    const token = await csrf(administrator, fixture);
    const email = `  ISSUE50-${process.pid}-${Date.now()}@Example.Test  `;
    const initialPassword = "Issue50 Initial Password!";
    const response = await administrator
      .post("/api/admin/users")
      .set("Origin", fixture.origin)
      .set("X-CSRF-Token", token)
      .send({
        name: "  Issue 50 Staff  ",
        email,
        role: "IT_STAFF",
        active: true,
        initialPassword,
        confirmPassword: initialPassword,
      });

    expect(response.status).toBe(201);
    createdUserIds.push(response.body.user.id);
    expect(response.body.user).toEqual({
      id: expect.any(Number),
      name: "Issue 50 Staff",
      email: email.trim().toLowerCase(),
      role: "IT_STAFF",
      mustChangePassword: true,
      active: true,
      version: 1,
    });
    expect(response.body.user).not.toHaveProperty("passwordHash");
    expect(response.body.user).not.toHaveProperty("authVersion");

    const stored = await fixture.prisma.user.findUniqueOrThrow({ where: { id: response.body.user.id } });
    expect(stored.passwordHash).not.toBe(initialPassword);
    expect(await verifyPassword(stored.passwordHash!, initialPassword)).toBe(true);

    const duplicate = await administrator
      .post("/api/admin/users")
      .set("Origin", fixture.origin)
      .set("X-CSRF-Token", token)
      .send({
        name: "Duplicate",
        email: email.toLowerCase(),
        role: "REQUESTER",
        active: true,
        initialPassword,
        confirmPassword: initialPassword,
      });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe("CONFLICT");
  });

  it("allows exactly one concurrent create for the same canonical email", async () => {
    const [firstAdmin, secondAdmin] = [request.agent(fixture.app), request.agent(fixture.app)];
    expect((await login(firstAdmin, fixture, fixture.administrator.email)).status).toBe(200);
    expect((await login(secondAdmin, fixture, fixture.administrator.email)).status).toBe(200);
    const [firstToken, secondToken] = await Promise.all([csrf(firstAdmin, fixture), csrf(secondAdmin, fixture)]);
    const email = `issue50-race-${process.pid}-${Date.now()}@example.test`;
    const password = "Concurrent Initial Password!";
    const body = { name: "Concurrent User", role: "REQUESTER", active: true, initialPassword: password, confirmPassword: password };

    const [first, second] = await Promise.all([
      firstAdmin.post("/api/admin/users").set("Origin", fixture.origin).set("X-CSRF-Token", firstToken).send({ ...body, email: `  ${email.toUpperCase()}  ` }),
      secondAdmin.post("/api/admin/users").set("Origin", fixture.origin).set("X-CSRF-Token", secondToken).send({ ...body, email }),
    ]);

    expect([first.status, second.status].sort()).toEqual([201, 409]);
    const created = first.status === 201 ? first.body.user : second.body.user;
    createdUserIds.push(created.id);
    expect(created.email).toBe(email);
    expect(await fixture.prisma.user.count({ where: { email } })).toBe(1);
  });

  it("edits only documented fields with optimistic versioning and rejects overposting", async () => {
    const target = await fixture.prisma.user.create({
      data: {
        name: "Issue 50 Edit Target",
        email: `issue50-edit-${process.pid}-${Date.now()}@example.test`,
        role: "IT_STAFF",
        active: true,
        mustChangePassword: false,
      },
      select: { id: true, version: true, authVersion: true },
    });
    createdUserIds.push(target.id);
    const administrator = await loggedIn(fixture.administrator.email);
    const token = await csrf(administrator, fixture);

    const response = await administrator
      .patch(`/api/admin/users/${target.id}`)
      .set("Origin", fixture.origin)
      .set("X-CSRF-Token", token)
      .send({
        name: "  Updated User  ",
        email: `  ISSUE50-EDITED-${target.id}@Example.Test  `,
        role: "REQUESTER",
        active: true,
        expectedVersion: target.version,
      });

    expect(response.status).toBe(200);
    expect(response.body.user).toEqual(expect.objectContaining({
      id: target.id,
      name: "Updated User",
      email: `issue50-edited-${target.id}@example.test`,
      role: "REQUESTER",
      active: true,
      version: target.version + 1,
    }));
    const stored = await fixture.prisma.user.findUniqueOrThrow({ where: { id: target.id } });
    expect(stored.authVersion).toBe(target.authVersion + 1);

    const stale = await administrator
      .patch(`/api/admin/users/${target.id}`)
      .set("Origin", fixture.origin)
      .set("X-CSRF-Token", token)
      .send({ name: "Stale", email: stored.email, role: stored.role, active: stored.active, expectedVersion: target.version });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe("CONFLICT");

    const overpost = await administrator
      .patch(`/api/admin/users/${target.id}`)
      .set("Origin", fixture.origin)
      .set("X-CSRF-Token", token)
      .send({
        name: stored.name,
        email: stored.email,
        role: stored.role,
        active: stored.active,
        expectedVersion: stored.version,
        passwordHash: "forbidden",
      });
    expect(overpost.status).toBe(400);
    expect(overpost.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("resets an initial password separately, forces next-login change, and revokes old password/session access", async () => {
    const oldPassword = "Issue50 Old Password!";
    const newPassword = "Issue50 New Password!";
    const target = await fixture.prisma.user.create({
      data: {
        name: "Issue 50 Reset Target",
        email: `issue50-reset-${process.pid}-${Date.now()}@example.test`,
        role: "REQUESTER",
        active: true,
        passwordHash: await hashPassword(oldPassword),
        mustChangePassword: false,
      },
      select: { id: true, email: true, version: true, authVersion: true },
    });
    createdUserIds.push(target.id);

    const targetAgent = request.agent(fixture.app);
    expect((await login(targetAgent, fixture, target.email, oldPassword)).status).toBe(200);

    const administrator = await loggedIn(fixture.administrator.email);
    const token = await csrf(administrator, fixture);
    const reset = await administrator
      .post(`/api/admin/users/${target.id}/initial-password`)
      .set("Origin", fixture.origin)
      .set("X-CSRF-Token", token)
      .send({
        initialPassword: newPassword,
        confirmPassword: newPassword,
        expectedVersion: target.version,
        confirmed: true,
      });

    expect(reset.status).toBe(200);
    expect(reset.body.user).toEqual(expect.objectContaining({
      id: target.id,
      mustChangePassword: true,
      version: target.version + 1,
    }));
    expect(reset.body.user).not.toHaveProperty("passwordHash");
    expect(reset.body.user).not.toHaveProperty("authVersion");

    const stored = await fixture.prisma.user.findUniqueOrThrow({ where: { id: target.id } });
    expect(stored.authVersion).toBe(target.authVersion + 1);
    expect(stored.passwordHash).not.toBe(newPassword);
    expect(await verifyPassword(stored.passwordHash!, newPassword)).toBe(true);
    expect(await verifyPassword(stored.passwordHash!, oldPassword)).toBe(false);

    const revoked = await targetAgent.get("/api/categories");
    expect(revoked.status).toBe(401);
    expect(revoked.body.error.code).toBe("AUTHENTICATION_REQUIRED");

    const oldLogin = await login(request.agent(fixture.app), fixture, target.email, oldPassword);
    expect(oldLogin.status).toBe(401);
    const newLogin = await login(request.agent(fixture.app), fixture, target.email, newPassword);
    expect(newLogin.status).toBe(200);
    expect(newLogin.body.user.mustChangePassword).toBe(true);
  });

  it("does not revive an invalidated old session after deactivation and later reactivation", async () => {
    const password = "Issue50 Reactivation Password!";
    const target = await fixture.prisma.user.create({
      data: {
        name: "Issue 50 Reactivation Target",
        email: `issue50-reactivate-${process.pid}-${Date.now()}@example.test`,
        role: "REQUESTER",
        active: true,
        passwordHash: await hashPassword(password),
        mustChangePassword: false,
      },
    });
    createdUserIds.push(target.id);
    const targetAgent = request.agent(fixture.app);
    expect((await login(targetAgent, fixture, target.email, password)).status).toBe(200);

    const administrator = await loggedIn(fixture.administrator.email);
    const token = await csrf(administrator, fixture);
    const deactivate = await administrator.patch(`/api/admin/users/${target.id}`)
      .set("Origin", fixture.origin).set("X-CSRF-Token", token)
      .send({ name: target.name, email: target.email, role: target.role, active: false, expectedVersion: target.version });
    expect(deactivate.status).toBe(200);
    expect((await targetAgent.get("/api/categories")).status).toBe(401);

    const reactivate = await administrator.patch(`/api/admin/users/${target.id}`)
      .set("Origin", fixture.origin).set("X-CSRF-Token", token)
      .send({
        name: deactivate.body.user.name,
        email: deactivate.body.user.email,
        role: deactivate.body.user.role,
        active: true,
        expectedVersion: deactivate.body.user.version,
      });
    expect(reactivate.status).toBe(200);
    expect((await targetAgent.get("/api/categories")).status).toBe(401);
    expect((await login(request.agent(fixture.app), fixture, target.email, password)).status).toBe(200);
  });
});
