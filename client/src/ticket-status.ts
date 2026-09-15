export const TICKET_STATUSES = [
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
  "CANCELLED",
] as const;

export type TicketStatus = typeof TICKET_STATUSES[number];

const STATUS_SET = new Set<string>(TICKET_STATUSES);

const STATUS_LABELS: Record<TicketStatus, string> = {
  NEW: "New",
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  WAITING_FOR_REQUESTER: "Waiting for Requester",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  REOPENED: "Reopened",
  CANCELLED: "Cancelled",
};

export function isTicketStatus(value: unknown): value is TicketStatus {
  return typeof value === "string" && STATUS_SET.has(value);
}

export function ticketStatusLabel(status: TicketStatus): string {
  return STATUS_LABELS[status];
}

export function ticketStatusClassName(status: TicketStatus): string {
  return `lab2-status-${status.toLowerCase().replaceAll("_", "-")}`;
}
