import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../src/auth-context.js";
import StaffTicketDetail from "../../src/staff/StaffTicketDetail.js";

const staff = { id: 21, name: "Niran Staff", email: "niran@example.test", role: "IT_STAFF" as const, mustChangePassword: false };
const owner = { id: 21, name: "Niran Staff", role: "IT_STAFF" as const };
const administrator = { id: 31, name: "Ada Admin", role: "ADMINISTRATOR" as const };

function workflow(
  permittedTransitions: Array<"NEW" | "OPEN" | "IN_PROGRESS" | "WAITING_FOR_REQUESTER" | "RESOLVED" | "CLOSED" | "REOPENED" | "CANCELLED">,
  counts = { completedCount: 0, outstandingCount: 0, unresolvedFollowUpCount: 0 },
  blockers: Array<"COMPLETED_ACTION_REQUIRED" | "OUTSTANDING_ACTIONS" | "FOLLOW_UP_REQUIRED"> = [],
) {
  return { permittedTransitions, resolution: { ...counts, blockers } };
}

const base = {
  id: 91,
  ticketNumber: "TKT-20260930-000091",
  summary: "VPN access unavailable",
  category: { id: 3, name: "Network" },
  relatedSystem: { id: 5, name: "VPN" },
  requester: { id: 8, name: "Anan Student", email: "anan@example.test" },
  description: "Long diagnostic description",
  requestedPriority: "HIGH" as const,
  itPriority: "MEDIUM" as const,
  currentStatus: "IN_PROGRESS" as const,
  owner,
  createdAt: "2026-09-29T02:00:00.000Z",
  updatedAt: "2026-09-30T03:00:00.000Z",
  version: 7,
  workflowCycle: 2,
  workflow: workflow(
    ["WAITING_FOR_REQUESTER", "CANCELLED"],
    { completedCount: 0, outstandingCount: 1, unresolvedFollowUpCount: 1 },
    ["COMPLETED_ACTION_REQUIRED", "OUTSTANDING_ACTIONS", "FOLLOW_UP_REQUIRED"],
  ),
  attachments: [],
  resolutionSummary: null,
  resolvedAt: null,
  closedAt: null,
  cancelReason: null,
  cancelledAt: null,
  requesterResolutionIndicatedAt: null,
};

function json(body: unknown, status = 200) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => body } as Response);
}

function commonRead(url: string) {
  if (url.endsWith("/api/staff/assignees")) return json({ items: [owner, administrator] });
  if (url.endsWith("/comments")) return json({ items: [] });
  if (url.endsWith("/internal-notes")) return json({ items: [] });
  return null;
}

function renderDetail(fetchMock: ReturnType<typeof vi.fn>) {
  vi.stubGlobal("fetch", fetchMock);
  render(
    <AuthProvider initialUser={staff}>
      <StaffTicketDetail ticketId={91} queueContext="owner=me" onBack={vi.fn()} />
    </AuthProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("UI-03 backend-authoritative Ticket workflow feedback", () => {
  it("fails closed when Staff Detail omits the backend workflow projection", async () => {
    const { workflow: _workflow, ...withoutWorkflow } = base;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/staff/tickets/91") && !init?.method) return json({ ticket: withoutWorkflow });
      return commonRead(url) ?? json({});
    });
    renderDetail(fetchMock);

    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load Staff Ticket Detail");
    expect(screen.queryByRole("combobox", { name: "Next status" })).not.toBeInTheDocument();
  });

  it("shows only server-permitted transitions and explains current resolution blockers with authoritative counts", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/staff/tickets/91") && !init?.method) return json({ ticket: base });
      return commonRead(url) ?? json({});
    });
    renderDetail(fetchMock);

    const status = await screen.findByRole("combobox", { name: "Next status" });
    expect(Array.from((status as HTMLSelectElement).options).map((option) => option.value)).toEqual([
      "",
      "WAITING_FOR_REQUESTER",
      "CANCELLED",
    ]);
    expect(screen.queryByRole("option", { name: "Resolved" })).not.toBeInTheDocument();
    expect(screen.getByText(/0 completed/i)).toBeInTheDocument();
    expect(screen.getByText(/1 outstanding/i)).toBeInTheDocument();
    expect(screen.getByText(/1 requiring follow-up/i)).toBeInTheDocument();
    expect(screen.getByText(/at least one current-cycle action/i)).toBeInTheDocument();
    expect(screen.getByText(/complete or cancel all outstanding/i)).toBeInTheDocument();
    expect(screen.getByText(/clear required follow-up/i)).toBeInTheDocument();
    expect(screen.getByText(/work cycle 2/i)).toBeInTheDocument();
  });

  it("submits RESOLVED only when the server advertises it and uses the current parent version", async () => {
    const ready = {
      ...base,
      workflow: workflow(
        ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
        { completedCount: 2, outstandingCount: 0, unresolvedFollowUpCount: 0 },
      ),
    };
    const resolved = {
      ...ready,
      currentStatus: "RESOLVED" as const,
      version: 8,
      resolutionSummary: "Verified current-cycle work restored access",
      resolvedAt: "2026-09-30T04:00:00.000Z",
      workflow: workflow(["CLOSED", "REOPENED"], { completedCount: 2, outstandingCount: 0, unresolvedFollowUpCount: 0 }),
    };
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/staff/tickets/91") && !init?.method) return json({ ticket: ready });
      if (url.endsWith("/api/auth/csrf")) return json({ csrfToken: "csrf-75" });
      if (url.endsWith("/api/staff/tickets/91/status")) return json({ ticket: resolved });
      return commonRead(url) ?? json({});
    });
    renderDetail(fetchMock);
    const user = userEvent.setup();
    const status = await screen.findByRole("combobox", { name: "Next status" });
    await user.selectOptions(status, "RESOLVED");
    await user.type(screen.getByRole("textbox", { name: "Resolution Summary" }), "Verified current-cycle work restored access");
    await user.click(screen.getByRole("checkbox", { name: /confirm transition/i }));
    await user.click(screen.getByRole("button", { name: "Confirm status change" }));

    await screen.findByText("Resolved");
    const call = fetchMock.mock.calls.find(([input]) => String(input).endsWith("/status"));
    expect(call?.[1]?.body).toBe(JSON.stringify({
      status: "RESOLVED",
      expectedVersion: 7,
      confirmed: true,
      resolutionSummary: "Verified current-cycle work restored access",
    }));
    expect(screen.getByRole("combobox", { name: "Next status" })).toHaveValue("");
    expect(screen.queryByRole("textbox", { name: "Resolution Summary" })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /confirm transition/i })).not.toBeInTheDocument();
  });

  it("preserves an unsaved resolution draft across an unrelated owner refresh", async () => {
    const ready = {
      ...base,
      workflow: workflow(
        ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
        { completedCount: 1, outstandingCount: 0, unresolvedFollowUpCount: 0 },
      ),
    };
    const reassigned = { ...ready, owner: administrator, version: 8 };
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/staff/tickets/91") && !init?.method) return json({ ticket: ready });
      if (url.endsWith("/api/auth/csrf")) return json({ csrfToken: "csrf-75" });
      if (url.endsWith("/api/staff/tickets/91/owner")) return json({ ticket: reassigned });
      return commonRead(url) ?? json({});
    });
    renderDetail(fetchMock);
    const user = userEvent.setup();
    await user.selectOptions(await screen.findByRole("combobox", { name: "Next status" }), "RESOLVED");
    const summary = screen.getByRole("textbox", { name: "Resolution Summary" });
    await user.type(summary, "Draft summary that must survive owner work");

    await user.selectOptions(screen.getByRole("combobox", { name: "Owner" }), "31");
    await user.click(screen.getByRole("checkbox", { name: "Confirm owner change" }));
    await user.click(screen.getByRole("button", { name: "Reassign owner" }));
    await screen.findByText("Ada Admin");
    expect(screen.getByRole("textbox", { name: "Resolution Summary" })).toHaveValue("Draft summary that must survive owner work");
  });

  it("preserves the status draft after a 409 reload and does not automatically replay the mutation", async () => {
    const ready = {
      ...base,
      workflow: workflow(
        ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
        { completedCount: 1, outstandingCount: 0, unresolvedFollowUpCount: 0 },
      ),
    };
    const reloaded = { ...ready, version: 8, updatedAt: "2026-09-30T03:30:00.000Z" };
    let reads = 0;
    let statusPosts = 0;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/staff/tickets/91") && !init?.method) {
        reads += 1;
        return json({ ticket: reads === 1 ? ready : reloaded });
      }
      if (url.endsWith("/api/auth/csrf")) return json({ csrfToken: "csrf-75" });
      if (url.endsWith("/api/staff/tickets/91/status")) {
        statusPosts += 1;
        return json({ error: { code: "CONFLICT", message: "Ticket changed or the operation is no longer available" } }, 409);
      }
      return commonRead(url) ?? json({});
    });
    renderDetail(fetchMock);
    const user = userEvent.setup();
    await user.selectOptions(await screen.findByRole("combobox", { name: "Next status" }), "RESOLVED");
    await user.type(screen.getByRole("textbox", { name: "Resolution Summary" }), "Conflict-safe draft summary");
    await user.click(screen.getByRole("checkbox", { name: /confirm transition/i }));
    await user.click(screen.getByRole("button", { name: "Confirm status change" }));

    expect(await screen.findByText(/ticket changed.*reloaded/i)).toBeInTheDocument();
    await waitFor(() => expect(reads).toBe(2));
    expect(statusPosts).toBe(1);
    expect(screen.getByRole("combobox", { name: "Next status" })).toHaveValue("RESOLVED");
    expect(screen.getByRole("textbox", { name: "Resolution Summary" })).toHaveValue("Conflict-safe draft summary");
  });
});
