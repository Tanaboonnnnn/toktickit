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

let uuidCounter = 0;
function mockCryptoRandomUUID() {
  const original = crypto.randomUUID;
  crypto.randomUUID = vi.fn((): `${string}-${string}-${string}-${string}-${string}` => {
    uuidCounter += 1;
    return `00000000-0000-4000-8000-${String(uuidCounter).padStart(12, "0")}`;
  });
  return () => {
    crypto.randomUUID = original;
    uuidCounter = 0;
  };
}

function ticketResponse(ticketNumber = "TKT-20260823-ABCDEF", replayed = false) {
  return {
    ok: true,
    status: replayed ? 200 : 201,
    json: async () => ({
      ticket: {
        id: 42,
        ticketNumber,
        requester: { id: 1, name: "Anan Student", email: "anan.student@example.test" },
        category: { id: 2, name: "Hardware" },
        relatedSystem: { id: 3, name: "Library Portal" },
        summary: "Cannot access university email",
        requestedPriority: "MEDIUM",
        currentStatus: "NEW",
        createdAt: "2026-08-23T09:30:00.000Z",
        updatedAt: "2026-08-23T09:30:00.000Z",
        description: "Sign-in repeatedly returns an access denied message.",
        attachments: [],
      },
      replayed,
    }),
  };
}

function jsonResponse(body: unknown) {
  return { ok: true, json: async () => body };
}

function submitButton() {
  const section = screen.getByRole("region", { name: /create ticket/i });
  return within(section).getByRole("button", { name: /create ticket|creating ticket/i });
}

async function enterShellAndFillValidForm() {
  const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/api/development-requesters")) return Promise.resolve(jsonResponse(activeRequesters));
    if (url.includes("/api/categories")) return Promise.resolve(jsonResponse(activeCategories));
    if (url.includes("/api/related-systems")) return Promise.resolve(jsonResponse(activeSystems));
    if (url.includes("/api/tickets")) return Promise.resolve(ticketResponse());
    return Promise.reject(new Error("unexpected fetch"));
  });
  vi.stubGlobal("fetch", fetchMock);

  render(<App />);
  const user = userEvent.setup();
  const select = await screen.findByRole("combobox", { name: /development requester/i });
  await user.selectOptions(select, "1");
  await user.click(screen.getByRole("button", { name: /continue/i }));
  await screen.findByRole("option", { name: "Hardware" });
  await screen.findByRole("option", { name: "Library Portal" });
  await user.selectOptions(screen.getByRole("combobox", { name: /category \*/i }), "2");
  await user.selectOptions(screen.getByRole("combobox", { name: /related system \*/i }), "3");
  await user.type(screen.getByLabelText(/ticket summary \*/i), "Cannot access university email");
  await user.selectOptions(screen.getByRole("combobox", { name: /requested priority \*/i }), "MEDIUM");
  await user.type(screen.getByLabelText(/description \*/i), "Sign-in repeatedly returns an access denied message.");
  return { user, fetchMock };
}

describe("UI-05 Create Ticket Submission", () => {
  let restoreUuid: (() => void) | null = null;

  beforeEach(() => {
    sessionStorage.clear();
    restoreUuid = mockCryptoRandomUUID();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    restoreUuid?.();
  });

  it("sends correct headers and body for first-create success", async () => {
    const { user, fetchMock } = await enterShellAndFillValidForm();

    // Overwrite with padded values to prove trim-on-submission
    const summaryInput = screen.getByLabelText(/ticket summary \*/i);
    await user.clear(summaryInput);
    await user.type(summaryInput, "  Cannot access university email  ");
    const descriptionInput = screen.getByLabelText(/description \*/i);
    await user.clear(descriptionInput);
    await user.type(descriptionInput, "   Sign-in repeatedly returns an access denied message.   ");

    await user.click(submitButton());

    expect(await screen.findByText(/your ticket has been created/i)).toBeInTheDocument();
    expect(screen.getByTestId("ticket-number")).toHaveTextContent("TKT-20260823-ABCDEF");

    const createCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).includes("/api/tickets") && String(url).includes("tickets"),
    );
    expect(createCalls).toHaveLength(1);
    const [url, init] = createCalls[0] as [string, RequestInit];
    expect(url).toContain("/api/tickets");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      "Content-Type": "application/json",
      "X-Development-Requester-Id": "1",
    });
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      clientRequestId: "00000000-0000-4000-8000-000000000001",
      categoryId: 2,
      relatedSystemId: 3,
      // trimmed values, proving the client trims before sending
      summary: "Cannot access university email",
      requestedPriority: "MEDIUM",
      description: "Sign-in repeatedly returns an access denied message.",
    });
    // authoritative fields excluded
    expect(body.requesterId).toBeUndefined();
    expect(body.ticketNumber).toBeUndefined();
    expect(body.currentStatus).toBeUndefined();
    expect(body.createdAt).toBeUndefined();
    expect(body.updatedAt).toBeUndefined();
  }, 10_000);

  it("shows a clear next action after successful Ticket creation", async () => {
    const { user } = await enterShellAndFillValidForm();

    await user.click(submitButton());

    expect(await screen.findByText(/your ticket has been created/i)).toBeInTheDocument();
    const nextAction = screen.getByRole("button", { name: /create another ticket/i });
    expect(nextAction).toBeInTheDocument();

    await user.click(nextAction);

    expect(screen.queryByText(/your ticket has been created/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/ticket summary \*/i)).toHaveValue("");
    expect(screen.getByLabelText(/description \*/i)).toHaveValue("");
    expect(screen.getByRole("combobox", { name: /category \*/i })).toHaveValue("");
    expect(screen.getByRole("combobox", { name: /related system \*/i })).toHaveValue("");
  });

  it("shows busy state and prevents duplicate click during submission", async () => {
    let resolveCreate!: (value: unknown) => void;
    const pendingCreate = new Promise((resolve) => { resolveCreate = resolve; });
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/development-requesters")) return Promise.resolve(jsonResponse(activeRequesters));
      if (url.includes("/api/categories")) return Promise.resolve(jsonResponse(activeCategories));
      if (url.includes("/api/related-systems")) return Promise.resolve(jsonResponse(activeSystems));
      if (url.includes("/api/tickets")) return pendingCreate;
      return Promise.reject(new Error("unexpected fetch"));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    const user = userEvent.setup();
    const select = await screen.findByRole("combobox", { name: /development requester/i });
    await user.selectOptions(select, "1");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByRole("option", { name: "Hardware" });
    await screen.findByRole("option", { name: "Library Portal" });
    await user.selectOptions(screen.getByRole("combobox", { name: /category \*/i }), "2");
    await user.selectOptions(screen.getByRole("combobox", { name: /related system \*/i }), "3");
    await user.type(screen.getByLabelText(/ticket summary \*/i), "Cannot access university email");
    await user.selectOptions(screen.getByRole("combobox", { name: /requested priority \*/i }), "MEDIUM");
    await user.type(screen.getByLabelText(/description \*/i), "Sign-in repeatedly returns an access denied message.");

    await user.click(submitButton());

    // While busy the button reads Creating ticket... and is disabled
    expect(await screen.findByText(/creating ticket\.\.\./i)).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();

    resolveCreate(ticketResponse());
    expect(await screen.findByText(/your ticket has been created/i)).toBeInTheDocument();
  });

  it("handles 200 replay success as success with official ticket number", async () => {
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/development-requesters")) return Promise.resolve(jsonResponse(activeRequesters));
      if (url.includes("/api/categories")) return Promise.resolve(jsonResponse(activeCategories));
      if (url.includes("/api/related-systems")) return Promise.resolve(jsonResponse(activeSystems));
      if (url.includes("/api/tickets")) {
        callCount += 1;
        return callCount === 1
          ? Promise.reject(new Error("Network error"))
          : Promise.resolve(ticketResponse("TKT-20260823-XYZW12", true));
      }
      return Promise.reject(new Error("unexpected fetch"));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    const user = userEvent.setup();
    const select = await screen.findByRole("combobox", { name: /development requester/i });
    await user.selectOptions(select, "1");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByRole("option", { name: "Hardware" });
    await screen.findByRole("option", { name: "Library Portal" });
    await user.selectOptions(screen.getByRole("combobox", { name: /category \*/i }), "2");
    await user.selectOptions(screen.getByRole("combobox", { name: /related system \*/i }), "3");
    await user.type(screen.getByLabelText(/ticket summary \*/i), "Cannot access university email");
    await user.selectOptions(screen.getByRole("combobox", { name: /requested priority \*/i }), "MEDIUM");
    await user.type(screen.getByLabelText(/description \*/i), "Sign-in repeatedly returns an access denied message.");

    // First attempt - ambiguous network failure
    await user.click(submitButton());
    expect(await screen.findByText(/result is uncertain/i)).toBeInTheDocument();

    // Retry same submission
    await user.click(screen.getByRole("button", { name: /retry same submission/i }));

    expect(await screen.findByText(/already exists and has been shown again/i)).toBeInTheDocument();
    expect(screen.getByTestId("ticket-number")).toHaveTextContent("TKT-20260823-XYZW12");

    // Verify both calls used the same clientRequestId and payload
    const createCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes("/api/tickets") && !String(url).includes("categories") && !String(url).includes("related-systems") && !String(url).includes("development-requesters"));
    expect(createCalls.length).toBe(2);
    const [firstUrl, firstInit] = createCalls[0] as [string, RequestInit];
    const [secondUrl, secondInit] = createCalls[1] as [string, RequestInit];
    expect(firstInit.body).toBe(secondInit.body);
    expect(JSON.parse(secondInit.body as string).clientRequestId).toBe("00000000-0000-4000-8000-000000000001");
  });

  it("preserves form values after definitive HTTP failure", async () => {
    let failCreate = true;
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/development-requesters")) return Promise.resolve(jsonResponse(activeRequesters));
      if (url.includes("/api/categories")) return Promise.resolve(jsonResponse(activeCategories));
      if (url.includes("/api/related-systems")) return Promise.resolve(jsonResponse(activeSystems));
      if (url.includes("/api/tickets")) {
        return failCreate
          ? Promise.resolve({ ok: false, status: 400, json: async () => ({ error: { code: "VALIDATION_ERROR", message: "Request validation failed", fieldErrors: {} } }) })
          : Promise.resolve(ticketResponse());
      }
      return Promise.reject(new Error("unexpected fetch"));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    const user = userEvent.setup();
    const select = await screen.findByRole("combobox", { name: /development requester/i });
    await user.selectOptions(select, "1");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByRole("option", { name: "Hardware" });
    await screen.findByRole("option", { name: "Library Portal" });
    await user.selectOptions(screen.getByRole("combobox", { name: /category \*/i }), "2");
    await user.selectOptions(screen.getByRole("combobox", { name: /related system \*/i }), "3");
    await user.type(screen.getByLabelText(/ticket summary \*/i), "Cannot access university email");
    await user.selectOptions(screen.getByRole("combobox", { name: /requested priority \*/i }), "MEDIUM");
    await user.type(screen.getByLabelText(/description \*/i), "Sign-in repeatedly returns an access denied message.");

    await user.click(submitButton());
    expect(await screen.findByText(/request validation failed/i)).toBeInTheDocument();

    // Form values are preserved after failure
    expect(screen.getByLabelText(/ticket summary \*/i)).toHaveValue("Cannot access university email");
    expect(screen.getByRole("combobox", { name: /category \*/i })).toHaveValue("2");
    expect(screen.getByLabelText(/description \*/i)).toHaveValue("Sign-in repeatedly returns an access denied message.");
  });

  it("uses a new clientRequestId when data changes after definitive no-create failure", async () => {
    let failCreate = true;
    const bodies: string[] = [];
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/development-requesters")) return Promise.resolve(jsonResponse(activeRequesters));
      if (url.includes("/api/categories")) return Promise.resolve(jsonResponse(activeCategories));
      if (url.includes("/api/related-systems")) return Promise.resolve(jsonResponse(activeSystems));
      if (url.includes("/api/tickets")) {
        bodies.push(String(init?.body ?? ""));
        return failCreate
          ? Promise.resolve({ ok: false, status: 400, json: async () => ({ error: { code: "VALIDATION_ERROR", message: "Request validation failed" } }) })
          : Promise.resolve(ticketResponse());
      }
      return Promise.reject(new Error("unexpected fetch"));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    const user = userEvent.setup();
    const select = await screen.findByRole("combobox", { name: /development requester/i });
    await user.selectOptions(select, "1");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByRole("option", { name: "Hardware" });
    await screen.findByRole("option", { name: "Library Portal" });
    await user.selectOptions(screen.getByRole("combobox", { name: /category \*/i }), "2");
    await user.selectOptions(screen.getByRole("combobox", { name: /related system \*/i }), "3");
    await user.type(screen.getByLabelText(/ticket summary \*/i), "Cannot access university email");
    await user.selectOptions(screen.getByRole("combobox", { name: /requested priority \*/i }), "MEDIUM");
    await user.type(screen.getByLabelText(/description \*/i), "Sign-in repeatedly returns an access denied message.");

    // First attempt fails definitively (400)
    await user.click(submitButton());
    await screen.findByText(/request validation failed/i);

    // Edit the summary (definitive no-create failure allows editing)
    failCreate = false;
    const summaryInput = screen.getByLabelText(/ticket summary \*/i);
    await user.clear(summaryInput);
    await user.type(summaryInput, "Updated summary after failure");

    await user.click(submitButton());

    expect(await screen.findByText(/your ticket has been created/i)).toBeInTheDocument();

    // The first POST used the first logical request; the second POST must use a new one.
    expect(bodies[0]).toBeDefined();
    const firstBody = JSON.parse(bodies[0]);
    expect(firstBody.clientRequestId).toBe("00000000-0000-4000-8000-000000000001");

    expect(bodies[1]).toBeDefined();
    const bodyObj = JSON.parse(bodies[1]);
    expect(bodyObj.clientRequestId).toBe("00000000-0000-4000-8000-000000000002");
    expect(bodyObj.summary).toBe("Updated summary after failure");
  });

  it("keeps same clientRequestId on ambiguous retry without creating a new logical request", async () => {
    let ambiguousCount = 0;
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/development-requesters")) return Promise.resolve(jsonResponse(activeRequesters));
      if (url.includes("/api/categories")) return Promise.resolve(jsonResponse(activeCategories));
      if (url.includes("/api/related-systems")) return Promise.resolve(jsonResponse(activeSystems));
      if (url.includes("/api/tickets")) {
        ambiguousCount += 1;
        if (ambiguousCount === 1) return Promise.reject(new TypeError("Failed to fetch"));
        return Promise.resolve(ticketResponse("TKT-20260823-SAME01", true));
      }
      return Promise.reject(new Error("unexpected fetch"));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    const user = userEvent.setup();
    const select = await screen.findByRole("combobox", { name: /development requester/i });
    await user.selectOptions(select, "1");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByRole("option", { name: "Hardware" });
    await screen.findByRole("option", { name: "Library Portal" });
    await user.selectOptions(screen.getByRole("combobox", { name: /category \*/i }), "2");
    await user.selectOptions(screen.getByRole("combobox", { name: /related system \*/i }), "3");
    await user.type(screen.getByLabelText(/ticket summary \*/i), "Ambiguous test summary");
    await user.selectOptions(screen.getByRole("combobox", { name: /requested priority \*/i}), "HIGH");
    await user.type(screen.getByLabelText(/description \*/i), "Testing ambiguous network retry behavior.");

    await user.click(submitButton());
    expect(await screen.findByText(/result is uncertain/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /retry same submission/i }));

    expect(await screen.findByText(/already exists and has been shown again/i)).toBeInTheDocument();
    expect(screen.getByTestId("ticket-number")).toHaveTextContent("TKT-20260823-SAME01");

    const createBodies = fetchMock.mock.calls
      .filter(([url]) => String(url).endsWith("/api/tickets"))
      .map(([, init]) => JSON.parse((init as RequestInit).body as string));
    expect(createBodies.length).toBe(2);
    expect(createBodies[0].clientRequestId).toBe(createBodies[1].clientRequestId);
    expect(createBodies[0].summary).toBe("Ambiguous test summary");
    expect(createBodies[1].summary).toBe("Ambiguous test summary");
  });

  it("freezes Ticket fields while the ambiguous outcome remains unresolved", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/development-requesters")) return Promise.resolve(jsonResponse(activeRequesters));
      if (url.includes("/api/categories")) return Promise.resolve(jsonResponse(activeCategories));
      if (url.includes("/api/related-systems")) return Promise.resolve(jsonResponse(activeSystems));
      if (url.includes("/api/tickets")) return Promise.reject(new TypeError("Failed to fetch"));
      return Promise.reject(new Error("unexpected fetch"));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    const user = userEvent.setup();
    const select = await screen.findByRole("combobox", { name: /development requester/i });
    await user.selectOptions(select, "1");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByRole("option", { name: "Hardware" });
    await screen.findByRole("option", { name: "Library Portal" });
    await user.selectOptions(screen.getByRole("combobox", { name: /category \*/i }), "2");
    await user.selectOptions(screen.getByRole("combobox", { name: /related system \*/i }), "3");
    await user.type(screen.getByLabelText(/ticket summary \*/i), "Frozen while ambiguous test");
    await user.selectOptions(screen.getByRole("combobox", { name: /requested priority \*/i }), "HIGH");
    await user.type(screen.getByLabelText(/description \*/i), "Verifying that fields freeze during ambiguous outcome.");

    await user.click(submitButton());
    expect(await screen.findByText(/result is uncertain/i)).toBeInTheDocument();

    // Every editable control inside the two fieldsets must be disabled
    const identityFieldset = screen.getByRole("group", { name: /ticket identity/i });
    const detailsFieldset = screen.getByRole("group", { name: /ticket details/i });
    expect(identityFieldset).toBeDisabled();
    expect(detailsFieldset).toBeDisabled();

    // Retry button remains available for same-submission retry
    expect(screen.getByRole("button", { name: /retry same submission/i })).toBeEnabled();
  });

  it("treats an HTTP 500 as definitive no-create failure and retries the same logical request", async () => {
    const { user, fetchMock } = await enterShellAndFillValidForm();
    fetchMock.mockClear();
    let createAttempt = 0;
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (!url.endsWith("/api/tickets")) return Promise.reject(new Error("unexpected fetch"));
      createAttempt += 1;
      return createAttempt === 1
        ? Promise.resolve({ ok: false, status: 500, json: async () => ({ error: { code: "INTERNAL_ERROR", message: "Unable to create ticket" } }) })
        : Promise.resolve(ticketResponse("TKT-20260823-RETRY1", false));
    });

    await user.click(submitButton());
    expect(await screen.findByText(/unable to create ticket/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ticket summary \*/i)).toBeEnabled();

    await user.click(screen.getByRole("button", { name: /^retry$/i }));
    expect(await screen.findByText(/your ticket has been created/i)).toBeInTheDocument();

    const bodies = fetchMock.mock.calls
      .filter(([url]) => String(url).endsWith("/api/tickets"))
      .map(([, init]) => JSON.parse((init as RequestInit).body as string));
    expect(bodies).toHaveLength(2);
    expect(bodies[0].clientRequestId).toBe(bodies[1].clientRequestId);
  });

  it("offers View Ticket and My Tickets actions after successful creation", async () => {
    const { user } = await enterShellAndFillValidForm();
    await user.click(submitButton());
    expect(await screen.findByText(/your ticket has been created/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create another Ticket" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View Ticket" })).toBeInTheDocument();
    const success = screen.getByRole("status");
    expect(within(success).getByRole("button", { name: "My Tickets" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "View Ticket" }));
    expect(await screen.findByRole("heading", { name: /ticket detail/i })).toBeInTheDocument();
    expect(screen.getByText("TKT-20260823-ABCDEF")).toBeInTheDocument();
  });

});
