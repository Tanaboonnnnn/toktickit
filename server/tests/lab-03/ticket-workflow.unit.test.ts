import { describe, expect, it } from "vitest";
import { TICKET_STATUSES, type TicketStatusValue } from "../../src/ticket-status.js";
import { evaluateStatusTransition } from "../../src/staff/ticket-workflow.js";

const allowed: Record<TicketStatusValue, TicketStatusValue[]> = {
  NEW: ["OPEN", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["OPEN", "IN_PROGRESS", "CANCELLED"],
  CANCELLED: [],
};

describe("FLOW-01 Ticket workflow policy", () => {
  it("evaluates all 64 source/destination pairs against the approved matrix", () => {
    let count = 0;
    for (const from of TICKET_STATUSES) {
      for (const to of TICKET_STATUSES) {
        count += 1;
        const result = evaluateStatusTransition({
          from,
          to,
          actorRole: "IT_STAFF",
          hasEligibleOwner: true,
          confirmed: true,
          resolutionSummary: to === "RESOLVED" ? "1234567890" : undefined,
          cancelReason: to === "CANCELLED" ? "abc" : undefined,
        });
        expect(result.allowed, `${from} -> ${to}`).toBe(allowed[from].includes(to));
      }
    }
    expect(count).toBe(64);
  });


  it("permits only IT Staff and Administrator roles", () => {
    const base = { from: "NEW" as const, to: "OPEN" as const, hasEligibleOwner: true };
    expect(evaluateStatusTransition({ ...base, actorRole: "IT_STAFF" }).allowed).toBe(true);
    expect(evaluateStatusTransition({ ...base, actorRole: "ADMINISTRATOR" }).allowed).toBe(true);
    expect(evaluateStatusTransition({ ...base, actorRole: "REQUESTER" }).reason).toBe("ROLE_NOT_ALLOWED");
  });
  it("rejects non-cancelled destinations without an active eligible owner", () => {
    expect(evaluateStatusTransition({ from: "NEW", to: "OPEN", actorRole: "IT_STAFF", hasEligibleOwner: false }).allowed).toBe(false);
    expect(evaluateStatusTransition({ from: "NEW", to: "CANCELLED", actorRole: "IT_STAFF", hasEligibleOwner: false, confirmed: true, cancelReason: "abc" }).allowed).toBe(true);
  });

  it.each(["RESOLVED", "CLOSED", "REOPENED", "CANCELLED"] as const)("requires confirmation for %s", (to) => {
    const from: Record<typeof to, TicketStatusValue> = { RESOLVED: "IN_PROGRESS", CLOSED: "RESOLVED", REOPENED: "CLOSED", CANCELLED: "OPEN" };
    const result = evaluateStatusTransition({
      from: from[to], to, actorRole: "IT_STAFF", hasEligibleOwner: true, confirmed: false,
      resolutionSummary: to === "RESOLVED" ? "1234567890" : undefined,
      cancelReason: to === "CANCELLED" ? "abc" : undefined,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("CONFIRMATION_REQUIRED");
  });

  it("validates trimmed resolution summary boundaries", () => {
    expect(evaluateStatusTransition({ from: "IN_PROGRESS", to: "RESOLVED", actorRole: "IT_STAFF", hasEligibleOwner: true, confirmed: true, resolutionSummary: " 1234567890 " }).allowed).toBe(true);
    expect(evaluateStatusTransition({ from: "IN_PROGRESS", to: "RESOLVED", actorRole: "IT_STAFF", hasEligibleOwner: true, confirmed: true, resolutionSummary: "123456789" }).reason).toBe("RESOLUTION_SUMMARY_INVALID");
    expect(evaluateStatusTransition({ from: "IN_PROGRESS", to: "RESOLVED", actorRole: "IT_STAFF", hasEligibleOwner: true, confirmed: true, resolutionSummary: "x".repeat(2001) }).reason).toBe("RESOLUTION_SUMMARY_INVALID");
  });

  it("validates trimmed cancel reason boundaries", () => {
    expect(evaluateStatusTransition({ from: "OPEN", to: "CANCELLED", actorRole: "IT_STAFF", hasEligibleOwner: false, confirmed: true, cancelReason: " abc " }).allowed).toBe(true);
    expect(evaluateStatusTransition({ from: "OPEN", to: "CANCELLED", actorRole: "IT_STAFF", hasEligibleOwner: false, confirmed: true, cancelReason: "ab" }).reason).toBe("CANCEL_REASON_INVALID");
    expect(evaluateStatusTransition({ from: "OPEN", to: "CANCELLED", actorRole: "IT_STAFF", hasEligibleOwner: false, confirmed: true, cancelReason: "x".repeat(201) }).reason).toBe("CANCEL_REASON_INVALID");
  });
});
