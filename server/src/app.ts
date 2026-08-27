import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";
import { safeErrorBody } from "./errors.js";
import {
  DEVELOPMENT_REQUESTER_HEADER,
  resolveRequesterContext,
} from "./requester-context.js";
import { parseTicketCreateBody } from "./ticket-contract.js";
import { createTicket, getTicketDetail } from "./ticket-service.js";
import { validationError } from "./errors.js";
import { parseTicketListQuery } from "./ticket-query.js";
import { listMyTickets } from "./ticket-list-service.js";
// getPrisma() is your lazy database handle. Call it INSIDE a route when you
// need the DB (Issue 4). It is intentionally unused until then.
void getPrisma;

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.use(cors());          // already wired: lets the Vite dev server call this API
app.use(express.json());

app.post("/api/tickets", async (req: Request, res: Response) => {
  try {
    const requester = await resolveRequesterContext(
      getPrisma(),
      req.get(DEVELOPMENT_REQUESTER_HEADER),
    );
    const input = parseTicketCreateBody(req.body);
    const result = await createTicket(getPrisma(), requester, input);
    res.status(result.status).json({
      ticket: result.ticket,
      replayed: result.replayed,
    });
  } catch (error) {
    const safe = safeErrorBody(error, "Unable to create ticket");
    res.status(safe.status).json(safe.body);
  }
});

app.get("/api/tickets", async (req: Request, res: Response) => {
  try {
    const requester = await resolveRequesterContext(
      getPrisma(),
      req.get(DEVELOPMENT_REQUESTER_HEADER),
    );
    const query = parseTicketListQuery(req.query as Record<string, unknown>);
    const result = await listMyTickets(getPrisma(), requester, query);
    res.status(200).json(result);
  } catch (error) {
    const safe = safeErrorBody(error, "Unable to load tickets");
    res.status(safe.status).json(safe.body);
  }
});

app.get("/api/tickets/:ticketId", async (req: Request, res: Response) => {
  try {
    const requester = await resolveRequesterContext(
      getPrisma(),
      req.get(DEVELOPMENT_REQUESTER_HEADER),
    );
    const rawTicketId = req.params.ticketId;
    if (!/^[1-9]\d*$/.test(rawTicketId)) {
      throw validationError({ ticketId: "Ticket ID must be a positive integer" });
    }
    const ticketId = Number(rawTicketId);
    if (!Number.isSafeInteger(ticketId)) {
      throw validationError({ ticketId: "Ticket ID must be a positive integer" });
    }
    const ticket = await getTicketDetail(getPrisma(), requester, ticketId);
    res.status(200).json({ ticket });
  } catch (error) {
    const safe = safeErrorBody(error, "Unable to load ticket");
    res.status(safe.status).json(safe.body);
  }
});

// ---------------------------------------------------------------------------
// Issue 2 — API health check
// Make the test in tests/lab-01/health.test.ts pass.
// It must return HTTP 200 with JSON: { status: "ok", service: "TokTickIT API" }
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

// ---------------------------------------------------------------------------
// Issue 4 — Category list
// Add:  GET /api/categories
//   -> read categories from PostgreSQL via getPrisma().category.findMany(...)
//   -> return each { id, name } in a predictable (id) order
//   -> on failure, respond 500 with a safe message (no internal details)
// ---------------------------------------------------------------------------
app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await getPrisma().category.findMany({
      where: { active: true },
      orderBy: { id: "asc" },
      select: { id: true, name: true },
    });
    res.status(200).json(categories);
  } catch {
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Unable to load categories" },
    });
  }
});

app.get("/api/related-systems", async (_req: Request, res: Response) => {
  try {
    const relatedSystems = await getPrisma().relatedSystem.findMany({
      where: { active: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: { id: true, name: true },
    });
    res.status(200).json(relatedSystems);
  } catch {
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Unable to load related systems" },
    });
  }
});

app.get("/api/development-requesters", async (_req: Request, res: Response) => {
  try {
    const requesters = await getPrisma().requesterUser.findMany({
      where: { active: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: { id: true, name: true, email: true },
    });
    res.status(200).json(requesters);
  } catch {
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Unable to load Development Requesters",
      },
    });
  }
});

// Keep body-parser failures and any unexpected middleware error inside the
// documented safe JSON envelope instead of Express's default HTML/details.
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const parserError = error && typeof error === "object"
    ? error as { type?: string }
    : undefined;
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

  const safe = safeErrorBody(error, "Unable to process request");
  res.status(safe.status).json(safe.body);
});

export default app;
