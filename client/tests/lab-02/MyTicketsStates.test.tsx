import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MyTickets from "../../src/MyTickets.js";
import { RequesterContextProvider } from "./support/requester-context.js";

const requester = [{ id: 1, name: "Anan Student", email: "anan.student@example.test" }];
const category = [{ id: 1, name: "Hardware" }];
const ticket = {
  id: 7,
  ticketNumber: "TKT-20260827-AAAAAA",
  category: { id: 1, name: "Hardware" },
  relatedSystem: { id: 1, name: "Campus Wi-Fi" },
  summary: "Cannot connect to Wi-Fi",
  requestedPriority: "HIGH" as const,
  currentStatus: "NEW" as const,
  createdAt: "2026-08-27T00:00:00.000Z",
  updatedAt: "2026-08-27T00:00:00.000Z",
};

function response(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

function renderPage(ticketResponses: Array<ReturnType<typeof response> | Promise<ReturnType<typeof response>>>) {
  let ticketIndex = 0;
  const fetchMock = vi.fn((input: RequestInfo | URL, _init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/api/development-requesters")) return Promise.resolve(response(requester));
    if (url.includes("/api/categories")) return Promise.resolve(response(category));
    if (url.includes("/api/tickets")) {
      const next = ticketResponses[Math.min(ticketIndex++, ticketResponses.length - 1)];
      return Promise.resolve(next);
    }
    return Promise.resolve(response({}));
  });
  vi.stubGlobal("fetch", fetchMock);
  sessionStorage.setItem("toktickit.developmentRequesterId", "1");
  render(<RequesterContextProvider><MyTickets /></RequesterContextProvider>);
  return fetchMock;
}

describe("UI-06 My Tickets states", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("communicates loading and does not show stale rows during a new query", async () => {
    let resolveNext!: (value: ReturnType<typeof response>) => void;
    const pending = new Promise<ReturnType<typeof response>>((resolve) => { resolveNext = resolve; });
    const fetchMock = renderPage([response({ items: [ticket], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }), pending]);
    expect((await screen.findAllByText("Cannot connect to Wi-Fi")).length).toBeGreaterThan(0);
    const search = screen.getByRole("searchbox", { name: /search ticket number or summary/i });
    await userEvent.setup().type(search, "new");
    await userEvent.setup().click(screen.getByRole("button", { name: "Search" }));
    expect(await screen.findByRole("status")).toHaveTextContent(/loading tickets/i);
    expect(screen.queryByText("Cannot connect to Wi-Fi")).not.toBeInTheDocument();
    resolveNext(response({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 }));
    await waitFor(() => expect(screen.getByText(/no tickets yet|no matching tickets/i)).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalled();
  });

  it("shows Empty with a Create Ticket action when ownership has no Tickets", async () => {
    renderPage([response({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 })]);
    expect(await screen.findByText("No tickets yet")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Create Ticket" }).length).toBeGreaterThan(0);
    expect(screen.queryByText(/no matching tickets/i)).not.toBeInTheDocument();
  });

  it("uses exactly one unrestricted page=1&pageSize=10 probe to distinguish No Results", async () => {
    const fetchMock = renderPage([
      response({ items: [ticket], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }),
      response({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 }),
      response({ items: [ticket], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }),
    ]);
    const user = userEvent.setup();
    await screen.findAllByText("Cannot connect to Wi-Fi");
    await user.type(screen.getByRole("searchbox", { name: /search ticket number or summary/i }), "does-not-exist");
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(await screen.findByText("No matching tickets")).toBeInTheDocument();
    const ticketCalls = fetchMock.mock.calls
      .map(([input]) => String(input))
      .filter((input) => input.includes("/api/tickets"));
    expect(ticketCalls).toHaveLength(3);
    expect(new URL(ticketCalls[2]).search).toBe("?page=1&pageSize=10");
  });

  it("shows safe Failure text and retries the current query", async () => {
    const fetchMock = renderPage([
      response({ error: { code: "INTERNAL_ERROR", message: "Unable to load tickets" } }, false, 500),
      response({ items: [ticket], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }),
    ]);
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load tickets");
    expect(screen.getByRole("alert")).not.toHaveTextContent(/password|Prisma|postgres|https?:/i);
    await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));
    expect((await screen.findAllByText("Cannot connect to Wi-Fi")).length).toBeGreaterThan(0);
    const ticketCalls = fetchMock.mock.calls.filter(([input]) => String(input).includes("/api/tickets"));
    expect(ticketCalls).toHaveLength(2);
  });

  it("shows the authenticated Requester and never sends the retired identity header", async () => {
    const fetchMock = renderPage([response({ items: [ticket], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 })]);
    expect((await screen.findAllByText("Cannot connect to Wi-Fi")).length).toBeGreaterThan(0);
    expect(screen.getByText(/Tickets owned by Anan Student/)).toBeInTheDocument();
    const ticketCall = fetchMock.mock.calls.find(([input]) => String(input).includes("/api/tickets"));
    expect(ticketCall?.[1]).toEqual(expect.objectContaining({ credentials: "include" }));
    expect(JSON.stringify(ticketCall?.[1] ?? {})).not.toMatch(/X-Development-Requester-Id/i);
  });
});
