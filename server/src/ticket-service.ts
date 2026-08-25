import { Prisma, type PrismaClient } from "@prisma/client";
import type { RequesterContext } from "./requester-context.js";
import { ApiError, validationError } from "./errors.js";
import type { NormalizedTicketCreateInput } from "./ticket-contract.js";
import { isReplayCompatible } from "./ticket-idempotency.js";
import {
  TicketNumberCollisionError,
  createTicketNumber,
  withTicketNumberRetry,
} from "./ticket-number.js";

const ticketArgs = Prisma.validator<Prisma.TicketDefaultArgs>()({
  include: {
    requester: { select: { id: true, name: true, email: true } },
    category: { select: { id: true, name: true } },
    relatedSystem: { select: { id: true, name: true } },
    attachments: {
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        ticketId: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
        removedAt: true,
        removalReason: true,
      },
    },
  },
});

type TicketWithRelations = Prisma.TicketGetPayload<typeof ticketArgs>;

export type TicketCreateResult = {
  status: 200 | 201;
  ticket: ReturnType<typeof serializeTicket>;
  replayed: boolean;
};

function isUniqueConstraint(error: unknown, field: "ticketNumber" | "clientRequestId"): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }
  const target = error.meta?.target;
  if (Array.isArray(target)) return target.some((item) => String(item).includes(field));
  return typeof target === "string" && target.includes(field);
}

function duplicateConflict(): ApiError {
  return new ApiError(
    409,
    "DUPLICATE_REQUEST_CONFLICT",
    "clientRequestId was already used for a different request",
  );
}

async function findByClientRequestId(
  prisma: PrismaClient,
  clientRequestId: string,
): Promise<TicketWithRelations | null> {
  return prisma.ticket.findUnique({
    where: { clientRequestId },
    include: ticketArgs.include,
  });
}

function replayOrConflict(
  existing: TicketWithRelations,
  requester: RequesterContext,
  input: NormalizedTicketCreateInput,
): TicketCreateResult {
  if (!isReplayCompatible(existing, requester.id, input)) throw duplicateConflict();
  return {
    status: 200,
    ticket: serializeTicket(existing),
    replayed: true,
  };
}

async function validateActiveReferences(prisma: PrismaClient, input: NormalizedTicketCreateInput) {
  const [category, relatedSystem] = await Promise.all([
    prisma.category.findFirst({
      where: { id: input.categoryId, active: true },
      select: { id: true, name: true },
    }),
    prisma.relatedSystem.findFirst({
      where: { id: input.relatedSystemId, active: true },
      select: { id: true, name: true },
    }),
  ]);

  const fieldErrors: Record<string, string> = {};
  if (!category) fieldErrors.categoryId = "Category must be active and exist";
  if (!relatedSystem) fieldErrors.relatedSystemId = "Related System must be active and exist";
  if (Object.keys(fieldErrors).length > 0) throw validationError(fieldErrors);
}

export async function createTicket(
  prisma: PrismaClient,
  requester: RequesterContext,
  input: NormalizedTicketCreateInput,
): Promise<TicketCreateResult> {
  const existing = await findByClientRequestId(prisma, input.clientRequestId);
  if (existing) return replayOrConflict(existing, requester, input);

  await validateActiveReferences(prisma, input);

  return withTicketNumberRetry(
    async (ticketNumber): Promise<TicketCreateResult> => {
      try {
        const created = await prisma.ticket.create({
          data: {
            ticketNumber,
            clientRequestId: input.clientRequestId,
            requesterId: requester.id,
            categoryId: input.categoryId,
            relatedSystemId: input.relatedSystemId,
            summary: input.summary,
            description: input.description,
            requestedPriority: input.requestedPriority,
          },
          include: ticketArgs.include,
        });
        return {
          status: 201,
          ticket: serializeTicket(created),
          replayed: false,
        };
      } catch (error) {
        if (isUniqueConstraint(error, "ticketNumber")) {
          throw new TicketNumberCollisionError();
        }
        if (isUniqueConstraint(error, "clientRequestId")) {
          const winner = await findByClientRequestId(prisma, input.clientRequestId);
          if (winner) return replayOrConflict(winner, requester, input);
        }
        throw error;
      }
    },
    () => createTicketNumber(),
  );
}

export function serializeTicket(ticket: TicketWithRelations) {
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    requester: ticket.requester,
    category: ticket.category,
    relatedSystem: ticket.relatedSystem,
    summary: ticket.summary,
    requestedPriority: ticket.requestedPriority,
    currentStatus: ticket.currentStatus,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    description: ticket.description,
    attachments: ticket.attachments.map((attachment) => ({
      id: attachment.id,
      ticketId: attachment.ticketId,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      state: attachment.removedAt ? "REMOVED" : "ACTIVE",
      createdAt: attachment.createdAt.toISOString(),
      removedAt: attachment.removedAt?.toISOString() ?? null,
      removalReason: attachment.removalReason,
      downloadUrl: attachment.removedAt
        ? null
        : `/api/tickets/${ticket.id}/attachments/${attachment.id}/download`,
    })),
  };
}
