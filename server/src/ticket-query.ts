import { validationError } from "./errors.js";
import type { RequestedPriority } from "./ticket-contract.js";

export type TicketStatus = "NEW";
export type TicketSortField = "createdAt" | "updatedAt" | "ticketNumber" | "summary";
export type TicketSortDirection = "asc" | "desc";
export type TicketPageSize = 10 | 20 | 50;

export type TicketListOrder = {
  field: TicketSortField | "id";
  direction: TicketSortDirection;
};

export interface TicketListQuery {
  search?: string;
  categoryId?: number;
  requestedPriority?: RequestedPriority;
  currentStatus?: TicketStatus;
  sortBy: TicketSortField;
  sortDirection: TicketSortDirection;
  page: number;
  pageSize: TicketPageSize;
  /** The primary order followed by the required deterministic id desc tie-breaker. */
  orderBy: readonly [TicketListOrder, { field: "id"; direction: "desc" }];
}

const allowedParameters = new Set([
  "search",
  "categoryId",
  "requestedPriority",
  "currentStatus",
  "sortBy",
  "sortDirection",
  "page",
  "pageSize",
]);
const priorities = new Set<RequestedPriority>(["LOW", "MEDIUM", "HIGH"]);
const statuses = new Set<TicketStatus>(["NEW"]);
const sortFields = new Set<TicketSortField>([
  "createdAt",
  "updatedAt",
  "ticketNumber",
  "summary",
]);
const sortDirections = new Set<TicketSortDirection>(["asc", "desc"]);
const pageSizes = new Set<TicketPageSize>([10, 20, 50]);

type QueryInput = Record<string, unknown> | URLSearchParams | null | undefined;

function entries(input: QueryInput): Array<[string, unknown]> {
  if (input instanceof URLSearchParams) return Array.from(input.entries());
  if (!input || typeof input !== "object") return [];
  return Object.entries(input);
}

function scalarValues(input: QueryInput): Map<string, unknown> {
  const values = new Map<string, unknown>();
  for (const [key, value] of entries(input)) {
    if (!values.has(key)) {
      values.set(key, value);
      continue;
    }
    const previous = values.get(key);
    values.set(key, Array.isArray(previous) ? [...previous, value] : [previous, value]);
  }
  return values;
}

function readScalar(
  values: Map<string, unknown>,
  key: string,
  fieldErrors: Record<string, string>,
): string | undefined {
  if (!values.has(key)) return undefined;
  const value = values.get(key);
  if (Array.isArray(value)) {
    fieldErrors[key] = "Query parameter must not be repeated";
    return undefined;
  }
  if (typeof value !== "string") {
    fieldErrors[key] = "Query parameter must be a string";
    return undefined;
  }
  return value;
}

function parsePositiveInteger(
  value: string | undefined,
  field: string,
  fieldErrors: Record<string, string>,
): number | undefined {
  if (value === undefined) return undefined;
  // Keep the representation canonical. This also rejects signs, decimals,
  // whitespace, zero, and values that would lose precision in Prisma.
  if (!/^[1-9]\d*$/.test(value)) {
    fieldErrors[field] = "Must be a positive integer";
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    fieldErrors[field] = "Must be a safe positive integer";
    return undefined;
  }
  return parsed;
}

export function parseTicketListQuery(input: QueryInput): TicketListQuery {
  const values = scalarValues(input);
  const fieldErrors: Record<string, string> = {};

  for (const key of values.keys()) {
    if (!allowedParameters.has(key)) fieldErrors[key] = "Unknown query parameter";
  }

  const searchValue = readScalar(values, "search", fieldErrors);
  const categoryValue = readScalar(values, "categoryId", fieldErrors);
  const priorityValue = readScalar(values, "requestedPriority", fieldErrors);
  const statusValue = readScalar(values, "currentStatus", fieldErrors);
  const sortByValue = readScalar(values, "sortBy", fieldErrors);
  const sortDirectionValue = readScalar(values, "sortDirection", fieldErrors);
  const pageValue = readScalar(values, "page", fieldErrors);
  const pageSizeValue = readScalar(values, "pageSize", fieldErrors);

  let search: string | undefined;
  if (searchValue !== undefined) {
    search = searchValue.trim();
    if (search.length === 0) search = undefined;
    else if (search.length > 120) fieldErrors.search = "Search must contain at most 120 characters";
  }

  const categoryId = parsePositiveInteger(categoryValue, "categoryId", fieldErrors);

  let requestedPriority: RequestedPriority | undefined;
  if (priorityValue !== undefined) {
    if (!priorities.has(priorityValue as RequestedPriority)) {
      fieldErrors.requestedPriority = "Requested Priority must be LOW, MEDIUM, or HIGH";
    } else requestedPriority = priorityValue as RequestedPriority;
  }

  let currentStatus: TicketStatus | undefined;
  if (statusValue !== undefined) {
    if (!statuses.has(statusValue as TicketStatus)) fieldErrors.currentStatus = "Current Status must be NEW";
    else currentStatus = statusValue as TicketStatus;
  }

  let sortBy: TicketSortField = "updatedAt";
  if (sortByValue !== undefined) {
    if (!sortFields.has(sortByValue as TicketSortField)) {
      fieldErrors.sortBy = "Sort field is not supported";
    } else sortBy = sortByValue as TicketSortField;
  }

  let sortDirection: TicketSortDirection = "desc";
  if (sortDirectionValue !== undefined) {
    if (!sortDirections.has(sortDirectionValue as TicketSortDirection)) {
      fieldErrors.sortDirection = "Sort direction must be asc or desc";
    } else sortDirection = sortDirectionValue as TicketSortDirection;
  }

  const page = parsePositiveInteger(pageValue, "page", fieldErrors) ?? 1;

  let pageSize: TicketPageSize = 10;
  if (pageSizeValue !== undefined) {
    const parsedPageSize = parsePositiveInteger(pageSizeValue, "pageSize", fieldErrors);
    if (parsedPageSize !== undefined && !pageSizes.has(parsedPageSize as TicketPageSize)) {
      fieldErrors.pageSize = "Page size must be 10, 20, or 50";
    } else if (parsedPageSize !== undefined) pageSize = parsedPageSize as TicketPageSize;
  }

  if (Object.keys(fieldErrors).length > 0) throw validationError(fieldErrors);

  return {
    ...(search === undefined ? {} : { search }),
    ...(categoryId === undefined ? {} : { categoryId }),
    ...(requestedPriority === undefined ? {} : { requestedPriority }),
    ...(currentStatus === undefined ? {} : { currentStatus }),
    sortBy,
    sortDirection,
    page,
    pageSize,
    orderBy: [
      { field: sortBy, direction: sortDirection },
      { field: "id", direction: "desc" },
    ],
  };
}
