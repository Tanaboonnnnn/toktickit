import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App.js";

function response(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("UI-01 Login", () => {
  beforeEach(() => {
    window.location.hash = "#/login";
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows Login after unauthenticated bootstrap without Development Requester UI", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(401, {
      error: { code: "AUTHENTICATION_REQUIRED", message: "Authentication required" },
    })));

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Login" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    expect(screen.queryByText(/development requester/i)).not.toBeInTheDocument();
  });

  it("establishes CSRF, submits credentials, and routes a normal Requester into the app", async () => {
    const requester = {
      id: 7,
      name: "Mali Requester",
      email: "mali@example.test",
      role: "REQUESTER",
      mustChangePassword: false,
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(401, { error: { code: "AUTHENTICATION_REQUIRED", message: "Authentication required" } }))
      .mockResolvedValueOnce(response(200, { csrfToken: "csrf-login" }))
      .mockResolvedValueOnce(response(200, { user: requester }))
      .mockResolvedValue(response(200, []));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<App />);
    await user.type(await screen.findByLabelText("Email"), requester.email);
    await user.type(screen.getByLabelText("Password"), "Initial-Password-45!");
    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(await screen.findByText("Mali Requester")).toBeInTheDocument();
    expect(screen.getByText("Requester")).toBeInTheDocument();
    expect(window.location.hash).toBe("#/tickets");
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/api\/auth\/csrf$/), expect.objectContaining({ credentials: "include" }));
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/api\/auth\/login$/), expect.objectContaining({
      method: "POST",
      credentials: "include",
      headers: expect.objectContaining({ "X-CSRF-Token": "csrf-login" }),
    }));
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it("shows safe invalid credential feedback without echoing the password", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(401, { error: { code: "AUTHENTICATION_REQUIRED", message: "Authentication required" } }))
      .mockResolvedValueOnce(response(200, { csrfToken: "csrf-login" }))
      .mockResolvedValueOnce(response(401, { error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<App />);
    await user.type(await screen.findByLabelText("Email"), "missing@example.test");
    await user.type(screen.getByLabelText("Password"), "Secret-Should-Not-Echo!");
    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password");
    expect(screen.getByRole("alert")).not.toHaveTextContent("Secret-Should-Not-Echo!");
    await waitFor(() => expect(screen.getByRole("button", { name: "Login" })).toBeEnabled());
  });
});
