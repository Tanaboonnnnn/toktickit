import type { UserRole } from "@prisma/client";
import { canonicalEmail } from "../auth/auth-contract.js";
import { validationError } from "../errors.js";

export interface AdminUserDto {
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
  expectedVersion: number;
  confirmed: true;
}

const roles = new Set<UserRole>(["REQUESTER", "IT_STAFF", "ADMINISTRATOR"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function bodyObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw validationError({ body: "Request body must be an object" });
  }
  return value as Record<string, unknown>;
}

function rejectUnknown(body: Record<string, unknown>, allowed: readonly string[]): void {
  const allowedSet = new Set(allowed);
  const extra = Object.keys(body).find((key) => !allowedSet.has(key));
  if (extra) throw validationError({ [extra]: "Field is not supported" });
}

function parseName(value: unknown): string {
  if (typeof value !== "string") throw validationError({ name: "Name is required" });
  const name = value.trim();
  const length = Array.from(name).length;
  if (length < 2 || length > 100) throw validationError({ name: "Name must contain 2 to 100 characters" });
  return name;
}

function parseEmail(value: unknown): string {
  if (typeof value !== "string") throw validationError({ email: "Email is required" });
  const email = canonicalEmail(value);
  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) throw validationError({ email: "Enter a valid email address" });
  return email;
}

function parseRole(value: unknown): UserRole {
  if (typeof value !== "string" || !roles.has(value as UserRole)) {
    throw validationError({ role: "Role must be REQUESTER, IT_STAFF, or ADMINISTRATOR" });
  }
  return value as UserRole;
}

function parseActive(value: unknown): boolean {
  if (typeof value !== "boolean") throw validationError({ active: "Active status must be boolean" });
  return value;
}

function parseInitialPassword(body: Record<string, unknown>): string {
  const initialPassword = body.initialPassword;
  const confirmPassword = body.confirmPassword;
  const fieldErrors: Record<string, string> = {};
  if (typeof initialPassword !== "string") {
    fieldErrors.initialPassword = "Initial password is required";
  } else {
    const length = Array.from(initialPassword).length;
    if (length < 15 || length > 128) fieldErrors.initialPassword = "Initial password must be 15 to 128 characters";
  }
  if (typeof confirmPassword !== "string") fieldErrors.confirmPassword = "Password confirmation is required";
  else if (typeof initialPassword === "string" && confirmPassword !== initialPassword) fieldErrors.confirmPassword = "Password confirmation must match";
  if (Object.keys(fieldErrors).length > 0) throw validationError(fieldErrors);
  return initialPassword as string;
}

function parseExpectedVersion(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    throw validationError({ expectedVersion: "Expected version must be a positive integer" });
  }
  return value as number;
}

function scalar(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw validationError({ [field]: `${field} must be a single value` });
  return value;
}

export function parseAdminUserQuery(query: Record<string, unknown>): AdminUserQuery {
  const unknown = Object.keys(query).find((key) => key !== "search" && key !== "role");
  if (unknown) throw validationError({ [unknown]: "Query parameter is not supported" });

  const searchRaw = scalar(query.search, "search");
  const roleRaw = scalar(query.role, "role");
  const search = searchRaw?.trim();
  if (search && Array.from(search).length > 120) throw validationError({ search: "Search must not exceed 120 characters" });
  if (roleRaw !== undefined && !roles.has(roleRaw as UserRole)) {
    throw validationError({ role: "Role must be REQUESTER, IT_STAFF, or ADMINISTRATOR" });
  }
  return {
    ...(search ? { search } : {}),
    ...(roleRaw !== undefined ? { role: roleRaw as UserRole } : {}),
  };
}

export function parseCreateAdminUserBody(value: unknown): CreateAdminUserInput {
  const body = bodyObject(value);
  rejectUnknown(body, ["name", "email", "role", "active", "initialPassword", "confirmPassword"]);
  return {
    name: parseName(body.name),
    email: parseEmail(body.email),
    role: parseRole(body.role),
    active: parseActive(body.active),
    initialPassword: parseInitialPassword(body),
  };
}

export function parseUpdateAdminUserBody(value: unknown): UpdateAdminUserInput {
  const body = bodyObject(value);
  rejectUnknown(body, ["name", "email", "role", "active", "expectedVersion"]);
  return {
    name: parseName(body.name),
    email: parseEmail(body.email),
    role: parseRole(body.role),
    active: parseActive(body.active),
    expectedVersion: parseExpectedVersion(body.expectedVersion),
  };
}

export function parseResetInitialPasswordBody(value: unknown): ResetInitialPasswordInput {
  const body = bodyObject(value);
  rejectUnknown(body, ["initialPassword", "confirmPassword", "expectedVersion", "confirmed"]);
  if (body.confirmed !== true) throw validationError({ confirmed: "Confirmation is required" });
  return {
    initialPassword: parseInitialPassword(body),
    expectedVersion: parseExpectedVersion(body.expectedVersion),
    confirmed: true,
  };
}
