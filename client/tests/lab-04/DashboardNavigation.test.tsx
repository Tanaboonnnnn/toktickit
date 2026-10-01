import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App.js";
import { roleHome } from "../../src/auth-context.js";
import { parseTicketListContext, ticketListContext } from "../../src/ticket-list-context.js";
import { parseStaffQueueContext } from "../../src/staff/staff-queue-context.js";

const requester = { id: 11, name: "Anan", email: "anan@example.test", role: "REQUESTER", mustChangePassword: false };
const staff = { id: 21, name: "Niran", email: "niran@example.test", role: "IT_STAFF", mustChangePassword: false };
const admin = { id: 31, name: "Ada", email: "ada@example.test", role: "ADMINISTRATOR", mustChangePassword: false };
const requesterDashboard = {
  asOf: "2026-10-01T00:00:00.000Z", resolvedWindow: { from: "2026-09-24T00:00:00.000Z", before: "2026-10-01T00:00:00.000Z" },
  metrics: { myActiveTickets: 0, waitingForMe: 0, recentlyResolved: 0 }, recentTickets: [], attentionTickets: [],
  drillDown: { myActiveTickets: "#/tickets?statusGroup=active", waitingForMe: "#/tickets?currentStatus=WAITING_FOR_REQUESTER", recentlyResolved: "#/tickets?statusGroup=resolved&resolvedFrom=2026-09-24T00%3A00%3A00.000Z&resolvedBefore=2026-10-01T00%3A00%3A00.000Z" },
};
const staffDashboard = {
  asOf: requesterDashboard.asOf, metrics: { unassignedActive: 0, myActiveTickets: 0, highPriorityActive: 0, waitingForRequester: 0 }, recentTickets: [], myActions: [],
  drillDown: { unassignedActive: "#/staff/tickets?owner=unassigned&statusGroup=active", myActiveTickets: "#/staff/tickets?owner=me&statusGroup=active", highPriorityActive: "#/staff/tickets?itPriority=HIGH&statusGroup=active", waitingForRequester: "#/staff/tickets?currentStatus=WAITING_FOR_REQUESTER" },
};
function response(body: unknown, status = 200) { return Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => body } as Response); }
function open(user: typeof requester | typeof staff | typeof admin) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/api/auth/me")) return response({ user });
    if (url.endsWith("/api/dashboard/requester")) return response(requesterDashboard);
    if (url.endsWith("/api/dashboard/staff")) return response(staffDashboard);
    if (url.endsWith("/api/categories")) return response([]);
    if (url.includes("/api/tickets")) return response({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
    if (url.includes("/api/staff/assignees")) return response({ items: [] });
    if (url.includes("/api/staff/tickets")) return response({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
    throw new Error(`Unexpected request: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  render(<App />);
  return fetchMock;
}
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); window.location.hash = ""; });

describe("UI-07 Dashboard navigation and strict list context", () => {
  it("selects the accepted default home for every role", () => {
    expect(roleHome("REQUESTER")).toBe("#/dashboard");
    expect(roleHome("IT_STAFF")).toBe("#/staff/dashboard");
    expect(roleHome("ADMINISTRATOR")).toBe("#/staff/dashboard");
  });

  it("round-trips the exact resolved window and rejects unknown or contradictory Requester query data", () => {
    const context = "statusGroup=resolved&resolvedFrom=2026-09-24T00%3A00%3A00.000Z&resolvedBefore=2026-10-01T00%3A00%3A00.000Z&page=2";
    const parsed = parseTicketListContext(context);
    expect(parsed?.resolvedFrom).toBe("2026-09-24T00:00:00.000Z");
    expect(parsed?.resolvedBefore).toBe("2026-10-01T00:00:00.000Z");
    expect(parseTicketListContext(ticketListContext(parsed!))).toEqual(parsed);
    expect(parseTicketListContext(`${context}&unexpected=1`)).toBeNull();
    expect(parseTicketListContext("currentStatus=OPEN&statusGroup=active")).toBeNull();
    expect(parseTicketListContext("statusGroup=resolved&resolvedFrom=bad&resolvedBefore=2026-10-01T00%3A00%3A00.000Z")).toBeNull();
  });

  it("rejects explicitly empty dashboard context values instead of silently dropping them", () => {
    for (const value of ["resolvedFrom=", "resolvedBefore=", "statusGroup=", "page="]) {
      expect(parseTicketListContext(value), value).toBeNull();
    }
    for (const value of ["resolvedFrom=", "resolvedBefore=", "statusGroup=", "page=", "actionId="]) {
      expect(parseStaffQueueContext(value, true), value).toBeNull();
      expect(parseStaffQueueContext(value), value).toBeNull();
    }
  });

  it("keeps Action navigation metadata separate from strict Staff queue filters", () => {
    const parsed = parseStaffQueueContext("owner=me&statusGroup=active&actionId=456", true);
    expect(parsed?.targetActionId).toBe(456);
    expect(parsed?.query).toEqual({ owner: "me", statusGroup: "active" });
    expect(parseStaffQueueContext("owner=me&statusGroup=active&actionId=456")).toBeNull();
    expect(parseStaffQueueContext("actionId=not-a-number", true)).toBeNull();
    expect(parseStaffQueueContext("mystery=1")).toBeNull();
  });

  it("opens each authenticated role at the right Dashboard and keeps Administrator Users navigation", async () => {
    for (const [user, heading] of [[requester, "Dashboard"], [staff, "Staff Dashboard"], [admin, "Staff Dashboard"]] as const) {
      cleanup();
      window.location.hash = "";
      open(user);
      expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
      await waitFor(() => expect(window.location.hash).toBe(roleHome(user.role as "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR")));
      expect(screen.getByRole("navigation", { name: "Primary navigation" }).querySelector('[aria-current="page"]')).toHaveTextContent("Dashboard");
      if (user.role === "REQUESTER") expect(screen.getByRole("button", { name: "Create Ticket" })).toBeInTheDocument();
      else expect(screen.queryByRole("button", { name: "Create Ticket" })).not.toBeInTheDocument();
      if (user.role === "ADMINISTRATOR") expect(screen.getByRole("button", { name: "Users" })).toBeInTheDocument();
    }
  });

  it("mandatory password change overrides the role home", async () => {
    window.location.hash = "#/tickets";
    const forced = { ...requester, mustChangePassword: true };
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => String(input).endsWith("/api/auth/me") ? response({ user: forced }) : response({})));
    render(<App />);
    expect(await screen.findByRole("heading", { name: /change password/i })).toBeInTheDocument();
    await waitFor(() => expect(window.location.hash).toBe("#/change-password"));
  });
});
