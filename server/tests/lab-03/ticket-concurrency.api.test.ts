import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AuthFixture } from "./support/auth-fixture.js";
import { createAuthFixture, csrf, destroyAuthFixture, login } from "./support/auth-fixture.js";

let fixture: AuthFixture;
let categoryId = 0;
let systemId = 0;
let extraOwnerId = 0;
const ticketIds: number[] = [];
const tag = `issue48-race-${process.pid}-${Date.now()}`;

async function makeTicket(ownerId: number | null = null) {
  const created = await fixture.prisma.ticket.create({
    data: {
      ticketNumber: `TKT-209911${String(ticketIds.length + 1).padStart(2, "0")}-${String(fixture.normalRequester.id).padStart(6, "0")}`,
      clientRequestId: randomUUID(), requesterId: fixture.normalRequester.id, categoryId, relatedSystemId: systemId,
      summary: `${tag} concurrency ticket ${ticketIds.length + 1}`, description: `${tag} concurrency description`,
      requestedPriority: "MEDIUM", itPriority: "MEDIUM", currentStatus: "OPEN", ownerId,
    },
  });
  ticketIds.push(created.id);
  return created;
}
async function loggedIn(email: string) {
  const agent = request.agent(fixture.app);
  expect((await login(agent, fixture, email)).status).toBe(200);
  return agent;
}
async function token(agent: ReturnType<typeof request.agent>) { return csrf(agent, fixture); }

beforeAll(async () => {
  fixture = await createAuthFixture();
  const [category, system, extraOwner] = await Promise.all([
    fixture.prisma.category.create({ data: { name: `${tag} category`, active: true } }),
    fixture.prisma.relatedSystem.create({ data: { name: `${tag} system`, active: true } }),
    fixture.prisma.user.create({ data: { name: `${tag} owner`, email: `${tag}@example.test`, active: true, role: "IT_STAFF", mustChangePassword: false } }),
  ]);
  categoryId = category.id; systemId = system.id; extraOwnerId = extraOwner.id;
});

afterAll(async () => {
  if (!fixture) return;
  await fixture.prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
  await fixture.prisma.category.deleteMany({ where: { id: categoryId || -1 } });
  await fixture.prisma.relatedSystem.deleteMany({ where: { id: systemId || -1 } });
  await fixture.prisma.user.deleteMany({ where: { id: extraOwnerId || -1 } });
  await destroyAuthFixture(fixture);
});

describe("RACE-01 Staff Ticket concurrency", () => {
  it("allows exactly one of two concurrent claimants and prevents lost ownership", async () => {
    const created = await makeTicket(null);
    const [staff, admin] = await Promise.all([loggedIn(fixture.staff.email), loggedIn(fixture.administrator.email)]);
    const [staffCsrf, adminCsrf] = await Promise.all([token(staff), token(admin)]);

    const [a, b] = await Promise.all([
      staff.post(`/api/staff/tickets/${created.id}/claim`).set("Origin", fixture.origin).set("X-CSRF-Token", staffCsrf).send({ expectedVersion: created.version }),
      admin.post(`/api/staff/tickets/${created.id}/claim`).set("Origin", fixture.origin).set("X-CSRF-Token", adminCsrf).send({ expectedVersion: created.version }),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const stored = await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: created.id } });
    expect([fixture.staff.id, fixture.administrator.id]).toContain(stored.ownerId);
    expect(stored.version).toBe(created.version + 1);
  });

  it("rejects a stale expectedVersion after another operational mutation", async () => {
    const created = await makeTicket(fixture.staff.id);
    const staff = await loggedIn(fixture.staff.email);
    const csrfToken = await token(staff);
    const first = await staff.patch(`/api/staff/tickets/${created.id}/priority`).set("Origin", fixture.origin).set("X-CSRF-Token", csrfToken).send({ itPriority: "HIGH", expectedVersion: created.version });
    expect(first.status).toBe(200);
    const stale = await staff.post(`/api/staff/tickets/${created.id}/status`).set("Origin", fixture.origin).set("X-CSRF-Token", csrfToken).send({ status: "IN_PROGRESS", expectedVersion: created.version });
    expect(stale.status).toBe(409);
    const stored = await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: created.id } });
    expect(stored.itPriority).toBe("HIGH");
    expect(stored.currentStatus).toBe("OPEN");
    expect(stored.version).toBe(created.version + 1);
  });

  it("revalidates target owner after the shared user lock so assignment cannot race deactivation", async () => {
    const created = await makeTicket(fixture.staff.id);
    const staff = await loggedIn(fixture.staff.email);
    const csrfToken = await token(staff);

    let release!: () => void;
    const hold = new Promise<void>((resolve) => { release = resolve; });
    let locked!: () => void;
    const acquired = new Promise<void>((resolve) => { locked = resolve; });

    const deactivate = fixture.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "RequesterUser" WHERE id = ${extraOwnerId} FOR UPDATE`;
      locked();
      await hold;
      await tx.user.update({ where: { id: extraOwnerId }, data: { active: false } });
    });
    await acquired;

    const assigning = staff.patch(`/api/staff/tickets/${created.id}/owner`)
      .set("Origin", fixture.origin).set("X-CSRF-Token", csrfToken)
      .send({ ownerId: extraOwnerId, expectedVersion: created.version, confirmed: true });

    release();
    await deactivate;
    const result = await assigning;
    expect(result.status).toBe(409);
    expect(result.body.error.code).toBe("CONFLICT");
    const stored = await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: created.id } });
    expect(stored.ownerId).toBe(fixture.staff.id);
    expect(stored.version).toBe(created.version);
  });
});
