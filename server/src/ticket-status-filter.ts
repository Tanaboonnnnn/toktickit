import type { Prisma } from "@prisma/client";
import type { TicketStatusValue } from "./ticket-status.js";

export interface TicketStatusFilter {
  currentStatus?: TicketStatusValue;
  statusGroup?: "active" | "resolved";
  resolvedFrom?: Date;
  resolvedBefore?: Date;
}

const activeStatuses: TicketStatusValue[] = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"];

function instant(value: string | undefined, field: string, errors: Record<string, string>): Date | undefined {
  if (value === undefined) return undefined;
  // Require a full ISO timestamp with explicit zone; Date.parse alone accepts
  // local dates and normalizes impossible calendar days such as February 30.
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.exec(value);
  const parsed = new Date(value);
  if (match) {
    const [, year, month, day, hour, minute, second] = match.map(Number);
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1]
      && hour < 24 && minute < 60 && second < 60 && Number.isFinite(parsed.getTime())) return parsed;
  }
  errors[field] = "Must be a valid ISO timestamp with an explicit UTC or offset zone";
  return undefined;
}

export function parseTicketStatusFilter(
  raw: { currentStatus?: string; statusGroup?: string; resolvedFrom?: string; resolvedBefore?: string },
  errors: Record<string, string>,
): Omit<TicketStatusFilter, "currentStatus"> {
  const { statusGroup, resolvedFrom, resolvedBefore } = raw;
  if (statusGroup !== undefined && statusGroup !== "active" && statusGroup !== "resolved") {
    errors.statusGroup = "Status group must be active or resolved";
  }
  if (statusGroup !== undefined && raw.currentStatus !== undefined) {
    errors.statusGroup = "Current Status and status group are mutually exclusive";
  }
  if (statusGroup !== "resolved") {
    if (resolvedFrom !== undefined || resolvedBefore !== undefined) errors.resolvedFrom = "Resolved bounds require statusGroup=resolved";
    return statusGroup === "active" ? { statusGroup } : {};
  }
  if (resolvedFrom === undefined) errors.resolvedFrom = "Both resolved bounds are required";
  if (resolvedBefore === undefined) errors.resolvedBefore = "Both resolved bounds are required";
  const from = instant(resolvedFrom, "resolvedFrom", errors);
  const before = instant(resolvedBefore, "resolvedBefore", errors);
  if (from && before && from >= before) errors.resolvedBefore = "Resolved before must be later than resolved from";
  return { statusGroup, resolvedFrom: from, resolvedBefore: before };
}

export function ticketStatusWhere(filter: TicketStatusFilter): Prisma.TicketWhereInput {
  if (filter.statusGroup === "active") return { currentStatus: { in: activeStatuses } };
  if (filter.statusGroup === "resolved") return {
    currentStatus: { in: ["RESOLVED", "CLOSED"] },
    resolvedAt: { gte: filter.resolvedFrom, lt: filter.resolvedBefore },
  };
  return filter.currentStatus ? { currentStatus: filter.currentStatus } : {};
}
