import type { TicketStatus } from "@prisma/client";
import { validationError } from "../errors.js";

type JsonObject = Record<string, unknown>;

function bodyObject(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw validationError({ body: "Request body must be an object" });
  }
  return value as JsonObject;
}

function rejectUnknown(body: JsonObject, allowed: readonly string[]): void {
  const allowedSet = new Set(allowed);
  const extra = Object.keys(body).find((key) => !allowedSet.has(key));
  if (extra) throw validationError({ [extra]: "Field is not supported" });
}

function positiveVersion(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    throw validationError({ expectedVersion: "Expected version must be a positive integer" });
  }
  return value as number;
}

export function normalizeCommunicationBody(value: unknown): string {
  if (typeof value !== "string") throw validationError({ body: "Body must be text" });
  const body = value.trim();
  const length = Array.from(body).length;
  if (length < 1 || length > 2000) {
    throw validationError({ body: "Body must contain 1 to 2000 characters after trimming" });
  }
  return body;
}

export function parseCommunicationBody(value: unknown): { body: string } {
  const body = bodyObject(value);
  rejectUnknown(body, ["body"]);
  return { body: normalizeCommunicationBody(body.body) };
}

export function parseResolutionIndicationBody(value: unknown): { expectedVersion: number; confirmed: true } {
  const body = bodyObject(value);
  rejectUnknown(body, ["expectedVersion", "confirmed"]);
  if (body.confirmed !== true) throw validationError({ confirmed: "Confirmation is required" });
  return { expectedVersion: positiveVersion(body.expectedVersion), confirmed: true };
}

const INDICATION_STATES = new Set<TicketStatus>(["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"]);

export function resolutionIndicationAllowed(status: TicketStatus): boolean {
  return INDICATION_STATES.has(status);
}
