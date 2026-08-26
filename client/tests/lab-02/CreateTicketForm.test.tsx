import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App.js";

const activeRequesters = [
  { id: 1, name: "Anan Student", email: "anan.student@example.test" },
];

const activeCategories = [
  { id: 1, name: "Account and Access" },
  { id: 2, name: "Hardware" },
];

const activeSystems = [
  { id: 1, name: "University Email" },
  { id: 3, name: "Library Portal" },
];

function jsonResponse(body: unknown) {
  return { ok: true, json: async () => body };
}

function stubFetchSequence(requesters: unknown, categories: unknown, systems: unknown) {
  const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/api/development-requesters")) return Promise.resolve(jsonResponse(requesters));
    if (url.includes("/api/categories")) return Promise.resolve(jsonResponse(categories));
    if (url.includes("/api/related-systems")) return Promise.resolve(jsonResponse(systems));
    return Promise.reject(new Error("unexpected fetch"));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function submitButton() {
  const section = screen.getByRole("region", { name: /create ticket/i });
  return within(section).getByRole("button", { name: /^create ticket$/i });
}

async function enterShell() {
  const user = userEvent.setup();
  const select = await screen.findByRole("combobox", { name: /development requester/i });
  await user.selectOptions(select, "1");
  await user.click(screen.getByRole("button", { name: /continue/i }));
  return user;
}

describe("UI-03 Create Ticket Form", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders required and read-only fields after selecting a Requester", async () => {
    stubFetchSequence(activeRequesters, activeCategories, activeSystems);

    render(<App />);
    await enterShell();

    expect(await screen.findByRole("heading", { name: /create ticket/i })).toBeInTheDocument();
    expect(screen.getByText(/generated after creation/i)).toBeInTheDocument();
    expect(screen.getByText(/set after creation/i)).toBeInTheDocument();
    expect(screen.getAllByText("Anan Student").length).toBeGreaterThan(0);
    expect(screen.getByRole("combobox", { name: /category \*/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /related system \*/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/ticket summary \*/i)).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /requested priority \*/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/description \*/i)).toBeInTheDocument();
  });

  it("loads Category and Related System options from the API without hard-coding values", async () => {
    const customCategories = [{ id: 7, name: "Custom Category" }];
    const customSystems = [{ id: 9, name: "Custom System" }];
    stubFetchSequence(activeRequesters, customCategories, customSystems);

    render(<App />);
    await enterShell();

    expect(await screen.findByRole("option", { name: "Custom Category" })).toBeInTheDocument();
    expect(await screen.findByRole("option", { name: "Custom System" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Account and Access" })).not.toBeInTheDocument();
  });

  it("shows reference-data loading state and blocks submission while unresolved", async () => {
    let resolveCategories!: (value: unknown) => void;
    const pendingCategories = new Promise((resolve) => { resolveCategories = resolve; });
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/development-requesters")) return Promise.resolve(jsonResponse(activeRequesters));
      if (url.includes("/api/categories")) return pendingCategories.then((value) => jsonResponse(value));
      if (url.includes("/api/related-systems")) return Promise.resolve(jsonResponse(activeSystems));
      return Promise.reject(new Error("unexpected fetch"));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    await enterShell();

    await waitFor(() => {
      expect(screen.getByText(/loading categories/i)).toBeInTheDocument();
    });
    expect(submitButton()).toBeDisabled();

    resolveCategories(activeCategories);
    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Hardware" })).toBeInTheDocument();
    });
    expect(submitButton()).toBeEnabled();
  });

  it("shows Category successful empty state with submission blocked", async () => {
    stubFetchSequence(activeRequesters, [], activeSystems);

    render(<App />);
    await enterShell();

    expect(await screen.findByText(/no active categories available/i)).toBeInTheDocument();
    expect(screen.getByText(/ticket creation is currently unavailable/i)).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();
  });

  it("shows Related System successful empty state with submission blocked", async () => {
    stubFetchSequence(activeRequesters, activeCategories, []);

    render(<App />);
    await enterShell();

    expect(await screen.findByText(/no active related systems available/i)).toBeInTheDocument();
    expect(screen.getByText(/ticket creation is currently unavailable/i)).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();
  });

  it("shows safe independent Category failure with Retry preserving entered text", async () => {
    let failCategories = true;
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/development-requesters")) return Promise.resolve(jsonResponse(activeRequesters));
      if (url.includes("/api/categories"))
        return failCategories
          ? Promise.resolve({ ok: false, status: 500, json: async () => ({ error: { code: "INTERNAL_ERROR", message: "Unable to load categories" } }) })
          : Promise.resolve(jsonResponse(activeCategories));
      if (url.includes("/api/related-systems")) return Promise.resolve(jsonResponse(activeSystems));
      return Promise.reject(new Error("unexpected fetch"));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    const user = await enterShell();

    expect(await screen.findByText(/unable to load categories\. please try again\./i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry categories/i })).toBeInTheDocument();

    // Enter some data before retrying to verify preservation
    await user.type(screen.getByLabelText(/ticket summary \*/i), "Test Summary");

    failCategories = false;
    await user.click(screen.getByRole("button", { name: /retry categories/i }));

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Hardware" })).toBeInTheDocument();
    });
    expect(screen.queryByText(/unable to load categories/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/ticket summary \*/i)).toHaveValue("Test Summary");
  });

  it("shows safe independent Related System failure with Retry preserving entered text", async () => {
    let failSystems = true;
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/development-requesters")) return Promise.resolve(jsonResponse(activeRequesters));
      if (url.includes("/api/categories")) return Promise.resolve(jsonResponse(activeCategories));
      if (url.includes("/api/related-systems"))
        return failSystems
          ? Promise.resolve({ ok: false, status: 500, json: async () => ({ error: { code: "INTERNAL_ERROR", message: "Unable to load related systems" } }) })
          : Promise.resolve(jsonResponse(activeSystems));
      return Promise.reject(new Error("unexpected fetch"));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    const user = await enterShell();

    expect(await screen.findByText(/unable to load related systems\. please try again\./i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry related systems/i })).toBeInTheDocument();

    // Enter description before retry to verify preservation
    await user.type(screen.getByLabelText(/description \*/i), "Some test description.");

    failSystems = false;
    await user.click(screen.getByRole("button", { name: /retry related systems/i }));

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Library Portal" })).toBeInTheDocument();
    });
    expect(screen.queryByText(/unable to load related systems/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/description \*/i)).toHaveValue("Some test description.");
  });

  it("preserves successful reference list when only one resource fails", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/development-requesters")) return Promise.resolve(jsonResponse(activeRequesters));
      if (url.includes("/api/categories"))
        return Promise.resolve({ ok: false, status: 500, json: async () => ({ error: { code: "INTERNAL_ERROR", message: "Unable to load categories" } }) });
      if (url.includes("/api/related-systems")) return Promise.resolve(jsonResponse(activeSystems));
      return Promise.reject(new Error("unexpected fetch"));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    await enterShell();

    expect(await screen.findByText(/unable to load categories\. please try again\./i)).toBeInTheDocument();
    // Successful Related System data retained even though Categories failed
    expect(screen.getByRole("option", { name: "Library Portal" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "University Email" })).toBeInTheDocument();

    // Submission blocked because not both lists are ready
    expect(submitButton()).toBeDisabled();
  });

  it("keeps submission blocked when either required list is empty or failed", async () => {
    stubFetchSequence(activeRequesters, [], []);

    render(<App />);
    await enterShell();

    expect(await screen.findByText(/no active categories available/i)).toBeInTheDocument();
    expect(await screen.findByText(/no active related systems available/i)).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();
  });
});
