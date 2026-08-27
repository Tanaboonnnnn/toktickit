import { Prisma, type PrismaClient } from "@prisma/client";
import type { RequesterContext } from "./requester-context.js";
import type { TicketListQuery } from "./ticket-query.js";

const ticketListSelect = {
  id: true,
  ticketNumber: true,
  category: { select: { id: true, name: true } },
  relatedSystem: { select: { id: true, name: true } },
  summary: true,
  requestedPriority: true,
  currentStatus: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TicketSelect;

type TicketListRow = Prisma.TicketGetPayload<{ select: typeof ticketListSelect }>;

export interface TicketListItem {
  id: number;
  ticketNumber: string;
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
  summary: string;
  requestedPriority: "LOW" | "MEDIUM" | "HIGH";
  currentStatus: "NEW";
  createdAt: string;
  updatedAt: string;
}

export interface TicketListResponse {
  items: TicketListItem[];
  page: number;
  pageSize: 10 | 20 | 50;
  totalItems: number;
  totalPages: number;
}

function buildWhere(requester: RequesterContext, query: TicketListQuery): Prisma.TicketWhereInput {
  const where: Prisma.TicketWhereInput = {
    // This predicate is deliberately part of the database query. Never move
    // ownership filtering into serialization or the client.
    requesterId: requester.id,
  };

  if (query.search !== undefined) {
    where.OR = [
      { ticketNumber: { contains: query.search, mode: "insensitive" } },
      { summary: { contains: query.search, mode: "insensitive" } },
    ];
  }
  if (query.categoryId !== undefined) where.categoryId = query.categoryId;
  if (query.requestedPriority !== undefined) where.requestedPriority = query.requestedPriority;
  if (query.currentStatus !== undefined) where.currentStatus = query.currentStatus;
  return where;
}

function buildOrderBy(query: TicketListQuery): Prisma.TicketOrderByWithRelationInput[] {
  return [
    { [query.sortBy]: query.sortDirection } as Prisma.TicketOrderByWithRelationInput,
    { id: "desc" },
  ];
}

function serializeTicketListItem(ticket: TicketListRow): TicketListItem {
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    category: ticket.category,
    relatedSystem: ticket.relatedSystem,
    summary: ticket.summary,
    requestedPriority: ticket.requestedPriority,
    currentStatus: ticket.currentStatus,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  };
}

export async function listMyTickets(
  prisma: PrismaClient,
  requester: RequesterContext,
  query: TicketListQuery,
): Promise<TicketListResponse> {
  const where = buildWhere(requester, query);
  const totalItems = await prisma.ticket.count({ where });
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);

  // Avoid passing an enormous skip value to Prisma for an ordinary valid page
  // beyond the end. The API contract treats that page as a successful empty
  // page and preserves the requested page number.
  if (totalItems === 0 || query.page > totalPages) {
    return {
      items: [],
      page: query.page,
      pageSize: query.pageSize,
      totalItems,
      totalPages,
    };
  }

  const rows = await prisma.ticket.findMany({
    where,
    orderBy: buildOrderBy(query),
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
    select: ticketListSelect,
  });

  return {
    items: rows.map(serializeTicketListItem),
    page: query.page,
    pageSize: query.pageSize,
    totalItems,
    totalPages,
  };
}

export { buildWhere, buildOrderBy, serializeTicketListItem };
