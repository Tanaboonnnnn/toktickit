import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TicketDetail from "../../src/TicketDetail.js";
import MyTickets from "../../src/MyTickets.js";
import { RequesterContextProvider, useRequesterContext } from "../../src/requester-context.js";

const requester = [{ id: 1, name: "Anan Student", email: "anan.student@example.test" }];
const ticket = {
  id: 7,
  ticketNumber: "TKT-20260827-AAAAAA",
  requester: requester[0],
  category: { id: 2, name: "Hardware" },
  relatedSystem: { id: 3, name: "Campus Wi-Fi" },
  summary: "Cannot connect to Wi-Fi",
  requestedPriority: "HIGH" as const,
  currentStatus: "NEW" as const,
  createdAt: "2026-08-27T08:00:00.000Z",
  updatedAt: "2026-08-27T09:00:00.000Z",
  description: "The connection fails after waking the laptop.\nPlease investigate the access point.",
  attachments: [
    {
      id: 11, ticketId: 7, originalName: "error screenshot.png", mimeType: "image/png", sizeBytes: 2048,
      state: "ACTIVE" as const, createdAt: "2026-08-27T08:10:00.000Z", removedAt: null, removalReason: null,
      downloadUrl: "/api/tickets/7/attachments/11/download",
    },
    {
      id: 12, ticketId: 7, originalName: "old-log.pdf", mimeType: "application/pdf", sizeBytes: 4096,
      state: "REMOVED" as const, createdAt: "2026-08-27T08:20:00.000Z", removedAt: "2026-08-27T08:45:00.000Z",
      removalReason: "Replaced with a current log", downloadUrl: null,
    },
  ],
};

function response(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

function renderDetail(detailResponse: unknown, detailOk = true, detailStatus = 200) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/api/development-requesters")) return Promise.resolve(response(requester));
    if (url.includes("/api/tickets/7")) return Promise.resolve(response(detailResponse, detailOk, detailStatus));
    return Promise.resolve(response({}));
  });
  vi.stubGlobal("fetch", fetchMock);
  sessionStorage.setItem("toktickit.developmentRequesterId", "1");
  render(<RequesterContextProvider><TicketDetail ticketId={7} onBack={vi.fn()} /></RequesterContextProvider>);
  return fetchMock;
}

describe("UI-08 Requester Ticket Detail", () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("announces loading and does not show stale detail data", async () => {
    let resolveDetail!: (value: ReturnType<typeof response>) => void;
    const pending = new Promise<ReturnType<typeof response>>((resolve) => { resolveDetail = resolve; });
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/development-requesters")) return Promise.resolve(response(requester));
      return pending;
    });
    vi.stubGlobal("fetch", fetchMock);
    sessionStorage.setItem("toktickit.developmentRequesterId", "1");
    render(<RequesterContextProvider><TicketDetail ticketId={7} onBack={vi.fn()} /></RequesterContextProvider>);
    expect(await screen.findByRole("status")).toHaveTextContent(/loading ticket/i);
    expect(screen.queryByText(ticket.summary)).not.toBeInTheDocument();
    resolveDetail(response({ ticket }));
    await waitFor(() => expect(screen.getByText(ticket.ticketNumber)).toBeInTheDocument());
  });

  it("renders the owned Ticket read-only fields and separate active/removed metadata", async () => {
    renderDetail({ ticket });
    expect(await screen.findByRole("heading", { name: /ticket detail/i })).toBeInTheDocument();
    expect(await screen.findByText(ticket.ticketNumber)).toBeInTheDocument();
    expect(screen.getByText(ticket.ticketNumber)).toBeInTheDocument();
    expect(screen.getByText("New")).toBeInTheDocument();
    expect(screen.getByText(/8\/27\/2026|2026/)).toBeInTheDocument();
    expect(screen.getByText(/Anan Student/)).toBeInTheDocument();
    expect(screen.getByText("Hardware")).toBeInTheDocument();
    expect(screen.getByText("Campus Wi-Fi")).toBeInTheDocument();
    expect(screen.getByText(ticket.summary)).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText(/connection fails after waking/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /attachments/i })).toBeInTheDocument();
    expect(screen.getByText("error screenshot.png")).toBeInTheDocument();
    expect(screen.getByText(/image\/png/i)).toBeInTheDocument();
    expect(screen.getByText(/Active/i)).toBeInTheDocument();
    expect(screen.getByText("old-log.pdf")).toBeInTheDocument();
    expect(screen.getAllByText(/Removed/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Replaced with a current log/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /upload|download|remove|preview/i })).not.toBeInTheDocument();
  });

  it("shows neutral unavailable wording for a documented 404", async () => {
    renderDetail({ error: { code: "RESOURCE_NOT_FOUND", message: "Ticket not found" } }, false, 404);
    expect(await screen.findByText("This Ticket is unavailable.")).toBeInTheDocument();
    expect(screen.getByRole("status")).not.toHaveTextContent(/another requester|owned by|Requester B/i);
  });

  it("shows safe failure text and retries with the same Ticket ID and requester context", async () => {
    let calls = 0;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/development-requesters")) return Promise.resolve(response(requester));
      calls += 1;
      return Promise.resolve(calls === 1
        ? response({ error: { code: "INTERNAL_ERROR", message: "Unable to load ticket" } }, false, 500)
        : response({ ticket }));
    });
    vi.stubGlobal("fetch", fetchMock);
    sessionStorage.setItem("toktickit.developmentRequesterId", "1");
    render(<RequesterContextProvider><TicketDetail ticketId={7} onBack={vi.fn()} /></RequesterContextProvider>);
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load ticket");
    expect(screen.getByRole("alert")).not.toHaveTextContent(/Prisma|password|filesystem/i);
    await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText(ticket.ticketNumber)).toBeInTheDocument();
    const detailCall = fetchMock.mock.calls.filter(([input]) => String(input).includes("/api/tickets/7")).at(-1);
    expect(detailCall?.[1]).toEqual(expect.objectContaining({ headers: { "X-Development-Requester-Id": "1" } }));
    expect(String(detailCall?.[0])).toContain("/api/tickets/7");
  });

  it("returns through Back to My Tickets", async () => {
    const onBack = vi.fn();
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => String(input).includes("development-requesters")
      ? Promise.resolve(response(requester)) : Promise.resolve(response({ ticket }))));
    sessionStorage.setItem("toktickit.developmentRequesterId", "1");
    render(<RequesterContextProvider><TicketDetail ticketId={7} onBack={onBack} /></RequesterContextProvider>);
    await screen.findByText(ticket.ticketNumber);
    await userEvent.setup().click(screen.getByRole("button", { name: /back to my tickets/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("opens the selected Ticket from desktop and mobile My Tickets View actions", async () => {
    const onViewTicket = vi.fn();
    const listItem = {
      id: 7, ticketNumber: ticket.ticketNumber, category: ticket.category, relatedSystem: ticket.relatedSystem,
      summary: ticket.summary, requestedPriority: ticket.requestedPriority, currentStatus: ticket.currentStatus,
      createdAt: ticket.createdAt, updatedAt: ticket.updatedAt,
    };
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("development-requesters")) return Promise.resolve(response(requester));
      if (url.includes("/api/categories")) return Promise.resolve(response([ticket.category]));
      return Promise.resolve(response({ items: [listItem], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }));
    }));
    sessionStorage.setItem("toktickit.developmentRequesterId", "1");
    render(<RequesterContextProvider><MyTickets onViewTicket={onViewTicket} /></RequesterContextProvider>);
    await waitFor(() => expect(screen.getAllByRole("button", { name: /view ticket/i })).toHaveLength(2));
    const viewActions = screen.getAllByRole("button", { name: /view ticket/i });
    await userEvent.setup().click(viewActions[0]);
    await userEvent.setup().click(viewActions[1]);
    expect(onViewTicket).toHaveBeenNthCalledWith(1, 7);
    expect(onViewTicket).toHaveBeenNthCalledWith(2, 7);
  });

  it("clears the previous detail before loading a newly selected Requester", async () => {
    const requesters = [requester[0], { id: 2, name: "Mali Student", email: "mali.student@example.test" }];
    const otherTicket = { ...ticket, requester: requesters[1], summary: "Mali requester ticket" };
    function Switcher() {
      const { selectRequester } = useRequesterContext();
      return <button type="button" onClick={() => selectRequester(2)}>Switch requester</button>;
    }
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("development-requesters")) return Promise.resolve(response(requesters));
      const headers = (init?.headers ?? {}) as Record<string, string>;
      return Promise.resolve(response({ ticket: headers["X-Development-Requester-Id"] === "2" ? otherTicket : ticket }));
    });
    vi.stubGlobal("fetch", fetchMock);
    sessionStorage.setItem("toktickit.developmentRequesterId", "1");
    render(<RequesterContextProvider><Switcher /><TicketDetail ticketId={7} onBack={vi.fn()} /></RequesterContextProvider>);
    await screen.findByText(ticket.summary);
    await userEvent.setup().click(screen.getByRole("button", { name: "Switch requester" }));
    expect(screen.queryByText(ticket.summary)).not.toBeInTheDocument();
    expect(await screen.findByText(otherTicket.summary)).toBeInTheDocument();
  });
});
