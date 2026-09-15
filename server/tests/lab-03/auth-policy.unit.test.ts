import { describe, expect, it } from "vitest";
import { parseChangePasswordBody, parseLoginBody } from "../../src/auth/auth-contract.js";
import { LoginLimiter } from "../../src/auth/login-limit.js";
import * as authService from "../../src/auth/auth-service.js";
import {
  configuredFrontendOrigin,
  createSessionMiddleware,
  secureCookieEnabled,
} from "../../src/auth/session.js";

describe("AUTH-05 authentication policy", () => {
  it("uses a real Argon2 verification path even when no account hash exists", async () => {
    const verifyLoginPassword = Reflect.get(authService, "verifyLoginPassword");
    expect(typeof verifyLoginPassword).toBe("function");
    await expect(verifyLoginPassword(null, "unknown-account-password")).resolves.toBe(false);
  });

  it("canonicalizes login email without altering the password", () => {
    expect(parseLoginBody({ email: "  USER@Example.Test  ", password: "  exact password  " })).toEqual({
      email: "user@example.test",
      password: "  exact password  ",
    });
  });

  it("validates new password by Unicode code points and preserves exact characters", () => {
    const value = "  ใหม่Password123  ";
    expect(parseChangePasswordBody({
      currentPassword: "current password",
      newPassword: value,
      confirmPassword: value,
    })).toEqual({
      currentPassword: "current password",
      newPassword: value,
      confirmPassword: value,
    });
  });

  it("rejects mismatched confirmation and passwords outside 15..128 code points", () => {
    for (const body of [
      { currentPassword: "current password", newPassword: "short", confirmPassword: "short" },
      { currentPassword: "current password", newPassword: "x".repeat(129), confirmPassword: "x".repeat(129) },
      { currentPassword: "current password", newPassword: "new-password-123", confirmPassword: "different-value" },
    ]) {
      expect(() => parseChangePasswordBody(body)).toThrow();
    }
  });

  it("rate-limits the eleventh matching account+IP failure for fifteen minutes", () => {
    const limiter = new LoginLimiter();
    const now = 1_700_000_000_000;
    for (let index = 0; index < 10; index += 1) {
      expect(limiter.isLimited("user@example.test", "127.0.0.1", now)).toBe(false);
      limiter.recordFailure("user@example.test", "127.0.0.1", now);
    }
    expect(limiter.isLimited("user@example.test", "127.0.0.1", now)).toBe(true);
    expect(limiter.isLimited("other@example.test", "127.0.0.1", now)).toBe(false);
    expect(limiter.isLimited("user@example.test", "127.0.0.1", now + 15 * 60_000 + 1)).toBe(false);
  });

  it("applies the IP-wide limit without unbounded stale entries", () => {
    const limiter = new LoginLimiter({ maxEntries: 128 });
    const now = 1_700_000_000_000;
    for (let index = 0; index < 100; index += 1) {
      limiter.recordFailure(`user-${index}@example.test`, "203.0.113.10", now);
    }
    expect(limiter.isLimited("fresh@example.test", "203.0.113.10", now)).toBe(true);
    expect(limiter.entryCount()).toBeLessThanOrEqual(128);
    expect(limiter.isLimited("fresh@example.test", "203.0.113.10", now + 15 * 60_000 + 1)).toBe(false);
  });

  it("fails closed on an unusable production session secret", () => {
    const previous = {
      databaseUrl: process.env.DATABASE_URL,
      frontendOrigin: process.env.FRONTEND_ORIGIN,
      nodeEnv: process.env.NODE_ENV,
      sessionSecret: process.env.SESSION_SECRET,
    };
    try {
      process.env.DATABASE_URL = "postgresql://example:example@localhost:5432/example";
      process.env.FRONTEND_ORIGIN = "http://localhost:5173";
      process.env.NODE_ENV = "production";
      process.env.SESSION_SECRET = "too-short";
      expect(() => createSessionMiddleware()).toThrow(/SESSION_SECRET/);
    } finally {
      if (previous.databaseUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previous.databaseUrl;
      if (previous.frontendOrigin === undefined) delete process.env.FRONTEND_ORIGIN;
      else process.env.FRONTEND_ORIGIN = previous.frontendOrigin;
      if (previous.nodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous.nodeEnv;
      if (previous.sessionSecret === undefined) delete process.env.SESSION_SECRET;
      else process.env.SESSION_SECRET = previous.sessionSecret;
    }
  });

  it("derives Secure cookies from HTTPS and permits plain HTTP only on loopback", () => {
    const previousOrigin = process.env.FRONTEND_ORIGIN;
    const previousNodeEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "production";
      process.env.FRONTEND_ORIGIN = "https://app.example.test";
      expect(configuredFrontendOrigin()).toBe("https://app.example.test");
      expect(secureCookieEnabled()).toBe(true);

      process.env.FRONTEND_ORIGIN = "http://127.0.0.1:5173";
      expect(configuredFrontendOrigin()).toBe("http://127.0.0.1:5173");
      expect(secureCookieEnabled()).toBe(false);

      process.env.FRONTEND_ORIGIN = "http://app.example.test";
      expect(() => configuredFrontendOrigin()).toThrow(/HTTPS/);
    } finally {
      if (previousOrigin === undefined) delete process.env.FRONTEND_ORIGIN;
      else process.env.FRONTEND_ORIGIN = previousOrigin;
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
    }
  });
});
