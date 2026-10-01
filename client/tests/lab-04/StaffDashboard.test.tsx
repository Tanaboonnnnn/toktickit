import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../src/auth-context.js";
import StaffDashboard from "../../src/dashboard/StaffDashboard.js";

const staffUser = { id: 21, name: "Niran", email: "niran@example.test", role: "IT_STAFF" as const, mustChangePassword: false };
const data = {
  asOf: "2026-10-01T00:00:00.000Z", metrics: { unassignedActive: 0, myActiveTickets: 2, highPriorityActive: 1, waitingForRequester: 3 },
  recentTickets: [],
  myActions: [{ action: {
    id: 51, ticketId: 91, workflowCycle: 1, createdAt: "2026-09-30T00:00:00.000Z", recordedBy: { id: 21, name: "Niran", role: "IT_STAFF" },
    assignee: { id: 21, name: "Niran", role: "IT_STAFF" }, performedBy: { id: 21, name: "Niran", role: "IT_STAFF" },
    description: "Replace access point", result: null, followUpRequired: false, followUpNote: null, attachmentNotes: null,
    status: "COMPLETED", version: 1, updatedAt: "2026-09-30T00:00:00.000Z", updatedBy: { id: 21, name: "Niran", role: "IT_STAFF" },
    completedAt: "2026-09-30T00:00:00.000Z", cancelledAt: null, cancelledBy: null, cancellationReason: null, readOnly: false,
    capabilities: { canEdit: true, canReassign: true, permittedTransitions: [] },
  }, ticket: { id: 91, ticketNumber: "TKT-91", summary: "WiFi outage" }, attribution: ["RECORDED", "ASSIGNED", "PERFORMED"] }],
  drillDown: {
    unassignedActive: "#/staff/tickets?owner=unassigned&statusGroup=active", myActiveTickets: "#/staff/tickets?owner=me&statusGroup=active",
    highPriorityActive: "#/staff/tickets?itPriority=HIGH&statusGroup=active", waitingForRequester: "#/staff/tickets?currentStatus=WAITING_FOR_REQUESTER",
  },
};
function json(body: unknown, status = 200) { return Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => body } as Response); }
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("UI-06 Staff/Admin Dashboard", () => {
  it("renders exact metrics, one action with all attribution, and correct queue/action links", async () => {
    const fetchMock = vi.fn(() => json(data)); vi.stubGlobal("fetch", fetchMock);
    render(<AuthProvider initialUser={staffUser}><StaffDashboard /></AuthProvider>);
    expect(await screen.findByText("0")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /TKT-91.*Replace access point/i })).toBeInTheDocument();
    expect(screen.getByText("Completed · Recorded · Assigned · Performed")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view unassigned active/i })).toHaveAttribute("href", data.drillDown.unassignedActive);
    expect(screen.getByRole("link", { name: /TKT-91.*Replace access point/i })).toHaveAttribute("href", "#/staff/tickets/91?actionId=51");
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/api\/dashboard\/staff$/), expect.objectContaining({ credentials: "include", signal: expect.any(AbortSignal) }));
  });

  it("does not show zero while pending and distinguishes forbidden from safe failure", async () => {
    let resolve!: (value: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((done) => { resolve = done; })));
    const view = render(<AuthProvider initialUser={staffUser}><StaffDashboard /></AuthProvider>);
    expect(screen.getByRole("status")).toHaveTextContent("Loading Dashboard");
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    resolve(await json({ error: { code: "FORBIDDEN", message: "Not allowed" } }, 403));
    expect(await screen.findByRole("heading", { name: "Access Denied" })).toBeInTheDocument();
    view.unmount();
  });

  it("rejects a malformed success safely, retries, and distinguishes valid empty previews", async () => {
    let calls = 0;
    const fetchMock = vi.fn(() => json(calls++ === 0 ? { ...data, metrics: { ...data.metrics, highPriorityActive: "1" } } : { ...data, myActions: [] }));
    vi.stubGlobal("fetch", fetchMock);
    render(<AuthProvider initialUser={staffUser}><StaffDashboard /></AuthProvider>);
    expect(await screen.findByRole("alert")).toHaveTextContent("Unexpected response");
    await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("No Actions are associated with you yet.")).toBeInTheDocument();
    expect(screen.getByText("No recently updated Tickets.")).toBeInTheDocument();
    expect(screen.getAllByText("0")).toHaveLength(1);
  });
});
