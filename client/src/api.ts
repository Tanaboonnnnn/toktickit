const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
}

export interface DevelopmentRequester {
  id: number;
  name: string;
  email: string;
}

export interface RelatedSystem {
  id: number;
  name: string;
}

export type RequestedPriority = "LOW" | "MEDIUM" | "HIGH";
export type TicketStatus = "NEW";

export type TicketSortField = "createdAt" | "updatedAt" | "ticketNumber" | "summary";
export type TicketSortDirection = "asc" | "desc";
export type TicketPageSize = 10 | 20 | 50;

export interface TicketRequester {
  id: number;
  name: string;
  email: string;
}

export interface TicketAttachmentMetadata {
  id: number;
  ticketId: number;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  state: "ACTIVE" | "REMOVED";
  createdAt: string;
  removedAt: string | null;
  removalReason: string | null;
  downloadUrl: string | null;
}
export type Attachment = TicketAttachmentMetadata;

export interface Ticket {
  id: number;
  ticketNumber: string;
  requester: TicketRequester;
  category: Category;
  relatedSystem: RelatedSystem;
  summary: string;
  requestedPriority: RequestedPriority;
  currentStatus: TicketStatus;
  createdAt: string;
  updatedAt: string;
  description: string;
  attachments: TicketAttachmentMetadata[];
}

export interface TicketListItem {
  id: number;
  ticketNumber: string;
  category: Category;
  relatedSystem: RelatedSystem;
  summary: string;
  requestedPriority: RequestedPriority;
  currentStatus: TicketStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TicketListQuery {
  search?: string;
  categoryId?: number;
  requestedPriority?: RequestedPriority;
  currentStatus?: TicketStatus;
  sortBy?: TicketSortField;
  sortDirection?: TicketSortDirection;
  page?: number;
  pageSize?: TicketPageSize;
}

export interface TicketListResponse {
  items: TicketListItem[];
  page: number;
  pageSize: TicketPageSize;
  totalItems: number;
  totalPages: number;
}

export interface TicketCreateResponse {
  ticket: Ticket;
  replayed: boolean;
}

export interface TicketCreateInput {
  clientRequestId: string;
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  requestedPriority: RequestedPriority;
  description: string;
}

export class SafeApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors?: Record<string, string>;

  constructor(status: number, code: string, message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = "SafeApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

async function fetchReferenceList(path: string): Promise<{ id: number; name: string }[]> {
  const response = await fetch(`${API_URL}${path}`);
  if (!response.ok) throw new Error(`Unable to load ${path}`);
  return response.json();
}

export async function fetchCategories(): Promise<Category[]> {
  return fetchReferenceList("/api/categories") as Promise<Category[]>;
}

export async function fetchRelatedSystems(): Promise<RelatedSystem[]> {
  return fetchReferenceList("/api/related-systems") as Promise<RelatedSystem[]>;
}

function safeErrorMessage(response: { status: number; json?: () => Promise<unknown> }): never {
  throw new SafeApiError(
    response.status,
    "INTERNAL_ERROR",
    "Unable to complete the request",
  );
}

async function parseSafeError(response: Response): Promise<SafeApiError> {
  let code = "INTERNAL_ERROR";
  let message = "Unable to complete the request";
  let fieldErrors: Record<string, string> | undefined;

  try {
    const body = await response.json() as {
      error?: { code?: string; message?: string; fieldErrors?: Record<string, string> };
    };
    if (body.error?.code) code = body.error.code;
    if (body.error?.message) message = body.error.message;
    if (body.error?.fieldErrors) fieldErrors = body.error.fieldErrors;
  } catch {
    // keep safe defaults
  }

  return new SafeApiError(response.status, code, message, fieldErrors);
}

function isReferenceItem(value: unknown): value is Category {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return Number.isSafeInteger(item.id) && typeof item.name === "string";
}

function isTicketListItem(value: unknown): value is TicketListItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return Number.isSafeInteger(item.id)
    && typeof item.ticketNumber === "string"
    && isReferenceItem(item.category)
    && isReferenceItem(item.relatedSystem)
    && typeof item.summary === "string"
    && (item.requestedPriority === "LOW" || item.requestedPriority === "MEDIUM" || item.requestedPriority === "HIGH")
    && item.currentStatus === "NEW"
    && typeof item.createdAt === "string"
    && typeof item.updatedAt === "string";
}

function isTicketListResponse(value: unknown): value is TicketListResponse {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  return Array.isArray(result.items)
    && result.items.every(isTicketListItem)
    && Number.isSafeInteger(result.page) && (result.page as number) >= 1
    && result.pageSize !== undefined && [10, 20, 50].includes(result.pageSize as number)
    && Number.isSafeInteger(result.totalItems) && (result.totalItems as number) >= 0
    && Number.isSafeInteger(result.totalPages) && (result.totalPages as number) >= 0;
}

function isTicketAttachment(value: unknown): value is TicketAttachmentMetadata {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return Number.isSafeInteger(item.id)
    && Number.isSafeInteger(item.ticketId)
    && typeof item.originalName === "string"
    && (item.mimeType === "image/jpeg" || item.mimeType === "image/png" || item.mimeType === "image/webp" || item.mimeType === "application/pdf")
    && Number.isSafeInteger(item.sizeBytes) && (item.sizeBytes as number) >= 0
    && (item.state === "ACTIVE" || item.state === "REMOVED")
    && typeof item.createdAt === "string"
    && (item.removedAt === null || typeof item.removedAt === "string")
    && (item.removalReason === null || typeof item.removalReason === "string")
    && (item.downloadUrl === null || typeof item.downloadUrl === "string");
}

function isAttachmentList(value: unknown): value is { items: TicketAttachmentMetadata[] } {
  return Boolean(value && typeof value === "object" && Array.isArray((value as { items?: unknown }).items)
    && (value as { items: unknown[] }).items.every(isTicketAttachment));
}

function isTicket(value: unknown): value is Ticket {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return isTicketListItem(item)
    && isReferenceItem(item.requester)
    && typeof ((item.requester as unknown) as Record<string, unknown>).email === "string"
    && typeof item.description === "string"
    && Array.isArray(item.attachments)
    && item.attachments.every(isTicketAttachment);
}

function appendListQuery(params: URLSearchParams, query: TicketListQuery): void {
  const search = typeof query.search === "string" ? query.search.trim() : "";
  if (search) params.set("search", search);
  if (Number.isSafeInteger(query.categoryId) && (query.categoryId as number) > 0) {
    params.set("categoryId", String(query.categoryId));
  }
  if (query.requestedPriority && ["LOW", "MEDIUM", "HIGH"].includes(query.requestedPriority)) {
    params.set("requestedPriority", query.requestedPriority);
  }
  if (query.currentStatus === "NEW") params.set("currentStatus", query.currentStatus);
  if (query.sortBy && ["createdAt", "updatedAt", "ticketNumber", "summary"].includes(query.sortBy)) {
    params.set("sortBy", query.sortBy);
  }
  if (query.sortDirection && ["asc", "desc"].includes(query.sortDirection)) {
    params.set("sortDirection", query.sortDirection);
  }
  if (Number.isSafeInteger(query.page) && (query.page as number) > 0) params.set("page", String(query.page));
  if (query.pageSize && [10, 20, 50].includes(query.pageSize)) params.set("pageSize", String(query.pageSize));
}

export async function fetchMyTickets(
  requesterId: number,
  query: TicketListQuery = {},
): Promise<TicketListResponse> {
  const params = new URLSearchParams();
  appendListQuery(params, query);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(`${API_URL}/api/tickets${suffix}`, {
    headers: { "X-Development-Requester-Id": String(requesterId) },
  });
  if (!response.ok) throw await parseSafeError(response);
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new SafeApiError(500, "INTERNAL_ERROR", "Unexpected response from TokTickIT API");
  }
  if (!isTicketListResponse(body)) {
    throw new SafeApiError(500, "INTERNAL_ERROR", "Unexpected response from TokTickIT API");
  }
  return body;
}

export async function fetchTicketDetail(requesterId: number, ticketId: number): Promise<Ticket> {
  const response = await fetch(`${API_URL}/api/tickets/${ticketId}`, {
    headers: { "X-Development-Requester-Id": String(requesterId) },
  });
  if (!response.ok) throw await parseSafeError(response);
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new SafeApiError(500, "INTERNAL_ERROR", "Unexpected response from TokTickIT API");
  }
  if (!body || typeof body !== "object" || !isTicket((body as Record<string, unknown>).ticket)) {
    throw new SafeApiError(500, "INTERNAL_ERROR", "Unexpected response from TokTickIT API");
  }
  return (body as { ticket: Ticket }).ticket;
}

export async function createTicket(
  requesterId: number,
  input: TicketCreateInput,
): Promise<TicketCreateResponse> {
  const response = await fetch(`${API_URL}/api/tickets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Development-Requester-Id": String(requesterId),
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) throw await parseSafeError(response);
  const result = await response.json() as TicketCreateResponse;
  if (!result.ticket || typeof result.replayed !== "boolean") {
    throw new SafeApiError(500, "INTERNAL_ERROR", "Unexpected response from TokTickIT API");
  }
  return result;
}

export async function fetchTicketAttachments(requesterId: number, ticketId: number): Promise<TicketAttachmentMetadata[]> {
  const response = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, { headers: { "X-Development-Requester-Id": String(requesterId) } });
  if (!response.ok) throw await parseSafeError(response);
  let body: unknown;
  try { body = await response.json(); } catch { throw new SafeApiError(500, "INTERNAL_ERROR", "Unexpected response from TokTickIT API"); }
  if (!isAttachmentList(body)) throw new SafeApiError(500, "INTERNAL_ERROR", "Unexpected response from TokTickIT API");
  return body.items;
}

export async function uploadAttachment(requesterId: number, ticketId: number, file: File): Promise<TicketAttachmentMetadata> {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
    method: "POST",
    headers: { "X-Development-Requester-Id": String(requesterId) },
    body: form,
  });
  if (!response.ok) throw await parseSafeError(response);
  let body: unknown;
  try { body = await response.json(); } catch { throw new SafeApiError(500, "INTERNAL_ERROR", "Unexpected response from TokTickIT API"); }
  const attachment = body && typeof body === "object" ? (body as { attachment?: unknown }).attachment : undefined;
  if (!isTicketAttachment(attachment) || attachment.state !== "ACTIVE" || attachment.removedAt !== null) throw new SafeApiError(500, "INTERNAL_ERROR", "Unexpected response from TokTickIT API");
  return attachment;
}

export async function downloadAttachment(requesterId: number, ticketId: number, attachmentId: number, filename = "attachment"): Promise<Blob> {
  const response = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments/${attachmentId}/download`, { headers: { "X-Development-Requester-Id": String(requesterId) } });
  if (!response.ok) throw await parseSafeError(response);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.rel = "noreferrer";
    anchor.click();
  } finally { URL.revokeObjectURL(objectUrl); }
  return blob;
}

export async function removeAttachment(requesterId: number, ticketId: number, attachmentId: number, removalReason: string): Promise<TicketAttachmentMetadata> {
  const response = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments/${attachmentId}`, {
    method: "DELETE",
    headers: { "X-Development-Requester-Id": String(requesterId), "Content-Type": "application/json" },
    body: JSON.stringify({ removalReason }),
  });
  if (!response.ok) throw await parseSafeError(response);
  let body: unknown;
  try { body = await response.json(); } catch { throw new SafeApiError(500, "INTERNAL_ERROR", "Unexpected response from TokTickIT API"); }
  const attachment = body && typeof body === "object" ? (body as { attachment?: unknown }).attachment : undefined;
  if (!isTicketAttachment(attachment) || attachment.state !== "REMOVED" || attachment.removedAt === null || attachment.downloadUrl !== null) throw new SafeApiError(500, "INTERNAL_ERROR", "Unexpected response from TokTickIT API");
  return attachment;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

export interface HealthStatus {
  status: "ok";
  service: "TokTickIT API";
}

export async function checkHealth(): Promise<HealthStatus> {
  const response = await fetch(`${API_URL}/api/health`);
  if (!response.ok) throw new Error("Unable to connect to TokTickIT API");
  return response.json();
}

export async function fetchDevelopmentRequesters(): Promise<DevelopmentRequester[]> {
  const response = await fetch(`${API_URL}/api/development-requesters`);
  if (!response.ok) throw new Error("Unable to load Development Requesters");
  return response.json();
}

// Issue 2 + Issue 4 — call the backend.
// Steps: fetch `${API_URL}/api/health`; if not ok, throw.
//        then fetch `${API_URL}/api/categories`; if not ok, throw.
//        return { online: true, categories }.
// Throwing on failure lets the UI show a single Offline/error state.
export async function checkSystem(): Promise<SystemStatus> {
  await checkHealth();

  const response = await fetch(`${API_URL}/api/categories`);
  if (!response.ok) throw new Error("Unable to load categories from TokTickIT API");

  return { online: true, categories: await response.json() };
}
