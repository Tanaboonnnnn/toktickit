import type { Request } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { randomBytes } from "node:crypto";

export const SESSION_COOKIE_NAME = "toktickit.lab3.sid";
export const PREAUTH_SESSION_MS = 10 * 60_000;
export const AUTH_IDLE_SESSION_MS = 30 * 60_000;
export const AUTH_ABSOLUTE_SESSION_MS = 8 * 60 * 60_000;

declare module "express-session" {
  interface SessionData {
    userId?: number;
    authVersion?: number;
    authenticatedAt?: number;
    absoluteExpiresAt?: number;
    csrfToken?: string;
  }
}

function requiredDatabaseUrl(): string {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) throw new Error("DATABASE_URL is required for the session store");
  return value;
}

function sessionSecret(): string {
  const configured = process.env.SESSION_SECRET;
  if (configured && configured.length >= 32) return configured;
  if (process.env.NODE_ENV === "test") return "toktickit-test-only-session-secret-not-for-production";
  throw new Error("SESSION_SECRET must contain at least 32 characters");
}

export function configuredFrontendOrigin(): string {
  const configured = process.env.FRONTEND_ORIGIN?.trim()
    || (process.env.NODE_ENV === "test" ? "http://localhost:5173" : "");
  if (!configured) throw new Error("FRONTEND_ORIGIN is required for authentication");

  let origin: URL;
  try {
    origin = new URL(configured);
  } catch {
    throw new Error("FRONTEND_ORIGIN must be a valid origin");
  }
  if (origin.username || origin.password || origin.search || origin.hash || origin.pathname !== "/") {
    throw new Error("FRONTEND_ORIGIN must contain only scheme, host, and optional port");
  }

  const hostname = origin.hostname.toLowerCase();
  const loopback = hostname === "localhost"
    || hostname === "::1"
    || /^127(?:\.\d{1,3}){3}$/.test(hostname);
  if (origin.protocol !== "https:" && !(origin.protocol === "http:" && loopback)) {
    throw new Error("FRONTEND_ORIGIN must use HTTPS except for loopback development");
  }
  return origin.origin;
}

export function secureCookieEnabled(): boolean {
  return new URL(configuredFrontendOrigin()).protocol === "https:";
}

export function createSessionMiddleware() {
  const PgStore = connectPgSimple(session);
  return session({
    name: SESSION_COOKIE_NAME,
    secret: sessionSecret(),
    store: new PgStore({
      conString: requiredDatabaseUrl(),
      tableName: "session",
      createTableIfMissing: false,
    }),
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookieEnabled(),
      path: "/",
      maxAge: PREAUTH_SESSION_MS,
    },
  });
}

export function newCsrfToken(): string {
  return randomBytes(32).toString("base64url");
}

export function setAuthenticatedSessionState(
  req: Request,
  user: { id: number; authVersion: number },
  now = Date.now(),
): void {
  req.session.userId = user.id;
  req.session.authVersion = user.authVersion;
  req.session.authenticatedAt = now;
  req.session.absoluteExpiresAt = now + AUTH_ABSOLUTE_SESSION_MS;
  req.session.csrfToken = newCsrfToken();
  req.session.cookie.maxAge = AUTH_IDLE_SESSION_MS;
}

export function refreshAuthenticatedCookie(req: Request, now = Date.now()): void {
  if (!req.session.absoluteExpiresAt) return;
  const remaining = req.session.absoluteExpiresAt - now;
  req.session.cookie.maxAge = Math.max(0, Math.min(AUTH_IDLE_SESSION_MS, remaining));
}

export function regenerateSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => error ? reject(error) : resolve());
  });
}

export function saveSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.save((error) => error ? reject(error) : resolve());
  });
}

export function destroySession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.destroy((error) => error ? reject(error) : resolve());
  });
}
