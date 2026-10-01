import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ActionsFixture } from "./support/actions-fixture.js";
import {
  agentFor,
  createActionsFixture,
  createActionTicket,
  createStoredAction,
  destroyActionsFixture,
  postJson,
} from "./support/actions-fixture.js";
import { csrf, login } from "../lab-03/support/auth-fixture.js";

let fixture: ActionsFixture;

beforeAll(async () => {
  fixture = await createActionsFixture();
});

afterAll(async () => {
  await destroyActionsFixture(fixture);
});

describe("SEC-01 integrated Action authorization and privacy regression", () => {
  it("enforces authentication, own-Ticket visibility, nested-resource matching, and safe public projection", async () => {
    const ticket = await createActionTicket(fixture, { requesterId: fixture.normalRequester.id });
    const foreignTicket = await createActionTicket(fixture, { requesterId: fixture.requesterWorker.id });
    const ownAction = await createStoredAction(fixture, ticket, { description: "Public owned Action" });
    const foreignAction = await createStoredAction(fixture, foreignTicket, { description: "Foreign Action" });
    await fixture.prisma.internalNote.create({
      data: { ticketId: ticket.id, authorId: fixture.staff.id, body: "PRIVATE-ISSUE79-DO-NOT-LEAK" },
    });
    const requester = await agentFor(fixture, fixture.normalRequester.email);
    const foreignRequester = await agentFor(fixture, fixture.requesterWorker.email);
    const staff = await agentFor(fixture, fixture.staff.email);
    const administrator = await agentFor(fixture, fixture.administrator.email);

    const unauthenticated = await request(fixture.app).get(`/api/tickets/${ticket.id}/actions-taken`);
    expect(unauthenticated.status).toBe(401);
    expect(unauthenticated.body.error.code).toBe("AUTHENTICATION_REQUIRED");

    const ownList = await requester.get(`/api/tickets/${ticket.id}/actions-taken`).expect(200);
    expect(ownList.body.items.map((item: { id: number }) => item.id)).toContain(ownAction.id);
    expect(ownList.body.items[0].readOnly).toBe(true);
    expect(JSON.stringify(ownList.body)).not.toMatch(/PRIVATE-ISSUE79-DO-NOT-LEAK|internalNotes|privateNoteCount|passwordHash|authVersion|createFingerprint|storedName/i);

    await foreignRequester.get(`/api/tickets/${ticket.id}/actions-taken`).expect(404);
    await requester.get(`/api/tickets/${ticket.id}/actions-taken/${foreignAction.id}/revisions`).expect(404);
    await requester.get(`/api/tickets/${ticket.id}/actions-taken?internalNote=true`).expect(400);
    await staff.get(`/api/tickets/${ticket.id}/actions-taken`).expect(200);
    await administrator.get(`/api/tickets/${ticket.id}/actions-taken`).expect(200);
  });

  it("rejects Requester writes, missing/bad CSRF origin, and forged server-owned Action fields", async () => {
    const ticket = await createActionTicket(fixture);
    const requester = await agentFor(fixture, fixture.normalRequester.email);
    const staff = await agentFor(fixture, fixture.staff.email);
    const path = `/api/staff/tickets/${ticket.id}/actions-taken`;
    const body = {
      clientRequestId: "9de9442c-257e-48a2-9c40-0fd6c711ce79",
      expectedTicketVersion: ticket.version,
      description: "Security boundary probe",
      followUpRequired: false,
    };

    await postJson(fixture, requester, path, body).then((response) => expect(response.status).toBe(403));
    const noCsrf = await staff.post(path).set("Origin", fixture.origin).send(body);
    expect(noCsrf.status).toBe(403);
    expect(noCsrf.body.error.code).toBe("CSRF_INVALID");

    const token = await csrf(staff, fixture);
    const wrongOrigin = await staff.post(path).set("Origin", "http://attacker.example").set("X-CSRF-Token", token).send(body);
    expect(wrongOrigin.status).toBe(403);
    expect(wrongOrigin.body.error.code).toBe("CSRF_INVALID");

    const forged = await postJson(fixture, staff, path, {
      ...body,
      clientRequestId: "9de9442c-257e-48a2-9c40-0fd6c711ce80",
      recordedById: fixture.administrator.id,
      performedById: fixture.administrator.id,
      createdAt: "2026-01-01T00:00:00.000Z",
      ownerId: fixture.administrator.id,
    });
    expect(forged.status).toBe(400);
    expect(JSON.stringify(forged.body)).not.toMatch(/passwordHash|session|prisma|sql|C:\\|createFingerprint/i);
    expect(await fixture.prisma.actionTaken.count({ where: { ticketId: ticket.id } })).toBe(0);
    expect((await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).version).toBe(ticket.version);
  });

  it("blocks mandatory-change and revoked/inactive sessions at the protected API boundary", async () => {
    const mandatoryTicket = await createActionTicket(fixture, { requesterId: fixture.requester.id });
    await fixture.prisma.user.update({ where: { id: fixture.requester.id }, data: { mustChangePassword: true } });
    const mandatory = request.agent(fixture.app);
    expect((await login(mandatory, fixture, fixture.requester.email)).status).toBe(200);
    const passwordGate = await mandatory.get(`/api/tickets/${mandatoryTicket.id}/actions-taken`);
    expect(passwordGate.status).toBe(403);
    expect(passwordGate.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");

    const requesterTicket = await createActionTicket(fixture, { requesterId: fixture.normalRequester.id });
    const requester = await agentFor(fixture, fixture.normalRequester.email);
    await fixture.prisma.user.update({ where: { id: fixture.normalRequester.id }, data: { active: false } });
    const inactive = await requester.get(`/api/tickets/${requesterTicket.id}/actions-taken`);
    expect(inactive.status).toBe(401);
    expect(inactive.body.error.code).toBe("AUTHENTICATION_REQUIRED");

    const staffTicket = await createActionTicket(fixture);
    const staff = await agentFor(fixture, fixture.staff.email);
    await fixture.prisma.user.update({ where: { id: fixture.staff.id }, data: { authVersion: { increment: 1 } } });
    const revoked = await staff.get(`/api/tickets/${staffTicket.id}/actions-taken`);
    expect(revoked.status).toBe(401);
    expect(revoked.body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });
});
