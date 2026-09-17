import {
  SafeApiError,
  fetchCsrfToken,
  notifyAuthenticationFailure,
  parseSafeError,
  type Category,
  type RequestedPriority,
  type TicketAttachmentMetadata,
  type TicketRequester,
  type UserRole,
} from "../api.js";
import { isTicketStatus, type TicketStatus } from "../ticket-status.js";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export type StaffOwnerFilter = "all" | "unassigned" | "me" | number;
export type StaffSortField = "updatedAt" | "createdAt" | "ticketNumber" | "itPriority";
export type StaffSortDirection = "asc" | "desc";
export type StaffPageSize = 10 | 20 | 50;

export interface StaffUserSummary { id: number; name: string; role: UserRole }
export interface StaffQueueItem {
  id: number; ticketNumber: string; summary: string; category: Category; requester: TicketRequester;
  requestedPriority: RequestedPriority; itPriority: RequestedPriority; currentStatus: TicketStatus;
  owner: StaffUserSummary | null; createdAt: string; updatedAt: string; version: number;
}
export interface StaffQueueResponse { items: StaffQueueItem[]; page: number; pageSize: StaffPageSize; totalItems: number; totalPages: number }
export interface StaffQueueQuery {
  search?: string; categoryId?: number; currentStatus?: TicketStatus; requestedPriority?: RequestedPriority;
  itPriority?: RequestedPriority; owner?: StaffOwnerFilter; sortBy?: StaffSortField; sortDirection?: StaffSortDirection;
  page?: number; pageSize?: StaffPageSize;
}
export interface StaffTicketDetail extends StaffQueueItem {
  relatedSystem: Category; description: string; attachments: TicketAttachmentMetadata[];
  resolutionSummary: string | null; resolvedAt: string | null; closedAt: string | null; cancelReason: string | null;
  cancelledAt: string | null; requesterResolutionIndicatedAt: string | null;
}

const priorities = ["LOW", "MEDIUM", "HIGH"] as const;
const roles: UserRole[] = ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"];
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value && typeof value === "object"); }
function reference(value: unknown): value is Category { return isRecord(value) && Number.isSafeInteger(value.id) && typeof value.name === "string"; }
function requester(value: unknown): value is TicketRequester {
  return isRecord(value) && Number.isSafeInteger(value.id) && typeof value.name === "string" && typeof value.email === "string";
}
function userSummary(value: unknown): value is StaffUserSummary {
  return reference(value) && roles.includes((value as StaffUserSummary).role);
}
function priority(value: unknown): value is RequestedPriority { return priorities.includes(value as RequestedPriority); }
function queueItem(value: unknown): value is StaffQueueItem {
  if (!isRecord(value)) return false;
  return Number.isSafeInteger(value.id) && typeof value.ticketNumber === "string" && typeof value.summary === "string"
    && reference(value.category) && requester(value.requester) && priority(value.requestedPriority) && priority(value.itPriority)
    && isTicketStatus(value.currentStatus) && (value.owner === null || userSummary(value.owner))
    && typeof value.createdAt === "string" && typeof value.updatedAt === "string" && Number.isSafeInteger(value.version);
}
function queueResponse(value: unknown): value is StaffQueueResponse {
  if (!isRecord(value)) return false;
  return Array.isArray(value.items) && value.items.every(queueItem) && Number.isSafeInteger(value.page) && (value.page as number) >= 1
    && [10, 20, 50].includes(value.pageSize as number) && Number.isSafeInteger(value.totalItems) && (value.totalItems as number) >= 0
    && Number.isSafeInteger(value.totalPages) && (value.totalPages as number) >= 0;
}
function attachment(value: unknown): value is TicketAttachmentMetadata {
  if (!isRecord(value)) return false;
  return Number.isSafeInteger(value.id) && Number.isSafeInteger(value.ticketId) && typeof value.originalName === "string"
    && typeof value.mimeType === "string" && Number.isSafeInteger(value.sizeBytes) && typeof value.createdAt === "string"
    && (value.state === "ACTIVE" || value.state === "REMOVED") && (value.removedAt === null || typeof value.removedAt === "string")
    && (value.removalReason === null || typeof value.removalReason === "string") && (value.downloadUrl === null || typeof value.downloadUrl === "string");
}
function detail(value: unknown): value is StaffTicketDetail {
  if (!queueItem(value) || !isRecord(value)) return false;
  return reference(value.relatedSystem) && typeof value.description === "string" && Array.isArray(value.attachments) && value.attachments.every(attachment)
    && (value.resolutionSummary === null || typeof value.resolutionSummary === "string")
    && (value.resolvedAt === null || typeof value.resolvedAt === "string") && (value.closedAt === null || typeof value.closedAt === "string")
    && (value.cancelReason === null || typeof value.cancelReason === "string") && (value.cancelledAt === null || typeof value.cancelledAt === "string")
    && (value.requesterResolutionIndicatedAt === null || typeof value.requesterResolutionIndicatedAt === "string");
}
function append(params: URLSearchParams, query: StaffQueueQuery): void {
  const search = query.search?.trim(); if (search) params.set("search", search);
  if (query.categoryId) params.set("categoryId", String(query.categoryId));
  if (query.currentStatus) params.set("currentStatus", query.currentStatus);
  if (query.requestedPriority) params.set("requestedPriority", query.requestedPriority);
  if (query.itPriority) params.set("itPriority", query.itPriority);
  const owner = query.owner ?? "all"; params.set("owner", typeof owner === "number" ? String(owner) : owner);
  params.set("sortBy", query.sortBy ?? "updatedAt"); params.set("sortDirection", query.sortDirection ?? "desc");
  params.set("page", String(query.page ?? 1)); params.set("pageSize", String(query.pageSize ?? 10));
}
async function safeJson(response: Response): Promise<unknown> {
  if (!response.ok) { const error = await parseSafeError(response); notifyAuthenticationFailure(error); throw error; }
  try { return await response.json(); } catch { throw new SafeApiError(500, "INTERNAL_ERROR", "Unexpected response from TokTickIT API"); }
}
async function mutation(ticketId: number, suffix: string, method: "POST" | "PATCH", body: Record<string, unknown>): Promise<StaffTicketDetail> {
  const csrfToken = await fetchCsrfToken();
  const response = await fetch(`${API_URL}/api/staff/tickets/${ticketId}${suffix}`, {
    method, credentials: "include",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    body: JSON.stringify(body),
  });
  const payload = await safeJson(response);
  if (!isRecord(payload) || !detail(payload.ticket)) throw new SafeApiError(500, "INTERNAL_ERROR", "Unexpected response from TokTickIT API");
  return payload.ticket;
}

export function staffQueueContext(query: StaffQueueQuery): string { const params = new URLSearchParams(); append(params, query); return params.toString(); }
export async function fetchStaffQueue(query: StaffQueueQuery = {}): Promise<StaffQueueResponse> {
  const context = staffQueueContext(query); const body = await safeJson(await fetch(`${API_URL}/api/staff/tickets?${context}`, { credentials: "include" }));
  if (!queueResponse(body)) throw new SafeApiError(500, "INTERNAL_ERROR", "Unexpected response from TokTickIT API"); return body;
}
export async function fetchStaffAssignees(): Promise<StaffUserSummary[]> {
  const body = await safeJson(await fetch(`${API_URL}/api/staff/assignees`, { credentials: "include" }));
  if (!isRecord(body) || !Array.isArray(body.items) || !body.items.every(userSummary)) throw new SafeApiError(500, "INTERNAL_ERROR", "Unexpected response from TokTickIT API"); return body.items;
}
export async function fetchStaffTicketDetail(ticketId: number): Promise<StaffTicketDetail> {
  const body = await safeJson(await fetch(`${API_URL}/api/staff/tickets/${ticketId}`, { credentials: "include" }));
  if (!isRecord(body) || !detail(body.ticket)) throw new SafeApiError(500, "INTERNAL_ERROR", "Unexpected response from TokTickIT API"); return body.ticket;
}
export const claimStaffTicket = (ticketId: number, expectedVersion: number) => mutation(ticketId, "/claim", "POST", { expectedVersion });
export const updateStaffOwner = (ticketId: number, ownerId: number | null, expectedVersion: number) => mutation(ticketId, "/owner", "PATCH", { ownerId, expectedVersion, confirmed: true });
export const updateStaffPriority = (ticketId: number, itPriority: RequestedPriority, expectedVersion: number) => mutation(ticketId, "/priority", "PATCH", { itPriority, expectedVersion });
export const updateStaffStatus = (ticketId: number, body: { status: TicketStatus; expectedVersion: number; confirmed?: boolean; resolutionSummary?: string; cancelReason?: string }) => mutation(ticketId, "/status", "POST", body);
