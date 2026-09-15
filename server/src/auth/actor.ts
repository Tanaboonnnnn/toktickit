import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@prisma/client";
import { ApiError } from "../errors.js";
import { getPrisma } from "../prisma.js";
import { destroySession, refreshAuthenticatedCookie } from "./session.js";

export interface Actor {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  mustChangePassword: boolean;
}

declare global {
  namespace Express {
    interface Request {
      actor?: Actor;
    }
  }
}

async function invalidate(req: Request): Promise<never> {
  try { await destroySession(req); } catch { /* the request is denied regardless */ }
  throw new ApiError(401, "AUTHENTICATION_REQUIRED", "Authentication required");
}

export async function loadActor(
  req: Request,
  options: { allowPasswordChangePending?: boolean; inactiveAsForbidden?: boolean } = {},
): Promise<Actor> {
  if (!req.session.userId || req.session.authVersion === undefined || !req.session.absoluteExpiresAt) {
    throw new ApiError(401, "AUTHENTICATION_REQUIRED", "Authentication required");
  }
  if (req.session.absoluteExpiresAt <= Date.now()) return invalidate(req);

  const user = await getPrisma().user.findUnique({
    where: { id: req.session.userId },
    select: { id: true, name: true, email: true, role: true, active: true, mustChangePassword: true, authVersion: true },
  });
  if (!user) return invalidate(req);
  if (!user.active) {
    try { await destroySession(req); } catch { /* request remains denied */ }
    if (options.inactiveAsForbidden) {
      throw new ApiError(403, "ACCOUNT_INACTIVE", "Your account cannot sign in. Contact support.");
    }
    throw new ApiError(401, "AUTHENTICATION_REQUIRED", "Authentication required");
  }
  if (user.authVersion !== req.session.authVersion) return invalidate(req);
  if (user.mustChangePassword && !options.allowPasswordChangePending) {
    throw new ApiError(403, "PASSWORD_CHANGE_REQUIRED", "Change your password before continuing");
  }
  refreshAuthenticatedCookie(req);
  return { id: user.id, name: user.name, email: user.email, role: user.role, mustChangePassword: user.mustChangePassword };
}

export function requireActor(options: { allowPasswordChangePending?: boolean } = {}) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.actor = await loadActor(req, options);
      next();
    } catch (error) {
      next(error);
    }
  };
}
