import { Router } from "express";
import { requireActor } from "../auth/actor.js";
import { requireCsrf } from "../auth/csrf.js";
import { requireCapability } from "../authorization.js";
import { safeErrorBody, validationError } from "../errors.js";
import { getPrisma } from "../prisma.js";
import { parseStaffTicketQuery } from "./staff-query.js";
import { getStaffTicketDetail, listEligibleAssignees, listStaffTickets } from "./staff-service.js";
import { claimTicket, parseClaimBody, parseOwnerBody, parsePriorityBody, parseStatusBody, updateTicketOwner, updateTicketPriority, updateTicketStatus } from "./ticket-operations.js";

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

  router.post("/tickets/:ticketId/claim", requireCapability("STAFF_TICKET_OPERATE"), requireCsrf, async (req, res) => {
    try { const id = positiveId(req.params.ticketId); await claimTicket(getPrisma(), req.actor!, id, parseClaimBody(req.body)); res.status(200).json({ ticket: await getStaffTicketDetail(getPrisma(), id) }); }
    catch (error) { const safe = safeErrorBody(error, "Unable to claim Ticket"); res.status(safe.status).json(safe.body); }
  });
  router.patch("/tickets/:ticketId/owner", requireCapability("STAFF_TICKET_OPERATE"), requireCsrf, async (req, res) => {
    try { const id = positiveId(req.params.ticketId); await updateTicketOwner(getPrisma(), req.actor!, id, parseOwnerBody(req.body)); res.status(200).json({ ticket: await getStaffTicketDetail(getPrisma(), id) }); }
    catch (error) { const safe = safeErrorBody(error, "Unable to update Ticket owner"); res.status(safe.status).json(safe.body); }
  });
  router.patch("/tickets/:ticketId/priority", requireCapability("STAFF_TICKET_OPERATE"), requireCsrf, async (req, res) => {
    try { const id = positiveId(req.params.ticketId); await updateTicketPriority(getPrisma(), id, parsePriorityBody(req.body)); res.status(200).json({ ticket: await getStaffTicketDetail(getPrisma(), id) }); }
    catch (error) { const safe = safeErrorBody(error, "Unable to update IT Priority"); res.status(safe.status).json(safe.body); }
  });
  router.post("/tickets/:ticketId/status", requireCapability("STAFF_TICKET_OPERATE"), requireCsrf, async (req, res) => {
    try { const id = positiveId(req.params.ticketId); await updateTicketStatus(getPrisma(), req.actor!, id, parseStatusBody(req.body)); res.status(200).json({ ticket: await getStaffTicketDetail(getPrisma(), id) }); }
    catch (error) { const safe = safeErrorBody(error, "Unable to update Ticket status"); res.status(safe.status).json(safe.body); }
  });
  return router;
}
