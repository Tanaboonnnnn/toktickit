import {
  SafeApiError,
  fetchCsrfToken,
  notifyAuthenticationFailure,
  parseSafeError,
  type UserRole,
} from "../api.js";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export type ActionStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface ActionUserSummary {
  id: number;
  name: string;
  role: UserRole;
}

export interface ActionTakenPublic {
  id: number;
  ticketId: number;
  workflowCycle: number;
  createdAt: string;
  recordedBy: ActionUserSummary;
  assignee: ActionUserSummary;
  performedBy: ActionUserSummary | null;
  description: string;
  result: string | null;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
  status: ActionStatus;
  version: number;
  updatedAt: string;
  updatedBy: ActionUserSummary;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelledBy: ActionUserSummary | null;
  cancellationReason: string | null;
  readOnly: boolean;
  capabilities: {
    canEdit: boolean;
    canReassign: boolean;
    permittedTransitions: ActionStatus[];
  };
}

export interface ActionListResponse {
  items: ActionTakenPublic[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  capabilities: { canCreate: boolean };
}

export interface CreateActionTakenInput {
  clientRequestId: string;
  expectedTicketVersion: number;
  description: string;
  result: string | null;
  assigneeId: number;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
}

export interface CreateActionTakenResult {
  action: ActionTakenPublic;
  ticketVersion: number;
  replayed: boolean;
}

export interface UpdateActionTakenInput {
  expectedTicketVersion: number;
  expectedActionVersion: number;
  description?: string;
  result?: string | null;
  assigneeId?: number;
  followUpRequired?: boolean;
  followUpNote?: string | null;
  attachmentNotes?: string | null;
}

export interface ActionStatusUpdateInput {
  expectedTicketVersion: number;
  expectedActionVersion: number;
  status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  result?: string;
  followUpRequired?: boolean;
  followUpNote?: string | null;
  confirmation?: boolean;
  cancellationReason?: string;
}

export interface ActionMutationResult {
  action: ActionTakenPublic;
  ticketVersion: number;
}

export interface ActionRevisionPublic {
  actionId: number;
  actionVersion: number;
  eventType: string;
  actor: ActionUserSummary;
  occurredAt: string;
  snapshot: {
    assignee: ActionUserSummary | null;
    performedBy: ActionUserSummary | null;
    description: string | null;
    result: string | null;
    followUpRequired: boolean;
    followUpNote: string | null;
    attachmentNotes: string | null;
    status: ActionStatus | null;
  };
}

export interface ActionRevisionListResponse {
  items: ActionRevisionPublic[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

const userRoles: UserRole[] = ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"];
const actionStatuses: ActionStatus[] = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

function userSummary(value: unknown): value is ActionUserSummary {
  if (!isRecord(value)) return false;
  return Number.isSafeInteger(value.id)
    && typeof value.name === "string"
    && userRoles.includes(value.role as UserRole);
}

function nullableText(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function nullableUser(value: unknown): value is ActionUserSummary | null {
  return value === null || userSummary(value);
}

export function isActionTakenPublic(value: unknown): value is ActionTakenPublic {
  if (!isRecord(value)) return false;
  const capabilities = value.capabilities;
  return Number.isSafeInteger(value.id)
    && Number.isSafeInteger(value.ticketId)
    && Number.isSafeInteger(value.workflowCycle)
    && typeof value.createdAt === "string"
    && userSummary(value.recordedBy)
    && userSummary(value.assignee)
    && nullableUser(value.performedBy)
    && typeof value.description === "string"
    && nullableText(value.result)
    && typeof value.followUpRequired === "boolean"
    && nullableText(value.followUpNote)
    && nullableText(value.attachmentNotes)
    && actionStatuses.includes(value.status as ActionStatus)
    && Number.isSafeInteger(value.version)
    && typeof value.updatedAt === "string"
    && userSummary(value.updatedBy)
    && nullableText(value.completedAt)
    && nullableText(value.cancelledAt)
    && nullableUser(value.cancelledBy)
    && nullableText(value.cancellationReason)
    && typeof value.readOnly === "boolean"
    && isRecord(capabilities)
    && typeof capabilities.canEdit === "boolean"
    && typeof capabilities.canReassign === "boolean"
    && Array.isArray(capabilities.permittedTransitions)
    && capabilities.permittedTransitions.every((status) => actionStatuses.includes(status as ActionStatus));
}

function actionList(value: unknown): value is ActionListResponse {
  if (!isRecord(value)) return false;
  const capabilities = value.capabilities;
  return Array.isArray(value.items)
    && value.items.every(isActionTakenPublic)
    && Number.isSafeInteger(value.page)
    && Number.isSafeInteger(value.pageSize)
    && Number.isSafeInteger(value.totalItems)
    && Number.isSafeInteger(value.totalPages)
    && (value.page as number) >= 1
    && (value.pageSize as number) >= 1
    && (value.pageSize as number) <= 50
    && (value.totalItems as number) >= 0
    && (value.totalPages as number) >= 0
    && isRecord(capabilities)
    && typeof capabilities.canCreate === "boolean";
}

function publicRevision(value: unknown): value is ActionRevisionPublic {
  if (!isRecord(value) || !isRecord(value.snapshot)) return false;
  const snapshot = value.snapshot;
  return Number.isSafeInteger(value.actionId)
    && Number.isSafeInteger(value.actionVersion)
    && typeof value.eventType === "string"
    && userSummary(value.actor)
    && typeof value.occurredAt === "string"
    && nullableUser(snapshot.assignee)
    && nullableUser(snapshot.performedBy)
    && nullableText(snapshot.description)
    && nullableText(snapshot.result)
    && typeof snapshot.followUpRequired === "boolean"
    && nullableText(snapshot.followUpNote)
    && nullableText(snapshot.attachmentNotes)
    && (snapshot.status === null || actionStatuses.includes(snapshot.status as ActionStatus));
}

function revisionList(value: unknown): value is ActionRevisionListResponse {
  if (!isRecord(value)) return false;
  return Array.isArray(value.items)
    && value.items.every(publicRevision)
    && Number.isSafeInteger(value.page)
    && Number.isSafeInteger(value.pageSize)
    && Number.isSafeInteger(value.totalItems)
    && Number.isSafeInteger(value.totalPages);
}

async function safeJson(response: Response): Promise<unknown> {
  if (!response.ok) {
    const error = await parseSafeError(response);
    notifyAuthenticationFailure(error);
    throw error;
  }
  try {
    return await response.json();
  } catch {
    throw new SafeApiError(500, "INTERNAL_ERROR", "Unexpected response from TokTickIT API");
  }
}

export async function fetchActionsTaken(ticketId: number, page = 1, pageSize = 20): Promise<ActionListResponse> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  const body = await safeJson(await fetch(`${API_URL}/api/tickets/${ticketId}/actions-taken?${params.toString()}`, {
    credentials: "include",
  }));
  if (!actionList(body)) {
    throw new SafeApiError(500, "INTERNAL_ERROR", "Unexpected response from TokTickIT API");
  }
  return body;
}

export async function createActionTaken(ticketId: number, input: CreateActionTakenInput): Promise<CreateActionTakenResult> {
  const csrfToken = await fetchCsrfToken();
  const body = await safeJson(await fetch(`${API_URL}/api/staff/tickets/${ticketId}/actions-taken`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    body: JSON.stringify(input),
  }));
  if (!isRecord(body)
    || !isActionTakenPublic(body.action)
    || !Number.isSafeInteger(body.ticketVersion)
    || (body.ticketVersion as number) < 1
    || typeof body.replayed !== "boolean") {
    throw new SafeApiError(500, "INTERNAL_ERROR", "Unexpected response from TokTickIT API");
  }
  return {
    action: body.action,
    ticketVersion: body.ticketVersion as number,
    replayed: body.replayed,
  };
}

export async function fetchActionRevisions(ticketId: number, actionId: number, page = 1, pageSize = 20): Promise<ActionRevisionListResponse> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  const body = await safeJson(await fetch(`${API_URL}/api/tickets/${ticketId}/actions-taken/${actionId}/revisions?${params.toString()}`, {
    credentials: "include",
  }));
  if (!revisionList(body)) throw new SafeApiError(500, "INTERNAL_ERROR", "Unexpected response from TokTickIT API");
  return body;
}

function mutationResult(body: unknown): ActionMutationResult {
  if (!isRecord(body) || !isActionTakenPublic(body.action) || !Number.isSafeInteger(body.ticketVersion) || (body.ticketVersion as number) < 1) {
    throw new SafeApiError(500, "INTERNAL_ERROR", "Unexpected response from TokTickIT API");
  }
  return { action: body.action, ticketVersion: body.ticketVersion as number };
}

async function actionMutation(ticketId: number, actionId: number, suffix: string, method: "PATCH" | "POST", input: unknown): Promise<ActionMutationResult> {
  const csrfToken = await fetchCsrfToken();
  const body = await safeJson(await fetch(`${API_URL}/api/staff/tickets/${ticketId}/actions-taken/${actionId}${suffix}`, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    body: JSON.stringify(input),
  }));
  return mutationResult(body);
}

export function updateActionTaken(ticketId: number, actionId: number, input: UpdateActionTakenInput): Promise<ActionMutationResult> {
  return actionMutation(ticketId, actionId, "", "PATCH", input);
}

export function updateActionStatus(ticketId: number, actionId: number, input: ActionStatusUpdateInput): Promise<ActionMutationResult> {
  return actionMutation(ticketId, actionId, "/status", "POST", input);
}
