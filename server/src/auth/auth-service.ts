import type { Request } from "express";
import { ApiError, validationError } from "../errors.js";
import { getPrisma } from "../prisma.js";
import { hashPassword, verifyPassword } from "../password.js";
import type { ChangePasswordInput, CurrentUserDto, LoginInput } from "./auth-contract.js";
import { loadActor } from "./actor.js";
import { LoginLimiter } from "./login-limit.js";
import { regenerateSession, saveSession, setAuthenticatedSessionState } from "./session.js";

const loginLimiter = new LoginLimiter();
const DUMMY_LOGIN_PASSWORD_HASH = "$argon2id$v=19$m=19456,p=1,t=2$rxda4ZcJKiWT5fRHYuls5g$3/4YF2vPwvMPTf9rbVRI6xXKhJRHmtm/+B/F1alyhiQ";

function currentUser(user: { id: number; name: string; email: string; role: CurrentUserDto["role"]; mustChangePassword: boolean }): CurrentUserDto {
  return { id: user.id, name: user.name, email: user.email, role: user.role, mustChangePassword: user.mustChangePassword };
}

function requestIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

export async function verifyLoginPassword(passwordHash: string | null | undefined, password: string): Promise<boolean> {
  const matched = await verifyPassword(passwordHash ?? DUMMY_LOGIN_PASSWORD_HASH, password);
  return Boolean(passwordHash) && matched;
}

export async function login(req: Request, input: LoginInput): Promise<CurrentUserDto> {
  const ip = requestIp(req);
  if (loginLimiter.isLimited(input.email, ip)) {
    throw new ApiError(429, "LOGIN_RATE_LIMITED", "Too many sign-in attempts. Try again later.");
  }

  const user = await getPrisma().user.findUnique({
    where: { email: input.email },
    select: { id: true, name: true, email: true, role: true, active: true, passwordHash: true, mustChangePassword: true, authVersion: true },
  });
  const passwordMatches = await verifyLoginPassword(user?.passwordHash, input.password);
  if (!passwordMatches || !user?.passwordHash) {
    loginLimiter.recordFailure(input.email, ip);
    throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }
  if (!user.active) {
    loginLimiter.recordFailure(input.email, ip);
    throw new ApiError(403, "ACCOUNT_INACTIVE", "Your account cannot sign in. Contact support.");
  }

  loginLimiter.recordSuccess(input.email, ip);
  await regenerateSession(req);
  setAuthenticatedSessionState(req, user);
  await saveSession(req);
  return currentUser(user);
}

export async function getCurrentUser(req: Request): Promise<CurrentUserDto> {
  return currentUser(await loadActor(req, { allowPasswordChangePending: true }));
}

export async function changeOwnPassword(req: Request, input: ChangePasswordInput): Promise<CurrentUserDto> {
  const actor = await loadActor(req, { allowPasswordChangePending: true, inactiveAsForbidden: true });
  const user = await getPrisma().user.findUnique({
    where: { id: actor.id },
    select: { id: true, name: true, email: true, role: true, active: true, passwordHash: true, mustChangePassword: true, authVersion: true },
  });
  if (!user?.active || !user.passwordHash) throw new ApiError(403, "ACCOUNT_INACTIVE", "Your account cannot sign in. Contact support.");
  if (!(await verifyPassword(user.passwordHash, input.currentPassword))) {
    throw validationError({ currentPassword: "Current password is incorrect" });
  }
  if (input.newPassword === input.currentPassword) {
    throw validationError({ newPassword: "New password must differ from the current password" });
  }

  const passwordHash = await hashPassword(input.newPassword);
  const updated = await getPrisma().user.updateMany({
    where: { id: user.id, active: true, authVersion: user.authVersion, passwordHash: user.passwordHash },
    data: { passwordHash, mustChangePassword: false, authVersion: { increment: 1 }, version: { increment: 1 } },
  });
  if (updated.count !== 1) throw new ApiError(401, "AUTHENTICATION_REQUIRED", "Authentication required");

  const refreshed = await getPrisma().user.findUniqueOrThrow({
    where: { id: user.id },
    select: { id: true, name: true, email: true, role: true, mustChangePassword: true, authVersion: true },
  });
  await regenerateSession(req);
  setAuthenticatedSessionState(req, refreshed);
  await saveSession(req);
  return currentUser(refreshed);
}
