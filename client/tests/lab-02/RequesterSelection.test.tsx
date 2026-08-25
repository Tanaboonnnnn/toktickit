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

describe("UI-01 Development Requester Selection", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("does not render the legacy Lab 1 Check System control in the Lab 2 flow", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));

    render(<App />);

    expect(screen.queryByRole("button", { name: /check system/i })).not.toBeInTheDocument();
  });

  it("shows loading feedback while active Requesters are loading", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));

    render(<App />);

    expect(screen.getByRole("status")).toHaveTextContent(/loading development requesters/i);
    expect(screen.queryByRole("button", { name: /my tickets/i })).not.toBeInTheDocument();
  });

  it("renders active name/email options with an accessible disabled Continue action", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(activeRequesters)));
    const user = userEvent.setup();

    render(<App />);

    const select = await screen.findByRole("combobox", { name: /development requester/i });
    expect(screen.getByRole("heading", { name: /select a development requester/i })).toBeInTheDocument();
    expect(screen.getByText(/lab 2 testing/i)).toBeInTheDocument();
    expect(screen.getByText(/not authentication|not login/i)).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Anan Student.*anan\.student@example\.test/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Mali Student.*mali\.student@example\.test/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();

    await user.selectOptions(select, "1");
    expect(screen.getByRole("button", { name: /continue/i })).toBeEnabled();
    expect(screen.getByRole("heading", { name: /select a development requester/i })).toBeInTheDocument();
  });

  it("establishes the selected Requester only after Continue", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(activeRequesters)));
    const user = userEvent.setup();
    render(<App />);

    const select = await screen.findByRole("combobox", { name: /development requester/i });
    await user.selectOptions(select, "1");
    expect(screen.getByRole("heading", { name: /select a development requester/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(await screen.findByText(/current development requester/i)).toBeInTheDocument();
    expect(screen.getByText("Anan Student")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /select a development requester/i })).not.toBeInTheDocument();
    expect(sessionStorage.getItem("toktickit.developmentRequesterId")).toBe("1");
  });

  it("shows a distinct no-active-Requester state for an empty successful response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([])));

    render(<App />);

    expect(await screen.findByText(/no active development requesters/i)).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /development requester/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /continue/i })).not.toBeInTheDocument();
  });

  it("shows safe failure wording and retries through the existing context", async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error("fetch https://user:password@example.test failed"))
      .mockResolvedValueOnce(jsonResponse(activeRequesters));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/unable to load development requesters/i);
    expect(screen.getByRole("alert")).not.toHaveTextContent(/password|https|example\.test/i);
    await user.click(screen.getByRole("button", { name: /retry/i }));
    expect(await screen.findByRole("combobox", { name: /development requester/i })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("clears malformed persisted context and returns to Requester Selection", async () => {
    sessionStorage.setItem("toktickit.developmentRequesterId", "01");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(activeRequesters));
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(await screen.findByRole("heading", { name: /select a development requester/i })).toBeInTheDocument();
    expect(sessionStorage.getItem("toktickit.developmentRequesterId")).toBeNull();
    expect(screen.queryByText(/current development requester/i)).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("clears an unknown or inactive persisted ID after active Requesters load", async () => {
    sessionStorage.setItem("toktickit.developmentRequesterId", "99");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(activeRequesters));
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(await screen.findByRole("heading", { name: /select a development requester/i })).toBeInTheDocument();
    expect(sessionStorage.getItem("toktickit.developmentRequesterId")).toBeNull();
    expect(screen.queryByText(/current development requester/i)).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("enters the shell directly when a valid active Requester is restored", async () => {
    sessionStorage.setItem("toktickit.developmentRequesterId", "2");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(activeRequesters)));

    render(<App />);

    expect(await screen.findByText(/current development requester/i)).toBeInTheDocument();
    expect(screen.getByText("Mali Student")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /select a development requester/i })).not.toBeInTheDocument();
  });
});
