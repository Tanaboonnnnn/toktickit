import express, { NextFunction, Request, Response } from "express";
import { getPrisma } from "./prisma.js";
import { safeErrorBody } from "./errors.js";
import { parseTicketCreateBody } from "./ticket-contract.js";
import { createTicket, getTicketDetail } from "./ticket-service.js";
import { validationError } from "./errors.js";
import { parseTicketListQuery } from "./ticket-query.js";
import { listMyTickets } from "./ticket-list-service.js";
import multer, { MulterError } from "multer";
import { MAX_ATTACHMENT_BYTES, parsePositiveId } from "./attachment-contract.js";
import { getDownloadAttachment, listAttachments, removeAttachment, uploadAttachment } from "./attachment-service.js";
import { attachmentStorage } from "./attachment-storage.js";
import { createAuthRouter, createCredentialedCorsMiddleware } from "./auth/auth-routes.js";
import { createSessionMiddleware } from "./auth/session.js";
import { requireActor } from "./auth/actor.js";
import { requireCsrf } from "./auth/csrf.js";
import { requireCapability } from "./authorization.js";
// getPrisma() is your lazy database handle. Call it INSIDE a route when you
// need the DB (Issue 4). It is intentionally unused until then.
void getPrisma;

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

// Issue #45 activates one credentialed session transport for authentication and
// the retained application routes. Public health stays public because
// saveUninitialized=false does not create a session merely by passing through.
app.use(createCredentialedCorsMiddleware());
app.use(createSessionMiddleware());
app.use("/api/auth", (_req: Request, res: Response, next: NextFunction) => {
  // Authentication responses, including JSON-parser failures that occur before
  // the auth router handlers, must never be cacheable.
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use(express.json());
app.use("/api/auth", createAuthRouter({ infrastructureMounted: true }));

app.post(
  "/api/tickets",
  requireActor(),
  requireCapability("REQUESTER_TICKET_CREATE"),
  requireCsrf,
  async (req: Request, res: Response) => {
  try {
    const requester = req.actor!;
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
  },
);

app.get("/api/tickets", requireActor(), requireCapability("REQUESTER_TICKET_READ_OWN"), async (req: Request, res: Response) => {
  try {
    const requester = req.actor!;
    const query = parseTicketListQuery(req.query as Record<string, unknown>);
    const result = await listMyTickets(getPrisma(), requester, query);
    res.status(200).json(result);
  } catch (error) {
    const safe = safeErrorBody(error, "Unable to load tickets");
    res.status(safe.status).json(safe.body);
  }
});

app.get("/api/tickets/:ticketId", requireActor(), requireCapability("REQUESTER_TICKET_READ_OWN"), async (req: Request, res: Response) => {
  try {
    const requester = req.actor!;
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

const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  // Allow one byte beyond the business boundary so the service can accept
  // the exact inclusive 5 MiB payload and return the documented 413 for +1.
  limits: { files: 2, fileSize: MAX_ATTACHMENT_BYTES + 1 },
});

app.post(
  "/api/tickets/:ticketId/attachments",
  requireActor(),
  requireCapability("REQUESTER_ATTACHMENT_MANAGE_OWN"),
  requireCsrf,
  attachmentUpload.single("file"),
  async (req: Request, res: Response) => {
  try {
    const requester = req.actor!;
    const ticketId = parsePositiveId(req.params.ticketId, "ticketId");
    if (!req.file) throw validationError({ file: "Exactly one file is required" });
    const attachment = await uploadAttachment(getPrisma(), requester, ticketId, req.file, attachmentStorage);
    res.status(201).json({ attachment });
  } catch (error) {
    const safe = safeErrorBody(error, "Unable to upload attachment");
    res.status(safe.status).json(safe.body);
  }
  },
);

app.get("/api/tickets/:ticketId/attachments", requireActor(), requireCapability("ATTACHMENT_READ_PERMITTED"), async (req: Request, res: Response) => {
  try {
    const requester = req.actor!;
    const ticketId = parsePositiveId(req.params.ticketId, "ticketId");
    res.status(200).json({ items: await listAttachments(getPrisma(), requester, ticketId) });
  } catch (error) {
    const safe = safeErrorBody(error, "Unable to load attachments");
    res.status(safe.status).json(safe.body);
  }
});

app.get("/api/tickets/:ticketId/attachments/:attachmentId/download", requireActor(), requireCapability("ATTACHMENT_READ_PERMITTED"), async (req: Request, res: Response) => {
  try {
    const requester = req.actor!;
    const ticketId = parsePositiveId(req.params.ticketId, "ticketId");
    const attachmentId = parsePositiveId(req.params.attachmentId, "attachmentId");
    const attachment = await getDownloadAttachment(getPrisma(), requester, ticketId, attachmentId);
    let bytes: Buffer;
    try { bytes = await attachmentStorage.read(attachment.storedName!); }
    catch { throw new Error("attachment bytes unavailable"); }
    const safeName = attachment.originalName.replace(/[\r\n"\\]/g, "_").replace(/[^\x20-\x7e]/g, "_") || "attachment";
    res.setHeader("Content-Type", attachment.mimeType);
    res.setHeader("Content-Length", String(bytes.length));
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(attachment.originalName)}`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-store");
    res.status(200).send(bytes);
  } catch (error) {
    const fallback = error instanceof Error && error.message === "attachment bytes unavailable" ? "Attachment is temporarily unavailable" : "Unable to download attachment";
    const safe = safeErrorBody(error, fallback);
    res.status(safe.status).json(safe.body);
  }
});

app.delete(
  "/api/tickets/:ticketId/attachments/:attachmentId",
  requireActor(),
  requireCapability("REQUESTER_ATTACHMENT_MANAGE_OWN"),
  requireCsrf,
  async (req: Request, res: Response) => {
  try {
    const requester = req.actor!;
    const ticketId = parsePositiveId(req.params.ticketId, "ticketId");
    const attachmentId = parsePositiveId(req.params.attachmentId, "attachmentId");
    const attachment = await removeAttachment(getPrisma(), requester, ticketId, attachmentId, req.body?.removalReason, attachmentStorage);
    res.status(200).json({ attachment });
  } catch (error) {
    const safe = safeErrorBody(error, "Unable to remove attachment");
    res.status(safe.status).json(safe.body);
  }
  },
);

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
function rejectReferenceQuery(req: Request): void {
  if (Object.keys(req.query).length > 0) {
    throw validationError({ query: "Query parameters are not supported" });
  }
}

app.get("/api/categories", requireActor(), requireCapability("REFERENCE_DATA_READ"), async (req: Request, res: Response) => {
  try {
    rejectReferenceQuery(req);
    const categories = await getPrisma().category.findMany({
      where: { active: true },
      orderBy: { id: "asc" },
      select: { id: true, name: true },
    });
    res.status(200).json(categories);
  } catch (error) {
    const safe = safeErrorBody(error, "Unable to load categories");
    res.status(safe.status).json(safe.body);
  }
});

app.get("/api/related-systems", requireActor(), requireCapability("REFERENCE_DATA_READ"), async (req: Request, res: Response) => {
  try {
    rejectReferenceQuery(req);
    const relatedSystems = await getPrisma().relatedSystem.findMany({
      where: { active: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: { id: true, name: true },
    });
    res.status(200).json(relatedSystems);
  } catch (error) {
    const safe = safeErrorBody(error, "Unable to load related systems");
    res.status(safe.status).json(safe.body);
  }
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: { code: "RESOURCE_NOT_FOUND", message: "Resource not found" } });
});

// Keep body-parser failures and any unexpected middleware error inside the
// documented safe JSON envelope instead of Express's default HTML/details.
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const parserError = error && typeof error === "object"
    ? error as { type?: string }
    : undefined;
  if (error instanceof MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({ error: { code: "PAYLOAD_TOO_LARGE", message: "Attachment must not exceed 5 MiB (5,242,880 bytes)" } });
    } else {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Request validation failed", fieldErrors: { file: "Exactly one file field named file is required" } } });
    }
    return;
  }
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
