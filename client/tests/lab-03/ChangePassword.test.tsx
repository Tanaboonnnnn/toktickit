import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App.js";

function response(status: number, body?: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

describe("UI-01 mandatory Change Password", () => {
  beforeEach(() => {
    window.location.hash = "#/tickets";
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("forces a pending user to Change Password even when a protected route is typed directly", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(200, {
      user: { id: 8, name: "Initial User", email: "initial@example.test", role: "REQUESTER", mustChangePassword: true },
    })));

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Change Password" })).toBeInTheDocument();
    expect(screen.getByText("Use 15–128 characters. Your new password must differ from your current password.")).toBeInTheDocument();
    expect(window.location.hash).toBe("#/change-password");
    expect(screen.queryByRole("heading", { name: "My Tickets" })).not.toBeInTheDocument();
  });

  it("validates confirmation locally and continues after a successful password change", async () => {
    const changedUser = { id: 8, name: "Initial User", email: "initial@example.test", role: "REQUESTER", mustChangePassword: false };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(200, { user: { ...changedUser, mustChangePassword: true } }))
      .mockResolvedValueOnce(response(200, { csrfToken: "csrf-change" }))
      .mockResolvedValueOnce(response(200, { user: changedUser }))
      .mockResolvedValue(response(200, []));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<App />);
    await user.type(await screen.findByLabelText("Current password"), "Initial-Password-45!");
    await user.type(screen.getByLabelText("New password"), "A-new-password-45!xxxx");
    await user.type(screen.getByLabelText("Confirm new password"), "different-value-45!xxx");
    await user.click(screen.getByRole("button", { name: "Change Password" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/confirmation/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await user.clear(screen.getByLabelText("Confirm new password"));
    await user.type(screen.getByLabelText("Confirm new password"), "A-new-password-45!xxxx");
    await user.click(screen.getByRole("button", { name: "Change Password" }));

    expect(await screen.findByText("Initial User")).toBeInTheDocument();
    expect(window.location.hash).toBe("#/tickets");
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/api\/auth\/change-password$/), expect.objectContaining({
      method: "POST",
      credentials: "include",
      headers: expect.objectContaining({ "X-CSRF-Token": "csrf-change" }),
    }));
  });
});
