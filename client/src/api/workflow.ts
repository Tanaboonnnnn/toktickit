import { SafeApiError, notifyAuthenticationFailure, parseSafeError, type UserRole } from "../api.js";
import { isTicketStatus, type TicketStatus } from "../ticket-status.js";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

interface WorkflowActor {
  id: number;
  name: string;
  role: UserRole;
}

export interface TicketWorkflowEventPublic {
  id: number;
  ticketId: number;
  ticketVersion: number;
  workflowCycle: number;
  fromStatus: TicketStatus;
  toStatus: TicketStatus;
  actor: WorkflowActor;
  occurredAt: string;
  resolutionSummary: string | null;
  cancellationReason: string | null;
}

export interface TicketWorkflowHistoryResponse {
  items: TicketWorkflowEventPublic[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  historyRecordedSince: "LAB_4";
}

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function nullableText(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function actor(value: unknown): value is WorkflowActor {
  if (!record(value)) return false;
  return Number.isSafeInteger(value.id)
    && typeof value.name === "string"
    && (value.role === "REQUESTER" || value.role === "IT_STAFF" || value.role === "ADMINISTRATOR");
}

function workflowEvent(value: unknown): value is TicketWorkflowEventPublic {
  if (!record(value)) return false;
  return Number.isSafeInteger(value.id)
    && Number.isSafeInteger(value.ticketId)
    && Number.isSafeInteger(value.ticketVersion)
    && Number.isSafeInteger(value.workflowCycle)
    && isTicketStatus(value.fromStatus)
    && isTicketStatus(value.toStatus)
    && actor(value.actor)
    && typeof value.occurredAt === "string"
    && nullableText(value.resolutionSummary)
    && nullableText(value.cancellationReason);
}

function workflowHistory(value: unknown): value is TicketWorkflowHistoryResponse {
  if (!record(value)) return false;
  return Array.isArray(value.items)
    && value.items.every(workflowEvent)
    && Number.isSafeInteger(value.page) && (value.page as number) >= 1
    && Number.isSafeInteger(value.pageSize) && (value.pageSize as number) >= 1 && (value.pageSize as number) <= 50
    && Number.isSafeInteger(value.totalItems) && (value.totalItems as number) >= 0
    && Number.isSafeInteger(value.totalPages) && (value.totalPages as number) >= 0
    && value.historyRecordedSince === "LAB_4";
}

export async function fetchTicketWorkflowHistory(ticketId: number, page = 1, pageSize = 20): Promise<TicketWorkflowHistoryResponse> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  const response = await fetch(`${API_URL}/api/tickets/${ticketId}/workflow-events?${params.toString()}`, { credentials: "include" });
  if (!response.ok) {
    const error = await parseSafeError(response);
    notifyAuthenticationFailure(error);
    throw error;
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new SafeApiError(500, "INTERNAL_ERROR", "Unexpected response from TokTickIT API");
  }
  if (!workflowHistory(body)) throw new SafeApiError(500, "INTERNAL_ERROR", "Unexpected response from TokTickIT API");
  return body;
}
