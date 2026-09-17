import type { RequestedPriority } from "../ticket-contract.js";
import { TICKET_STATUSES, isTicketStatus, type TicketStatusValue } from "../ticket-status.js";
import { validationError } from "../errors.js";

export type StaffOwnerFilter = "all" | "unassigned" | "me" | number;
export type StaffSortField = "updatedAt" | "createdAt" | "ticketNumber" | "itPriority";
export type StaffSortDirection = "asc" | "desc";
export type StaffPageSize = 10 | 20 | 50;

export interface StaffTicketQuery {
  search?: string;
  categoryId?: number;
  currentStatus?: TicketStatusValue;
  requestedPriority?: RequestedPriority;
  itPriority?: RequestedPriority;
  owner: StaffOwnerFilter;
  sortBy: StaffSortField;
  sortDirection: StaffSortDirection;
  page: number;
  pageSize: StaffPageSize;
  orderBy: readonly [{ field: StaffSortField; direction: StaffSortDirection }, { field: "id"; direction: "desc" }];
}

const allowedParameters = new Set(["search", "categoryId", "currentStatus", "requestedPriority", "itPriority", "owner", "sortBy", "sortDirection", "page", "pageSize"]);
const priorities = new Set<RequestedPriority>(["LOW", "MEDIUM", "HIGH"]);
const sortFields = new Set<StaffSortField>(["updatedAt", "createdAt", "ticketNumber", "itPriority"]);
const sortDirections = new Set<StaffSortDirection>(["asc", "desc"]);
const pageSizes = new Set<StaffPageSize>([10, 20, 50]);
type QueryInput = Record<string, unknown> | URLSearchParams | null | undefined;

function entries(input: QueryInput): Array<[string, unknown]> {
  if (input instanceof URLSearchParams) return Array.from(input.entries());
  return input && typeof input === "object" ? Object.entries(input) : [];
}

function scalarValues(input: QueryInput): Map<string, unknown> {
  const values = new Map<string, unknown>();
  for (const [key, value] of entries(input)) {
    if (!values.has(key)) values.set(key, value);
    else {
      const previous = values.get(key);
      values.set(key, Array.isArray(previous) ? [...previous, value] : [previous, value]);
    }
  }
  return values;
}

function readScalar(values: Map<string, unknown>, key: string, errors: Record<string, string>): string | undefined {
  if (!values.has(key)) return undefined;
  const value = values.get(key);
  if (Array.isArray(value)) { errors[key] = "Query parameter must not be repeated"; return undefined; }
  if (typeof value !== "string") { errors[key] = "Query parameter must be a string"; return undefined; }
  return value;
}

function positiveInteger(value: string | undefined, field: string, errors: Record<string, string>): number | undefined {
  if (value === undefined) return undefined;
  if (!/^[1-9]\d*$/.test(value)) { errors[field] = "Must be a positive integer"; return undefined; }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) { errors[field] = "Must be a safe positive integer"; return undefined; }
  return parsed;
}

export function parseStaffTicketQuery(input: QueryInput): StaffTicketQuery {
  const values = scalarValues(input);
  const errors: Record<string, string> = {};
  for (const key of values.keys()) if (!allowedParameters.has(key)) errors[key] = "Unknown query parameter";

  const raw = Object.fromEntries([...allowedParameters].map((key) => [key, readScalar(values, key, errors)])) as Record<string, string | undefined>;
  let search = raw.search?.trim();
  if (search === "") search = undefined;
  if (search && search.length > 120) errors.search = "Search must contain at most 120 characters";
  const categoryId = positiveInteger(raw.categoryId, "categoryId", errors);

  let currentStatus: TicketStatusValue | undefined;
  if (raw.currentStatus !== undefined) {
    if (!isTicketStatus(raw.currentStatus)) errors.currentStatus = `Current Status must be one of: ${TICKET_STATUSES.join(", ")}`;
    else currentStatus = raw.currentStatus;
  }
  function priority(field: "requestedPriority" | "itPriority") {
    const value = raw[field];
    if (value === undefined) return undefined;
    if (!priorities.has(value as RequestedPriority)) { errors[field] = "Priority must be LOW, MEDIUM, or HIGH"; return undefined; }
    return value as RequestedPriority;
  }
  const requestedPriority = priority("requestedPriority");
  const itPriority = priority("itPriority");

  let owner: StaffOwnerFilter = "all";
  if (raw.owner !== undefined) {
    if (raw.owner === "all" || raw.owner === "unassigned" || raw.owner === "me") owner = raw.owner;
    else {
      const parsed = positiveInteger(raw.owner, "owner", errors);
      if (parsed !== undefined) owner = parsed;
    }
  }

  let sortBy: StaffSortField = "updatedAt";
  if (raw.sortBy !== undefined) {
    if (!sortFields.has(raw.sortBy as StaffSortField)) errors.sortBy = "Sort field is not supported";
    else sortBy = raw.sortBy as StaffSortField;
  }
  let sortDirection: StaffSortDirection = "desc";
  if (raw.sortDirection !== undefined) {
    if (!sortDirections.has(raw.sortDirection as StaffSortDirection)) errors.sortDirection = "Sort direction must be asc or desc";
    else sortDirection = raw.sortDirection as StaffSortDirection;
  }
  const page = positiveInteger(raw.page, "page", errors) ?? 1;
  let pageSize: StaffPageSize = 10;
  if (raw.pageSize !== undefined) {
    const parsed = positiveInteger(raw.pageSize, "pageSize", errors);
    if (parsed !== undefined && !pageSizes.has(parsed as StaffPageSize)) errors.pageSize = "Page size must be 10, 20, or 50";
    else if (parsed !== undefined) pageSize = parsed as StaffPageSize;
  }
  if (Object.keys(errors).length) throw validationError(errors);
  return {
    ...(search ? { search } : {}), ...(categoryId ? { categoryId } : {}), ...(currentStatus ? { currentStatus } : {}),
    ...(requestedPriority ? { requestedPriority } : {}), ...(itPriority ? { itPriority } : {}),
    owner, sortBy, sortDirection, page, pageSize,
    orderBy: [{ field: sortBy, direction: sortDirection }, { field: "id", direction: "desc" }],
  };
}
