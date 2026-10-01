import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../src/auth-context.js";
import { useAuth } from "../../src/auth-context.js";
import { SafeApiError } from "../../src/api.js";
import RequesterDashboard from "../../src/dashboard/RequesterDashboard.js";

const requester = { id: 11, name: "Anan", email: "anan@example.test", role: "REQUESTER" as const, mustChangePassword: false };
const empty = {
  asOf: "2026-10-01T00:00:00.000Z", resolvedWindow: { from: "2026-09-24T00:00:00.000Z", before: "2026-10-01T00:00:00.000Z" },
  metrics: { myActiveTickets: 0, waitingForMe: 0, recentlyResolved: 0 }, recentTickets: [], attentionTickets: [],
  drillDown: { myActiveTickets: "#/tickets?statusGroup=active", waitingForMe: "#/tickets?currentStatus=WAITING_FOR_REQUESTER", recentlyResolved: "#/tickets?statusGroup=resolved&resolvedFrom=2026-09-24T00%3A00%3A00.000Z&resolvedBefore=2026-10-01T00%3A00%3A00.000Z" },
};
function json(body: unknown, status = 200) { return Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => body } as Response); }
function show(responses: Array<unknown | Error> = [empty]) {
  let index = 0;
  const fetchMock = vi.fn(() => { const next = responses[Math.min(index++, responses.length - 1)]; return next instanceof Error ? Promise.reject(next) : json(next); });
  vi.stubGlobal("fetch", fetchMock);
  render(<AuthProvider initialUser={requester}><RequesterDashboard /></AuthProvider>);
  return fetchMock;
}
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("UI-05 Requester Dashboard", () => {
  it("does not show zero while loading and shows backend zeros and empty states after success", async () => {
    let resolve!: (value: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((done) => { resolve = done; })));
    render(<AuthProvider initialUser={requester}><RequesterDashboard /></AuthProvider>);
    expect(screen.getByRole("status")).toHaveTextContent("Loading Dashboard");
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    resolve(await json(empty));
    expect(await screen.findAllByText("0")).toHaveLength(3);
    expect(screen.getByText("No recently updated Tickets.")).toBeInTheDocument();
    expect(screen.getByText("No Tickets are waiting for your response.")).toBeInTheDocument();
  });

  it("renders exact non-zero metrics and uses the returned drill-down URLs and owned Ticket links", async () => {
    const preview = { id: 55, ticketNumber: "TKT-55", category: { id: 2, name: "Accounts" }, relatedSystem: { id: 3, name: "Portal" }, summary: "Portal access", requestedPriority: "HIGH", currentStatus: "OPEN", createdAt: empty.asOf, updatedAt: empty.asOf };
    const attention = { ...preview, id: 56, ticketNumber: "TKT-56", summary: "Waiting for Requester update", currentStatus: "WAITING_FOR_REQUESTER" };
    const data = { ...empty, metrics: { myActiveTickets: 8, waitingForMe: 2, recentlyResolved: 4 }, recentTickets: [preview], attentionTickets: [attention] };
    show([data]);
    expect(await screen.findByText("8")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view recently resolved/i })).toHaveAttribute("href", data.drillDown.recentlyResolved);
    expect(screen.getByRole("link", { name: /TKT-55.*Portal access/i })).toHaveAttribute("href", "#/tickets/55");
    expect(screen.getByRole("link", { name: /TKT-56.*Waiting for Requester update/i })).toHaveAttribute("href", "#/tickets/56");
  });

  it("shows safe failure and retries without exposing malformed partial metrics", async () => {
    const user = await import("@testing-library/user-event").then((m) => m.default.setup());
    show([{ ...empty, metrics: { ...empty.metrics, waitingForMe: "1" } }, empty]);
    expect(await screen.findByRole("alert")).toHaveTextContent("Unexpected response");
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.getAllByText("0")).toHaveLength(3));
  });

  it("renders Access Denied for a forbidden Dashboard response without showing metrics", async () => {
    show([new SafeApiError(403, "FORBIDDEN", "You do not have permission to perform this action")]);
    expect(await screen.findByRole("heading", { name: "Access Denied" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("You do not have permission to open your Dashboard.");
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });

  it("ignores a slow Dashboard response after the authenticated user changes", async () => {
    const nextUser = { ...requester, id: 12, name: "Boon" };
    const newer = { ...empty, metrics: { myActiveTickets: 7, waitingForMe: 6, recentlyResolved: 5 } };
    let resolveOld!: (value: Response) => void;
    let dashboardCalls = 0;
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/auth/csrf")) return json({ csrfToken: "csrf" });
      if (url.endsWith("/api/auth/login")) return json({ user: nextUser });
      if (url.endsWith("/api/dashboard/requester")) {
        dashboardCalls += 1;
        return dashboardCalls === 1 ? new Promise<Response>((done) => { resolveOld = done; }) : json(newer);
      }
      return json([]);
    });
    vi.stubGlobal("fetch", fetchMock);
    function Switchable() {
      const { login, user } = useAuth();
      return <><span>{user?.name}</span><button type="button" onClick={() => { void login("boon@example.test", "password"); }}>Switch account</button><RequesterDashboard /></>;
    }
    render(<AuthProvider initialUser={requester}><Switchable /></AuthProvider>);
    await waitFor(() => expect(dashboardCalls).toBe(1));
    await userEvent.setup().click(screen.getByRole("button", { name: "Switch account" }));
    expect(await screen.findByText("7")).toBeInTheDocument();
    resolveOld(await json({ error: { code: "AUTHENTICATION_REQUIRED", message: "Sign in again" } }, 401));
    await waitFor(() => expect(screen.getByText("7")).toBeInTheDocument());
    expect(screen.getByText("Boon")).toBeInTheDocument();
  });
});
