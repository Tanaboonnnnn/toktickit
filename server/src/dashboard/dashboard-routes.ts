import { Router } from "express";
import { requireActor } from "../auth/actor.js";
import { requireCapability } from "../authorization.js";
import { safeErrorBody, validationError } from "../errors.js";
import { getPrisma } from "../prisma.js";
import { requesterDashboard, staffDashboard } from "./dashboard-service.js";

export function createDashboardRouter() {
  const router = Router();
  router.use((_req, res, next) => { res.setHeader("Cache-Control", "private, no-store"); next(); });
  router.get("/requester", requireActor(), requireCapability("REQUESTER_TICKET_READ_OWN"), async (req, res) => {
    try {
      if (Object.keys(req.query).length) throw validationError({ query: "Query parameters are not supported" });
      res.status(200).json(await requesterDashboard(getPrisma(), req.actor!));
    } catch (error) {
      const safe = safeErrorBody(error, "Unable to load dashboard");
      res.status(safe.status).json(safe.body);
    }
  });
  router.get("/staff", requireActor(), requireCapability("STAFF_TICKET_QUEUE"), async (req, res) => {
    try {
      if (Object.keys(req.query).length) throw validationError({ query: "Query parameters are not supported" });
      res.status(200).json(await staffDashboard(getPrisma(), req.actor!));
    } catch (error) {
      const safe = safeErrorBody(error, "Unable to load dashboard");
      res.status(safe.status).json(safe.body);
    }
  });
  return router;
}
