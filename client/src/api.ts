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

export interface Ticket {
  id: number;
  ticketNumber: string;
  requester: TicketRequester;
  category: Category;
  relatedSystem: RelatedSystem;
  summary: string;
  requestedPriority: RequestedPriority;
  currentStatus: string;
  createdAt: string;
  updatedAt: string;
  description: string;
  attachments: TicketAttachmentMetadata[];
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
