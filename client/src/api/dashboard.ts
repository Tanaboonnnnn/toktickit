import { isTicketListItem, SafeApiError, notifyAuthenticationFailure, parseSafeError, type TicketListItem } from "../api.js";
import { isActionTakenPublic, type ActionTakenPublic } from "./actions.js";
import { isStaffQueueItem, type StaffQueueItem } from "./staff.js";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface RequesterDashboardResponse {
  asOf: string;
  resolvedWindow: { from: string; before: string };
  metrics: { myActiveTickets: number; waitingForMe: number; recentlyResolved: number };
  recentTickets: TicketListItem[];
  attentionTickets: TicketListItem[];
  drillDown: { myActiveTickets: string; waitingForMe: string; recentlyResolved: string };
}

export interface StaffDashboardResponse {
  asOf: string;
  metrics: { unassignedActive: number; myActiveTickets: number; highPriorityActive: number; waitingForRequester: number };
  recentTickets: StaffQueueItem[];
  myActions: Array<{
    action: ActionTakenPublic;
    ticket: { id: number; ticketNumber: string; summary: string };
    attribution: Array<"RECORDED" | "ASSIGNED" | "PERFORMED">;
  }>;
  drillDown: { unassignedActive: string; myActiveTickets: string; highPriorityActive: string; waitingForRequester: string };
}

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
function instant(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value));
}
function metric(value: unknown): value is number { return Number.isSafeInteger(value) && (value as number) >= 0; }
function metrics(value: unknown, keys: string[]): boolean {
  return record(value) && Object.keys(value).length === keys.length && keys.every((key) => metric(value[key]));
}
function validDrillDown(value: string, key: string, role: "requester" | "staff"): boolean {
  const path = role === "requester" ? "#/tickets?" : "#/staff/tickets?";
  if (!value.startsWith(path) || /[\r\n]/.test(value) || value.slice(path.length - 1).includes("#")) return false;
  const params = new URLSearchParams(value.slice(path.length));
  const names = [...params.keys()];
  if (new Set(names).size !== names.length) return false;
  if (role === "requester") {
    if (key === "myActiveTickets") return names.length === 1 && params.get("statusGroup") === "active";
    if (key === "waitingForMe") return names.length === 1 && params.get("currentStatus") === "WAITING_FOR_REQUESTER";
    const from = params.get("resolvedFrom"); const before = params.get("resolvedBefore");
    return key === "recentlyResolved" && names.length === 3 && params.get("statusGroup") === "resolved"
      && from !== null && before !== null && instant(from) && instant(before) && Date.parse(from) < Date.parse(before);
  }
  if (key === "unassignedActive" || key === "myActiveTickets") {
    return names.length === 2 && params.get("owner") === (key === "unassignedActive" ? "unassigned" : "me") && params.get("statusGroup") === "active";
  }
  if (key === "highPriorityActive") return names.length === 2 && params.get("itPriority") === "HIGH" && params.get("statusGroup") === "active";
  return key === "waitingForRequester" && names.length === 1 && params.get("currentStatus") === "WAITING_FOR_REQUESTER";
}
function drillDown(value: unknown, keys: string[], role: "requester" | "staff"): boolean {
  return record(value) && Object.keys(value).length === keys.length && keys.every((key) => typeof value[key] === "string"
    && validDrillDown(value[key] as string, key, role));
}
function list(value: unknown, validate: (item: unknown) => boolean): boolean {
  return Array.isArray(value) && value.length <= 5 && value.every(validate);
}
function isRequesterDashboard(value: unknown): value is RequesterDashboardResponse {
  if (!record(value) || !record(value.resolvedWindow)) return false;
  return instant(value.asOf)
    && instant(value.resolvedWindow.from) && instant(value.resolvedWindow.before)
    && Date.parse(value.resolvedWindow.from) < Date.parse(value.resolvedWindow.before)
    && metrics(value.metrics, ["myActiveTickets", "waitingForMe", "recentlyResolved"])
    && list(value.recentTickets, isTicketListItem)
    && list(value.attentionTickets, isTicketListItem)
    && drillDown(value.drillDown, ["myActiveTickets", "waitingForMe", "recentlyResolved"], "requester");
}
function isStaffPreview(value: unknown): boolean {
  if (!record(value) || !isActionTakenPublic(value.action) || !record(value.ticket)) return false;
  return Number.isSafeInteger(value.ticket.id) && typeof value.ticket.ticketNumber === "string" && typeof value.ticket.summary === "string"
    && Array.isArray(value.attribution) && value.attribution.length > 0
    && value.attribution.every((item) => item === "RECORDED" || item === "ASSIGNED" || item === "PERFORMED")
    && new Set(value.attribution).size === value.attribution.length
    && value.action.ticketId === value.ticket.id;
}
function isStaffDashboard(value: unknown): value is StaffDashboardResponse {
  return record(value) && instant(value.asOf)
    && metrics(value.metrics, ["unassignedActive", "myActiveTickets", "highPriorityActive", "waitingForRequester"])
    && list(value.recentTickets, isStaffQueueItem)
    && list(value.myActions, isStaffPreview)
    && drillDown(value.drillDown, ["unassignedActive", "myActiveTickets", "highPriorityActive", "waitingForRequester"], "staff");
}

async function fetchDashboard<T>(role: "requester" | "staff", validate: (value: unknown) => value is T, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_URL}/api/dashboard/${role}`, { credentials: "include", ...(signal ? { signal } : {}) });
  if (!response.ok) {
    const error = await parseSafeError(response);
    if (!signal?.aborted) notifyAuthenticationFailure(error);
    throw error;
  }
  let body: unknown;
  try { body = await response.json(); }
  catch { throw new SafeApiError(500, "INTERNAL_ERROR", "Unexpected response from TokTickIT API"); }
  if (!validate(body)) throw new SafeApiError(500, "INTERNAL_ERROR", "Unexpected response from TokTickIT API");
  return body;
}

export const fetchRequesterDashboard = (signal?: AbortSignal) => fetchDashboard("requester", isRequesterDashboard, signal);
export const fetchStaffDashboard = (signal?: AbortSignal) => fetchDashboard("staff", isStaffDashboard, signal);
