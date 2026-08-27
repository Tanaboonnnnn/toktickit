import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TicketDetail from "../../src/TicketDetail.js";
import { RequesterContextProvider } from "../../src/requester-context.js";

const requester = [{ id: 1, name: "Anan Student", email: "anan.student@example.test" }];
const ticket = {
  id: 7, ticketNumber: "TKT-20260827-AAAAAA", requester: requester[0],
  category: { id: 2, name: "Hardware" }, relatedSystem: { id: 3, name: "Campus Wi-Fi" },
  summary: "Cannot connect to Wi-Fi", requestedPriority: "HIGH" as const, currentStatus: "NEW" as const,
  createdAt: "2026-08-27T08:00:00.000Z", updatedAt: "2026-08-27T09:00:00.000Z", description: "A detailed description.", attachments: [],
};

describe("STYLE-04 Ticket Detail scope guard", () => {
  beforeEach(() => {
    sessionStorage.setItem("toktickit.developmentRequesterId", "1");
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => String(input).includes("development-requesters")
      ? Promise.resolve({ ok: true, status: 200, json: async () => requester })
      : Promise.resolve({ ok: true, status: 200, json: async () => ({ ticket }) })));
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); sessionStorage.clear(); });

  it("renders no collaboration, IT Staff, ownership mutation, or lifecycle controls", async () => {
    render(<RequesterContextProvider><TicketDetail ticketId={7} onBack={vi.fn()} /></RequesterContextProvider>);
    await screen.findByText(ticket.ticketNumber);
    for (const text of ["Public Comments", "Internal Notes", "Actions Taken", "Assign", "Reassign", "Ticket Owner", "IT Priority", "Change status", "Resolve", "Close", "Reopen", "Administrator"]) {
      expect(screen.queryByText(new RegExp(text, "i"))).not.toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: /upload|download|remove|preview|status|priority/i })).not.toBeInTheDocument();
  });
});
