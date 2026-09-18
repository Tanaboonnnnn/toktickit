import { Router } from "express";
import { requireActor } from "../auth/actor.js";
import { requireCsrf } from "../auth/csrf.js";
import { requireCapability } from "../authorization.js";
import { safeErrorBody, validationError } from "../errors.js";
import { getPrisma } from "../prisma.js";
import { parseAdminUserQuery, parseCreateAdminUserBody, parseResetInitialPasswordBody, parseUpdateAdminUserBody } from "./user-contract.js";
import { createAdminUser, listAdminUsers, resetInitialPassword, updateAdminUser } from "./user-service.js";

function positiveUserId(raw: string): number {
  if (!/^[1-9]\d*$/.test(raw)) throw validationError({ userId: "User ID must be a positive integer" });
  const id = Number(raw);
  if (!Number.isSafeInteger(id)) throw validationError({ userId: "User ID must be a positive integer" });
  return id;
}

export function createAdminRouter(): Router {
  const router = Router();
  router.use(requireActor(), requireCapability("ADMIN_USER_MANAGE"));
  router.get("/users", async (req, res) => {
    try {
      const items = await listAdminUsers(getPrisma(), parseAdminUserQuery(req.query as Record<string, unknown>));
      res.status(200).json({ items });
    } catch (error) {
      const safe = safeErrorBody(error, "Unable to load users");
      res.status(safe.status).json(safe.body);
    }
  });
  router.post("/users", requireCsrf, async (req, res) => {
    try {
      const user = await createAdminUser(getPrisma(), parseCreateAdminUserBody(req.body));
      res.status(201).json({ user });
    } catch (error) {
      const safe = safeErrorBody(error, "Unable to create user");
      res.status(safe.status).json(safe.body);
    }
  });
  router.patch("/users/:userId", requireCsrf, async (req, res) => {
    try {
      const user = await updateAdminUser(getPrisma(), req.actor!, positiveUserId(req.params.userId), parseUpdateAdminUserBody(req.body));
      res.status(200).json({ user });
    } catch (error) {
      const safe = safeErrorBody(error, "Unable to update user");
      res.status(safe.status).json(safe.body);
    }
  });
  router.post("/users/:userId/initial-password", requireCsrf, async (req, res) => {
    try {
      const user = await resetInitialPassword(getPrisma(), positiveUserId(req.params.userId), parseResetInitialPasswordBody(req.body));
      res.status(200).json({ user });
    } catch (error) {
      const safe = safeErrorBody(error, "Unable to set initial password");
      res.status(safe.status).json(safe.body);
    }
  });
  return router;
}
