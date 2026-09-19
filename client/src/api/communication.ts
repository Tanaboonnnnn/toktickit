import {
  SafeApiError,
  fetchCsrfToken,
  notifyAuthenticationFailure,
  parseSafeError,
  type UserRole,
} from "../api.js";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface CommunicationAuthor {
  id: number;
  name: string;
  role: UserRole;
}

export interface TicketMessage {
  id: number;
  ticketId: number;
  author: CommunicationAuthor;
  body: string;
  createdAt: string;
}

export interface ResolutionIndicationResult {
  id: number;
  requesterResolutionIndicatedAt: string;
  version: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}

function isRole(value: unknown): value is UserRole {
  return value === "REQUESTER" || value === "IT_STAFF" || value === "ADMINISTRATOR";
}

function isMessage(value: unknown): value is TicketMessage {
  if (!isRecord(value) || !isRecord(value.author)) return false;
  return Number.isSafeInteger(value.id)
    && Number.isSafeInteger(value.ticketId)
    && typeof value.body === "string"
    && typeof value.createdAt === "string"
    && Number.isSafeInteger(value.author.id)
    && typeof value.author.name === "string"
    && isRole(value.author.role);
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

async function fetchMessages(path: string): Promise<TicketMessage[]> {
  const payload = await safeJson(await fetch(`${API_URL}${path}`, { credentials: "include" }));
  if (!isRecord(payload) || !Array.isArray(payload.items) || !payload.items.every(isMessage)) {
    throw new SafeApiError(500, "INTERNAL_ERROR", "Unexpected response from TokTickIT API");
  }
  return payload.items;
}

async function postMessage(path: string, body: string, field: "comment" | "note"): Promise<TicketMessage> {
  const csrfToken = await fetchCsrfToken();
  const payload = await safeJson(await fetch(`${API_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    body: JSON.stringify({ body: body.trim() }),
  }));
  if (!isRecord(payload) || !isMessage(payload[field])) {
    throw new SafeApiError(500, "INTERNAL_ERROR", "Unexpected response from TokTickIT API");
  }
  return payload[field];
}

export const fetchPublicComments = (ticketId: number) => fetchMessages(`/api/tickets/${ticketId}/comments`);
export const postPublicComment = (ticketId: number, body: string) => postMessage(`/api/tickets/${ticketId}/comments`, body, "comment");
export const fetchInternalNotes = (ticketId: number) => fetchMessages(`/api/staff/tickets/${ticketId}/internal-notes`);
export const postInternalNote = (ticketId: number, body: string) => postMessage(`/api/staff/tickets/${ticketId}/internal-notes`, body, "note");

export async function indicateProblemResolved(ticketId: number, expectedVersion: number): Promise<ResolutionIndicationResult> {
  const csrfToken = await fetchCsrfToken();
  const payload = await safeJson(await fetch(`${API_URL}/api/tickets/${ticketId}/resolution-indication`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    body: JSON.stringify({ expectedVersion, confirmed: true }),
  }));
  if (!isRecord(payload) || !isRecord(payload.ticket)
    || !Number.isSafeInteger(payload.ticket.id)
    || typeof payload.ticket.requesterResolutionIndicatedAt !== "string"
    || !Number.isSafeInteger(payload.ticket.version)) {
    throw new SafeApiError(500, "INTERNAL_ERROR", "Unexpected response from TokTickIT API");
  }
  return payload.ticket as unknown as ResolutionIndicationResult;
}
