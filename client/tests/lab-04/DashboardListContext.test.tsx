import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../src/auth-context.js";
import MyTickets from "../../src/MyTickets.js";
import StaffTicketQueue from "../../src/staff/StaffTicketQueue.js";

const requester = { id: 11, name: "Anan", email: "anan@example.test", role: "REQUESTER" as const, mustChangePassword: false };
const staff = { id: 21, name: "Niran", email: "niran@example.test", role: "IT_STAFF" as const, mustChangePassword: false };
const resolved = "statusGroup=resolved&resolvedFrom=2026-09-24T00%3A00%3A00.000Z&resolvedBefore=2026-10-01T00%3A00%3A00.000Z";
const item = { id: 91, ticketNumber: "TKT-91", category: { id: 3, name: "Network" }, relatedSystem: { id: 5, name: "VPN" }, summary: "VPN outage", requestedPriority: "HIGH", currentStatus: "OPEN", createdAt: "2026-09-30T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z" };
const page = { items: [item], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 };
function json(body: unknown) { return Promise.resolve({ ok: true, status: 200, json: async () => body } as Response); }
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); window.location.hash = ""; });

describe("Dashboard list context", () => {
  it("restores the applied search in the visible control after a list reload or detail/back round trip", async () => {
    const context = "search=VPN+access&statusGroup=active";
    window.location.hash = `#/tickets?${context}`;
    const onView = vi.fn();
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/categories")) return json([{ id: 3, name: "Network" }]);
      if (url.includes("/api/tickets")) return json(page);
      return json({});
    });
    vi.stubGlobal("fetch", fetchMock);
    const first = render(<AuthProvider initialUser={requester}><MyTickets initialContext={context} onViewTicket={onView} /></AuthProvider>);
    const search = await screen.findByRole("searchbox", { name: /search ticket number or summary/i });
    expect(search).toHaveValue("VPN access");
    await userEvent.setup().click((await screen.findAllByRole("button", { name: "View ticket" }))[0]);
    expect(onView).toHaveBeenCalledWith(91);
    first.unmount();
    render(<AuthProvider initialUser={requester}><MyTickets initialContext={context} /></AuthProvider>);
    expect(await screen.findByRole("searchbox", { name: /search ticket number or summary/i })).toHaveValue("VPN access");
    const urls = fetchMock.mock.calls.map(([input]) => String(input)).filter((url) => url.includes("/api/tickets?"));
    expect(urls[0]).toContain("search=VPN+access");
    expect(urls[0]).toContain("statusGroup=active");
  });

  it("forwards the exact Requester resolved window and carries it into Ticket Detail", async () => {
    window.location.hash = `#/tickets?${resolved}`;
    const onView = vi.fn();
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/categories")) return json([{ id: 3, name: "Network" }]);
      if (url.includes("/api/tickets")) return json(page);
      return json({});
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AuthProvider initialUser={requester}><MyTickets initialContext={resolved} syncUrl onViewTicket={onView} /></AuthProvider>);
    await screen.findByRole("heading", { name: "My Tickets" });
    await userEvent.setup().click((await screen.findAllByRole("button", { name: "View ticket" }))[0]);
    const listRequest = fetchMock.mock.calls.map(([input]) => String(input)).find((url) => url.includes("/api/tickets?statusGroup=resolved"));
    expect(listRequest).toContain("resolvedFrom=2026-09-24T00%3A00%3A00.000Z");
    expect(listRequest).toContain("resolvedBefore=2026-10-01T00%3A00%3A00.000Z");
    expect(onView).toHaveBeenCalledWith(91);
    expect(window.location.hash).toContain("resolvedBefore=2026-10-01T00%3A00%3A00.000Z");
  });

  it("reuses Staff drill-down context and never forwards Action target metadata to the queue API", async () => {
    window.location.hash = "#/staff/tickets?owner=me&statusGroup=active";
    const onView = vi.fn();
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/categories")) return json([{ id: 3, name: "Network" }]);
      if (url.endsWith("/api/staff/assignees")) return json({ items: [{ id: 21, name: "Niran", role: "IT_STAFF" }] });
      if (url.includes("/api/staff/tickets")) return json({ ...page, items: [{ ...item, itPriority: "HIGH", requester: { id: 11, name: "Anan", email: "anan@example.test" }, owner: staff, version: 2 }] });
      return json({});
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AuthProvider initialUser={staff}><StaffTicketQueue initialContext="owner=me&statusGroup=active" syncUrl onViewTicket={onView} /></AuthProvider>);
    await screen.findByRole("heading", { name: "Ticket Queue" });
    const queueUrl = fetchMock.mock.calls.map(([input]) => String(input)).find((url) => url.includes("/api/staff/tickets?"));
    expect(queueUrl).toContain("owner=me");
    expect(queueUrl).toContain("statusGroup=active");
    expect(queueUrl).not.toContain("actionId");
    await userEvent.setup().click((await screen.findAllByRole("button", { name: "View ticket" }))[0]);
    expect(onView).toHaveBeenCalledWith(91, expect.stringContaining("statusGroup=active"));
    expect(onView.mock.calls[0][1]).not.toContain("actionId");
  });
});
