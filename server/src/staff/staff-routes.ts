import { Router } from "express";
import { requireActor } from "../auth/actor.js";
import { requireCapability } from "../authorization.js";
import { safeErrorBody, validationError } from "../errors.js";
import { getPrisma } from "../prisma.js";
import { parseStaffTicketQuery } from "./staff-query.js";
import { getStaffTicketDetail, listEligibleAssignees, listStaffTickets } from "./staff-service.js";

function positiveId(raw: string): number {
  if (!/^[1-9]\d*$/.test(raw)) throw validationError({ ticketId: "Ticket ID must be a positive integer" });
  const id = Number(raw);
  if (!Number.isSafeInteger(id)) throw validationError({ ticketId: "Ticket ID must be a positive integer" });
  return id;
}

export function createStaffRouter(): Router {
  const router = Router();
  router.use(requireActor(), requireCapability("STAFF_TICKET_QUEUE"));
  router.get("/tickets", async (req, res) => {
    try { res.status(200).json(await listStaffTickets(getPrisma(), req.actor!, parseStaffTicketQuery(req.query as Record<string, unknown>))); }
    catch (error) { const safe = safeErrorBody(error, "Unable to load Staff Ticket Queue"); res.status(safe.status).json(safe.body); }
  });
  router.get("/tickets/:ticketId", async (req, res) => {
    try { res.status(200).json({ ticket: await getStaffTicketDetail(getPrisma(), positiveId(req.params.ticketId)) }); }
    catch (error) { const safe = safeErrorBody(error, "Unable to load Staff Ticket Detail"); res.status(safe.status).json(safe.body); }
  });
  router.get("/assignees", async (_req, res) => {
    try { res.status(200).json({ items: await listEligibleAssignees(getPrisma()) }); }
    catch (error) { const safe = safeErrorBody(error, "Unable to load assignees"); res.status(safe.status).json(safe.body); }
  });
  return router;
}
