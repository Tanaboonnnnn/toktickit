import { Prisma, type PrismaClient } from "@prisma/client";
import type { Actor } from "../auth/actor.js";
import { ApiError, validationError } from "../errors.js";
import { serializeAttachment } from "../attachment-service.js";
import type { StaffTicketQuery } from "./staff-query.js";

const queueSelect = {
  id: true, ticketNumber: true, summary: true,
  category: { select: { id: true, name: true } },
  requester: { select: { id: true, name: true, email: true } },
  requestedPriority: true, itPriority: true, currentStatus: true,
  owner: { select: { id: true, name: true, role: true } },
  createdAt: true, updatedAt: true, version: true,
} satisfies Prisma.TicketSelect;

const detailSelect = {
  ...queueSelect,
  relatedSystem: { select: { id: true, name: true } },
  description: true,
  attachments: { orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }], select: { id: true, ticketId: true, originalName: true, mimeType: true, sizeBytes: true, createdAt: true, removedAt: true, removalReason: true } },
  resolutionSummary: true, resolvedAt: true, closedAt: true, cancelReason: true, cancelledAt: true, requesterResolutionIndicatedAt: true,
} satisfies Prisma.TicketSelect;

type QueueRow = Prisma.TicketGetPayload<{ select: typeof queueSelect }>;
type DetailRow = Prisma.TicketGetPayload<{ select: typeof detailSelect }>;

function serializeQueue(row: QueueRow) {
  return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

function whereFor(actor: Actor, query: StaffTicketQuery): Prisma.TicketWhereInput {
  const where: Prisma.TicketWhereInput = {};
  if (query.search) where.OR = [
    { ticketNumber: { contains: query.search, mode: "insensitive" } },
    { summary: { contains: query.search, mode: "insensitive" } },
    { requester: { name: { contains: query.search, mode: "insensitive" } } },
  ];
  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.currentStatus) where.currentStatus = query.currentStatus;
  if (query.requestedPriority) where.requestedPriority = query.requestedPriority;
  if (query.itPriority) where.itPriority = query.itPriority;
  if (query.owner === "unassigned") where.ownerId = null;
  else if (query.owner === "me") where.ownerId = actor.id;
  else if (typeof query.owner === "number") where.ownerId = query.owner;
  return where;
}

async function assertEligibleOwnerFilter(prisma: PrismaClient, query: StaffTicketQuery): Promise<void> {
  if (typeof query.owner !== "number") return;
  const owner = await prisma.user.findFirst({ where: { id: query.owner, active: true, role: { in: ["IT_STAFF", "ADMINISTRATOR"] } }, select: { id: true } });
  if (!owner) throw validationError({ owner: "Owner must be an active eligible IT Staff or Administrator" });
}

export async function listStaffTickets(prisma: PrismaClient, actor: Actor, query: StaffTicketQuery) {
  await assertEligibleOwnerFilter(prisma, query);
  const where = whereFor(actor, query);
  const totalItems = await prisma.ticket.count({ where });
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);
  if (totalItems === 0 || query.page > totalPages) return { items: [], page: query.page, pageSize: query.pageSize, totalItems, totalPages };
  const rows = await prisma.ticket.findMany({
    where,
    orderBy: [{ [query.sortBy]: query.sortDirection } as Prisma.TicketOrderByWithRelationInput, { id: "desc" }],
    skip: (query.page - 1) * query.pageSize, take: query.pageSize, select: queueSelect,
  });
  return { items: rows.map(serializeQueue), page: query.page, pageSize: query.pageSize, totalItems, totalPages };
}

export async function getStaffTicketDetail(prisma: PrismaClient, ticketId: number) {
  const row = await prisma.ticket.findUnique({ where: { id: ticketId }, select: detailSelect });
  if (!row) throw new ApiError(404, "RESOURCE_NOT_FOUND", "Resource not found");
  return {
    ...serializeQueue(row), relatedSystem: row.relatedSystem, description: row.description,
    attachments: row.attachments.map(serializeAttachment), resolutionSummary: row.resolutionSummary,
    resolvedAt: row.resolvedAt?.toISOString() ?? null, closedAt: row.closedAt?.toISOString() ?? null,
    cancelReason: row.cancelReason, cancelledAt: row.cancelledAt?.toISOString() ?? null,
    requesterResolutionIndicatedAt: row.requesterResolutionIndicatedAt?.toISOString() ?? null,
  };
}

export async function listEligibleAssignees(prisma: PrismaClient) {
  return prisma.user.findMany({
    where: { active: true, role: { in: ["IT_STAFF", "ADMINISTRATOR"] } },
    orderBy: [{ name: "asc" }, { id: "asc" }], select: { id: true, name: true, role: true },
  });
}
