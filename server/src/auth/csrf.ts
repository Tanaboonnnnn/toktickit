import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../errors.js";
import { configuredFrontendOrigin, newCsrfToken, saveSession } from "./session.js";

function equalToken(expected: string, actual: string): boolean {
  const expectedBytes = Buffer.from(expected);
  const actualBytes = Buffer.from(actual);
  return expectedBytes.length === actualBytes.length && timingSafeEqual(expectedBytes, actualBytes);
}

export async function ensureCsrfToken(req: Request): Promise<string> {
  if (!req.session.csrfToken) {
    req.session.csrfToken = newCsrfToken();
    await saveSession(req);
  }
  return req.session.csrfToken;
}

export function validateCsrf(req: Request): void {
  const origin = req.get("Origin");
  const token = req.get("X-CSRF-Token");
  const expected = req.session.csrfToken;
  if (origin !== configuredFrontendOrigin() || !token || !expected || !equalToken(expected, token)) {
    throw new ApiError(403, "CSRF_INVALID", "Request could not be verified");
  }
}

export function requireCsrf(req: Request, _res: Response, next: NextFunction): void {
  try {
    validateCsrf(req);
    next();
  } catch (error) {
    next(error);
  }
}
