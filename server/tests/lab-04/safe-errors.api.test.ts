import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { ActionsFixture } from "./support/actions-fixture.js";
import { agentFor, createActionsFixture, createActionTicket, destroyActionsFixture, postJson } from "./support/actions-fixture.js";
import { getPrisma } from "../../src/prisma.js";

let fixture: ActionsFixture;

beforeAll(async () => {
  fixture = await createActionsFixture();
});

afterAll(async () => {
  await destroyActionsFixture(fixture);
});

describe("SAFE-01 safe API failure behavior", () => {
  it("returns a generic Action-create error without persisting work when the database fails", async () => {
    const ticket = await createActionTicket(fixture);
    const staff = await agentFor(fixture, fixture.staff.email);
    const failure = vi.spyOn(getPrisma(), "$transaction").mockRejectedValueOnce(
      new Error("Prisma SQL passwordHash session SECRET C:\\private\\uploads"),
    );
    try {
      const response = await postJson(fixture, staff, `/api/staff/tickets/${ticket.id}/actions-taken`, {
        clientRequestId: "9de9442c-257e-48a2-9c40-0fd6c711ce81",
        expectedTicketVersion: ticket.version,
        description: "Database failure safe-error probe",
        followUpRequired: false,
      });
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: { code: "INTERNAL_ERROR", message: "Unable to create Action" } });
      expect(JSON.stringify(response.body)).not.toMatch(/Prisma|SQL|passwordHash|session|SECRET|C:\\private|uploads/i);
      expect(await fixture.prisma.actionTaken.count({ where: { ticketId: ticket.id } })).toBe(0);
      expect((await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).version).toBe(ticket.version);
    } finally {
      failure.mockRestore();
    }
  });
});
