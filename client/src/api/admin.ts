import {
  SafeApiError,
  fetchCsrfToken,
  notifyAuthenticationFailure,
  parseSafeError,
  type UserRole,
} from "../api.js";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  mustChangePassword: boolean;
  active: boolean;
  version: number;
}

export interface AdminUserQuery {
  search?: string;
  role?: UserRole;
}

export interface CreateAdminUserInput {
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  initialPassword: string;
  confirmPassword: string;
}

export interface UpdateAdminUserInput {
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  expectedVersion: number;
}

export interface ResetInitialPasswordInput {
  initialPassword: string;
  confirmPassword: string;
  expectedVersion: number;
  confirmed: true;
}

const roles: UserRole[] = ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function adminUser(value: unknown): value is AdminUser {
  if (!isRecord(value)) return false;
  return Number.isSafeInteger(value.id)
    && typeof value.name === "string"
    && typeof value.email === "string"
    && roles.includes(value.role as UserRole)
    && typeof value.mustChangePassword === "boolean"
    && typeof value.active === "boolean"
    && Number.isSafeInteger(value.version)
    && (value.version as number) >= 1;
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

async function mutation(path: string, method: "POST" | "PATCH", body: unknown): Promise<AdminUser> {
  const csrfToken = await fetchCsrfToken();
  const response = await fetch(`${API_URL}${path}`, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    body: JSON.stringify(body),
  });
  const payload = await safeJson(response);
  if (!isRecord(payload) || !adminUser(payload.user)) {
    throw new SafeApiError(500, "INTERNAL_ERROR", "Unexpected response from TokTickIT API");
  }
  return payload.user;
}

export async function fetchAdminUsers(query: AdminUserQuery = {}): Promise<AdminUser[]> {
  const params = new URLSearchParams();
  const search = query.search?.trim();
  if (search) params.set("search", search);
  if (query.role) params.set("role", query.role);
  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  const payload = await safeJson(await fetch(`${API_URL}/api/admin/users${suffix}`, { credentials: "include" }));
  if (!isRecord(payload) || !Array.isArray(payload.items) || !payload.items.every(adminUser)) {
    throw new SafeApiError(500, "INTERNAL_ERROR", "Unexpected response from TokTickIT API");
  }
  return payload.items;
}

export function createAdminUser(input: CreateAdminUserInput): Promise<AdminUser> {
  return mutation("/api/admin/users", "POST", input);
}

export function updateAdminUser(userId: number, input: UpdateAdminUserInput): Promise<AdminUser> {
  return mutation(`/api/admin/users/${userId}`, "PATCH", input);
}

export function resetAdminInitialPassword(userId: number, input: ResetInitialPasswordInput): Promise<AdminUser> {
  return mutation(`/api/admin/users/${userId}/initial-password`, "POST", input);
}
