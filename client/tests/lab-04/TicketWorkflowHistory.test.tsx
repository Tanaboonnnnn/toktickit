import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import TicketWorkflowHistory from "../../src/workflow/TicketWorkflowHistory.js";

function json(body: unknown, status = 200): Promise<Response> {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => body } as Response);
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("UI-03 Ticket workflow history", () => {
  it("shows a truthful pre-Lab-4 empty state", async () => {
    vi.stubGlobal("fetch", vi.fn(() => json({
      items: [],
      page: 1,
      pageSize: 20,
      totalItems: 0,
      totalPages: 0,
      historyRecordedSince: "LAB_4",
    })));

    render(<TicketWorkflowHistory ticketId={91} ticketVersion={7} />);

    expect(await screen.findByRole("heading", { name: "Ticket workflow history" })).toBeInTheDocument();
    expect(screen.getByText(/no lab 4 ticket workflow events recorded yet/i)).toBeInTheDocument();
    expect(screen.getByText(/earlier ticket transitions are not backfilled/i)).toBeInTheDocument();
  });

  it("renders append-only public events and keeps every page reachable", async () => {
    const actor = { id: 21, name: "Niran Staff", role: "IT_STAFF" };
    const first = {
      id: 801,
      ticketId: 91,
      ticketVersion: 8,
      workflowCycle: 2,
      fromStatus: "IN_PROGRESS",
      toStatus: "RESOLVED",
      actor,
      occurredAt: "2026-09-30T09:00:00.000Z",
      resolutionSummary: "Verified service restoration",
      cancellationReason: null,
    };
    const second = {
      ...first,
      id: 802,
      ticketVersion: 9,
      fromStatus: "RESOLVED",
      toStatus: "CLOSED",
      occurredAt: "2026-09-30T10:00:00.000Z",
      resolutionSummary: null,
    };
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      const page = url.includes("page=2") ? 2 : 1;
      return json({
        items: [page === 1 ? first : second],
        page,
        pageSize: 1,
        totalItems: 2,
        totalPages: 2,
        historyRecordedSince: "LAB_4",
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<TicketWorkflowHistory ticketId={91} ticketVersion={9} pageSize={1} />);

    expect(await screen.findByText(/In Progress.*Resolved/i)).toBeInTheDocument();
    expect(screen.getByText("Verified service restoration")).toBeInTheDocument();
    expect(screen.getByText(/Page 1 of 2/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next workflow history page" }));
    expect(await screen.findByText(/Resolved.*Closed/i)).toBeInTheDocument();
    expect(screen.getByText(/Page 2 of 2/i)).toBeInTheDocument();
  });
});
