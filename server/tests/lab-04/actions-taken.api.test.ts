import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ActionsFixture } from "./support/actions-fixture.js";
import {
  agentFor,
  createActionsFixture,
  createActionTicket,
  createStoredAction,
  destroyActionsFixture,
  patchJson,
  postJson,
} from "./support/actions-fixture.js";

let fixture: ActionsFixture;

beforeAll(async () => {
  fixture = await createActionsFixture();
});

afterAll(async () => {
  await destroyActionsFixture(fixture);
});

describe("API-02 / API-06 Action read authorization and stable public history", () => {
  it("lets the owning Requester and Staff/Admin read public Actions but hides foreign Tickets and Internal Notes", async () => {
    const ticket = await createActionTicket(fixture);
    const first = await createStoredAction(fixture, ticket, {
      description: "Inspect switch port",
      attachmentNotes: "See port-photo.png",
    });
    await fixture.prisma.internalNote.create({
      data: { ticketId: ticket.id, authorId: fixture.staff.id, body: "PRIVATE-DIAGNOSTIC-SHOULD-NOT-LEAK" },
    });
    const recorder = await fixture.prisma.user.findUniqueOrThrow({ where: { id: fixture.staff.id }, select: { id: true, name: true, role: true } });
    const assignee = await fixture.prisma.user.findUniqueOrThrow({ where: { id: fixture.extraStaff.id }, select: { id: true, name: true, role: true } });
    await fixture.prisma.actionTakenRevision.create({
      data: {
        actionId: first.id,
        actionVersion: 1,
        eventType: "CREATED",
        actorId: fixture.staff.id,
        snapshot: {
          assignee: { ...assignee, passwordHash: "PRIVATE-HASH-SHOULD-NOT-LEAK" },
          performedBy: null,
          description: first.description,
          result: null,
          followUpRequired: false,
          followUpNote: null,
          attachmentNotes: first.attachmentNotes,
          status: "PENDING",
        },
      },
    });

    const owner = await agentFor(fixture, fixture.normalRequester.email);
    const foreign = await agentFor(fixture, fixture.requester.email);
    const staff = await agentFor(fixture, fixture.staff.email);
    const admin = await agentFor(fixture, fixture.administrator.email);

    const unauthenticated = await import("supertest").then(({ default: request }) => request(fixture.app).get(`/api/tickets/${ticket.id}/actions-taken`));
    expect(unauthenticated.status).toBe(401);
    expect(unauthenticated.body.error.code).toBe("AUTHENTICATION_REQUIRED");

    const ownList = await owner.get(`/api/tickets/${ticket.id}/actions-taken`).expect(200);
    expect(ownList.body).toMatchObject({ page: 1, pageSize: 20, totalItems: 1, totalPages: 1 });
    expect(ownList.body.items[0]).toMatchObject({
      id: first.id,
      ticketId: ticket.id,
      description: "Inspect switch port",
      recordedBy: recorder,
      assignee,
      performedBy: null,
      status: "PENDING",
      readOnly: true,
    });
    expect(JSON.stringify(ownList.body)).not.toMatch(/PRIVATE-DIAGNOSTIC|passwordHash|authVersion|createFingerprint|storedName|sql|prisma/i);

    await foreign.get(`/api/tickets/${ticket.id}/actions-taken`).expect(404);
    expect((await staff.get(`/api/tickets/${ticket.id}/actions-taken`)).status).toBe(200);
    expect((await admin.get(`/api/tickets/${ticket.id}/actions-taken`)).status).toBe(200);

    const revisions = await owner.get(`/api/tickets/${ticket.id}/actions-taken/${first.id}/revisions`).expect(200);
    expect(revisions.body).toMatchObject({ page: 1, pageSize: 20, totalItems: 1, totalPages: 1 });
    expect(revisions.body.items[0]).toMatchObject({
      actionId: first.id,
      actionVersion: 1,
      eventType: "CREATED",
      actor: recorder,
      snapshot: { assignee, performedBy: null, status: "PENDING" },
    });
    expect(JSON.stringify(revisions.body)).not.toMatch(/createFingerprint|session|PRIVATE-DIAGNOSTIC|PRIVATE-HASH|passwordHash/i);
  });

  it("enforces nested Ticket/Action relationship without disclosing a foreign child", async () => {
    const [ticketA, ticketB] = await Promise.all([createActionTicket(fixture), createActionTicket(fixture)]);
    const action = await createStoredAction(fixture, ticketA);
    const owner = await agentFor(fixture, fixture.normalRequester.email);
    const staff = await agentFor(fixture, fixture.staff.email);
    const mismatch = await owner.get(`/api/tickets/${ticketB.id}/actions-taken/${action.id}/revisions`);
    expect(mismatch.status).toBe(404);
    expect(mismatch.body).toEqual({ error: { code: "RESOURCE_NOT_FOUND", message: "Resource not found" } });
    const writeMismatch = await patchJson(fixture, staff, `/api/staff/tickets/${ticketB.id}/actions-taken/${action.id}`, {
      expectedTicketVersion: ticketB.version,
      expectedActionVersion: action.version,
      description: "Nested IDOR attempt",
    });
    expect(writeMismatch.status).toBe(404);
    const statusMismatch = await postJson(fixture, staff, `/api/staff/tickets/${ticketB.id}/actions-taken/${action.id}/status`, {
      expectedTicketVersion: ticketB.version,
      expectedActionVersion: action.version,
      status: "IN_PROGRESS",
    });
    expect(statusMismatch.status).toBe(404);
    expect((await fixture.prisma.actionTaken.findUniqueOrThrow({ where: { id: action.id } })).description).toBe(action.description);
  });

  it("paginates all statuses/cycles in deterministic createdAt/id order and rejects repeated or unknown query parameters", async () => {
    const ticket = await createActionTicket(fixture, { workflowCycle: 2 });
    const tie = new Date("2026-09-29T12:00:00.000Z");
    const a = await createStoredAction(fixture, ticket, { workflowCycle: 1, status: "COMPLETED", createdAt: tie, description: "Previous cycle" });
    const b = await createStoredAction(fixture, ticket, { workflowCycle: 2, status: "PENDING", createdAt: tie, description: "Current pending" });
    const c = await createStoredAction(fixture, ticket, { workflowCycle: 2, status: "CANCELLED", createdAt: new Date("2026-09-29T12:01:00.000Z"), description: "Current cancelled" });
    const d = await createStoredAction(fixture, ticket, { workflowCycle: 2, status: "IN_PROGRESS", createdAt: new Date("2026-09-29T12:02:00.000Z"), description: "Current in progress" });
    const owner = await agentFor(fixture, fixture.normalRequester.email);

    const firstPage = await owner.get(`/api/tickets/${ticket.id}/actions-taken?page=1&pageSize=2`).expect(200);
    expect(firstPage.body).toMatchObject({ page: 1, pageSize: 2, totalItems: 4, totalPages: 2 });
    expect(firstPage.body.items.map((row: { id: number }) => row.id)).toEqual([a.id, b.id]);
    expect(firstPage.body.items.every((row: { readOnly: boolean }) => row.readOnly)).toBe(true);
    const secondPage = await owner.get(`/api/tickets/${ticket.id}/actions-taken?page=2&pageSize=2`).expect(200);
    expect(secondPage.body.items.map((row: { id: number }) => row.id)).toEqual([c.id, d.id]);

    expect((await owner.get(`/api/tickets/${ticket.id}/actions-taken?page=1&page=2`)).status).toBe(400);
    expect((await owner.get(`/api/tickets/${ticket.id}/actions-taken?status=PENDING`)).status).toBe(400);
  });

  it("denies Requester Action writes and preserves the CSRF gate for Staff writes", async () => {
    const ticket = await createActionTicket(fixture);
    const requester = await agentFor(fixture, fixture.normalRequester.email);
    const staff = await agentFor(fixture, fixture.staff.email);
    const body = {
      clientRequestId: "9de9442c-257e-48a2-9c40-0fd6c711ce56",
      expectedTicketVersion: ticket.version,
      description: "Probe write authorization",
      followUpRequired: false,
    };
    expect((await postJson(fixture, requester, `/api/staff/tickets/${ticket.id}/actions-taken`, body)).status).toBe(403);
    const noCsrf = await staff.post(`/api/staff/tickets/${ticket.id}/actions-taken`).send(body);
    expect(noCsrf.status).toBe(403);
    expect(noCsrf.body.error.code).toBe("CSRF_INVALID");
    expect(await fixture.prisma.actionTaken.count({ where: { ticketId: ticket.id } })).toBe(0);
  });

  it("requires an authenticated session for Action reads", async () => {
    const ticket = await createActionTicket(fixture);
    const unauthenticated = await request(fixture.app).get(`/api/tickets/${ticket.id}/actions-taken`);
    expect(unauthenticated.status).toBe(401);
    expect(unauthenticated.body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });
});

describe("API-01 / API-04 Action create and persistent replay", () => {
  it("defaults assignee to the authenticated recorder without changing Ticket Owner", async () => {
    const ticket = await createActionTicket(fixture, { ownerId: fixture.extraStaff.id });
    const staff = await agentFor(fixture, fixture.staff.email);
    const response = await postJson(fixture, staff, `/api/staff/tickets/${ticket.id}/actions-taken`, {
      clientRequestId: randomUUID(),
      expectedTicketVersion: ticket.version,
      description: "Default assignee probe",
      followUpRequired: false,
    });
    expect(response.status).toBe(201);
    expect(response.body.action).toMatchObject({
      recordedBy: { id: fixture.staff.id },
      assignee: { id: fixture.staff.id },
      performedBy: null,
    });
    expect((await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).ownerId).toBe(fixture.extraStaff.id);
  });

  it("creates one Action with authentic recorder/time, distinct owner/assignee, one revision and one parent bump", async () => {
    const ticket = await createActionTicket(fixture, { ownerId: fixture.extraStaff.id });
    const staff = await agentFor(fixture, fixture.staff.email);
    const clientRequestId = randomUUID();
    const response = await postJson(fixture, staff, `/api/staff/tickets/${ticket.id}/actions-taken`, {
      clientRequestId,
      expectedTicketVersion: ticket.version,
      description: "  Inspect access point uplink  ",
      result: null,
      assigneeId: fixture.administrator.id,
      followUpRequired: true,
      followUpNote: "  Re-test after cable replacement  ",
      attachmentNotes: "  See ap-uplink.png  ",
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ ticketVersion: ticket.version + 1, replayed: false });
    expect(response.body.action).toMatchObject({
      ticketId: ticket.id,
      workflowCycle: ticket.workflowCycle,
      description: "Inspect access point uplink",
      result: null,
      recordedBy: { id: fixture.staff.id, role: "IT_STAFF" },
      assignee: { id: fixture.administrator.id, role: "ADMINISTRATOR" },
      performedBy: null,
      status: "PENDING",
      version: 1,
      followUpRequired: true,
      followUpNote: "Re-test after cable replacement",
      attachmentNotes: "See ap-uplink.png",
      readOnly: false,
    });
    expect(response.body.action.createdAt).toEqual(expect.any(String));
    expect(JSON.stringify(response.body)).not.toMatch(/createFingerprint|passwordHash|authVersion|session|storedName/i);

    const [storedTicket, storedAction, revisions] = await Promise.all([
      fixture.prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } }),
      fixture.prisma.actionTaken.findUniqueOrThrow({ where: { id: response.body.action.id } }),
      fixture.prisma.actionTakenRevision.findMany({ where: { actionId: response.body.action.id } }),
    ]);
    expect(storedTicket.ownerId).toBe(fixture.extraStaff.id);
    expect(storedTicket.version).toBe(ticket.version + 1);
    expect(storedAction.recordedById).toBe(fixture.staff.id);
    expect(storedAction.assigneeId).toBe(fixture.administrator.id);
    expect(storedAction.performedById).toBeNull();
    expect(storedAction.createFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(revisions).toHaveLength(1);
    expect(revisions[0]).toMatchObject({ actionVersion: 1, eventType: "CREATED", actorId: fixture.staff.id });

    const beforeCount = await fixture.prisma.actionTaken.count({ where: { ticketId: ticket.id } });
    for (const spoofedField of [
      { recordedById: fixture.administrator.id },
      { performedById: fixture.administrator.id },
    ]) {
      const spoofed = await postJson(fixture, staff, `/api/staff/tickets/${ticket.id}/actions-taken`, {
        clientRequestId: randomUUID(),
        expectedTicketVersion: storedTicket.version,
        description: "Spoof metadata",
        followUpRequired: false,
        ...spoofedField,
      });
      expect(spoofed.status).toBe(400);
      expect(spoofed.body.error.code).toBe("VALIDATION_ERROR");
    }
    expect(await fixture.prisma.actionTaken.count({ where: { ticketId: ticket.id } })).toBe(beforeCount);
  });

  it("scopes clientRequestId to the authenticated recorder rather than globally", async () => {
    const ticket = await createActionTicket(fixture);
    const staff = await agentFor(fixture, fixture.staff.email);
    const admin = await agentFor(fixture, fixture.administrator.email);
    const clientRequestId = randomUUID();
    const first = await postJson(fixture, staff, `/api/staff/tickets/${ticket.id}/actions-taken`, {
      clientRequestId,
      expectedTicketVersion: ticket.version,
      description: "Recorder-scoped key staff",
      followUpRequired: false,
    });
    expect(first.status).toBe(201);
    const second = await postJson(fixture, admin, `/api/staff/tickets/${ticket.id}/actions-taken`, {
      clientRequestId,
      expectedTicketVersion: first.body.ticketVersion,
      description: "Recorder-scoped key admin",
      followUpRequired: false,
    });
    expect(second.status).toBe(201);
    expect(second.body.action.id).not.toBe(first.body.action.id);
    expect(await fixture.prisma.actionTaken.count({ where: { ticketId: ticket.id, clientRequestId } })).toBe(2);
  });

  it("returns a matching replay without duplicate/revision/parent bump and rejects a changed original payload", async () => {
    const ticket = await createActionTicket(fixture);
    const staff = await agentFor(fixture, fixture.staff.email);
    const clientRequestId = randomUUID();
    const originalBody = {
      clientRequestId,
      expectedTicketVersion: ticket.version,
      description: "Check DHCP lease",
      result: null,
      assigneeId: fixture.extraStaff.id,
      followUpRequired: false,
      followUpNote: null,
      attachmentNotes: null,
    };

    const first = await postJson(fixture, staff, `/api/staff/tickets/${ticket.id}/actions-taken`, originalBody);
    expect(first.status).toBe(201);
    const actionId = first.body.action.id as number;
    const replay = await postJson(fixture, staff, `/api/staff/tickets/${ticket.id}/actions-taken`, originalBody);
    expect(replay.status).toBe(200);
    expect(replay.body).toMatchObject({ replayed: true, ticketVersion: ticket.version + 1, action: { id: actionId } });
    expect(await fixture.prisma.actionTaken.count({ where: { recordedById: fixture.staff.id, clientRequestId } })).toBe(1);
    expect(await fixture.prisma.actionTakenRevision.count({ where: { actionId } })).toBe(1);
    expect((await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).version).toBe(ticket.version + 1);

    const changed = await postJson(fixture, staff, `/api/staff/tickets/${ticket.id}/actions-taken`, {
      ...originalBody,
      description: "Changed original request",
    });
    expect(changed.status).toBe(409);
    expect(changed.body.error.code).toBe("DUPLICATE_REQUEST_CONFLICT");
    expect(await fixture.prisma.actionTakenRevision.count({ where: { actionId } })).toBe(1);
  });

  it("reconciles the original create after later Action edits and a terminal parent without mutating either record", async () => {
    const ticket = await createActionTicket(fixture);
    const staff = await agentFor(fixture, fixture.staff.email);
    const body = {
      clientRequestId: randomUUID(),
      expectedTicketVersion: ticket.version,
      description: "Original diagnostic",
      result: null,
      followUpRequired: false,
      followUpNote: null,
      attachmentNotes: null,
    };
    const first = await postJson(fixture, staff, `/api/staff/tickets/${ticket.id}/actions-taken`, body);
    expect(first.status).toBe(201);
    const actionId = first.body.action.id as number;
    await fixture.prisma.actionTaken.update({
      where: { id: actionId },
      data: { description: "Later audited correction", version: { increment: 1 }, updatedById: fixture.staff.id },
    });
    const updatedAction = await fixture.prisma.actionTaken.findUniqueOrThrow({ where: { id: actionId } });
    await fixture.prisma.actionTakenRevision.create({
      data: {
        actionId,
        actionVersion: updatedAction.version,
        eventType: "EDITED",
        actorId: fixture.staff.id,
        snapshot: {
          assignee: { id: fixture.staff.id, name: "IT Staff", role: "IT_STAFF" },
          performedBy: null,
          description: updatedAction.description,
          result: null,
          followUpRequired: false,
          followUpNote: null,
          attachmentNotes: null,
          status: "PENDING",
        },
      },
    });
    await fixture.prisma.ticket.update({ where: { id: ticket.id }, data: { currentStatus: "CLOSED", version: 9 } });
    const before = await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    const revisionCount = await fixture.prisma.actionTakenRevision.count({ where: { actionId } });

    const replay = await postJson(fixture, staff, `/api/staff/tickets/${ticket.id}/actions-taken`, body);
    expect(replay.status).toBe(200);
    expect(replay.body).toMatchObject({
      replayed: true,
      ticketVersion: before.version,
      action: { id: actionId, description: "Later audited correction", version: updatedAction.version, readOnly: true },
    });
    expect((await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).version).toBe(before.version);
    expect(await fixture.prisma.actionTakenRevision.count({ where: { actionId } })).toBe(revisionCount);
  });
});

describe("API-03 / API-05 Action assignment, lifecycle, optimistic versions and audit", () => {
  it("rejects inactive or Requester assignees without changing the Ticket", async () => {
    const ticket = await createActionTicket(fixture);
    const staff = await agentFor(fixture, fixture.staff.email);
    for (const assigneeId of [fixture.inactiveStaff.id, fixture.requesterWorker.id]) {
      const response = await postJson(fixture, staff, `/api/staff/tickets/${ticket.id}/actions-taken`, {
        clientRequestId: randomUUID(),
        expectedTicketVersion: ticket.version,
        description: "Invalid assignee probe",
        assigneeId,
        followUpRequired: false,
      });
      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe("CONFLICT");
      expect(JSON.stringify(response.body)).not.toMatch(/passwordHash|prisma|sql/i);
    }
    expect(await fixture.prisma.actionTaken.count({ where: { ticketId: ticket.id } })).toBe(0);
    expect((await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).version).toBe(ticket.version);
  });

  it("starts and completes an Action with the real authenticated performer while preserving Ticket Owner and completion provenance", async () => {
    const ticket = await createActionTicket(fixture, { ownerId: fixture.extraStaff.id });
    const recorder = await agentFor(fixture, fixture.staff.email);
    const completer = await agentFor(fixture, fixture.administrator.email);
    const created = await postJson(fixture, recorder, `/api/staff/tickets/${ticket.id}/actions-taken`, {
      clientRequestId: randomUUID(),
      expectedTicketVersion: ticket.version,
      description: "Replace damaged cable",
      assigneeId: fixture.extraStaff.id,
      followUpRequired: true,
      followUpNote: "Confirm link after replacement",
    });
    expect(created.status).toBe(201);

    const started = await postJson(fixture, recorder, `/api/staff/tickets/${ticket.id}/actions-taken/${created.body.action.id}/status`, {
      expectedTicketVersion: created.body.ticketVersion,
      expectedActionVersion: created.body.action.version,
      status: "IN_PROGRESS",
    });
    expect(started.status).toBe(200);
    expect(started.body).toMatchObject({
      ticketVersion: created.body.ticketVersion + 1,
      action: { status: "IN_PROGRESS", version: 2, performedBy: null },
    });

    const completed = await postJson(fixture, completer, `/api/staff/tickets/${ticket.id}/actions-taken/${created.body.action.id}/status`, {
      expectedTicketVersion: started.body.ticketVersion,
      expectedActionVersion: started.body.action.version,
      status: "COMPLETED",
      result: "  Connectivity restored  ",
      followUpRequired: false,
      followUpNote: null,
      confirmation: true,
    });
    expect(completed.status).toBe(200);
    expect(completed.body).toMatchObject({
      ticketVersion: started.body.ticketVersion + 1,
      action: {
        status: "COMPLETED",
        version: 3,
        result: "Connectivity restored",
        recordedBy: { id: fixture.staff.id },
        assignee: { id: fixture.extraStaff.id },
        performedBy: { id: fixture.administrator.id, role: "ADMINISTRATOR" },
      },
    });
    expect(completed.body.action.completedAt).toEqual(expect.any(String));
    const completionTime = completed.body.action.completedAt;

    const corrected = await patchJson(fixture, recorder, `/api/staff/tickets/${ticket.id}/actions-taken/${created.body.action.id}`, {
      expectedTicketVersion: completed.body.ticketVersion,
      expectedActionVersion: completed.body.action.version,
      result: "Connectivity restored and verified",
      attachmentNotes: "Replacement photo attached to Ticket",
    });
    expect(corrected.status).toBe(200);
    expect(corrected.body).toMatchObject({
      changed: true,
      ticketVersion: completed.body.ticketVersion + 1,
      action: {
        status: "COMPLETED",
        version: 4,
        result: "Connectivity restored and verified",
        performedBy: { id: fixture.administrator.id },
        completedAt: completionTime,
      },
    });
    const owner = await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(owner.ownerId).toBe(fixture.extraStaff.id);

    const revisions = await fixture.prisma.actionTakenRevision.findMany({
      where: { actionId: created.body.action.id }, orderBy: { actionVersion: "asc" },
    });
    expect(revisions.map((row) => [row.actionVersion, row.eventType])).toEqual([
      [1, "CREATED"], [2, "STARTED"], [3, "COMPLETED"], [4, "CONTENT_CORRECTED"],
    ]);

    const reassignCompleted = await patchJson(fixture, recorder, `/api/staff/tickets/${ticket.id}/actions-taken/${created.body.action.id}`, {
      expectedTicketVersion: corrected.body.ticketVersion,
      expectedActionVersion: corrected.body.action.version,
      assigneeId: fixture.administrator.id,
    });
    expect(reassignCompleted.status).toBe(409);
    const reversal = await postJson(fixture, recorder, `/api/staff/tickets/${ticket.id}/actions-taken/${created.body.action.id}/status`, {
      expectedTicketVersion: corrected.body.ticketVersion,
      expectedActionVersion: corrected.body.action.version,
      status: "IN_PROGRESS",
    });
    expect(reversal.status).toBe(409);
  });

  it("allows completed content correction after the historical assignee becomes inactive without changing completion provenance", async () => {
    const historicalAssignee = await fixture.prisma.user.create({
      data: {
        name: `Issue 74 historical assignee ${randomUUID()}`,
        email: `issue74-historical-${randomUUID()}@example.test`,
        role: "IT_STAFF",
        active: true,
        mustChangePassword: false,
      },
    });
    fixture.extraUserIds.push(historicalAssignee.id);

    const ticket = await createActionTicket(fixture);
    const recorder = await agentFor(fixture, fixture.staff.email);
    const completer = await agentFor(fixture, fixture.administrator.email);
    const created = await postJson(fixture, recorder, `/api/staff/tickets/${ticket.id}/actions-taken`, {
      clientRequestId: randomUUID(),
      expectedTicketVersion: ticket.version,
      description: "Document completed historical work",
      assigneeId: historicalAssignee.id,
      followUpRequired: false,
    });
    expect(created.status).toBe(201);

    const completed = await postJson(fixture, completer, `/api/staff/tickets/${ticket.id}/actions-taken/${created.body.action.id}/status`, {
      expectedTicketVersion: created.body.ticketVersion,
      expectedActionVersion: created.body.action.version,
      status: "COMPLETED",
      result: "Historical work completed",
      confirmation: true,
    });
    expect(completed.status).toBe(200);
    const completedAt = completed.body.action.completedAt;

    const admin = await agentFor(fixture, fixture.administrator.email);
    const deactivated = await patchJson(fixture, admin, `/api/admin/users/${historicalAssignee.id}`, {
      name: historicalAssignee.name,
      email: historicalAssignee.email,
      role: "IT_STAFF",
      active: false,
      expectedVersion: historicalAssignee.version,
    });
    expect(deactivated.status).toBe(200);

    const corrected = await patchJson(fixture, recorder, `/api/staff/tickets/${ticket.id}/actions-taken/${created.body.action.id}`, {
      expectedTicketVersion: completed.body.ticketVersion,
      expectedActionVersion: completed.body.action.version,
      result: "Historical work completed and documentation corrected",
      followUpRequired: true,
      followUpNote: "Retain the corrected record for audit history",
    });
    expect(corrected.status).toBe(200);
    expect(corrected.body).toMatchObject({
      changed: true,
      action: {
        status: "COMPLETED",
        assignee: { id: historicalAssignee.id },
        performedBy: { id: fixture.administrator.id },
        completedAt,
        result: "Historical work completed and documentation corrected",
        followUpRequired: true,
        followUpNote: "Retain the corrected record for audit history",
      },
    });
    expect(await fixture.prisma.actionTakenRevision.findFirst({
      where: { actionId: created.body.action.id, actionVersion: corrected.body.action.version },
      select: { eventType: true },
    })).toEqual({ eventType: "CONTENT_CORRECTED" });
  });

  it("cancels outstanding work with immutable cancellation provenance and blocks terminal reversal", async () => {
    const ticket = await createActionTicket(fixture);
    const staff = await agentFor(fixture, fixture.staff.email);
    const created = await postJson(fixture, staff, `/api/staff/tickets/${ticket.id}/actions-taken`, {
      clientRequestId: randomUUID(), expectedTicketVersion: ticket.version,
      description: "Check unused wall port", followUpRequired: false,
    });
    const cancelled = await postJson(fixture, staff, `/api/staff/tickets/${ticket.id}/actions-taken/${created.body.action.id}/status`, {
      expectedTicketVersion: created.body.ticketVersion,
      expectedActionVersion: created.body.action.version,
      status: "CANCELLED",
      confirmation: true,
      cancellationReason: "  Work no longer required  ",
    });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.action).toMatchObject({
      status: "CANCELLED",
      cancellationReason: "Work no longer required",
      cancelledBy: { id: fixture.staff.id },
      version: 2,
      readOnly: true,
    });
    expect(cancelled.body.action.cancelledAt).toEqual(expect.any(String));
    const reverse = await postJson(fixture, staff, `/api/staff/tickets/${ticket.id}/actions-taken/${created.body.action.id}/status`, {
      expectedTicketVersion: cancelled.body.ticketVersion,
      expectedActionVersion: cancelled.body.action.version,
      status: "IN_PROGRESS",
    });
    expect(reverse.status).toBe(409);
  });

  it("supports the remaining documented lifecycle edges: direct completion and in-progress cancellation", async () => {
    const staff = await agentFor(fixture, fixture.staff.email);

    const directTicket = await createActionTicket(fixture);
    const directCreated = await postJson(fixture, staff, `/api/staff/tickets/${directTicket.id}/actions-taken`, {
      clientRequestId: randomUUID(), expectedTicketVersion: directTicket.version,
      description: "Direct completion", followUpRequired: false,
    });
    const directCompleted = await postJson(fixture, staff, `/api/staff/tickets/${directTicket.id}/actions-taken/${directCreated.body.action.id}/status`, {
      expectedTicketVersion: directCreated.body.ticketVersion,
      expectedActionVersion: directCreated.body.action.version,
      status: "COMPLETED",
      result: "Completed without a separate start step",
      confirmation: true,
    });
    expect(directCompleted.status).toBe(200);
    expect(directCompleted.body.action).toMatchObject({ status: "COMPLETED", performedBy: { id: fixture.staff.id } });

    const cancelTicket = await createActionTicket(fixture);
    const cancelCreated = await postJson(fixture, staff, `/api/staff/tickets/${cancelTicket.id}/actions-taken`, {
      clientRequestId: randomUUID(), expectedTicketVersion: cancelTicket.version,
      description: "Start then cancel", followUpRequired: false,
    });
    const started = await postJson(fixture, staff, `/api/staff/tickets/${cancelTicket.id}/actions-taken/${cancelCreated.body.action.id}/status`, {
      expectedTicketVersion: cancelCreated.body.ticketVersion,
      expectedActionVersion: cancelCreated.body.action.version,
      status: "IN_PROGRESS",
    });
    const cancelled = await postJson(fixture, staff, `/api/staff/tickets/${cancelTicket.id}/actions-taken/${cancelCreated.body.action.id}/status`, {
      expectedTicketVersion: started.body.ticketVersion,
      expectedActionVersion: started.body.action.version,
      status: "CANCELLED",
      confirmation: true,
      cancellationReason: "No longer needed",
    });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.action.status).toBe("CANCELLED");
  });

  it("updates content/assignment atomically, returns explicit no-op, and rejects stale Action or Ticket versions without partial writes", async () => {
    const ticket = await createActionTicket(fixture);
    const staff = await agentFor(fixture, fixture.staff.email);
    const created = await postJson(fixture, staff, `/api/staff/tickets/${ticket.id}/actions-taken`, {
      clientRequestId: randomUUID(), expectedTicketVersion: ticket.version,
      description: "Initial diagnostic", assigneeId: fixture.extraStaff.id, followUpRequired: false,
    });
    const actionId = created.body.action.id as number;
    const changed = await patchJson(fixture, staff, `/api/staff/tickets/${ticket.id}/actions-taken/${actionId}`, {
      expectedTicketVersion: created.body.ticketVersion,
      expectedActionVersion: created.body.action.version,
      description: "Updated diagnostic",
      assigneeId: fixture.administrator.id,
    });
    expect(changed.status).toBe(200);
    expect(changed.body).toMatchObject({
      changed: true,
      ticketVersion: created.body.ticketVersion + 1,
      action: { id: actionId, description: "Updated diagnostic", assignee: { id: fixture.administrator.id }, version: 2 },
    });
    expect(await fixture.prisma.actionTakenRevision.count({ where: { actionId } })).toBe(2);

    const noop = await patchJson(fixture, staff, `/api/staff/tickets/${ticket.id}/actions-taken/${actionId}`, {
      expectedTicketVersion: changed.body.ticketVersion,
      expectedActionVersion: changed.body.action.version,
      description: "  Updated diagnostic  ",
      assigneeId: fixture.administrator.id,
    });
    expect(noop.status).toBe(200);
    expect(noop.body).toMatchObject({ changed: false, ticketVersion: changed.body.ticketVersion, action: { version: changed.body.action.version } });
    expect(await fixture.prisma.actionTakenRevision.count({ where: { actionId } })).toBe(2);

    const staleAction = await patchJson(fixture, staff, `/api/staff/tickets/${ticket.id}/actions-taken/${actionId}`, {
      expectedTicketVersion: changed.body.ticketVersion,
      expectedActionVersion: 1,
      description: "Stale overwrite",
    });
    expect(staleAction.status).toBe(409);
    const staleTicket = await patchJson(fixture, staff, `/api/staff/tickets/${ticket.id}/actions-taken/${actionId}`, {
      expectedTicketVersion: created.body.ticketVersion,
      expectedActionVersion: changed.body.action.version,
      description: "Stale parent overwrite",
    });
    expect(staleTicket.status).toBe(409);
    const stored = await fixture.prisma.actionTaken.findUniqueOrThrow({ where: { id: actionId } });
    expect(stored).toMatchObject({ description: "Updated diagnostic", assigneeId: fixture.administrator.id, version: 2 });
    expect((await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).version).toBe(changed.body.ticketVersion);
    expect(await fixture.prisma.actionTakenRevision.count({ where: { actionId } })).toBe(2);
  });

  it("rolls back Action and Ticket changes and returns a safe error when revision persistence fails", async () => {
    const ticket = await createActionTicket(fixture);
    const staff = await agentFor(fixture, fixture.staff.email);
    const created = await postJson(fixture, staff, `/api/staff/tickets/${ticket.id}/actions-taken`, {
      clientRequestId: randomUUID(),
      expectedTicketVersion: ticket.version,
      description: "Rollback probe",
      followUpRequired: false,
    });
    expect(created.status).toBe(201);

    const actionId = created.body.action.id as number;
    await fixture.prisma.actionTakenRevision.create({
      data: {
        actionId,
        actionVersion: created.body.action.version + 1,
        eventType: "EDITED",
        actorId: fixture.staff.id,
        snapshot: {},
      },
    });

    const failed = await patchJson(fixture, staff, `/api/staff/tickets/${ticket.id}/actions-taken/${actionId}`, {
      expectedTicketVersion: created.body.ticketVersion,
      expectedActionVersion: created.body.action.version,
      description: "This mutation must roll back",
    });
    expect(failed.status).toBe(500);
    expect(failed.body).toEqual({
      error: { code: "INTERNAL_ERROR", message: "Unable to update Action" },
    });
    expect(JSON.stringify(failed.body)).not.toMatch(/prisma|sql|constraint|unique|stack|filesystem|path/i);

    const [storedAction, storedTicket, revisions] = await Promise.all([
      fixture.prisma.actionTaken.findUniqueOrThrow({ where: { id: actionId } }),
      fixture.prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } }),
      fixture.prisma.actionTakenRevision.findMany({ where: { actionId }, orderBy: { actionVersion: "asc" } }),
    ]);
    expect(storedAction).toMatchObject({
      description: "Rollback probe",
      version: created.body.action.version,
    });
    expect(storedTicket.version).toBe(created.body.ticketVersion);
    expect(revisions.map((row) => row.actionVersion)).toEqual([1, 2]);
  });

  it("blocks normal edits for previous-cycle Actions and terminal parent Tickets", async () => {
    const staff = await agentFor(fixture, fixture.staff.email);
    const cycledTicket = await createActionTicket(fixture, { workflowCycle: 2 });
    const oldAction = await createStoredAction(fixture, cycledTicket, { workflowCycle: 1 });
    const oldCycle = await patchJson(fixture, staff, `/api/staff/tickets/${cycledTicket.id}/actions-taken/${oldAction.id}`, {
      expectedTicketVersion: cycledTicket.version,
      expectedActionVersion: oldAction.version,
      description: "Should remain historical",
    });
    expect(oldCycle.status).toBe(409);

    const closedTicket = await createActionTicket(fixture, { status: "CLOSED" });
    const closedAction = await createStoredAction(fixture, closedTicket);
    const freshCreate = await postJson(fixture, staff, `/api/staff/tickets/${closedTicket.id}/actions-taken`, {
      clientRequestId: randomUUID(), expectedTicketVersion: closedTicket.version,
      description: "Terminal parent create should fail", followUpRequired: false,
    });
    expect(freshCreate.status).toBe(409);
    const terminalParent = await patchJson(fixture, staff, `/api/staff/tickets/${closedTicket.id}/actions-taken/${closedAction.id}`, {
      expectedTicketVersion: closedTicket.version,
      expectedActionVersion: closedAction.version,
      description: "Should remain read only",
    });
    expect(terminalParent.status).toBe(409);
  });
});
