import { validationError } from "../errors.js";

export interface ActionListQuery {
  page: number;
  pageSize: number;
}

export interface CreateActionInput {
  clientRequestId: string;
  expectedTicketVersion: number;
  description: string;
  result: string | null;
  assigneeId?: number;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
}

export interface UpdateActionInput {
  expectedTicketVersion: number;
  expectedActionVersion: number;
  description?: string;
  result?: string | null;
  assigneeId?: number;
  followUpRequired?: boolean;
  followUpNote?: string | null;
  attachmentNotes?: string | null;
}

export interface ActionStatusInput {
  expectedTicketVersion: number;
  expectedActionVersion: number;
  status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  result?: string;
  followUpRequired?: boolean;
  followUpNote?: string | null;
  confirmation?: boolean;
  cancellationReason?: string;
}

type JsonObject = Record<string, unknown>;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function positiveInteger(body: JsonObject, field: string): number {
  const value = body[field];
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    throw validationError({ [field]: `${field} must be a positive integer` });
  }
  return value as number;
}

function codePointLength(value: string): number {
  return Array.from(value).length;
}

function requiredText(body: JsonObject, field: string, min: number, max: number): string {
  const value = body[field];
  if (typeof value !== "string") {
    throw validationError({ [field]: `${field} must be text` });
  }
  const normalized = value.trim();
  const length = codePointLength(normalized);
  if (length < min || length > max) {
    throw validationError({ [field]: `${field} must contain ${min} to ${max} characters after trimming` });
  }
  return normalized;
}

function optionalText(body: JsonObject, field: string, max: number): string | null | undefined {
  const value = body[field];
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") throw validationError({ [field]: `${field} must be text or null` });
  const normalized = value.trim();
  if (!normalized) return null;
  if (codePointLength(normalized) > max) {
    throw validationError({ [field]: `${field} must contain at most ${max} characters after trimming` });
  }
  return normalized;
}

function requiredBoolean(body: JsonObject, field: string): boolean {
  const value = body[field];
  if (typeof value !== "boolean") throw validationError({ [field]: `${field} must be boolean` });
  return value;
}

function optionalBoolean(body: JsonObject, field: string): boolean | undefined {
  const value = body[field];
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") throw validationError({ [field]: `${field} must be boolean` });
  return value;
}

function assertFollowUpNote(required: boolean, note: string | null | undefined): void {
  if (required && !note) {
    throw validationError({ followUpNote: "Follow-up Note is required when follow-up is required" });
  }
}

export function parseCreateActionBody(value: unknown): CreateActionInput {
  const body = bodyObject(value);
  rejectUnknown(body, [
    "clientRequestId", "expectedTicketVersion", "description", "result", "assigneeId",
    "followUpRequired", "followUpNote", "attachmentNotes",
  ]);
  if (typeof body.clientRequestId !== "string" || !uuidPattern.test(body.clientRequestId)) {
    throw validationError({ clientRequestId: "clientRequestId must be a UUID" });
  }
  const followUpRequired = requiredBoolean(body, "followUpRequired");
  const followUpNote = optionalText(body, "followUpNote", 2000) ?? null;
  assertFollowUpNote(followUpRequired, followUpNote);
  const result = optionalText(body, "result", 2000) ?? null;
  const attachmentNotes = optionalText(body, "attachmentNotes", 2000) ?? null;
  const input: CreateActionInput = {
    clientRequestId: body.clientRequestId.toLowerCase(),
    expectedTicketVersion: positiveInteger(body, "expectedTicketVersion"),
    description: requiredText(body, "description", 1, 2000),
    result,
    followUpRequired,
    followUpNote,
    attachmentNotes,
  };
  if (body.assigneeId !== undefined) input.assigneeId = positiveInteger(body, "assigneeId");
  return input;
}

export function parseUpdateActionBody(value: unknown): UpdateActionInput {
  const body = bodyObject(value);
  rejectUnknown(body, [
    "expectedTicketVersion", "expectedActionVersion", "description", "result", "assigneeId",
    "followUpRequired", "followUpNote", "attachmentNotes",
  ]);
  const businessFields = ["description", "result", "assigneeId", "followUpRequired", "followUpNote", "attachmentNotes"];
  if (!businessFields.some((key) => Object.prototype.hasOwnProperty.call(body, key))) {
    throw validationError({ body: "At least one editable Action field is required" });
  }
  const input: UpdateActionInput = {
    expectedTicketVersion: positiveInteger(body, "expectedTicketVersion"),
    expectedActionVersion: positiveInteger(body, "expectedActionVersion"),
  };
  if (body.description !== undefined) input.description = requiredText(body, "description", 1, 2000);
  if (body.result !== undefined) input.result = optionalText(body, "result", 2000) ?? null;
  if (body.assigneeId !== undefined) input.assigneeId = positiveInteger(body, "assigneeId");
  if (body.followUpRequired !== undefined) input.followUpRequired = optionalBoolean(body, "followUpRequired");
  if (body.followUpNote !== undefined) input.followUpNote = optionalText(body, "followUpNote", 2000) ?? null;
  if (body.attachmentNotes !== undefined) input.attachmentNotes = optionalText(body, "attachmentNotes", 2000) ?? null;
  return input;
}

export function parseActionStatusBody(value: unknown): ActionStatusInput {
  const body = bodyObject(value);
  rejectUnknown(body, [
    "expectedTicketVersion", "expectedActionVersion", "status", "result", "followUpRequired",
    "followUpNote", "confirmation", "cancellationReason",
  ]);
  if (body.status !== "IN_PROGRESS" && body.status !== "COMPLETED" && body.status !== "CANCELLED") {
    throw validationError({ status: "Action status must be IN_PROGRESS, COMPLETED, or CANCELLED" });
  }
  const input: ActionStatusInput = {
    expectedTicketVersion: positiveInteger(body, "expectedTicketVersion"),
    expectedActionVersion: positiveInteger(body, "expectedActionVersion"),
    status: body.status,
  };
  if (body.result !== undefined) {
    const normalized = optionalText(body, "result", 2000);
    input.result = normalized ?? undefined;
  }
  if (body.followUpRequired !== undefined) input.followUpRequired = optionalBoolean(body, "followUpRequired");
  if (body.followUpNote !== undefined) input.followUpNote = optionalText(body, "followUpNote", 2000) ?? null;
  if (body.confirmation !== undefined) input.confirmation = optionalBoolean(body, "confirmation");
  if (body.cancellationReason !== undefined && body.cancellationReason !== null) {
    input.cancellationReason = requiredText(body, "cancellationReason", 3, 200);
  }

  if (input.status === "COMPLETED") {
    if (!input.result) throw validationError({ result: "Result is required when completing an Action" });
    if (input.confirmation !== true) throw validationError({ confirmation: "Confirmation is required" });
  }
  if (input.status === "CANCELLED") {
    if (input.confirmation !== true) throw validationError({ confirmation: "Confirmation is required" });
    if (!input.cancellationReason) {
      throw validationError({ cancellationReason: "Cancellation reason must contain 3 to 200 characters after trimming" });
    }
  }
  return input;
}

function oneQueryValue(query: Record<string, unknown>, field: string): string | undefined {
  const value = query[field];
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw validationError({ [field]: `${field} must be provided once` });
  return value;
}

function queryInteger(value: string | undefined, field: string, defaultValue: number, max?: number): number {
  if (value === undefined) return defaultValue;
  if (!/^[1-9]\d*$/.test(value)) throw validationError({ [field]: `${field} must be a positive integer` });
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || (max !== undefined && parsed > max)) {
    throw validationError({ [field]: max ? `${field} must be between 1 and ${max}` : `${field} must be a positive integer` });
  }
  return parsed;
}

export function parseActionListQuery(query: Record<string, unknown>): ActionListQuery {
  const supported = new Set(["page", "pageSize"]);
  const unknown = Object.keys(query).find((key) => !supported.has(key));
  if (unknown) throw validationError({ [unknown]: "Query parameter is not supported" });
  return {
    page: queryInteger(oneQueryValue(query, "page"), "page", 1),
    pageSize: queryInteger(oneQueryValue(query, "pageSize"), "pageSize", 20, 50),
  };
}
