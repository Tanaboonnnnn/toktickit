import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MyTickets from "../../src/MyTickets.js";
import TicketDetail from "../../src/TicketDetail.js";
import { AuthProvider } from "../../src/auth-context.js";
import type { Ticket } from "../../src/api.js";

const requester = { id: 9101, name: "Lab 3 Requester", email: "lab3-requester@example.test" };
const authenticatedRequester = { ...requester, role: "REQUESTER" as const, mustChangePassword: false };
const baseItem = {
  id: 91,
  ticketNumber: "TKT-20260915-STAT01",
  category: { id: 1, name: "Hardware" },
  relatedSystem: { id: 1, name: "University Email" },
  summary: "Status compatibility",
  requestedPriority: "HIGH",
  createdAt: "2026-09-15T01:00:00.000Z",
  updatedAt: "2026-09-15T02:00:00.000Z",
};

function response(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

describe("STATUS-01 client runtime status compatibility", () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => {
    cleanup();
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("renders every Lab 3 status as an available My Tickets filter", async () => {
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("categories")) return Promise.resolve(response([]));
      return Promise.resolve(response({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 }));
    }));
    render(<AuthProvider initialUser={authenticatedRequester}><MyTickets /></AuthProvider>);
    const filter = await screen.findByRole("combobox", { name: "Current Status" });
    const labels = Array.from((filter as HTMLSelectElement).options).map(({ text }) => text);
    expect(labels).toEqual([
      "All Statuses", "New", "Open", "In Progress", "Waiting for Requester",
      "Resolved", "Closed", "Reopened", "Cancelled",
    ]);
  });

  it("accepts and renders a non-NEW status returned by the API", async () => {
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("categories")) return Promise.resolve(response([]));
      return Promise.resolve(response({
        items: [{ ...baseItem, currentStatus: "WAITING_FOR_REQUESTER" }],
        page: 1,
        pageSize: 10,
        totalItems: 1,
        totalPages: 1,
      }));
    }));
    render(<AuthProvider initialUser={authenticatedRequester}><MyTickets /></AuthProvider>);
    expect((await screen.findAllByText("Waiting for Requester")).length).toBeGreaterThan(0);
  });

  it("shows the actual non-NEW status on Ticket Detail", async () => {
    const ticket = {
      ...baseItem,
      requester,
      currentStatus: "RESOLVED",
      description: "A sufficiently detailed status compatibility description.",
      attachments: [],
      resolutionSummary: "The service has been restored and verified.",
      resolvedAt: "2026-09-15T03:00:00.000Z",
      closedAt: null,
      cancelReason: null,
      cancelledAt: null,
      requesterResolutionIndicatedAt: null,
      version: 2,
    } as unknown as Ticket;
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(response({ ticket }))));
    render(<AuthProvider initialUser={authenticatedRequester}><TicketDetail ticketId={ticket.id} onBack={vi.fn()} /></AuthProvider>);
    expect((await screen.findAllByText("Resolved")).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("New")).not.toBeInTheDocument();
  });
});
