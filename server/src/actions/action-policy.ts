import type { ActionStatus, TicketStatus } from "@prisma/client";

const activeParentStatuses = new Set<TicketStatus>([
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "REOPENED",
]);

const actionTransitions: Readonly<Record<ActionStatus, ReadonlySet<ActionStatus>>> = {
  PENDING: new Set(["IN_PROGRESS", "COMPLETED", "CANCELLED"]),
  IN_PROGRESS: new Set(["COMPLETED", "CANCELLED"]),
  COMPLETED: new Set(),
  CANCELLED: new Set(),
};

export function isActiveActionParentStatus(status: TicketStatus): boolean {
  return activeParentStatuses.has(status);
}

export function actionTransitionAllowed(from: ActionStatus, to: ActionStatus): boolean {
  return actionTransitions[from].has(to);
}

export function permittedActionTransitions(from: ActionStatus): ActionStatus[] {
  return [...actionTransitions[from]];
}
