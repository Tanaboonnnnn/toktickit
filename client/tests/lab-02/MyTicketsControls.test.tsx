import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MyTickets from "../../src/MyTickets.js";
import { RequesterContextProvider } from "../../src/requester-context.js";

const requester = [{ id: 1, name: "Anan Student", email: "anan.student@example.test" }];
const category = [{ id: 12, name: "Hardware" }];
const item = (id: number, summary = `Ticket ${id}`) => ({
  id,
  ticketNumber: `TKT-20260827-${String(id).padStart(6, "0")}`,
  category: { id: 12, name: "Hardware" },
  relatedSystem: { id: 3, name: "Campus Wi-Fi" },
  summary,
  requestedPriority: "LOW" as const,
  currentStatus: "NEW" as const,
  createdAt: "2026-08-27T00:00:00.000Z",
  updatedAt: "2026-08-27T00:00:00.000Z",
});
const pageOne = { items: [item(1)], page: 1, pageSize: 10 as const, totalItems: 11, totalPages: 2 };

function response(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

function renderPage(ticketResponses: unknown[]) {
  let index = 0;
  const fetchMock = vi.fn((input: RequestInfo | URL, _init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/api/development-requesters")) return Promise.resolve(response(requester));
    if (url.includes("/api/categories")) return Promise.resolve(response(category));
    if (url.includes("/api/tickets")) {
      const next = ticketResponses[Math.min(index++, ticketResponses.length - 1)];
      return Promise.resolve(next && typeof next === "object" && "json" in next
        ? next as ReturnType<typeof response>
        : response(next));
    }
    return Promise.resolve(response({}));
  });
  vi.stubGlobal("fetch", fetchMock);
  sessionStorage.setItem("toktickit.developmentRequesterId", "1");
  render(<RequesterContextProvider><MyTickets /></RequesterContextProvider>);
  return fetchMock;
}

function ticketUrls(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.map(([input]) => String(input)).filter((input) => input.includes("/api/tickets"));
}

describe("UI-07 My Tickets controls", () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses the documented initial defaults and applies search only on Search/Enter", async () => {
    const fetchMock = renderPage([pageOne, pageOne, pageOne]);
    await screen.findAllByText("Ticket 1");
    expect(new URL(ticketUrls(fetchMock)[0]).search).toBe("?sortBy=updatedAt&sortDirection=desc&page=1&pageSize=10");
    const user = userEvent.setup();
    const search = screen.getByRole("searchbox", { name: /search ticket number or summary/i });
    await user.type(search, "  wifi ");
    expect(ticketUrls(fetchMock)).toHaveLength(1);
    await user.keyboard("{Enter}");
    await waitFor(() => expect(ticketUrls(fetchMock)).toHaveLength(2));
    expect(new URL(ticketUrls(fetchMock)[1]).search).toContain("search=wifi");
    expect(new URL(ticketUrls(fetchMock)[1]).search).toContain("page=1");
  });

  it("sends Category, Priority, Status, sorting and page-size controls and resets page to one", async () => {
    const fetchMock = renderPage([pageOne, pageOne, pageOne, pageOne, pageOne, pageOne]);
    await screen.findAllByText("Ticket 1");
    const user = userEvent.setup();
    await user.selectOptions(screen.getByRole("combobox", { name: "Category" }), "12");
    await waitFor(() => expect(ticketUrls(fetchMock)).toHaveLength(2));
    expect(new URL(ticketUrls(fetchMock)[1]).searchParams.get("categoryId")).toBe("12");
    expect(new URL(ticketUrls(fetchMock)[1]).searchParams.get("page")).toBe("1");
    await user.selectOptions(screen.getByRole("combobox", { name: "Requested Priority" }), "HIGH");
    await user.selectOptions(screen.getByRole("combobox", { name: "Current Status" }), "NEW");
    await user.selectOptions(screen.getByRole("combobox", { name: "Sort by" }), "summary");
    await user.selectOptions(screen.getByRole("combobox", { name: "Sort direction" }), "asc");
    await user.selectOptions(screen.getByRole("combobox", { name: "Page size" }), "20");
    await waitFor(() => expect(ticketUrls(fetchMock).length).toBeGreaterThanOrEqual(7));
    const latest = new URL(ticketUrls(fetchMock).at(-1)!);
    expect(latest.searchParams.get("requestedPriority")).toBe("HIGH");
    expect(latest.searchParams.get("currentStatus")).toBe("NEW");
    expect(latest.searchParams.get("sortBy")).toBe("summary");
    expect(latest.searchParams.get("sortDirection")).toBe("asc");
    expect(latest.searchParams.get("pageSize")).toBe("20");
    expect(latest.searchParams.get("page")).toBe("1");
  });

  it("supports pagination boundaries and Clear resetting all controls", async () => {
    const pageTwo = { ...pageOne, items: [item(2)], page: 2 as const };
    const fetchMock = renderPage([pageOne, pageTwo, pageOne]);
    await screen.findAllByText("Ticket 1");
    const user = userEvent.setup();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect((await screen.findAllByText("Ticket 2")).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Previous" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Clear search/filters" }));
    await waitFor(() => expect(ticketUrls(fetchMock).length).toBe(3));
    expect(new URL(ticketUrls(fetchMock)[2]).search).toBe("?sortBy=updatedAt&sortDirection=desc&page=1&pageSize=10");
  });

  it("recovers an out-of-range page with exactly one final-page request", async () => {
    const outOfRange = { items: [], page: 3 as const, pageSize: 10 as const, totalItems: 21, totalPages: 2 };
    const finalPage = { items: [item(20, "Recovered final page")], page: 2 as const, pageSize: 10 as const, totalItems: 21, totalPages: 2 };
    const fetchMock = renderPage([outOfRange, finalPage]);
    await waitFor(() => expect(screen.getAllByText("Recovered final page").length).toBeGreaterThan(0));
    const urls = ticketUrls(fetchMock);
    expect(urls).toHaveLength(2);
    expect(new URL(urls[1]).searchParams.get("page")).toBe("2");
    expect(screen.getByText(/Page 2 of 2/)).toBeInTheDocument();
  });

  it("sends the selected Requester context and preserves the applied query on Retry", async () => {
    const fetchMock = renderPage([
      pageOne,
      response({ error: { code: "INTERNAL_ERROR", message: "Unable to load tickets" } }, false, 500),
      pageOne,
    ]);
    const user = userEvent.setup();
    await screen.findAllByText("Ticket 1");
    const search = screen.getByRole("searchbox", { name: /search ticket number or summary/i });
    await user.type(search, "wifi");
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load tickets");
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(ticketUrls(fetchMock)).toHaveLength(3));
    const retryCall = fetchMock.mock.calls.filter(([input]) => String(input).includes("/api/tickets")).at(-1);
    expect(new URL(String(retryCall?.[0])).searchParams.get("search")).toBe("wifi");
    expect(retryCall?.[1]).toEqual(expect.objectContaining({
      headers: { "X-Development-Requester-Id": "1" },
    }));
  });
});
