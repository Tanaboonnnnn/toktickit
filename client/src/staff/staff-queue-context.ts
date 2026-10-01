import type { RequestedPriority } from "../api.js";
import { isTicketStatus, type TicketStatus } from "../ticket-status.js";
import type { StaffQueueQuery, StaffSortDirection, StaffSortField } from "../api/staff.js";

const allowed = new Set(["search", "categoryId", "currentStatus", "requestedPriority", "itPriority", "owner", "sortBy", "sortDirection", "page", "pageSize", "statusGroup", "resolvedFrom", "resolvedBefore", "actionId"]);
const priorities = new Set(["LOW", "MEDIUM", "HIGH"]);
const sortFields = new Set(["updatedAt", "createdAt", "ticketNumber", "itPriority"]);
const isoInstant = (value: string) => /^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value));

export function parseStaffQueueContext(value: string, allowActionTarget = false): { query: StaffQueueQuery; targetActionId?: number } | null {
  const params = new URLSearchParams(value.replace(/^\?/, ""));
  for (const key of params.keys()) if (!allowed.has(key) || params.getAll(key).length !== 1 || (key === "actionId" && !allowActionTarget)) return null;
  for (const key of params.keys()) if (key !== "search" && params.get(key) === "") return null;
  const get = (key: string) => params.get(key) ?? undefined;
  const owner = get("owner"); const category = get("categoryId"); const page = get("page"); const pageSize = get("pageSize");
  const currentStatus = get("currentStatus"); const group = get("statusGroup"); const from = get("resolvedFrom"); const before = get("resolvedBefore");
  const requestedPriority = get("requestedPriority"); const itPriority = get("itPriority"); const actionId = get("actionId");
  if (category && (!/^\d+$/.test(category) || Number(category) < 1)) return null;
  if (page && (!/^\d+$/.test(page) || Number(page) < 1)) return null;
  if (pageSize && !["10", "20", "50"].includes(pageSize)) return null;
  if (owner && !["all", "me", "unassigned"].includes(owner) && (!/^\d+$/.test(owner) || Number(owner) < 1)) return null;
  if (currentStatus && !isTicketStatus(currentStatus)) return null;
  if (group && group !== "active" && group !== "resolved") return null;
  if (currentStatus && group) return null;
  if ((from || before) && (group !== "resolved" || !from || !before || !isoInstant(from) || !isoInstant(before) || Date.parse(from) >= Date.parse(before))) return null;
  if (group === "resolved" && (!from || !before)) return null;
  if (requestedPriority && !priorities.has(requestedPriority)) return null;
  if (itPriority && !priorities.has(itPriority)) return null;
  if (get("search") && get("search")!.length > 120) return null;
  if (get("sortBy") && !sortFields.has(get("sortBy")!)) return null;
  if (get("sortDirection") && !["asc", "desc"].includes(get("sortDirection")!)) return null;
  if (actionId && (!/^[1-9]\d*$/.test(actionId) || !Number.isSafeInteger(Number(actionId)))) return null;
  return {
    query: {
      ...(get("search") ? { search: get("search") } : {}), ...(category ? { categoryId: Number(category) } : {}),
      ...(currentStatus ? { currentStatus: currentStatus as TicketStatus } : {}),
      ...(requestedPriority ? { requestedPriority: requestedPriority as RequestedPriority } : {}),
      ...(itPriority ? { itPriority: itPriority as RequestedPriority } : {}),
      ...(owner ? { owner: owner === "all" || owner === "me" || owner === "unassigned" ? owner : Number(owner) } : {}),
      ...(group ? { statusGroup: group as "active" | "resolved" } : {}), ...(from ? { resolvedFrom: from } : {}), ...(before ? { resolvedBefore: before } : {}),
      ...(get("sortBy") ? { sortBy: get("sortBy") as StaffSortField } : {}),
      ...(get("sortDirection") ? { sortDirection: get("sortDirection") as StaffSortDirection } : {}),
      ...(page ? { page: Number(page) } : {}), ...(pageSize ? { pageSize: Number(pageSize) as 10 | 20 | 50 } : {}),
    },
    ...(actionId ? { targetActionId: Number(actionId) } : {}),
  };
}
