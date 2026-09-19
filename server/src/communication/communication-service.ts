import { Prisma, type PrismaClient } from "@prisma/client";
import type { Actor } from "../auth/actor.js";
import { ApiError } from "../errors.js";
import { resolutionIndicationAllowed } from "./communication-contract.js";

const messageArgs = Prisma.validator<Prisma.PublicCommentDefaultArgs>()({
  include: { author: { select: { id: true, name: true, role: true } } },
});
type PublicMessage = Prisma.PublicCommentGetPayload<typeof messageArgs>;
type PrivateMessage = Prisma.InternalNoteGetPayload<typeof messageArgs>;

function serializeMessage(message: PublicMessage | PrivateMessage) {
  return {
    id: message.id,
    ticketId: message.ticketId,
    author: message.author,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
  };
}

async function assertPublicTicketAccess(prisma: PrismaClient | Prisma.TransactionClient, actor: Actor, ticketId: number): Promise<void> {
  const where = actor.role === "REQUESTER" ? { id: ticketId, requesterId: actor.id } : { id: ticketId };
  const ticket = await prisma.ticket.findFirst({ where, select: { id: true } });
  if (!ticket) throw new ApiError(404, "RESOURCE_NOT_FOUND", "Resource not found");
}

async function assertStaffTicketExists(prisma: PrismaClient, ticketId: number): Promise<void> {
  if (!await prisma.ticket.findUnique({ where: { id: ticketId }, select: { id: true } })) {
    throw new ApiError(404, "RESOURCE_NOT_FOUND", "Resource not found");
  }
}

export async function listPublicComments(prisma: PrismaClient, actor: Actor, ticketId: number) {
  await assertPublicTicketAccess(prisma, actor, ticketId);
  const items = await prisma.publicComment.findMany({
    where: { ticketId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: messageArgs.include,
  });
  return items.map(serializeMessage);
}

export async function createPublicComment(prisma: PrismaClient, actor: Actor, ticketId: number, body: string) {
  await assertPublicTicketAccess(prisma, actor, ticketId);
  return serializeMessage(await prisma.publicComment.create({
    data: { ticketId, authorId: actor.id, body },
    include: messageArgs.include,
  }));
}

export async function listInternalNotes(prisma: PrismaClient, ticketId: number) {
  await assertStaffTicketExists(prisma, ticketId);
  const items = await prisma.internalNote.findMany({
    where: { ticketId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: messageArgs.include,
  });
  return items.map(serializeMessage);
}

export async function createInternalNote(prisma: PrismaClient, actor: Actor, ticketId: number, body: string) {
  await assertStaffTicketExists(prisma, ticketId);
  return serializeMessage(await prisma.internalNote.create({
    data: { ticketId, authorId: actor.id, body },
    include: messageArgs.include,
  }));
}

export async function indicateResolution(
  prisma: PrismaClient,
  actor: Actor,
  ticketId: number,
  expectedVersion: number,
) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Ticket" WHERE id = ${ticketId} FOR UPDATE`;
    const ticket = await tx.ticket.findFirst({
      where: { id: ticketId, requesterId: actor.id },
      select: { id: true, currentStatus: true, requesterResolutionIndicatedAt: true, version: true },
    });
    if (!ticket) throw new ApiError(404, "RESOURCE_NOT_FOUND", "Resource not found");
    if (ticket.requesterResolutionIndicatedAt !== null) {
      return {
        id: ticket.id,
        requesterResolutionIndicatedAt: ticket.requesterResolutionIndicatedAt.toISOString(),
        version: ticket.version,
      };
    }
    if (ticket.version !== expectedVersion || !resolutionIndicationAllowed(ticket.currentStatus)) {
      throw new ApiError(409, "CONFLICT", "Ticket changed or resolution indication is not available");
    }
    const now = new Date();
    const updated = await tx.ticket.update({
      where: { id: ticket.id },
      data: { requesterResolutionIndicatedAt: now, version: { increment: 1 } },
      select: { id: true, requesterResolutionIndicatedAt: true, version: true },
    });
    return {
      id: updated.id,
      requesterResolutionIndicatedAt: updated.requesterResolutionIndicatedAt!.toISOString(),
      version: updated.version,
    };
  });
}
