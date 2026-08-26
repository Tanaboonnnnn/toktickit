import { useState } from "react";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App.js";
import {
  RequesterContextProvider,
  RequesterScoped,
  useRequesterContext,
} from "../../src/requester-context.js";

const activeRequesters = [
  { id: 1, name: "Anan Student", email: "anan.student@example.test" },
  { id: 2, name: "Mali Student", email: "mali.student@example.test" },
];

function jsonResponse(body: unknown) {
  return { ok: true, json: async () => body };
}

function ScopedLocalState() {
  const [value, setValue] = useState("clean");
  return (
    <button type="button" data-testid="scoped-state" onClick={() => setValue("dirty")}>
      {value}
    </button>
  );
}

function ScopedBoundaryHarness() {
  const { currentRequester, selectRequester } = useRequesterContext();
  return (
    <>
      <button type="button" onClick={() => selectRequester(1)}>Select Anan</button>
      <button type="button" onClick={() => selectRequester(2)}>Select Mali</button>
      <span data-testid="current-requester">{currentRequester?.name ?? "none"}</span>
      <RequesterScoped>
        <ScopedLocalState />
      </RequesterScoped>
    </>
  );
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
    expect(await screen.findByText(/current development requester/i)).toBeInTheDocument();
    expect(screen.getByText(/current development requester/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /change requester/i }));
    expect(await screen.findByRole("heading", { name: /select a development requester/i })).toBeInTheDocument();
    expect(screen.queryByText(/current development requester/i)).not.toBeInTheDocument();
    expect(sessionStorage.getItem("toktickit.developmentRequesterId")).toBeNull();

    const select = screen.getByRole("combobox", { name: /development requester/i });
    await user.selectOptions(select, "2");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(await screen.findByRole("heading", { name: /create ticket/i })).toBeInTheDocument();
    expect(screen.getByText(/current development requester/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /select a development requester/i })).not.toBeInTheDocument();
    expect(sessionStorage.getItem("toktickit.developmentRequesterId")).toBe("2");
  });

  it("remounts requester-scoped client state when the Requester changes", async () => {
    sessionStorage.clear();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(activeRequesters)));
    const user = userEvent.setup();

    render(
      <RequesterContextProvider>
        <ScopedBoundaryHarness />
      </RequesterContextProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("current-requester")).toHaveTextContent("none"));
    await user.click(screen.getByRole("button", { name: "Select Anan" }));
    await user.click(screen.getByTestId("scoped-state"));
    expect(screen.getByTestId("scoped-state")).toHaveTextContent("dirty");

    await user.click(screen.getByRole("button", { name: "Select Mali" }));

    expect(screen.getByTestId("current-requester")).toHaveTextContent("Mali Student");
    expect(screen.getByTestId("scoped-state")).toHaveTextContent("clean");
    expect(sessionStorage.getItem("toktickit.developmentRequesterId")).toBe("2");
  });

  it("keeps shell navigation understandable without creating Ticket feature pages", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(activeRequesters)));

    render(<App />);

    const nav = await screen.findByRole("navigation", { name: /primary/i });
    const myTickets = within(nav).getByRole("button", { name: /my tickets/i });
    expect(myTickets).toBeDisabled();
    expect(myTickets).not.toHaveAttribute("aria-current");

    const createTicketNav = within(nav).getByRole("button", { name: /create ticket/i });
    expect(createTicketNav).toHaveAttribute("aria-current", "page");
    expect(createTicketNav).toBeEnabled();
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
