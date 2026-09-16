import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App.js";

function response(status: number, body?: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

const requester = { id: 11, name: "Authenticated Requester", email: "requester@example.test", role: "REQUESTER", mustChangePassword: false };

function authenticatedShellFetch(logoutStatus: 204 | 500) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/api/auth/me")) return response(200, { user: requester });
    if (url.endsWith("/api/auth/csrf")) return response(200, { csrfToken: "csrf-logout" });
    if (url.endsWith("/api/auth/logout")) {
      return logoutStatus === 204
        ? ({ ok: true, status: 204, json: async () => undefined } as Response)
        : response(500, { error: { code: "INTERNAL_ERROR", message: "Unable to process authentication request" } });
    }
    if (url.endsWith("/api/categories")) return response(200, []);
    if (url.includes("/api/tickets")) {
      return response(200, { items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
    }
    throw new Error(`Unexpected test request: ${url}`);
  });
}

describe("UI-01 authenticated shell and routing", () => {
  beforeEach(() => {
    window.location.hash = "#/tickets";
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("does not flash protected content before /me bootstrap resolves", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));
    render(<App />);
    expect(screen.getByRole("status")).toHaveTextContent("Checking your session…");
    expect(screen.queryByRole("heading", { name: "My Tickets" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Login" })).not.toBeInTheDocument();
  });

  it("shows Access Denied for an authenticated wrong-role route and Not Found for malformed routes", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(200, { user: requester })));
    window.location.hash = "#/admin/users";
    const { unmount } = render(<App />);
    expect(await screen.findByRole("heading", { name: "Access Denied" })).toBeInTheDocument();
    unmount();

    window.location.hash = "#/totally-unknown";
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Not Found" })).toBeInTheDocument();
  });

  it("does not claim logout success when server logout fails", async () => {
    const fetchMock = authenticatedShellFetch(500);

    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Logout" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/unable to process authentication request/i);
    expect(screen.getByText("Authenticated Requester")).toBeInTheDocument();
    expect(window.location.hash).toBe("#/tickets");
  });

  it("clears protected shell state only after successful logout", async () => {
    const fetchMock = authenticatedShellFetch(204);

    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Logout" }));

    await waitFor(() => expect(window.location.hash).toBe("#/login"));
    expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
    expect(screen.queryByText("Authenticated Requester")).not.toBeInTheDocument();
  });
});
