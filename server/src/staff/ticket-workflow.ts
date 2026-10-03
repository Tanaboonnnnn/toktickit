import type { UserRole } from "@prisma/client";
import type { TicketStatusValue } from "../ticket-status.js";

export type WorkflowReason =
  | "ROLE_NOT_ALLOWED"
  | "TRANSITION_NOT_ALLOWED"
  | "OWNER_REQUIRED"
  | "CONFIRMATION_REQUIRED"
  | "RESOLUTION_SUMMARY_INVALID"
  | "CANCEL_REASON_INVALID"
  | "COMPLETED_ACTION_REQUIRED"
  | "OUTSTANDING_ACTIONS"
  | "FOLLOW_UP_REQUIRED";

export interface ResolutionWorkState {
  completedCount: number;
  outstandingCount: number;
  unresolvedFollowUpCount: number;
}

export interface StatusTransitionInput {
  from: TicketStatusValue;
  to: TicketStatusValue;
  actorRole: UserRole;
  hasEligibleOwner: boolean;
  confirmed?: boolean;
  resolutionSummary?: string;
  cancelReason?: string;
  resolutionWork?: ResolutionWorkState;
}

export interface WorkflowDecision {
  allowed: boolean;
  reason?: WorkflowReason;
  resolutionSummary?: string;
  cancelReason?: string;
}

const ALLOWED: Readonly<Record<TicketStatusValue, ReadonlySet<TicketStatusValue>>> = {
  NEW: new Set(["OPEN", "CANCELLED"]),
  OPEN: new Set(["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"]),
  IN_PROGRESS: new Set(["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"]),
  WAITING_FOR_REQUESTER: new Set(["IN_PROGRESS", "RESOLVED", "CANCELLED"]),
  RESOLVED: new Set(["CLOSED", "REOPENED"]),
  CLOSED: new Set(["REOPENED"]),
  REOPENED: new Set(["OPEN", "IN_PROGRESS", "CANCELLED"]),
  CANCELLED: new Set(),
};

const CONFIRMED_DESTINATIONS = new Set<TicketStatusValue>(["RESOLVED", "CLOSED", "REOPENED", "CANCELLED"]);

function codePointLength(value: string): number {
  return Array.from(value).length;
}

export function resolutionBlockers(work: ResolutionWorkState): WorkflowReason[] {
  const blockers: WorkflowReason[] = [];
  if (work.completedCount < 1) blockers.push("COMPLETED_ACTION_REQUIRED");
  if (work.outstandingCount > 0) blockers.push("OUTSTANDING_ACTIONS");
  if (work.unresolvedFollowUpCount > 0) blockers.push("FOLLOW_UP_REQUIRED");
  return blockers;
}

export function permittedStatusTransitions(
  from: TicketStatusValue,
  hasEligibleOwner: boolean,
  resolutionWork: ResolutionWorkState,
): readonly TicketStatusValue[] {
  const blockers = resolutionBlockers(resolutionWork);
  return [...ALLOWED[from]].filter((to) => {
    if (to !== "CANCELLED" && !hasEligibleOwner) return false;
    if (to === "RESOLVED" && blockers.length > 0) return false;
    return true;
  });
}

export function evaluateStatusTransition(input: StatusTransitionInput): WorkflowDecision {
  if (input.actorRole !== "IT_STAFF" && input.actorRole !== "ADMINISTRATOR") {
    return { allowed: false, reason: "ROLE_NOT_ALLOWED" };
  }
  if (!ALLOWED[input.from].has(input.to)) {
    return { allowed: false, reason: "TRANSITION_NOT_ALLOWED" };
  }
  if (input.to !== "CANCELLED" && !input.hasEligibleOwner) {
    return { allowed: false, reason: "OWNER_REQUIRED" };
  }
  if (CONFIRMED_DESTINATIONS.has(input.to) && input.confirmed !== true) {
    return { allowed: false, reason: "CONFIRMATION_REQUIRED" };
  }
  if (input.to === "RESOLVED") {
    const resolutionSummary = input.resolutionSummary?.trim() ?? "";
    const length = codePointLength(resolutionSummary);
    if (length < 10 || length > 2000) {
      return { allowed: false, reason: "RESOLUTION_SUMMARY_INVALID" };
    }
    const blocker = input.resolutionWork ? resolutionBlockers(input.resolutionWork)[0] : "COMPLETED_ACTION_REQUIRED";
    if (blocker) return { allowed: false, reason: blocker };
    return { allowed: true, resolutionSummary };
  }
  if (input.to === "CANCELLED") {
    const cancelReason = input.cancelReason?.trim() ?? "";
    const length = codePointLength(cancelReason);
    if (length < 3 || length > 200) {
      return { allowed: false, reason: "CANCEL_REASON_INVALID" };
    }
    return { allowed: true, cancelReason };
  }
  return { allowed: true };
}

export function permittedNextStatuses(from: TicketStatusValue): readonly TicketStatusValue[] {
  return [...ALLOWED[from]];
}
