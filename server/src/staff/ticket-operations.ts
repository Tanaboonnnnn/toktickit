import { Prisma, type PrismaClient, type RequestedPriority, type TicketStatus } from "@prisma/client";
import type { Actor } from "../auth/actor.js";
import { ApiError, validationError } from "../errors.js";
import { isTicketStatus } from "../ticket-status.js";
import { evaluateStatusTransition, type ResolutionWorkState } from "./ticket-workflow.js";

const priorities = new Set<RequestedPriority>(["LOW", "MEDIUM", "HIGH"]);
const claimableStatuses = new Set<TicketStatus>(["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "REOPENED"]);
const unassignableStatuses = new Set<TicketStatus>(["NEW", "CLOSED", "CANCELLED"]);

type JsonObject = Record<string, unknown>;

function bodyObject(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw validationError({ body: "Request body must be an object" });
  return value as JsonObject;
}
function rejectUnknown(body: JsonObject, allowed: readonly string[]): void {
  const allowedSet = new Set(allowed);
  const extra = Object.keys(body).find((key) => !allowedSet.has(key));
  if (extra) throw validationError({ [extra]: "Field is not supported" });
}
function expectedVersion(body: JsonObject): number {
  const value = body.expectedVersion;
  if (!Number.isSafeInteger(value) || (value as number) < 1) throw validationError({ expectedVersion: "Expected version must be a positive integer" });
  return value as number;
}
function confirmed(body: JsonObject): boolean {
  if (body.confirmed !== true) throw validationError({ confirmed: "Confirmation is required" });
  return true;
}
function conflict(message = "Ticket changed or the operation is no longer available"): ApiError {
  return new ApiError(409, "CONFLICT", message);
}
async function lockUser(tx: Prisma.TransactionClient, userId: number): Promise<void> {
  await tx.$queryRaw`SELECT id FROM "RequesterUser" WHERE id = ${userId} FOR UPDATE`;
}
async function lockUsers(tx: Prisma.TransactionClient, userIds: number[]): Promise<void> {
  const ids = [...new Set(userIds)].sort((a, b) => a - b);
  for (const userId of ids) await lockUser(tx, userId);
}
async function lockTicket(tx: Prisma.TransactionClient, ticketId: number): Promise<void> {
  await tx.$queryRaw`SELECT id FROM "Ticket" WHERE id = ${ticketId} FOR UPDATE`;
}
async function lockActions(tx: Prisma.TransactionClient, actionIds: number[]): Promise<void> {
  for (const actionId of [...new Set(actionIds)].sort((a, b) => a - b)) {
    await tx.$queryRaw`SELECT id FROM "ActionTaken" WHERE id = ${actionId} FOR UPDATE`;
  }
}
async function eligibleUser(tx: Prisma.TransactionClient, userId: number) {
  return tx.user.findFirst({ where: { id: userId, active: true, role: { in: ["IT_STAFF", "ADMINISTRATOR"] } }, select: { id: true } });
}
async function ticketState(tx: Prisma.TransactionClient, ticketId: number) {
  const ticket = await tx.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true, ownerId: true, currentStatus: true, version: true,
      workflowCycle: true,
      resolutionSummary: true, resolvedAt: true, closedAt: true,
      cancelReason: true, cancelledAt: true, requesterResolutionIndicatedAt: true,
    },
  });
  if (!ticket) throw new ApiError(404, "RESOURCE_NOT_FOUND", "Resource not found");
  return ticket;
}

const actionCancellationSelect = {
  id: true,
  version: true,
  assignee: { select: { id: true, name: true, role: true } },
  performedBy: { select: { id: true, name: true, role: true } },
  description: true,
  result: true,
  followUpRequired: true,
  followUpNote: true,
  attachmentNotes: true,
  status: true,
} satisfies Prisma.ActionTakenSelect;

type ActionCancellationRow = Prisma.ActionTakenGetPayload<{ select: typeof actionCancellationSelect }>;

function actionRevisionSnapshot(action: ActionCancellationRow): Prisma.InputJsonObject {
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

async function currentCycleActions(tx: Prisma.TransactionClient, ticketId: number, workflowCycle: number) {
  const rows = await tx.actionTaken.findMany({
    where: { ticketId, workflowCycle },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  await lockActions(tx, rows.map((row) => row.id));
  return tx.actionTaken.findMany({
    where: { ticketId, workflowCycle },
    orderBy: { id: "asc" },
    select: {
      id: true,
      status: true,
      followUpRequired: true,
    },
  });
}

function summarizeResolutionWork(actions: Array<{ status: string; followUpRequired: boolean }>): ResolutionWorkState {
  return {
    completedCount: actions.filter((action) => action.status === "COMPLETED").length,
    outstandingCount: actions.filter((action) => action.status === "PENDING" || action.status === "IN_PROGRESS").length,
    unresolvedFollowUpCount: actions.filter((action) => action.status !== "CANCELLED" && action.followUpRequired).length,
  };
}

function resolutionConflict(reason: "COMPLETED_ACTION_REQUIRED" | "OUTSTANDING_ACTIONS" | "FOLLOW_UP_REQUIRED"): ApiError {
  const fieldErrors = {
    COMPLETED_ACTION_REQUIRED: "Complete at least one current-cycle Action before resolving",
    OUTSTANDING_ACTIONS: "Complete or cancel all outstanding current-cycle Actions before resolving",
    FOLLOW_UP_REQUIRED: "Clear required current-cycle follow-up before resolving",
  } as const;
  return new ApiError(409, "CONFLICT", "Ticket cannot be resolved yet", { status: fieldErrors[reason] });
}

async function cancelCurrentCycleActions(
  tx: Prisma.TransactionClient,
  actorId: number,
  actionIds: number[],
  cancellationReason: string,
  now: Date,
): Promise<void> {
  for (const actionId of actionIds) {
    const updated = await tx.actionTaken.update({
      where: { id: actionId },
      data: {
        status: "CANCELLED",
        cancelledAt: now,
        cancelledById: actorId,
        cancellationReason,
        updatedById: actorId,
        version: { increment: 1 },
      },
      select: actionCancellationSelect,
    });
    await tx.actionTakenRevision.create({
      data: {
        actionId,
        actionVersion: updated.version,
        eventType: "CANCELLED",
        actorId,
        createdAt: now,
        snapshot: actionRevisionSnapshot(updated),
      },
    });
  }
}

export function parseClaimBody(value: unknown) {
  const body = bodyObject(value); rejectUnknown(body, ["expectedVersion"]);
  return { expectedVersion: expectedVersion(body) };
}
export function parseOwnerBody(value: unknown) {
  const body = bodyObject(value); rejectUnknown(body, ["ownerId", "expectedVersion", "confirmed"]);
  const ownerId = body.ownerId;
  if (ownerId !== null && (!Number.isSafeInteger(ownerId) || (ownerId as number) < 1)) throw validationError({ ownerId: "Owner ID must be a positive integer or null" });
  confirmed(body);
  return { ownerId: ownerId as number | null, expectedVersion: expectedVersion(body), confirmed: true as const };
}
export function parsePriorityBody(value: unknown) {
  const body = bodyObject(value); rejectUnknown(body, ["itPriority", "expectedVersion"]);
  if (typeof body.itPriority !== "string" || !priorities.has(body.itPriority as RequestedPriority)) throw validationError({ itPriority: "IT Priority must be LOW, MEDIUM, or HIGH" });
  return { itPriority: body.itPriority as RequestedPriority, expectedVersion: expectedVersion(body) };
}
export function parseStatusBody(value: unknown) {
  const body = bodyObject(value); rejectUnknown(body, ["status", "expectedVersion", "confirmed", "resolutionSummary", "cancelReason"]);
  if (typeof body.status !== "string" || !isTicketStatus(body.status)) throw validationError({ status: "Status is not supported" });
  if (body.confirmed !== undefined && typeof body.confirmed !== "boolean") throw validationError({ confirmed: "Confirmation must be boolean" });
  if (body.resolutionSummary !== undefined && typeof body.resolutionSummary !== "string") throw validationError({ resolutionSummary: "Resolution Summary must be text" });
  if (body.cancelReason !== undefined && typeof body.cancelReason !== "string") throw validationError({ cancelReason: "Cancel reason must be text" });
  return {
    status: body.status,
    expectedVersion: expectedVersion(body),
    confirmed: body.confirmed as boolean | undefined,
    resolutionSummary: body.resolutionSummary as string | undefined,
    cancelReason: body.cancelReason as string | undefined,
  };
}

export async function claimTicket(prisma: PrismaClient, actor: Actor, ticketId: number, input: ReturnType<typeof parseClaimBody>): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await lockUser(tx, actor.id);
    if (!await eligibleUser(tx, actor.id)) throw new ApiError(403, "FORBIDDEN", "You do not have permission to perform this action");
    await lockTicket(tx, ticketId);
    const ticket = await ticketState(tx, ticketId);
    if (ticket.version !== input.expectedVersion || ticket.ownerId !== null || !claimableStatuses.has(ticket.currentStatus)) throw conflict();
    await tx.ticket.update({ where: { id: ticketId }, data: { ownerId: actor.id, version: { increment: 1 } } });
  });
}

export async function updateTicketOwner(prisma: PrismaClient, _actor: Actor, ticketId: number, input: ReturnType<typeof parseOwnerBody>): Promise<void> {
  await prisma.$transaction(async (tx) => {
    if (input.ownerId !== null) {
      await lockUser(tx, input.ownerId);
      if (!await eligibleUser(tx, input.ownerId)) throw conflict("Selected owner is not an active eligible assignee");
    }
    await lockTicket(tx, ticketId);
    const ticket = await ticketState(tx, ticketId);
    if (ticket.version !== input.expectedVersion) throw conflict();
    if (ticket.ownerId === input.ownerId) throw conflict("Ticket already has the selected owner");
    if (input.ownerId === null && !unassignableStatuses.has(ticket.currentStatus)) throw conflict("Ticket cannot be unassigned in its current state");
    await tx.ticket.update({ where: { id: ticketId }, data: { ownerId: input.ownerId, version: { increment: 1 } } });
  });
}

export async function updateTicketPriority(prisma: PrismaClient, ticketId: number, input: ReturnType<typeof parsePriorityBody>): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await lockTicket(tx, ticketId);
    const ticket = await ticketState(tx, ticketId);
    if (ticket.version !== input.expectedVersion || ticket.currentStatus === "CLOSED" || ticket.currentStatus === "CANCELLED") throw conflict();
    await tx.ticket.update({ where: { id: ticketId }, data: { itPriority: input.itPriority, version: { increment: 1 } } });
  });
}

export async function updateTicketStatus(prisma: PrismaClient, actor: Actor, ticketId: number, input: ReturnType<typeof parseStatusBody>): Promise<void> {
  const snapshot = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { ownerId: true } });
  if (!snapshot) throw new ApiError(404, "RESOURCE_NOT_FOUND", "Resource not found");
  await prisma.$transaction(async (tx) => {
    await lockUsers(tx, [actor.id, ...(snapshot.ownerId === null ? [] : [snapshot.ownerId])]);
    await lockTicket(tx, ticketId);
    const ticket = await ticketState(tx, ticketId);
    if (ticket.version !== input.expectedVersion || ticket.ownerId !== snapshot.ownerId) throw conflict();
    if (!await eligibleUser(tx, actor.id)) throw new ApiError(403, "FORBIDDEN", "You do not have permission to perform this action");
    const ownerEligible = ticket.ownerId === null ? false : Boolean(await eligibleUser(tx, ticket.ownerId));
    const actions = input.status === "RESOLVED" || input.status === "CANCELLED"
      ? await currentCycleActions(tx, ticketId, ticket.workflowCycle)
      : [];
    const resolutionWork = summarizeResolutionWork(actions);
    const decision = evaluateStatusTransition({
      from: ticket.currentStatus,
      to: input.status,
      actorRole: actor.role,
      hasEligibleOwner: ownerEligible,
      confirmed: input.confirmed,
      resolutionSummary: input.resolutionSummary,
      cancelReason: input.cancelReason,
      resolutionWork,
    });
    if (!decision.allowed) {
      if (decision.reason === "CONFIRMATION_REQUIRED") throw validationError({ confirmed: "Confirmation is required" });
      if (decision.reason === "RESOLUTION_SUMMARY_INVALID") throw validationError({ resolutionSummary: "Resolution Summary must contain 10 to 2000 characters after trimming" });
      if (decision.reason === "CANCEL_REASON_INVALID") throw validationError({ cancelReason: "Cancel reason must contain 3 to 200 characters after trimming" });
      if (decision.reason === "ROLE_NOT_ALLOWED") throw new ApiError(403, "FORBIDDEN", "You do not have permission to perform this action");
      if (decision.reason === "COMPLETED_ACTION_REQUIRED" || decision.reason === "OUTSTANDING_ACTIONS" || decision.reason === "FOLLOW_UP_REQUIRED") {
        throw resolutionConflict(decision.reason);
      }
      throw conflict();
    }

    const now = new Date();
    const data: Prisma.TicketUpdateInput = { currentStatus: input.status, version: { increment: 1 } };
    if (input.status === "RESOLVED") { data.resolutionSummary = decision.resolutionSummary!; data.resolvedAt = now; }
    if (input.status === "CLOSED") data.closedAt = now;
    if (input.status === "REOPENED") {
      data.workflowCycle = { increment: 1 };
      data.resolutionSummary = null; data.resolvedAt = null; data.closedAt = null; data.requesterResolutionIndicatedAt = null;
    }
    if (input.status === "CANCELLED") {
      const outstandingIds = actions
        .filter((action) => action.status === "PENDING" || action.status === "IN_PROGRESS")
        .map((action) => action.id);
      await cancelCurrentCycleActions(tx, actor.id, outstandingIds, decision.cancelReason!, now);
      data.cancelReason = decision.cancelReason!;
      data.cancelledAt = now;
    }
    const updated = await tx.ticket.update({
      where: { id: ticketId },
      data,
      select: { version: true, workflowCycle: true },
    });
    await tx.ticketWorkflowEvent.create({
      data: {
        ticketId,
        ticketVersion: updated.version,
        workflowCycle: updated.workflowCycle,
        fromStatus: ticket.currentStatus,
        toStatus: input.status,
        actorId: actor.id,
        createdAt: now,
        resolutionSummary: input.status === "RESOLVED" ? decision.resolutionSummary! : null,
        cancellationReason: input.status === "CANCELLED" ? decision.cancelReason! : null,
      },
    });
  });
}
