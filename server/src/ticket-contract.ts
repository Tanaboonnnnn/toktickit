import { validationError } from "./errors.js";

export type RequestedPriority = "LOW" | "MEDIUM" | "HIGH";

export type NormalizedTicketCreateInput = {
  clientRequestId: string;
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  requestedPriority: RequestedPriority;
  description: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const priorities = new Set<RequestedPriority>(["LOW", "MEDIUM", "HIGH"]);

export function parseTicketCreateBody(body: unknown): NormalizedTicketCreateInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw validationError({ body: "Request body must be a JSON object" });
  }
  const record = body as Record<string, unknown>;
  const fieldErrors: Record<string, string> = {};

  const clientRequestId = record.clientRequestId;
  if (typeof clientRequestId !== "string" || !uuidPattern.test(clientRequestId)) {
    fieldErrors.clientRequestId = "clientRequestId must be a valid UUID";
  }

  const categoryId = record.categoryId;
  if (typeof categoryId !== "number" || !Number.isSafeInteger(categoryId) || categoryId <= 0) {
    fieldErrors.categoryId = "Category must be a positive integer";
  }

  const relatedSystemId = record.relatedSystemId;
  if (
    typeof relatedSystemId !== "number"
    || !Number.isSafeInteger(relatedSystemId)
    || relatedSystemId <= 0
  ) {
    fieldErrors.relatedSystemId = "Related System must be a positive integer";
  }

  const summary = typeof record.summary === "string" ? record.summary.trim() : "";
  if (summary.length < 5 || summary.length > 120) {
    fieldErrors.summary = "Summary must contain 5 to 120 characters";
  }

  const requestedPriority = record.requestedPriority;
  if (typeof requestedPriority !== "string" || !priorities.has(requestedPriority as RequestedPriority)) {
    fieldErrors.requestedPriority = "Requested Priority must be LOW, MEDIUM, or HIGH";
  }

  const description = typeof record.description === "string" ? record.description.trim() : "";
  if (description.length < 10 || description.length > 2000) {
    fieldErrors.description = "Description must contain 10 to 2000 characters";
  }

  if (Object.keys(fieldErrors).length > 0) throw validationError(fieldErrors);

  return {
    clientRequestId: clientRequestId as string,
    categoryId: categoryId as number,
    relatedSystemId: relatedSystemId as number,
    summary,
    requestedPriority: requestedPriority as RequestedPriority,
    description,
  };
}
