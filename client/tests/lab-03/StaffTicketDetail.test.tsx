import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../src/auth-context.js";
import StaffTicketDetail from "../../src/staff/StaffTicketDetail.js";

const staff = { id: 21, name: "Niran Staff", email: "niran@example.test", role: "IT_STAFF" as const, mustChangePassword: false };
const base = {
  id: 91, ticketNumber: "TKT-20260917-000091", summary: "VPN access unavailable",
  category: { id: 3, name: "Network" }, relatedSystem: { id: 5, name: "VPN" },
  requester: { id: 8, name: "Anan Student", email: "anan@example.test" }, description: "Long diagnostic description",
  requestedPriority: "HIGH" as const, itPriority: "MEDIUM" as const, currentStatus: "OPEN" as const,
  owner: null, createdAt: "2026-09-16T02:00:00.000Z", updatedAt: "2026-09-17T03:00:00.000Z", version: 2,
  attachments: [], resolutionSummary: null, resolvedAt: null, closedAt: null, cancelReason: null, cancelledAt: null,
  requesterResolutionIndicatedAt: null,
};
function json(body: unknown, status = 200) { return Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => body } as Response); }
function renderDetail(fetchMock: ReturnType<typeof vi.fn>) {
  vi.stubGlobal("fetch", fetchMock);
  render(<AuthProvider initialUser={staff}><StaffTicketDetail ticketId={91} queueContext="search=vpn" onBack={vi.fn()} /></AuthProvider>);
}
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("UI-04 Staff Ticket Detail operations", () => {
  it("claims an unassigned Ticket and renders the authoritative returned owner without changing status", async () => {
    const claimed = { ...base, owner: { id: 21, name: "Niran Staff", role: "IT_STAFF" as const }, version: 3 };
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/staff/tickets/91") && !init?.method) return json({ ticket: base });
      if (url.endsWith("/api/staff/assignees")) return json({ items: [{ id: 21, name: "Niran Staff", role: "IT_STAFF" }, { id: 31, name: "Ada Admin", role: "ADMINISTRATOR" }] });
      if (url.endsWith("/api/auth/csrf")) return json({ csrfToken: "csrf-48" });
      if (url.endsWith("/api/staff/tickets/91/claim")) return json({ ticket: claimed });
      return json({});
    });
    renderDetail(fetchMock);
    expect(await screen.findByRole("button", { name: "Claim ticket" })).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Claim ticket" }));
    expect(await screen.findByText("Niran Staff")).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
    const claimCall = fetchMock.mock.calls.find(([input]) => String(input).endsWith("/claim"));
    expect(claimCall?.[1]).toEqual(expect.objectContaining({ method: "POST", credentials: "include", body: JSON.stringify({ expectedVersion: 2 }) }));
  });

  it("requires an explicit contextual confirmation before reassignment", async () => {
    const owned = { ...base, owner: { id: 21, name: "Niran Staff", role: "IT_STAFF" as const } };
    const reassigned = { ...owned, owner: { id: 31, name: "Ada Admin", role: "ADMINISTRATOR" as const }, version: 3 };
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/staff/tickets/91") && !init?.method) return json({ ticket: owned });
      if (url.endsWith("/api/staff/assignees")) return json({ items: [{ id: 21, name: "Niran Staff", role: "IT_STAFF" }, { id: 31, name: "Ada Admin", role: "ADMINISTRATOR" }] });
      if (url.endsWith("/api/auth/csrf")) return json({ csrfToken: "csrf-48" });
      if (url.endsWith("/owner")) return json({ ticket: reassigned });
      return json({});
    });
    renderDetail(fetchMock);
    const user = userEvent.setup();
    const owner = await screen.findByRole("combobox", { name: "Owner" });
    await user.selectOptions(owner, "31");
    expect(screen.getByText(/TKT-20260917-000091.*Open.*Ada Admin.*primary Ticket Owner/i)).toBeInTheDocument();
    const save = screen.getByRole("button", { name: "Reassign owner" });
    expect(save).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: "Confirm owner change" }));
    await user.click(save);
    const call = fetchMock.mock.calls.find(([input]) => String(input).endsWith("/owner"));
    expect(call?.[1]?.body).toBe(JSON.stringify({ ownerId: 31, expectedVersion: 2, confirmed: true }));
    expect(await screen.findByText("Ada Admin")).toBeInTheDocument();
  });
  it("changes IT Priority while keeping Requested Priority read-only and uses the current version", async () => {
    const owned = { ...base, owner: { id: 21, name: "Niran Staff", role: "IT_STAFF" as const } };
    const changed = { ...owned, itPriority: "LOW" as const, version: 3 };
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/staff/tickets/91") && !init?.method) return json({ ticket: owned });
      if (url.endsWith("/api/staff/assignees")) return json({ items: [{ id: 21, name: "Niran Staff", role: "IT_STAFF" }] });
      if (url.endsWith("/api/auth/csrf")) return json({ csrfToken: "csrf-48" });
      if (url.endsWith("/priority")) return json({ ticket: changed });
      return json({});
    });
    renderDetail(fetchMock);
    const user = userEvent.setup();
    await screen.findByRole("combobox", { name: "IT Priority" });
    expect(screen.getByText("High", { selector: "dd" })).toBeInTheDocument();
    await user.selectOptions(screen.getByRole("combobox", { name: "IT Priority" }), "LOW");
    await user.click(screen.getByRole("button", { name: "Save IT Priority" }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith("/priority"))).toBe(true));
    const call = fetchMock.mock.calls.find(([input]) => String(input).endsWith("/priority"));
    expect(call?.[1]?.body).toBe(JSON.stringify({ itPriority: "LOW", expectedVersion: 2 }));
    expect(screen.getByText("High", { selector: "dd" })).toBeInTheDocument();
  });

  it("hides non-Cancelled status actions while a NEW Ticket is unassigned, then enables them after claim", async () => {
    const unassigned = { ...base, currentStatus: "NEW" as const, owner: null };
    const claimed = { ...unassigned, owner: { id: 21, name: "Niran Staff", role: "IT_STAFF" as const }, version: 3 };
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/staff/tickets/91") && !init?.method) return json({ ticket: unassigned });
      if (url.endsWith("/api/staff/assignees")) return json({ items: [{ id: 21, name: "Niran Staff", role: "IT_STAFF" }] });
      if (url.endsWith("/api/auth/csrf")) return json({ csrfToken: "csrf-48" });
      if (url.endsWith("/api/staff/tickets/91/claim")) return json({ ticket: claimed });
      return json({});
    });
    renderDetail(fetchMock);
    const user = userEvent.setup();
    const status = await screen.findByRole("combobox", { name: "Next status" });
    expect(Array.from((status as HTMLSelectElement).options).map((o) => o.value)).toEqual(["", "CANCELLED"]);

    await user.click(screen.getByRole("button", { name: "Claim ticket" }));
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Next status" })).toHaveValue(""));
    expect(Array.from((screen.getByRole("combobox", { name: "Next status" }) as HTMLSelectElement).options).map((o) => o.value)).toEqual(["", "OPEN", "CANCELLED"]);
  });

  it("shows no status action for an unassigned CLOSED Ticket", async () => {
    const closed = { ...base, currentStatus: "CLOSED" as const, owner: null, closedAt: "2026-09-17T06:00:00.000Z" };
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/staff/tickets/91")) return json({ ticket: closed });
      if (url.endsWith("/api/staff/assignees")) return json({ items: [{ id: 21, name: "Niran Staff", role: "IT_STAFF" }] });
      return json({});
    });
    renderDetail(fetchMock);
    const status = await screen.findByRole("combobox", { name: "Next status" });
    expect(status).toBeDisabled();
    expect(Array.from((status as HTMLSelectElement).options).map((o) => o.value)).toEqual([""]);
  });
  it("shows only permitted next statuses and requires contextual confirmation fields", async () => {
    const owned = { ...base, currentStatus: "IN_PROGRESS" as const, owner: { id: 21, name: "Niran Staff", role: "IT_STAFF" as const } };
    const resolved = { ...owned, currentStatus: "RESOLVED" as const, resolutionSummary: "Validated and restored access", resolvedAt: "2026-09-17T05:00:00.000Z", version: 3 };
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/staff/tickets/91") && !init?.method) return json({ ticket: owned });
      if (url.endsWith("/api/staff/assignees")) return json({ items: [{ id: 21, name: "Niran Staff", role: "IT_STAFF" }] });
      if (url.endsWith("/api/auth/csrf")) return json({ csrfToken: "csrf-48" });
      if (url.endsWith("/status")) return json({ ticket: resolved });
      return json({});
    });
    renderDetail(fetchMock);
    const user = userEvent.setup();
    const status = await screen.findByRole("combobox", { name: "Next status" });
    expect(Array.from((status as HTMLSelectElement).options).map((o) => o.value)).toEqual(["", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"]);
    await user.selectOptions(status, "RESOLVED");
    expect(screen.getByRole("textbox", { name: "Resolution Summary" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm status change" })).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "Resolution Summary" }), "Validated and restored access");
    await user.click(screen.getByRole("checkbox", { name: /confirm transition/i }));
    await user.click(screen.getByRole("button", { name: "Confirm status change" }));
    expect(await screen.findByText("Resolved")).toBeInTheDocument();
  });

  it("reloads authoritative state on 409 and never automatically reapplies the mutation", async () => {
    const owned = { ...base, owner: { id: 21, name: "Niran Staff", role: "IT_STAFF" as const } };
    const authoritative = { ...owned, itPriority: "HIGH" as const, version: 4 };
    let detailReads = 0;
    let mutations = 0;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/staff/tickets/91") && !init?.method) { detailReads += 1; return json({ ticket: detailReads === 1 ? owned : authoritative }); }
      if (url.endsWith("/api/staff/assignees")) return json({ items: [{ id: 21, name: "Niran Staff", role: "IT_STAFF" }] });
      if (url.endsWith("/api/auth/csrf")) return json({ csrfToken: "csrf-48" });
      if (url.endsWith("/priority")) { mutations += 1; return json({ error: { code: "CONFLICT", message: "Ticket changed or the operation is no longer available" } }, 409); }
      return json({});
    });
    renderDetail(fetchMock);
    const user = userEvent.setup();
    await user.selectOptions(await screen.findByRole("combobox", { name: "IT Priority" }), "LOW");
    await user.click(screen.getByRole("button", { name: "Save IT Priority" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/ticket changed.*reloaded/i);
    expect(detailReads).toBe(2);
    expect(mutations).toBe(1);
    expect(screen.getByRole("combobox", { name: "IT Priority" })).toHaveValue("HIGH");
  });
});
