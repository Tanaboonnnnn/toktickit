import { Prisma, type PrismaClient } from "@prisma/client";
import type { Actor } from "../auth/actor.js";
import { ApiError, validationError } from "../errors.js";

export interface WorkflowEventListQuery {
  page: number;
  pageSize: number;
}

function single(raw: unknown, field: string): string | undefined {
  if (raw === undefined) return undefined;
  if (Array.isArray(raw)) throw validationError({ [field]: `${field} must be provided once` });
  if (typeof raw !== "string") throw validationError({ [field]: `${field} is invalid` });
  return raw;
}

function positiveInteger(raw: unknown, field: string, fallback: number, max?: number): number {
  const value = single(raw, field);
  if (value === undefined) return fallback;
  if (!/^[1-9]\d*$/.test(value)) throw validationError({ [field]: `${field} must be a positive integer` });
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || (max !== undefined && parsed > max)) {
    throw validationError({ [field]: max === undefined ? `${field} must be a positive integer` : `${field} must be between 1 and ${max}` });
  }
  return parsed;
}

export function parseWorkflowEventQuery(query: Record<string, unknown>): WorkflowEventListQuery {
  const unknown = Object.keys(query).find((key) => key !== "page" && key !== "pageSize");
  if (unknown) throw validationError({ [unknown]: "Query parameter is not supported" });
  return {
    page: positiveInteger(query.page, "page", 1),
    pageSize: positiveInteger(query.pageSize, "pageSize", 20, 50),
  };
}

const workflowEventSelect = {
  id: true,
  ticketId: true,
  ticketVersion: true,
  workflowCycle: true,
  fromStatus: true,
  toStatus: true,
  actor: { select: { id: true, name: true, role: true } },
  createdAt: true,
  resolutionSummary: true,
  cancellationReason: true,
} satisfies Prisma.TicketWorkflowEventSelect;

export async function listWorkflowEvents(
  prisma: PrismaClient,
  actor: Actor,
  ticketId: number,
  query: WorkflowEventListQuery,
) {
  const ticket = await prisma.ticket.findFirst({
    where: actor.role === "REQUESTER" ? { id: ticketId, requesterId: actor.id } : { id: ticketId },
    select: { id: true },
  });
  if (!ticket) throw new ApiError(404, "RESOURCE_NOT_FOUND", "Resource not found");

  const where: Prisma.TicketWorkflowEventWhereInput = { ticketId };
  const totalItems = await prisma.ticketWorkflowEvent.count({ where });
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);
  const rows = totalItems === 0 || query.page > totalPages
    ? []
    : await prisma.ticketWorkflowEvent.findMany({
      where,
      orderBy: [{ ticketVersion: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: workflowEventSelect,
    });
  return {
    items: rows.map((row) => ({
      id: row.id,
      ticketId: row.ticketId,
      ticketVersion: row.ticketVersion,
      workflowCycle: row.workflowCycle,
      fromStatus: row.fromStatus,
      toStatus: row.toStatus,
      actor: row.actor,
      occurredAt: row.createdAt.toISOString(),
      resolutionSummary: row.resolutionSummary,
      cancellationReason: row.cancellationReason,
    })),
    page: query.page,
    pageSize: query.pageSize,
    totalItems,
    totalPages,
    historyRecordedSince: "LAB_4" as const,
  };
}
