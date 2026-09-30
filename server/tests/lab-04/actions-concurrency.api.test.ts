import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ActionsFixture } from "./support/actions-fixture.js";
import {
  agentFor,
  createActionsFixture,
  createActionTicket,
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

describe("RACE-01 duplicate create serialization", () => {
  it("commits one logical Action/revision and one parent bump for simultaneous identical POSTs", async () => {
    const ticket = await createActionTicket(fixture);
    const [staffA, staffB] = await Promise.all([
      agentFor(fixture, fixture.staff.email),
      agentFor(fixture, fixture.staff.email),
    ]);
    const clientRequestId = randomUUID();
    const body = {
      clientRequestId,
      expectedTicketVersion: ticket.version,
      description: "Concurrent create probe",
      assigneeId: fixture.extraStaff.id,
      followUpRequired: false,
    };

    const [a, b] = await Promise.all([
      postJson(fixture, staffA, `/api/staff/tickets/${ticket.id}/actions-taken`, body),
      postJson(fixture, staffB, `/api/staff/tickets/${ticket.id}/actions-taken`, body),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 201]);
    expect(a.body.action.id).toBe(b.body.action.id);
    expect([a.body.replayed, b.body.replayed].sort()).toEqual([false, true]);
    expect(await fixture.prisma.actionTaken.count({ where: { recordedById: fixture.staff.id, clientRequestId } })).toBe(1);
    expect(await fixture.prisma.actionTakenRevision.count({ where: { actionId: a.body.action.id } })).toBe(1);
    expect((await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).version).toBe(ticket.version + 1);
  });
});

describe("RACE-03 stale Action and parent serialization", () => {
  it("allows exactly one of two simultaneous Action edits and leaves one audit revision for the winner", async () => {
    const ticket = await createActionTicket(fixture);
    const staff = await agentFor(fixture, fixture.staff.email);
    const created = await postJson(fixture, staff, `/api/staff/tickets/${ticket.id}/actions-taken`, {
      clientRequestId: randomUUID(), expectedTicketVersion: ticket.version,
      description: "Race edit base", assigneeId: fixture.extraStaff.id, followUpRequired: false,
    });
    const [staffA, staffB] = await Promise.all([
      agentFor(fixture, fixture.staff.email),
      agentFor(fixture, fixture.staff.email),
    ]);
    const common = {
      expectedTicketVersion: created.body.ticketVersion,
      expectedActionVersion: created.body.action.version,
    };
    const [a, b] = await Promise.all([
      patchJson(fixture, staffA, `/api/staff/tickets/${ticket.id}/actions-taken/${created.body.action.id}`, { ...common, description: "Winner candidate A" }),
      patchJson(fixture, staffB, `/api/staff/tickets/${ticket.id}/actions-taken/${created.body.action.id}`, { ...common, description: "Winner candidate B" }),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const stored = await fixture.prisma.actionTaken.findUniqueOrThrow({ where: { id: created.body.action.id } });
    expect(["Winner candidate A", "Winner candidate B"]).toContain(stored.description);
    expect(stored.version).toBe(created.body.action.version + 1);
    expect(await fixture.prisma.actionTakenRevision.count({ where: { actionId: stored.id } })).toBe(2);
    expect((await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).version).toBe(created.body.ticketVersion + 1);
  });

  it("serializes an Action edit against a competing Ticket owner mutation so neither can silently overwrite the other", async () => {
    const ticket = await createActionTicket(fixture);
    const recorder = await agentFor(fixture, fixture.staff.email);
    const created = await postJson(fixture, recorder, `/api/staff/tickets/${ticket.id}/actions-taken`, {
      clientRequestId: randomUUID(), expectedTicketVersion: ticket.version,
      description: "Parent race base", assigneeId: fixture.extraStaff.id, followUpRequired: false,
    });
    const [staffA, staffB] = await Promise.all([
      agentFor(fixture, fixture.staff.email),
      agentFor(fixture, fixture.staff.email),
    ]);

    const [actionEdit, ownerEdit] = await Promise.all([
      patchJson(fixture, staffA, `/api/staff/tickets/${ticket.id}/actions-taken/${created.body.action.id}`, {
        expectedTicketVersion: created.body.ticketVersion,
        expectedActionVersion: created.body.action.version,
        description: "Action race winner",
      }),
      patchJson(fixture, staffB, `/api/staff/tickets/${ticket.id}/owner`, {
        expectedVersion: created.body.ticketVersion,
        ownerId: fixture.administrator.id,
        confirmed: true,
      }),
    ]);
    expect([actionEdit.status, ownerEdit.status].sort()).toEqual([200, 409]);
    const [storedAction, storedTicket] = await Promise.all([
      fixture.prisma.actionTaken.findUniqueOrThrow({ where: { id: created.body.action.id } }),
      fixture.prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } }),
    ]);
    expect(storedTicket.version).toBe(created.body.ticketVersion + 1);
    if (actionEdit.status === 200) {
      expect(storedAction.description).toBe("Action race winner");
      expect(storedAction.version).toBe(2);
      expect(storedTicket.ownerId).toBe(fixture.staff.id);
      expect(await fixture.prisma.actionTakenRevision.count({ where: { actionId: storedAction.id } })).toBe(2);
    } else {
      expect(storedAction.description).toBe("Parent race base");
      expect(storedAction.version).toBe(1);
      expect(storedTicket.ownerId).toBe(fixture.administrator.id);
      expect(await fixture.prisma.actionTakenRevision.count({ where: { actionId: storedAction.id } })).toBe(1);
    }
  });
});
