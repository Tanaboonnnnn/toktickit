import { randomBytes } from "node:crypto";
import { ApiError } from "./errors.js";

const TICKET_NUMBER_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
export const TICKET_NUMBER_ATTEMPT_LIMIT = 5;

export class TicketNumberCollisionError extends Error {
  constructor() {
    super("Ticket Number collision");
    this.name = "TicketNumberCollisionError";
  }
}

function randomSuffix(): string {
  const bytes = randomBytes(6);
  return Array.from(bytes, (byte) => (
    TICKET_NUMBER_ALPHABET[byte % TICKET_NUMBER_ALPHABET.length]
  )).join("");
}

export function createTicketNumber(
  createdAt: Date = new Date(),
  suffixFactory: () => string = randomSuffix,
): string {
  const utcDate = createdAt.toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = suffixFactory();
  if (!/^[A-Z0-9]{6}$/.test(suffix)) {
    throw new Error("Ticket Number suffix must contain six uppercase alphanumeric characters");
  }
  return `TKT-${utcDate}-${suffix}`;
}

export async function withTicketNumberRetry<T>(
  create: (candidate: string) => Promise<T>,
  candidateFactory: () => string = () => createTicketNumber(),
): Promise<T> {
  for (let attempt = 0; attempt < TICKET_NUMBER_ATTEMPT_LIMIT; attempt += 1) {
    try {
      return await create(candidateFactory());
    } catch (error) {
      if (!(error instanceof TicketNumberCollisionError)) throw error;
    }
  }

  throw new ApiError(500, "INTERNAL_ERROR", "Unable to create ticket");
}
