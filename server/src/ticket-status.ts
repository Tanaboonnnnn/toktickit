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

export type TicketStatusValue = typeof TICKET_STATUSES[number];

const STATUS_SET = new Set<string>(TICKET_STATUSES);

export function isTicketStatus(value: string): value is TicketStatusValue {
  return STATUS_SET.has(value);
}
