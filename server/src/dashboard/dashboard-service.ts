import { Prisma, type PrismaClient } from "@prisma/client";
import type { Actor } from "../auth/actor.js";
import { assertCapability } from "../authorization.js";
import { buildWhere, buildOrderBy, serializeTicketListItem, ticketListSelect } from "../ticket-list-service.js";
import { parseTicketListQuery } from "../ticket-query.js";
import { dashboardClock, requesterDashboardQueries, staffDashboardQueries } from "./dashboard-query.js";
import { queueSelect, serializeQueue, whereFor } from "../staff/staff-service.js";
import { serializeActionPublic } from "../actions/action-service.js";

const actionPreviewSelect = {
  id: true, ticketId: true, workflowCycle: true, createdAt: true, updatedAt: true,
  recordedById: true, assigneeId: true, performedById: true, updatedById: true, cancelledById: true,
  description: true, result: true, followUpRequired: true, followUpNote: true, attachmentNotes: true,
  status: true, version: true, completedAt: true, cancelledAt: true, cancellationReason: true,
  ticket: { select: { id: true, ticketNumber: true, summary: true, requesterId: true, currentStatus: true, workflowCycle: true } },
} satisfies Prisma.ActionTakenSelect;

async function myActionPreviews(tx: Prisma.TransactionClient, actor: Actor) {
  const rows = await tx.actionTaken.findMany({
    where: { OR: [{ recordedById: actor.id }, { assigneeId: actor.id }, { performedById: actor.id }] },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 5, select: actionPreviewSelect,
  });
  if (rows.length === 0) return [];
  // Hydrate all public actor summaries in one bounded query instead of one
  // relation query for each of the five provenance/assignment roles.
  const ids = [...new Set(rows.flatMap((row) => [row.recordedById, row.assigneeId, row.performedById, row.updatedById, row.cancelledById]))]
    .filter((id): id is number => id !== null);
  const users = await tx.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, role: true } });
  const byId = new Map(users.map((user) => [user.id, user]));
  function user(id: number) {
    const value = byId.get(id);
    if (!value) throw new Error("Action actor unavailable");
    return value;
  }
  return rows.map((row) => {
    const { ticket, recordedById, assigneeId, performedById, updatedById, cancelledById, ...fields } = row;
    const action = serializeActionPublic(actor, ticket, {
      ...fields, recordedBy: user(recordedById), assignee: user(assigneeId),
      performedBy: performedById === null ? null : user(performedById), updatedBy: user(updatedById),
      cancelledBy: cancelledById === null ? null : user(cancelledById),
    });
    const attribution: Array<"RECORDED" | "ASSIGNED" | "PERFORMED"> = [];
    if (recordedById === actor.id) attribution.push("RECORDED");
    if (assigneeId === actor.id) attribution.push("ASSIGNED");
    if (performedById === actor.id) attribution.push("PERFORMED");
    return { action, ticket: { id: ticket.id, ticketNumber: ticket.ticketNumber, summary: ticket.summary }, attribution };
  });
}

export async function requesterDashboard(prisma: PrismaClient, actor: Actor) {
  assertCapability(actor, "REQUESTER_TICKET_READ_OWN");
  const asOf = dashboardClock();
  const { queries, resolvedWindow, drillDown } = requesterDashboardQueries(asOf);
  const recent = parseTicketListQuery({});
  // PostgreSQL REPEATABLE READ pins counts and previews to one read snapshot.
  return prisma.$transaction(async (tx) => {
    const myActiveTickets = await tx.ticket.count({ where: buildWhere(actor, queries.myActiveTickets) });
    const waitingForMe = await tx.ticket.count({ where: buildWhere(actor, queries.waitingForMe) });
    const recentlyResolved = await tx.ticket.count({ where: buildWhere(actor, queries.recentlyResolved) });
    const recentTickets = await tx.ticket.findMany({ where: buildWhere(actor, recent), orderBy: buildOrderBy(recent), take: 5, select: ticketListSelect });
    const attentionTickets = await tx.ticket.findMany({ where: buildWhere(actor, queries.waitingForMe), orderBy: buildOrderBy(recent), take: 5, select: ticketListSelect });
    return { asOf: asOf.toISOString(), resolvedWindow, metrics: { myActiveTickets, waitingForMe, recentlyResolved },
      recentTickets: recentTickets.map(serializeTicketListItem), attentionTickets: attentionTickets.map(serializeTicketListItem), drillDown };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}

export async function staffDashboard(prisma: PrismaClient, actor: Actor) {
  assertCapability(actor, "STAFF_TICKET_QUEUE");
  const asOf = dashboardClock();
  const { queries, drillDown } = staffDashboardQueries();
  return prisma.$transaction(async (tx) => {
    const unassignedActive = await tx.ticket.count({ where: whereFor(actor, queries.unassignedActive) });
    const myActiveTickets = await tx.ticket.count({ where: whereFor(actor, queries.myActiveTickets) });
    const highPriorityActive = await tx.ticket.count({ where: whereFor(actor, queries.highPriorityActive) });
    const waitingForRequester = await tx.ticket.count({ where: whereFor(actor, queries.waitingForRequester) });
    const recentTickets = await tx.ticket.findMany({ orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 5, select: queueSelect });
    const myActions = await myActionPreviews(tx, actor);
    return { asOf: asOf.toISOString(), metrics: { unassignedActive, myActiveTickets, highPriorityActive, waitingForRequester },
      recentTickets: recentTickets.map(serializeQueue), myActions, drillDown };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
