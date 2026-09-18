import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../src/auth-context.js";
import StaffTicketQueue from "../../src/staff/StaffTicketQueue.js";
import StaffTicketDetail from "../../src/staff/StaffTicketDetail.js";

const staff = { id: 21, name: "Niran Staff", email: "niran@example.test", role: "IT_STAFF" as const, mustChangePassword: false };
const item = {
  id: 91, ticketNumber: "TKT-20260917-000091", summary: "VPN access unavailable",
  category: { id: 3, name: "Network" }, requester: { id: 8, name: "Anan Student", email: "anan@example.test" },
  requestedPriority: "HIGH" as const, itPriority: "MEDIUM" as const, currentStatus: "OPEN" as const,
  owner: { id: 21, name: "Niran Staff", role: "IT_STAFF" as const }, createdAt: "2026-09-16T02:00:00.000Z",
  updatedAt: "2026-09-17T03:00:00.000Z", version: 2,
};
const page = { items: [item], page: 1, pageSize: 10 as const, totalItems: 1, totalPages: 1 };

function json(body: unknown, status = 200) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => body } as Response);
}

function renderQueue(queueResponses: Array<{ body: unknown; status?: number }> = [{ body: page }], onViewTicket = vi.fn(), initialSearch = "") {
  let queueIndex = 0;
  const fetchMock = vi.fn((input: RequestInfo | URL, _init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/api/categories")) return json([{ id: 3, name: "Network" }]);
    if (url.includes("/api/staff/assignees")) return json({ items: [{ id: 21, name: "Niran Staff", role: "IT_STAFF" }, { id: 31, name: "Ada Admin", role: "ADMINISTRATOR" }] });
    if (url.includes("/api/staff/tickets")) {
      const next = queueResponses[Math.min(queueIndex++, queueResponses.length - 1)];
      return json(next.body, next.status ?? 200);
    }
    return json({});
  });
  vi.stubGlobal("fetch", fetchMock);
  render(<AuthProvider initialUser={staff}><StaffTicketQueue onViewTicket={onViewTicket} initialSearch={initialSearch} /></AuthProvider>);
  return { fetchMock, onViewTicket };
}

function queueUrls(mock: ReturnType<typeof vi.fn>) {
  return mock.mock.calls.map(([input]) => String(input)).filter((url) => /\/api\/staff\/tickets(?:\?|$)/.test(url));
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("UI-03 Staff Ticket Queue", () => {
  it("loads the shared queue with documented defaults and renders table plus mobile-card data", async () => {
    const { fetchMock } = renderQueue();
    expect(await screen.findByRole("heading", { name: "Ticket Queue" })).toBeInTheDocument();
    expect((await screen.findAllByText("VPN access unavailable")).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Anan Student").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Niran Staff").length).toBeGreaterThanOrEqual(2);
    const initial = new URL(queueUrls(fetchMock)[0]);
    expect(initial.search).toBe("?owner=all&sortBy=updatedAt&sortDirection=desc&page=1&pageSize=10");
    expect(fetchMock.mock.calls.find(([input]) => String(input).includes("/api/staff/tickets"))?.[1]).toEqual(expect.objectContaining({ credentials: "include" }));
  });

  it("applies search, all filters, sorting and page size then clears to defaults", async () => {
    const responses = Array.from({ length: 12 }, () => ({ body: page }));
    const { fetchMock } = renderQueue(responses);
    await screen.findAllByText("VPN access unavailable");
    const user = userEvent.setup();
    await user.type(screen.getByRole("searchbox", { name: /search ticket number, summary, or requester/i }), "  vpn  ");
    await user.keyboard("{Enter}");
    await user.selectOptions(screen.getByRole("combobox", { name: "Category" }), "3");
    await user.selectOptions(screen.getByRole("combobox", { name: "Current Status" }), "OPEN");
    await user.selectOptions(screen.getByRole("combobox", { name: "Requested Priority" }), "HIGH");
    await user.selectOptions(screen.getByRole("combobox", { name: "IT Priority" }), "MEDIUM");
    await user.selectOptions(screen.getByRole("combobox", { name: "Owner" }), "me");
    await user.selectOptions(screen.getByRole("combobox", { name: "Sort by" }), "itPriority");
    await user.selectOptions(screen.getByRole("combobox", { name: "Sort direction" }), "asc");
    await user.selectOptions(screen.getByRole("combobox", { name: "Page size" }), "20");
    await waitFor(() => {
      const latest = new URL(queueUrls(fetchMock).at(-1)!);
      expect(latest.searchParams.get("search")).toBe("vpn");
      expect(latest.searchParams.get("categoryId")).toBe("3");
      expect(latest.searchParams.get("currentStatus")).toBe("OPEN");
      expect(latest.searchParams.get("requestedPriority")).toBe("HIGH");
      expect(latest.searchParams.get("itPriority")).toBe("MEDIUM");
      expect(latest.searchParams.get("owner")).toBe("me");
      expect(latest.searchParams.get("sortBy")).toBe("itPriority");
      expect(latest.searchParams.get("sortDirection")).toBe("asc");
      expect(latest.searchParams.get("pageSize")).toBe("20");
    });
    await user.click(screen.getByRole("button", { name: "Clear search/filters" }));
    await waitFor(() => expect(new URL(queueUrls(fetchMock).at(-1)!).search).toBe("?owner=all&sortBy=updatedAt&sortDirection=desc&page=1&pageSize=10"));
  });

  it("distinguishes Empty Queue, No Results, Forbidden and Failure/Retry", async () => {
    const empty = { items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 };
    const first = renderQueue([{ body: empty }]);
    expect(await screen.findByRole("heading", { name: "No tickets in the queue" })).toBeInTheDocument();
    cleanup(); vi.unstubAllGlobals();

    const second = renderQueue([{ body: empty }, { body: page }], vi.fn(), "missing");
    expect(await screen.findByRole("heading", { name: "No matching tickets" })).toBeInTheDocument();
    expect(queueUrls(second.fetchMock)).toHaveLength(2);
    cleanup(); vi.unstubAllGlobals();

    renderQueue([{ body: { error: { code: "FORBIDDEN", message: "You do not have permission to perform this action" } }, status: 403 }]);
    expect(await screen.findByRole("heading", { name: "Access Denied" })).toBeInTheDocument();
    cleanup(); vi.unstubAllGlobals();

    const retry = renderQueue([{ body: { error: { code: "INTERNAL_ERROR", message: "Unable to load Staff Ticket Queue" } }, status: 500 }, { body: page }]);
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load Staff Ticket Queue");
    await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));
    expect((await screen.findAllByText("VPN access unavailable")).length).toBeGreaterThanOrEqual(2);
    expect(queueUrls(retry.fetchMock)).toHaveLength(2);
  });

  it("recovers once from an out-of-range page and passes the exact applied context when opening Detail", async () => {
    const out = { items: [], page: 4, pageSize: 10, totalItems: 21, totalPages: 3 };
    const recovered = { ...page, page: 3, totalItems: 21, totalPages: 3 };
    const onView = vi.fn();
    const { fetchMock } = renderQueue([{ body: out }, { body: recovered }], onView, "vpn");
    await screen.findAllByText("VPN access unavailable");
    expect(queueUrls(fetchMock)).toHaveLength(2);
    expect(new URL(queueUrls(fetchMock)[1]).searchParams.get("page")).toBe("3");
    await userEvent.setup().click(screen.getAllByRole("button", { name: "View ticket" })[0]);
    expect(onView).toHaveBeenCalledWith(91, expect.stringContaining("search=vpn"));
    expect(onView).toHaveBeenCalledWith(91, expect.stringContaining("page=3"));
  });
});

describe("Issue #47 Staff Ticket Detail continuity", () => {
  it("preserves the staff projection and Queue back-context as Issue #49 adds communication", async () => {
    const detail = { ...item, relatedSystem: { id: 5, name: "VPN" }, description: "Long diagnostic description", attachments: [], resolutionSummary: null, resolvedAt: null, closedAt: null, cancelReason: null, cancelledAt: null, requesterResolutionIndicatedAt: null };
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => String(input).includes("/api/staff/tickets/91") ? json({ ticket: detail }) : json({})));
    const onBack = vi.fn();
    render(<AuthProvider initialUser={staff}><StaffTicketDetail ticketId={91} queueContext="search=vpn&page=2&pageSize=20" onBack={onBack} /></AuthProvider>);
    expect(await screen.findByText("Long diagnostic description")).toBeInTheDocument();
    expect(screen.getByText("Niran Staff")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ticket operations" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Public Comments" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Internal Notes" })).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Back to Ticket Queue" }));
    expect(onBack).toHaveBeenCalledWith("search=vpn&page=2&pageSize=20");
  });
});
