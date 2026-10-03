import { isTicketStatus, type TicketStatus } from "./ticket-status.js";
import type { TicketListQuery } from "./api.js";

const allowed = new Set(["search", "categoryId", "requestedPriority", "currentStatus", "statusGroup", "resolvedFrom", "resolvedBefore", "sortBy", "sortDirection", "page", "pageSize"]);
const priorities = new Set(["LOW", "MEDIUM", "HIGH"]);
const sortFields = new Set(["createdAt", "updatedAt", "ticketNumber", "summary"]);
const isoInstant = (value: string) => /^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value));

export function parseTicketListContext(context: string): TicketListQuery | null {
  const params = new URLSearchParams(context.replace(/^\?/, ""));
  for (const key of params.keys()) if (!allowed.has(key) || params.getAll(key).length !== 1) return null;
  for (const key of params.keys()) if (key !== "search" && params.get(key) === "") return null;
  const get = (key: string) => params.get(key) ?? undefined;
  const category = get("categoryId"); const page = get("page"); const pageSize = get("pageSize");
  const group = get("statusGroup"); const from = get("resolvedFrom"); const before = get("resolvedBefore");
  const status = get("currentStatus"); const priority = get("requestedPriority");
  if (category !== undefined && (!/^\d+$/.test(category) || Number(category) < 1)) return null;
  if (page !== undefined && (!/^\d+$/.test(page) || Number(page) < 1)) return null;
  if (pageSize !== undefined && !["10", "20", "50"].includes(pageSize)) return null;
  if (priority !== undefined && !priorities.has(priority)) return null;
  if (status !== undefined && !isTicketStatus(status)) return null;
  if (group !== undefined && group !== "active" && group !== "resolved") return null;
  if (status && group) return null;
  if ((from || before) && (group !== "resolved" || !from || !before || !isoInstant(from) || !isoInstant(before) || Date.parse(from) >= Date.parse(before))) return null;
  if (group === "resolved" && (!from || !before)) return null;
  if (get("search")?.length && get("search")!.length > 120) return null;
  if (get("sortBy") && !sortFields.has(get("sortBy")!)) return null;
  if (get("sortDirection") && !["asc", "desc"].includes(get("sortDirection")!)) return null;
  return {
    ...(get("search") ? { search: get("search") } : {}),
    ...(category ? { categoryId: Number(category) } : {}),
    ...(priority ? { requestedPriority: priority as TicketListQuery["requestedPriority"] } : {}),
    ...(status ? { currentStatus: status as TicketStatus } : {}),
    ...(group ? { statusGroup: group } : {}),
    ...(from ? { resolvedFrom: from } : {}), ...(before ? { resolvedBefore: before } : {}),
    ...(get("sortBy") ? { sortBy: get("sortBy") as TicketListQuery["sortBy"] } : {}),
    ...(get("sortDirection") ? { sortDirection: get("sortDirection") as TicketListQuery["sortDirection"] } : {}),
    ...(page ? { page: Number(page) } : {}),
    ...(pageSize ? { pageSize: Number(pageSize) as TicketListQuery["pageSize"] } : {}),
  };
}

export function ticketListContext(query: TicketListQuery): string {
  const params = new URLSearchParams();
  for (const key of ["search", "categoryId", "requestedPriority", "currentStatus", "statusGroup", "resolvedFrom", "resolvedBefore", "sortBy", "sortDirection", "page", "pageSize"] as const) {
    const value = query[key];
    if ((key === "sortBy" && value === "updatedAt") || (key === "sortDirection" && value === "desc")
      || (key === "page" && value === 1) || (key === "pageSize" && value === 10)) continue;
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return params.toString();
}
