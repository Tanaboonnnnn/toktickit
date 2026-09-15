import cors from "cors";
import { Router, json, type Request, type Response } from "express";
import { safeErrorBody } from "../errors.js";
import { parseChangePasswordBody, parseLoginBody } from "./auth-contract.js";
import { changeOwnPassword, getCurrentUser, login } from "./auth-service.js";
import { ensureCsrfToken, requireCsrf, validateCsrf } from "./csrf.js";
import {
  SESSION_COOKIE_NAME,
  configuredFrontendOrigin,
  createSessionMiddleware,
  destroySession,
  secureCookieEnabled,
} from "./session.js";

function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, { path: "/", httpOnly: true, sameSite: "lax", secure: secureCookieEnabled() });
}

export function createAuthRouter(): Router {
  const router = Router();
  const allowedOrigin = configuredFrontendOrigin();
  router.use(cors({
    credentials: true,
    origin(origin, callback) {
      callback(null, !origin || origin === allowedOrigin);
    },
  }));
  router.use(createSessionMiddleware());
  router.use(json());

  router.get("/csrf", async (req, res, next) => {
    try {
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json({ csrfToken: await ensureCsrfToken(req) });
    } catch (error) { next(error); }
  });

  router.post("/login", requireCsrf, async (req, res, next) => {
    try {
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json({ user: await login(req, parseLoginBody(req.body)) });
    } catch (error) { next(error); }
  });

  router.get("/me", async (req, res, next) => {
    try {
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json({ user: await getCurrentUser(req) });
    } catch (error) { next(error); }
  });

  router.post("/change-password", requireCsrf, async (req, res, next) => {
    try {
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json({ user: await changeOwnPassword(req, parseChangePasswordBody(req.body)) });
    } catch (error) { next(error); }
  });

  router.post("/logout", async (req: Request, res: Response, next) => {
    try {
      const established = Boolean(req.session.userId || req.session.csrfToken);
      if (established) validateCsrf(req);
      if (established) await destroySession(req);
      clearSessionCookie(res);
      res.setHeader("Cache-Control", "no-store");
      res.status(204).end();
    } catch (error) { next(error); }
  });

  router.use((error: unknown, _req: Request, res: Response, _next: unknown) => {
    res.setHeader("Cache-Control", "no-store");
    const parserError = error && typeof error === "object" ? error as { type?: string } : undefined;
    if (parserError?.type === "entity.parse.failed") {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          fieldErrors: { body: "Request body must be valid JSON" },
        },
      });
      return;
    }
    const safe = safeErrorBody(error, "Unable to process authentication request");
    res.status(safe.status).json(safe.body);
  });
  return router;
}
