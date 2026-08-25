import type { NormalizedTicketCreateInput } from "./ticket-contract.js";

export interface ExistingTicketLogicalContent {
  requesterId: number;
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  requestedPriority: NormalizedTicketCreateInput["requestedPriority"];
  description: string;
}

export function isReplayCompatible(
  existing: ExistingTicketLogicalContent,
  requesterId: number,
  input: NormalizedTicketCreateInput,
): boolean {
  return existing.requesterId === requesterId
    && existing.categoryId === input.categoryId
    && existing.relatedSystemId === input.relatedSystemId
    && existing.summary === input.summary
    && existing.requestedPriority === input.requestedPriority
    && existing.description === input.description;
}
