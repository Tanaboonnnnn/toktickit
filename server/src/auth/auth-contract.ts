import { validationError } from "../errors.js";

export interface LoginInput {
  email: string;
  password: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface CurrentUserDto {
  id: number;
  name: string;
  email: string;
  role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  mustChangePassword: boolean;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function canonicalEmail(value: string): string {
  return value.trim().toLowerCase();
}

function stringField(body: unknown, field: string): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const value = (body as Record<string, unknown>)[field];
  return typeof value === "string" ? value : undefined;
}

export function parseLoginBody(body: unknown): LoginInput {
  const emailInput = stringField(body, "email");
  const password = stringField(body, "password");
  const email = emailInput === undefined ? "" : canonicalEmail(emailInput);
  const fieldErrors: Record<string, string> = {};

  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    fieldErrors.email = "Enter a valid email address";
  }
  if (!password) fieldErrors.password = "Password is required";
  if (Object.keys(fieldErrors).length > 0) throw validationError(fieldErrors);
  return { email, password: password! };
}

export function parseChangePasswordBody(body: unknown): ChangePasswordInput {
  const currentPassword = stringField(body, "currentPassword");
  const newPassword = stringField(body, "newPassword");
  const confirmPassword = stringField(body, "confirmPassword");
  const fieldErrors: Record<string, string> = {};

  if (!currentPassword) fieldErrors.currentPassword = "Current password is required";
  if (newPassword === undefined) {
    fieldErrors.newPassword = "New password is required";
  } else {
    const length = Array.from(newPassword).length;
    if (length < 15 || length > 128) {
      fieldErrors.newPassword = "New password must be 15 to 128 characters";
    }
  }
  if (confirmPassword === undefined) {
    fieldErrors.confirmPassword = "Password confirmation is required";
  } else if (newPassword !== undefined && confirmPassword !== newPassword) {
    fieldErrors.confirmPassword = "Password confirmation must match";
  }
  if (Object.keys(fieldErrors).length > 0) throw validationError(fieldErrors);
  return { currentPassword: currentPassword!, newPassword: newPassword!, confirmPassword: confirmPassword! };
}
