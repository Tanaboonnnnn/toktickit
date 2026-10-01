import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchRequesterDashboard, fetchStaffDashboard } from "../../src/api/dashboard.js";

const requester = {
  asOf: "2026-10-01T00:00:00.000Z",
  resolvedWindow: { from: "2026-09-24T00:00:00.000Z", before: "2026-10-01T00:00:00.000Z" },
  metrics: { myActiveTickets: 2, waitingForMe: 1, recentlyResolved: 3 },
  recentTickets: [], attentionTickets: [],
  drillDown: {
    myActiveTickets: "#/tickets?statusGroup=active",
    waitingForMe: "#/tickets?currentStatus=WAITING_FOR_REQUESTER",
    recentlyResolved: "#/tickets?statusGroup=resolved&resolvedFrom=2026-09-24T00%3A00%3A00.000Z&resolvedBefore=2026-10-01T00%3A00%3A00.000Z",
  },
};

const staff = {
  asOf: "2026-10-01T00:00:00.000Z",
  metrics: { unassignedActive: 1, myActiveTickets: 2, highPriorityActive: 3, waitingForRequester: 4 },
  recentTickets: [], myActions: [],
  drillDown: {
    unassignedActive: "#/staff/tickets?owner=unassigned&statusGroup=active",
    myActiveTickets: "#/staff/tickets?owner=me&statusGroup=active",
    highPriorityActive: "#/staff/tickets?itPriority=HIGH&statusGroup=active",
    waitingForRequester: "#/staff/tickets?currentStatus=WAITING_FOR_REQUESTER",
  },
};

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("Dashboard transport", () => {
  it("fetches and validates requester dashboard including the exact resolved window and drill-down", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => requester } as Response));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchRequesterDashboard()).resolves.toEqual(requester);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/api\/dashboard\/requester$/), { credentials: "include" });
  });

  it("fetches staff data and rejects malformed successful responses instead of exposing partial data", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => staff } as Response));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchStaffDashboard()).resolves.toEqual(staff);
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ...staff, metrics: { ...staff.metrics, myActiveTickets: "2" } }) } as Response);
    await expect(fetchStaffDashboard()).rejects.toMatchObject({ code: "INTERNAL_ERROR", status: 500 });
  });
});
