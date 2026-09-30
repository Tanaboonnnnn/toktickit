import { createHash } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import type { Actor } from "../auth/actor.js";
import { ApiError } from "../errors.js";
import { validationError } from "../errors.js";
import type { ActionListQuery, ActionStatusInput, CreateActionInput, UpdateActionInput } from "./action-contract.js";
import { actionTransitionAllowed, isActiveActionParentStatus } from "./action-policy.js";

const userSummarySelect = {
  id: true,
  name: true,
  role: true,
} satisfies Prisma.UserSelect;

const actionPublicSelect = {
  id: true,
  ticketId: true,
  workflowCycle: true,
  createdAt: true,
  recordedBy: { select: userSummarySelect },
  assignee: { select: userSummarySelect },
  performedBy: { select: userSummarySelect },
  description: true,
  result: true,
  followUpRequired: true,
  followUpNote: true,
  attachmentNotes: true,
  status: true,
  version: true,
  updatedAt: true,
  updatedBy: { select: userSummarySelect },
  completedAt: true,
  cancelledAt: true,
  cancelledBy: { select: userSummarySelect },
  cancellationReason: true,
} satisfies Prisma.ActionTakenSelect;

type ActionPublicRow = Prisma.ActionTakenGetPayload<{ select: typeof actionPublicSelect }>;

interface TicketActionScope {
  id: number;
  requesterId: number;
  currentStatus: Prisma.TicketGetPayload<{ select: { currentStatus: true } }>["currentStatus"];
  workflowCycle: number;
}

function resourceNotFound(): ApiError {
  return new ApiError(404, "RESOURCE_NOT_FOUND", "Resource not found");
}

function conflict(message = "Action or Ticket changed or the operation is no longer available"): ApiError {
  return new ApiError(409, "CONFLICT", message);
}

function duplicateRequestConflict(): ApiError {
  return new ApiError(409, "DUPLICATE_REQUEST_CONFLICT", "clientRequestId was already used with different Action data");
}

function isEligibleActionUser(user: { active: boolean; role: string } | null): boolean {
  return Boolean(user?.active && (user.role === "IT_STAFF" || user.role === "ADMINISTRATOR"));
}

async function lockUsers(tx: Prisma.TransactionClient, userIds: number[]): Promise<void> {
  const ids = [...new Set(userIds)].sort((a, b) => a - b);
  for (const id of ids) {
    await tx.$queryRaw`SELECT id FROM "RequesterUser" WHERE id = ${id} FOR UPDATE`;
  }
}

async function lockTicket(tx: Prisma.TransactionClient, ticketId: number): Promise<void> {
  await tx.$queryRaw`SELECT id FROM "Ticket" WHERE id = ${ticketId} FOR UPDATE`;
}

async function lockAction(tx: Prisma.TransactionClient, ticketId: number, actionId: number): Promise<void> {
  await tx.$queryRaw`SELECT id FROM "ActionTaken" WHERE id = ${actionId} AND "ticketId" = ${ticketId} FOR UPDATE`;
}

function canonicalCreateFingerprint(ticketId: number, input: CreateActionInput, assigneeId: number): string {
  const canonical = JSON.stringify({
    ticketId,
    description: input.description,
    result: input.result,
    assigneeId,
    followUpRequired: input.followUpRequired,
    followUpNote: input.followUpNote,
    attachmentNotes: input.attachmentNotes,
  });
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

function actionRevisionSnapshot(action: ActionPublicRow): Prisma.InputJsonObject {
  return {
    assignee: action.assignee,
    performedBy: action.performedBy ?? null,
    description: action.description,
    result: action.result ?? null,
    followUpRequired: action.followUpRequired,
    followUpNote: action.followUpNote ?? null,
    attachmentNotes: action.attachmentNotes ?? null,
    status: action.status,
  };
}

async function replayFromClient(
  prisma: PrismaClient,
  actor: Actor,
  ticketId: number,
  actionId: number,
  expectedFingerprint: string,
  storedFingerprint: string,
) {
  if (storedFingerprint !== expectedFingerprint) throw duplicateRequestConflict();
  const [ticket, action] = await Promise.all([
    prisma.ticket.findUnique({ where: { id: ticketId }, select: { id: true, requesterId: true, currentStatus: true, workflowCycle: true, version: true } }),
    prisma.actionTaken.findFirst({ where: { id: actionId, ticketId }, select: actionPublicSelect }),
  ]);
  if (!ticket || !action) throw duplicateRequestConflict();
  return {
    status: 200 as const,
    action: serializeActionPublic(actor, ticket, action),
    ticketVersion: ticket.version,
    replayed: true as const,
  };
}

async function loadTicketScope(prisma: PrismaClient, actor: Actor, ticketId: number): Promise<TicketActionScope> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, requesterId: true, currentStatus: true, workflowCycle: true },
  });
  if (!ticket) throw resourceNotFound();
  if (actor.role === "REQUESTER" && ticket.requesterId !== actor.id) throw resourceNotFound();
  return ticket;
}

function actionReadOnly(actor: Actor, ticket: TicketActionScope, action: ActionPublicRow): boolean {
  if (actor.role === "REQUESTER") return true;
  return !isActiveActionParentStatus(ticket.currentStatus)
    || action.workflowCycle !== ticket.workflowCycle
    || action.status === "CANCELLED";
}

export function serializeActionPublic(actor: Actor, ticket: TicketActionScope, action: ActionPublicRow) {
  return {
    ...action,
    createdAt: action.createdAt.toISOString(),
    updatedAt: action.updatedAt.toISOString(),
    completedAt: action.completedAt?.toISOString() ?? null,
    cancelledAt: action.cancelledAt?.toISOString() ?? null,
    readOnly: actionReadOnly(actor, ticket, action),
  };
}

export async function listActions(
  prisma: PrismaClient,
  actor: Actor,
  ticketId: number,
  query: ActionListQuery,
) {
  const ticket = await loadTicketScope(prisma, actor, ticketId);
  const where: Prisma.ActionTakenWhereInput = { ticketId };
  const totalItems = await prisma.actionTaken.count({ where });
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);
  if (totalItems === 0 || query.page > totalPages) {
    return { items: [], page: query.page, pageSize: query.pageSize, totalItems, totalPages };
  }
  const rows = await prisma.actionTaken.findMany({
    where,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
    select: actionPublicSelect,
  });
  return {
    items: rows.map((row) => serializeActionPublic(actor, ticket, row)),
    page: query.page,
    pageSize: query.pageSize,
    totalItems,
    totalPages,
  };
}

function publicSnapshotUser(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  if (!Number.isSafeInteger(source.id) || typeof source.name !== "string") return null;
  if (source.role !== "REQUESTER" && source.role !== "IT_STAFF" && source.role !== "ADMINISTRATOR") return null;
  return { id: source.id as number, name: source.name, role: source.role };
}

function publicRevisionSnapshot(value: Prisma.JsonValue) {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  return {
    assignee: publicSnapshotUser(source.assignee),
    performedBy: publicSnapshotUser(source.performedBy),
    description: source.description ?? null,
    result: source.result ?? null,
    followUpRequired: source.followUpRequired ?? false,
    followUpNote: source.followUpNote ?? null,
    attachmentNotes: source.attachmentNotes ?? null,
    status: source.status ?? null,
  };
}

export async function listActionRevisions(
  prisma: PrismaClient,
  actor: Actor,
  ticketId: number,
  actionId: number,
  query: ActionListQuery,
) {
  await loadTicketScope(prisma, actor, ticketId);
  const action = await prisma.actionTaken.findFirst({ where: { id: actionId, ticketId }, select: { id: true } });
  if (!action) throw resourceNotFound();
  const where: Prisma.ActionTakenRevisionWhereInput = { actionId };
  const totalItems = await prisma.actionTakenRevision.count({ where });
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);
  if (totalItems === 0 || query.page > totalPages) {
    return { items: [], page: query.page, pageSize: query.pageSize, totalItems, totalPages };
  }
  const rows = await prisma.actionTakenRevision.findMany({
    where,
    orderBy: [{ actionVersion: "asc" }, { id: "asc" }],
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
    select: {
      actionId: true,
      actionVersion: true,
      eventType: true,
      actor: { select: userSummarySelect },
      createdAt: true,
      snapshot: true,
    },
  });
  return {
    items: rows.map((row) => ({
      actionId: row.actionId,
      actionVersion: row.actionVersion,
      eventType: row.eventType,
      actor: row.actor,
      occurredAt: row.createdAt.toISOString(),
      snapshot: publicRevisionSnapshot(row.snapshot),
    })),
    page: query.page,
    pageSize: query.pageSize,
    totalItems,
    totalPages,
  };
}

export async function createAction(
  prisma: PrismaClient,
  actor: Actor,
  ticketId: number,
  input: CreateActionInput,
) {
  const assigneeId = input.assigneeId ?? actor.id;
  const fingerprint = canonicalCreateFingerprint(ticketId, input, assigneeId);
  const replay = await prisma.actionTaken.findUnique({
    where: { recordedById_clientRequestId: { recordedById: actor.id, clientRequestId: input.clientRequestId } },
    select: { id: true, ticketId: true, createFingerprint: true },
  });
  if (replay) {
    if (replay.ticketId !== ticketId) throw duplicateRequestConflict();
    return replayFromClient(prisma, actor, ticketId, replay.id, fingerprint, replay.createFingerprint);
  }

  return prisma.$transaction(async (tx) => {
    await lockUsers(tx, [actor.id, assigneeId]);
    const [actorRow, assignee] = await Promise.all([
      tx.user.findUnique({ where: { id: actor.id }, select: { id: true, name: true, role: true, active: true } }),
      tx.user.findUnique({ where: { id: assigneeId }, select: { id: true, name: true, role: true, active: true } }),
    ]);
    if (!isEligibleActionUser(actorRow)) throw new ApiError(403, "FORBIDDEN", "You do not have permission to perform this action");

    const existing = await tx.actionTaken.findUnique({
      where: { recordedById_clientRequestId: { recordedById: actor.id, clientRequestId: input.clientRequestId } },
      select: { id: true, ticketId: true, createFingerprint: true },
    });
    if (existing) {
      if (existing.ticketId !== ticketId || existing.createFingerprint !== fingerprint) throw duplicateRequestConflict();
      const [ticket, action] = await Promise.all([
        tx.ticket.findUnique({ where: { id: ticketId }, select: { id: true, requesterId: true, currentStatus: true, workflowCycle: true, version: true } }),
        tx.actionTaken.findUnique({ where: { id: existing.id }, select: actionPublicSelect }),
      ]);
      if (!ticket || !action) throw duplicateRequestConflict();
      return {
        status: 200 as const,
        action: serializeActionPublic(actor, ticket, action),
        ticketVersion: ticket.version,
        replayed: true as const,
      };
    }

    if (!isEligibleActionUser(assignee)) throw conflict("Selected assignee is not an active eligible IT Staff or Administrator");
    await lockTicket(tx, ticketId);
    const ticket = await tx.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, requesterId: true, currentStatus: true, workflowCycle: true, version: true },
    });
    if (!ticket) throw resourceNotFound();
    if (ticket.version !== input.expectedTicketVersion) throw conflict();
    if (!isActiveActionParentStatus(ticket.currentStatus)) throw conflict("Ticket does not accept Action changes in its current state");

    const action = await tx.actionTaken.create({
      data: {
        ticketId,
        workflowCycle: ticket.workflowCycle,
        recordedById: actor.id,
        assigneeId,
        description: input.description,
        result: input.result,
        followUpRequired: input.followUpRequired,
        followUpNote: input.followUpNote,
        attachmentNotes: input.attachmentNotes,
        updatedById: actor.id,
        clientRequestId: input.clientRequestId,
        createFingerprint: fingerprint,
      },
      select: actionPublicSelect,
    });
    await tx.actionTakenRevision.create({
      data: {
        actionId: action.id,
        actionVersion: action.version,
        eventType: "CREATED",
        actorId: actor.id,
        snapshot: actionRevisionSnapshot(action),
      },
    });
    const updatedTicket = await tx.ticket.update({
      where: { id: ticketId },
      data: { version: { increment: 1 } },
      select: { id: true, requesterId: true, currentStatus: true, workflowCycle: true, version: true },
    });
    return {
      status: 201 as const,
      action: serializeActionPublic(actor, updatedTicket, action),
      ticketVersion: updatedTicket.version,
      replayed: false as const,
    };
  });
}

async function mutationSnapshot(
  prisma: PrismaClient,
  ticketId: number,
  actionId: number,
) {
  const action = await prisma.actionTaken.findFirst({
    where: { id: actionId, ticketId },
    select: { id: true, assigneeId: true },
  });
  if (!action) throw resourceNotFound();
  return action;
}

function assertFollowUpState(followUpRequired: boolean, followUpNote: string | null): void {
  if (followUpRequired && !followUpNote) {
    throw validationError({ followUpNote: "Follow-up Note is required when follow-up is required" });
  }
}

function assertCompletedResult(result: string | null): void {
  if (!result) throw validationError({ result: "Result is required for a completed Action" });
}

async function loadMutationState(tx: Prisma.TransactionClient, ticketId: number, actionId: number) {
  const [ticket, action] = await Promise.all([
    tx.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, requesterId: true, currentStatus: true, workflowCycle: true, version: true },
    }),
    tx.actionTaken.findFirst({ where: { id: actionId, ticketId }, select: actionPublicSelect }),
  ]);
  if (!ticket || !action) throw resourceNotFound();
  return { ticket, action };
}

async function assertEligibleActor(tx: Prisma.TransactionClient, actorId: number): Promise<void> {
  const actor = await tx.user.findUnique({ where: { id: actorId }, select: { active: true, role: true } });
  if (!isEligibleActionUser(actor)) {
    throw new ApiError(403, "FORBIDDEN", "You do not have permission to perform this action");
  }
}

async function assertEligibleAssignee(tx: Prisma.TransactionClient, userId: number): Promise<void> {
  const assignee = await tx.user.findUnique({ where: { id: userId }, select: { active: true, role: true } });
  if (!isEligibleActionUser(assignee)) {
    throw conflict("Selected assignee is not an active eligible IT Staff or Administrator");
  }
}

export async function updateAction(
  prisma: PrismaClient,
  actor: Actor,
  ticketId: number,
  actionId: number,
  input: UpdateActionInput,
) {
  const snapshot = await mutationSnapshot(prisma, ticketId, actionId);
  const candidateAssigneeId = input.assigneeId ?? snapshot.assigneeId;

  return prisma.$transaction(async (tx) => {
    await lockUsers(tx, [actor.id, snapshot.assigneeId, candidateAssigneeId]);
    await lockTicket(tx, ticketId);
    await lockAction(tx, ticketId, actionId);
    const { ticket, action } = await loadMutationState(tx, ticketId, actionId);
    await assertEligibleActor(tx, actor.id);

    if (ticket.version !== input.expectedTicketVersion || action.version !== input.expectedActionVersion) throw conflict();
    if (action.assignee.id !== snapshot.assigneeId) throw conflict();
    if (!isActiveActionParentStatus(ticket.currentStatus)) throw conflict("Ticket does not accept Action changes in its current state");
    if (action.workflowCycle !== ticket.workflowCycle) throw conflict("Historical Actions are read-only");
    if (action.status === "CANCELLED") throw conflict("Cancelled Actions are read-only");
    if (action.status === "COMPLETED" && input.assigneeId !== undefined) throw conflict("Completed Action assignment cannot be changed");

    const nextAssigneeId = input.assigneeId ?? action.assignee.id;
    await assertEligibleAssignee(tx, nextAssigneeId);
    const nextDescription = input.description ?? action.description;
    const nextResult = input.result !== undefined ? input.result : action.result;
    const nextFollowUpRequired = input.followUpRequired ?? action.followUpRequired;
    const nextFollowUpNote = input.followUpNote !== undefined ? input.followUpNote : action.followUpNote;
    const nextAttachmentNotes = input.attachmentNotes !== undefined ? input.attachmentNotes : action.attachmentNotes;
    assertFollowUpState(nextFollowUpRequired, nextFollowUpNote);
    if (action.status === "COMPLETED") assertCompletedResult(nextResult);

    const changed = nextDescription !== action.description
      || nextResult !== action.result
      || nextAssigneeId !== action.assignee.id
      || nextFollowUpRequired !== action.followUpRequired
      || nextFollowUpNote !== action.followUpNote
      || nextAttachmentNotes !== action.attachmentNotes;
    if (!changed) {
      return {
        action: serializeActionPublic(actor, ticket, action),
        ticketVersion: ticket.version,
        changed: false as const,
      };
    }

    const eventType = action.status === "COMPLETED"
      ? "CONTENT_CORRECTED"
      : nextAssigneeId !== action.assignee.id ? "ASSIGNED" : "EDITED";
    const updatedAction = await tx.actionTaken.update({
      where: { id: actionId },
      data: {
        description: nextDescription,
        result: nextResult,
        assigneeId: nextAssigneeId,
        followUpRequired: nextFollowUpRequired,
        followUpNote: nextFollowUpNote,
        attachmentNotes: nextAttachmentNotes,
        updatedById: actor.id,
        version: { increment: 1 },
      },
      select: actionPublicSelect,
    });
    const updatedTicket = await tx.ticket.update({
      where: { id: ticketId },
      data: { version: { increment: 1 } },
      select: { id: true, requesterId: true, currentStatus: true, workflowCycle: true, version: true },
    });
    await tx.actionTakenRevision.create({
      data: {
        actionId,
        actionVersion: updatedAction.version,
        eventType,
        actorId: actor.id,
        snapshot: actionRevisionSnapshot(updatedAction),
      },
    });
    return {
      action: serializeActionPublic(actor, updatedTicket, updatedAction),
      ticketVersion: updatedTicket.version,
      changed: true as const,
    };
  });
}

export async function updateActionStatus(
  prisma: PrismaClient,
  actor: Actor,
  ticketId: number,
  actionId: number,
  input: ActionStatusInput,
) {
  const snapshot = await mutationSnapshot(prisma, ticketId, actionId);
  return prisma.$transaction(async (tx) => {
    await lockUsers(tx, [actor.id, snapshot.assigneeId]);
    await lockTicket(tx, ticketId);
    await lockAction(tx, ticketId, actionId);
    const { ticket, action } = await loadMutationState(tx, ticketId, actionId);
    await assertEligibleActor(tx, actor.id);

    if (ticket.version !== input.expectedTicketVersion || action.version !== input.expectedActionVersion) throw conflict();
    if (action.assignee.id !== snapshot.assigneeId) throw conflict();
    if (!isActiveActionParentStatus(ticket.currentStatus)) throw conflict("Ticket does not accept Action changes in its current state");
    if (action.workflowCycle !== ticket.workflowCycle) throw conflict("Historical Actions are read-only");
    if (!actionTransitionAllowed(action.status, input.status)) throw conflict("Action status transition is not available");
    await assertEligibleAssignee(tx, action.assignee.id);

    const now = new Date();
    let data: Prisma.ActionTakenUpdateInput;
    let eventType: "STARTED" | "COMPLETED" | "CANCELLED";
    if (input.status === "IN_PROGRESS") {
      data = { status: "IN_PROGRESS", updatedBy: { connect: { id: actor.id } }, version: { increment: 1 } };
      eventType = "STARTED";
    } else if (input.status === "COMPLETED") {
      const followUpRequired = input.followUpRequired ?? action.followUpRequired;
      const followUpNote = input.followUpNote !== undefined ? input.followUpNote : action.followUpNote;
      assertFollowUpState(followUpRequired, followUpNote);
      const result = input.result ?? null;
      assertCompletedResult(result);
      data = {
        status: "COMPLETED",
        result,
        followUpRequired,
        followUpNote,
        performedBy: { connect: { id: actor.id } },
        completedAt: now,
        updatedBy: { connect: { id: actor.id } },
        version: { increment: 1 },
      };
      eventType = "COMPLETED";
    } else {
      data = {
        status: "CANCELLED",
        cancelledAt: now,
        cancelledBy: { connect: { id: actor.id } },
        cancellationReason: input.cancellationReason!,
        updatedBy: { connect: { id: actor.id } },
        version: { increment: 1 },
      };
      eventType = "CANCELLED";
    }

    const updatedAction = await tx.actionTaken.update({ where: { id: actionId }, data, select: actionPublicSelect });
    const updatedTicket = await tx.ticket.update({
      where: { id: ticketId },
      data: { version: { increment: 1 } },
      select: { id: true, requesterId: true, currentStatus: true, workflowCycle: true, version: true },
    });
    await tx.actionTakenRevision.create({
      data: {
        actionId,
        actionVersion: updatedAction.version,
        eventType,
        actorId: actor.id,
        snapshot: actionRevisionSnapshot(updatedAction),
      },
    });
    return {
      action: serializeActionPublic(actor, updatedTicket, updatedAction),
      ticketVersion: updatedTicket.version,
    };
  });
}
