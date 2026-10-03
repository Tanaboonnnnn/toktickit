import { Router } from "express";
import { requireActor } from "../auth/actor.js";
import { requireCsrf } from "../auth/csrf.js";
import { requireCapability } from "../authorization.js";
import { safeErrorBody, validationError } from "../errors.js";
import { getPrisma } from "../prisma.js";
import { parseActionListQuery, parseActionStatusBody, parseCreateActionBody, parseUpdateActionBody } from "./action-contract.js";
import { createAction, listActionRevisions, listActions, updateAction, updateActionStatus } from "./action-service.js";

function positiveId(raw: string, field: "ticketId" | "actionId"): number {
  if (!/^[1-9]\d*$/.test(raw)) throw validationError({ [field]: `${field} must be a positive integer` });
  const id = Number(raw);
  if (!Number.isSafeInteger(id)) throw validationError({ [field]: `${field} must be a positive integer` });
  return id;
}

export function createActionsRouter(): Router {
  const router = Router();

  router.get("/tickets/:ticketId/actions-taken", requireActor(), requireCapability("ACTION_READ"), async (req, res) => {
    try {
      const result = await listActions(
        getPrisma(),
        req.actor!,
        positiveId(req.params.ticketId, "ticketId"),
        parseActionListQuery(req.query as Record<string, unknown>),
      );
      res.status(200).json(result);
    } catch (error) {
      const safe = safeErrorBody(error, "Unable to load Actions Taken");
      res.status(safe.status).json(safe.body);
    }
  });

  router.get("/tickets/:ticketId/actions-taken/:actionId/revisions", requireActor(), requireCapability("ACTION_READ"), async (req, res) => {
    try {
      const result = await listActionRevisions(
        getPrisma(),
        req.actor!,
        positiveId(req.params.ticketId, "ticketId"),
        positiveId(req.params.actionId, "actionId"),
        parseActionListQuery(req.query as Record<string, unknown>),
      );
      res.status(200).json(result);
    } catch (error) {
      const safe = safeErrorBody(error, "Unable to load Action history");
      res.status(safe.status).json(safe.body);
    }
  });

  router.post("/staff/tickets/:ticketId/actions-taken", requireActor(), requireCapability("ACTION_WRITE"), requireCsrf, async (req, res) => {
    try {
      const result = await createAction(
        getPrisma(),
        req.actor!,
        positiveId(req.params.ticketId, "ticketId"),
        parseCreateActionBody(req.body),
      );
      res.status(result.status).json({
        action: result.action,
        ticketVersion: result.ticketVersion,
        replayed: result.replayed,
      });
    } catch (error) {
      const safe = safeErrorBody(error, "Unable to create Action");
      res.status(safe.status).json(safe.body);
    }
  });

  router.patch("/staff/tickets/:ticketId/actions-taken/:actionId", requireActor(), requireCapability("ACTION_WRITE"), requireCsrf, async (req, res) => {
    try {
      const result = await updateAction(
        getPrisma(),
        req.actor!,
        positiveId(req.params.ticketId, "ticketId"),
        positiveId(req.params.actionId, "actionId"),
        parseUpdateActionBody(req.body),
      );
      res.status(200).json(result);
    } catch (error) {
      const safe = safeErrorBody(error, "Unable to update Action");
      res.status(safe.status).json(safe.body);
    }
  });

  router.post("/staff/tickets/:ticketId/actions-taken/:actionId/status", requireActor(), requireCapability("ACTION_WRITE"), requireCsrf, async (req, res) => {
    try {
      const result = await updateActionStatus(
        getPrisma(),
        req.actor!,
        positiveId(req.params.ticketId, "ticketId"),
        positiveId(req.params.actionId, "actionId"),
        parseActionStatusBody(req.body),
      );
      res.status(200).json(result);
    } catch (error) {
      const safe = safeErrorBody(error, "Unable to update Action status");
      res.status(safe.status).json(safe.body);
    }
  });

  return router;
}
