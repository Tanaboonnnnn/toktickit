import { Prisma, type PrismaClient, type RequestedPriority, type TicketStatus } from "@prisma/client";
import type { Actor } from "../auth/actor.js";
import { ApiError, validationError } from "../errors.js";
import { isTicketStatus } from "../ticket-status.js";
import { evaluateStatusTransition } from "./ticket-workflow.js";

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
async function lockTicket(tx: Prisma.TransactionClient, ticketId: number): Promise<void> {
  await tx.$queryRaw`SELECT id FROM "Ticket" WHERE id = ${ticketId} FOR UPDATE`;
}
async function eligibleUser(tx: Prisma.TransactionClient, userId: number) {
  return tx.user.findFirst({ where: { id: userId, active: true, role: { in: ["IT_STAFF", "ADMINISTRATOR"] } }, select: { id: true } });
}
async function ticketState(tx: Prisma.TransactionClient, ticketId: number) {
  const ticket = await tx.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true, ownerId: true, currentStatus: true, version: true,
      resolutionSummary: true, resolvedAt: true, closedAt: true,
      cancelReason: true, cancelledAt: true, requesterResolutionIndicatedAt: true,
    },
  });
  if (!ticket) throw new ApiError(404, "RESOURCE_NOT_FOUND", "Resource not found");
  return ticket;
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
    if (snapshot.ownerId !== null) await lockUser(tx, snapshot.ownerId);
    await lockTicket(tx, ticketId);
    const ticket = await ticketState(tx, ticketId);
    if (ticket.version !== input.expectedVersion || ticket.ownerId !== snapshot.ownerId) throw conflict();
    const ownerEligible = ticket.ownerId === null ? false : Boolean(await eligibleUser(tx, ticket.ownerId));
    const decision = evaluateStatusTransition({
      from: ticket.currentStatus,
      to: input.status,
      actorRole: actor.role,
      hasEligibleOwner: ownerEligible,
      confirmed: input.confirmed,
      resolutionSummary: input.resolutionSummary,
      cancelReason: input.cancelReason,
    });
    if (!decision.allowed) {
      if (decision.reason === "CONFIRMATION_REQUIRED") throw validationError({ confirmed: "Confirmation is required" });
      if (decision.reason === "RESOLUTION_SUMMARY_INVALID") throw validationError({ resolutionSummary: "Resolution Summary must contain 10 to 2000 characters after trimming" });
      if (decision.reason === "CANCEL_REASON_INVALID") throw validationError({ cancelReason: "Cancel reason must contain 3 to 200 characters after trimming" });
      if (decision.reason === "ROLE_NOT_ALLOWED") throw new ApiError(403, "FORBIDDEN", "You do not have permission to perform this action");
      throw conflict();
    }

    const now = new Date();
    const data: Prisma.TicketUpdateInput = { currentStatus: input.status, version: { increment: 1 } };
    if (input.status === "RESOLVED") { data.resolutionSummary = decision.resolutionSummary!; data.resolvedAt = now; }
    if (input.status === "CLOSED") data.closedAt = now;
    if (input.status === "REOPENED") {
      data.resolutionSummary = null; data.resolvedAt = null; data.closedAt = null; data.requesterResolutionIndicatedAt = null;
    }
    if (input.status === "CANCELLED") { data.cancelReason = decision.cancelReason!; data.cancelledAt = now; }
    await tx.ticket.update({ where: { id: ticketId }, data });
  });
}


