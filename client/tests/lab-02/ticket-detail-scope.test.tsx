import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TicketDetail from "../../src/TicketDetail.js";
import { RequesterContextProvider } from "./support/requester-context.js";

const requester = [{ id: 1, name: "Anan Student", email: "anan.student@example.test" }];
const ticket = {
  id: 7, ticketNumber: "TKT-20260827-AAAAAA", requester: requester[0],
  category: { id: 2, name: "Hardware" }, relatedSystem: { id: 3, name: "Campus Wi-Fi" },
  summary: "Cannot connect to Wi-Fi", requestedPriority: "HIGH" as const, currentStatus: "NEW" as const,
  createdAt: "2026-08-27T08:00:00.000Z", updatedAt: "2026-08-27T09:00:00.000Z", description: "A detailed description.", attachments: [],
  resolutionSummary: null, resolvedAt: null, closedAt: null, cancelReason: null, cancelledAt: null,
  requesterResolutionIndicatedAt: null, version: 1,
};

describe("STYLE-04 Ticket Detail scope guard", () => {
  beforeEach(() => {
    sessionStorage.setItem("toktickit.developmentRequesterId", "1");
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("development-requesters")) return Promise.resolve({ ok: true, status: 200, json: async () => requester });
      if (url.includes("/api/tickets/7/actions-taken?")) return Promise.resolve({ ok: true, status: 200, json: async () => ({ items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 0, capabilities: { canCreate: false } }) });
      if (url.endsWith("/comments")) return Promise.resolve({ ok: true, status: 200, json: async () => ({ items: [] }) });
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ ticket }) });
    }));
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); sessionStorage.clear(); });

  it("renders Requester collaboration without private staff, ownership, or formal lifecycle controls", async () => {
    render(<RequesterContextProvider><TicketDetail ticketId={7} onBack={vi.fn()} /></RequesterContextProvider>);
    await screen.findByText(ticket.ticketNumber);
    expect(screen.getByRole("heading", { name: "Public Comments" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Problem Appears Resolved" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Actions Taken" })).toBeInTheDocument();
    expect(await screen.findByText("No Actions Taken yet.")).toBeInTheDocument();
    for (const text of ["Internal Notes", "Ticket Owner", "IT Priority", "Change status", "Administrator"]) {
      expect(screen.queryByText(new RegExp(text, "i"))).not.toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: /create action|edit action|start action|complete action|cancel action/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /confirm status change|resolve ticket|close ticket|reopen ticket/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /upload|download|remove|preview|status|priority/i })).not.toBeInTheDocument();
  });
});
