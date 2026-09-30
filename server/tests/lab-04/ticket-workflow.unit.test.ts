import { describe, expect, it } from "vitest";
import type { UserRole } from "@prisma/client";
import { TICKET_STATUSES, type TicketStatusValue } from "../../src/ticket-status.js";
import { evaluateStatusTransition } from "../../src/staff/ticket-workflow.js";

const allowed: Record<TicketStatusValue, readonly TicketStatusValue[]> = {
  NEW: ["OPEN", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["OPEN", "IN_PROGRESS", "CANCELLED"],
  CANCELLED: [],
};

function validInput(from: TicketStatusValue, to: TicketStatusValue, actorRole: UserRole = "IT_STAFF") {
  return {
    from,
    to,
    actorRole,
    hasEligibleOwner: true,
    confirmed: true,
    resolutionSummary: to === "RESOLVED" ? "Resolved after verified current-cycle work" : undefined,
    cancelReason: to === "CANCELLED" ? "Duplicate request" : undefined,
    resolutionWork: {
      completedCount: 1,
      outstandingCount: 0,
      unresolvedFollowUpCount: 0,
    },
  };
}

describe("FLOW-01 final Ticket workflow policy", () => {
  it("evaluates all 64 source/destination pairs against the approved matrix", () => {
    let pairs = 0;
    for (const from of TICKET_STATUSES) {
      for (const to of TICKET_STATUSES) {
        pairs += 1;
        const decision = evaluateStatusTransition(validInput(from, to) as never);
        expect(decision.allowed, `${from} -> ${to}`).toBe(allowed[from].includes(to));
      }
    }
    expect(pairs).toBe(64);
  });

  it("retains role, owner, confirmation and text guards around permitted edges", () => {
    expect(evaluateStatusTransition(validInput("NEW", "OPEN", "REQUESTER") as never).reason).toBe("ROLE_NOT_ALLOWED");
    expect(evaluateStatusTransition({ ...validInput("NEW", "OPEN"), hasEligibleOwner: false } as never).reason).toBe("OWNER_REQUIRED");
    expect(evaluateStatusTransition({ ...validInput("RESOLVED", "CLOSED"), confirmed: false } as never).reason).toBe("CONFIRMATION_REQUIRED");
    expect(evaluateStatusTransition({ ...validInput("IN_PROGRESS", "RESOLVED"), resolutionSummary: "too short" } as never).reason).toBe("RESOLUTION_SUMMARY_INVALID");
    expect(evaluateStatusTransition({ ...validInput("OPEN", "CANCELLED"), cancelReason: "x" } as never).reason).toBe("CANCEL_REASON_INVALID");
  });
});

describe("FLOW-02 final resolution work predicate", () => {
  it.each([
    [{ completedCount: 0, outstandingCount: 0, unresolvedFollowUpCount: 0 }, "COMPLETED_ACTION_REQUIRED"],
    [{ completedCount: 1, outstandingCount: 1, unresolvedFollowUpCount: 0 }, "OUTSTANDING_ACTIONS"],
    [{ completedCount: 2, outstandingCount: 0, unresolvedFollowUpCount: 1 }, "FOLLOW_UP_REQUIRED"],
  ] as const)("blocks RESOLVED when current-cycle work is not ready: %j", (resolutionWork, reason) => {
    const decision = evaluateStatusTransition({
      ...validInput("IN_PROGRESS", "RESOLVED"),
      resolutionWork,
    } as never);

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe(reason);
  });

  it("permits RESOLVED when current-cycle work satisfies every approved predicate", () => {
    const decision = evaluateStatusTransition(validInput("WAITING_FOR_REQUESTER", "RESOLVED") as never);
    expect(decision.allowed).toBe(true);
    expect(decision.resolutionSummary).toBe("Resolved after verified current-cycle work");
  });
});
