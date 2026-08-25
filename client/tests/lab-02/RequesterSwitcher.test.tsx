import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App.js";

const activeRequesters = [
  { id: 1, name: "Anan Student", email: "anan.student@example.test" },
  { id: 2, name: "Mali Student", email: "mali.student@example.test" },
];

function jsonResponse(body: unknown) {
  return { ok: true, json: async () => body };
}

describe("UI-02 Development Requester switching", () => {
  beforeEach(() => {
    sessionStorage.setItem("toktickit.developmentRequesterId", "1");
  });

  afterEach(() => {
    cleanup();
    sessionStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns to selection and replaces the shell context when switching Requesters", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(activeRequesters)));
    const user = userEvent.setup();

    render(<App />);
    expect(await screen.findByText("Anan Student")).toBeInTheDocument();
    expect(screen.getByText(/current development requester/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /change requester/i }));
    expect(await screen.findByRole("heading", { name: /select a development requester/i })).toBeInTheDocument();
    expect(screen.queryByText(/current development requester/i)).not.toBeInTheDocument();
    expect(sessionStorage.getItem("toktickit.developmentRequesterId")).toBeNull();

    const select = screen.getByRole("combobox", { name: /development requester/i });
    await user.selectOptions(select, "2");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(await screen.findByText("Mali Student")).toBeInTheDocument();
    expect(screen.getByText(/current development requester/i)).toBeInTheDocument();
    expect(screen.queryByText("Anan Student")).not.toBeInTheDocument();
    expect(sessionStorage.getItem("toktickit.developmentRequesterId")).toBe("2");
  });

  it("keeps shell navigation understandable without creating Ticket feature pages", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(activeRequesters)));

    render(<App />);

    expect(await screen.findByRole("button", { name: /my tickets/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /my tickets/i })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("button", { name: /create ticket/i })).toBeInTheDocument();
    expect(screen.queryByText(/ticket number|supported request categories/i)).not.toBeInTheDocument();
  });

  it("keeps Change Requester keyboard-operable and visibly focusable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(activeRequesters)));
    const user = userEvent.setup();

    render(<App />);
    const change = await screen.findByRole("button", { name: /change requester/i });
    await user.tab();
    await waitFor(() => expect(change).toHaveFocus());
  });
});
