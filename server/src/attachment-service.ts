import { Prisma, type PrismaClient } from "@prisma/client";
import { rm } from "node:fs/promises";
import { ApiError } from "./errors.js";
import type { RequesterContext } from "./requester-context.js";
import { attachmentStorage, generatedStoredName, type AttachmentStorage } from "./attachment-storage.js";
import { assertAttachmentCapacity, validateAttachment, validateRemovalReason } from "./attachment-contract.js";

type AttachmentRow = {
  id: number; ticketId: number; originalName: string; storedName?: string; mimeType: string;
  sizeBytes: number; createdAt: Date; removedAt: Date | null; removalReason: string | null;
};

export function serializeAttachment(attachment: AttachmentRow): {
  id: number; ticketId: number; originalName: string; mimeType: string; sizeBytes: number;
  state: "ACTIVE" | "REMOVED"; createdAt: string; removedAt: string | null;
  removalReason: string | null; downloadUrl: string | null;
} {
  const removed = attachment.removedAt !== null;
  return {
    id: attachment.id, ticketId: attachment.ticketId, originalName: attachment.originalName,
    mimeType: attachment.mimeType, sizeBytes: attachment.sizeBytes, state: removed ? "REMOVED" : "ACTIVE",
    createdAt: attachment.createdAt.toISOString(), removedAt: attachment.removedAt?.toISOString() ?? null,
    removalReason: attachment.removalReason, downloadUrl: removed ? null : `/api/tickets/${attachment.ticketId}/attachments/${attachment.id}/download`,
  };
}

function notFound(message: "Ticket not found" | "Attachment not found") { throw new ApiError(404, "RESOURCE_NOT_FOUND", message); }

async function ownedTicket(prisma: PrismaClient, requesterId: number, ticketId: number) {
  const ticket = await prisma.ticket.findFirst({ where: { id: ticketId, requesterId }, select: { id: true } });
  if (!ticket) notFound("Ticket not found");
  return ticket;
}

export async function uploadAttachment(
  prisma: PrismaClient, requester: RequesterContext, ticketId: number,
  file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
  storage: AttachmentStorage = attachmentStorage,
) {
  await ownedTicket(prisma, requester.id, ticketId);
  const checked = validateAttachment(file.originalname, file.mimetype, file.size, file.buffer);
  const staged = await storage.stage(file.buffer);
  const storedName = generatedStoredName(checked.extension);
  let finalCreated = false;
  try {
    await storage.finalize(staged.tempPath, storedName);
    finalCreated = true;
    const attachment = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Ticket" WHERE id = ${ticketId} AND "requesterId" = ${requester.id} FOR UPDATE`;
      const ticket = await tx.ticket.findFirst({ where: { id: ticketId, requesterId: requester.id }, select: { id: true } });
      if (!ticket) notFound("Ticket not found");
      const activeCount = await tx.attachment.count({ where: { ticketId, removedAt: null } });
      assertAttachmentCapacity(activeCount);
      const created = await tx.attachment.create({ data: { ticketId, originalName: file.originalname, storedName, mimeType: checked.mimeType, sizeBytes: file.size } });
      await tx.ticket.update({ where: { id: ticketId }, data: { updatedAt: new Date() } });
      return created as AttachmentRow;
    });
    return serializeAttachment(attachment);
  } catch (error) {
    if (finalCreated) { try { await storage.remove(storedName); } catch { /* orphan remains outside API reach */ } }
    throw error;
  } finally {
    try { await rmStaging(staged.tempPath); } catch { /* best effort */ }
  }
}

async function rmStaging(tempPath: string) {
  await rm(tempPath, { force: true });
  await rm(pathDir(tempPath), { recursive: true, force: true });
}
function pathDir(value: string): string { const index = Math.max(value.lastIndexOf("/"), value.lastIndexOf("\\")); return index > 0 ? value.slice(0, index) : value; }

export async function listAttachments(prisma: PrismaClient, requester: RequesterContext, ticketId: number) {
  await ownedTicket(prisma, requester.id, ticketId);
  const rows = await prisma.attachment.findMany({ where: { ticketId, ticket: { requesterId: requester.id } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
  return rows.map((row) => serializeAttachment(row as AttachmentRow));
}

export async function getDownloadAttachment(prisma: PrismaClient, requester: RequesterContext, ticketId: number, attachmentId: number) {
  const row = await prisma.attachment.findFirst({ where: { id: attachmentId, ticketId, removedAt: null, ticket: { requesterId: requester.id } } });
  if (!row) notFound("Attachment not found");
  return row as AttachmentRow;
}

export async function removeAttachment(prisma: PrismaClient, requester: RequesterContext, ticketId: number, attachmentId: number, reasonInput: unknown, storage: AttachmentStorage = attachmentStorage) {
  const reason = validateRemovalReason(reasonInput);
  let removed: AttachmentRow;
  try {
    removed = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Ticket" WHERE id = ${ticketId} AND "requesterId" = ${requester.id} FOR UPDATE`;
      const row = await tx.attachment.findFirst({ where: { id: attachmentId, ticketId, removedAt: null, ticket: { requesterId: requester.id } } });
      if (!row) notFound("Attachment not found");
      const updated = await tx.attachment.update({ where: { id: attachmentId }, data: { removedAt: new Date(), removalReason: reason } });
      await tx.ticket.update({ where: { id: ticketId }, data: { updatedAt: new Date() } });
      return updated as AttachmentRow;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") notFound("Attachment not found");
    throw error;
  }
  try { if (removed.storedName) await storage.remove(removed.storedName); } catch { /* metadata removal is authoritative */ }
  return serializeAttachment(removed);
}

export { Prisma };
