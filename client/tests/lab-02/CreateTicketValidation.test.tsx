import { cleanup, fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App.js";

const activeRequesters = [
  { id: 1, name: "Anan Initial", email: "anan.initial@example.test" },
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

function stubFetch() {
  const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/api/development-requesters")) return Promise.resolve(jsonResponse(activeRequesters));
    if (url.includes("/api/categories")) return Promise.resolve(jsonResponse(activeCategories));
    if (url.includes("/api/related-systems")) return Promise.resolve(jsonResponse(activeSystems));
    if (url.includes("/api/tickets")) {
      return Promise.resolve({
        ok: true,
        status: 201,
        json: async () => ({
          ticket: {
            id: 1,
            ticketNumber: "TKT-20260823-ABCDEF",
            requester: { id: 1, name: "Anan Initial", email: "anan.initial@example.test" },
            category: { id: 2, name: "Hardware" },
            relatedSystem: { id: 3, name: "Library Portal" },
            summary: "",
            requestedPriority: "MEDIUM",
            currentStatus: "NEW",
            createdAt: "2026-08-23T09:30:00.000Z",
            updatedAt: "2026-08-23T09:30:00.000Z",
            description: "",
            attachments: [],
          },
          replayed: false,
        }),
      });
    }
    return Promise.reject(new Error("unexpected fetch"));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function submitButton() {
  const section = screen.getByRole("region", { name: /create ticket/i });
  return within(section).getByRole("button", { name: /^create ticket$/i });
}

async function enterShellAndFillValidForm() {
  stubFetch();
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
  return user;
}

describe("UI-04 Create Ticket Validation", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows required Category validation without calling the API", async () => {
    const fetchMock = stubFetch();
    const user = userEvent.setup();

    render(<App />);
    const select = await screen.findByRole("combobox", { name: /development requester/i });
    await user.selectOptions(select, "1");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByRole("option", { name: "Hardware" });

    // Fill everything except Category
    await user.selectOptions(screen.getByRole("combobox", { name: /related system \*/i }), "3");
    await user.type(screen.getByLabelText(/ticket summary \*/i), "Cannot access email");
    await user.selectOptions(screen.getByRole("combobox", { name: /requested priority \*/i }), "MEDIUM");
    await user.type(screen.getByLabelText(/description \*/i), "Access denied repeatedly.");

    let createTicketCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes("/api/tickets"));
    expect(createTicketCalls).toHaveLength(0);

    await user.click(submitButton());

    expect(screen.getByText(/category is required\./i)).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /category \*/i })).toHaveAttribute("aria-invalid", "true");
    createTicketCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes("/api/tickets"));
    expect(createTicketCalls).toHaveLength(0);
  });

  it("shows required Related System validation without calling the API", async () => {
    const fetchMock = stubFetch();
    const user = userEvent.setup();

    render(<App />);
    const select = await screen.findByRole("combobox", { name: /development requester/i });
    await user.selectOptions(select, "1");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByRole("option", { name: "Hardware" });

    await user.selectOptions(screen.getByRole("combobox", { name: /category \*/i }), "2");
    await user.type(screen.getByLabelText(/ticket summary \*/i), "Cannot access email");
    await user.selectOptions(screen.getByRole("combobox", { name: /requested priority \*/i}, ), "MEDIUM");
    await user.type(screen.getByLabelText(/description \*/i), "Access denied repeatedly.");

    let createTicketCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes("/api/tickets"));
    await user.click(submitButton());

    expect(screen.getByText(/related system is required\./i)).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /related system \*/i })).toHaveAttribute("aria-invalid", "true");
    createTicketCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes("/api/tickets"));
    expect(createTicketCalls).toHaveLength(0);
  });

  it.each([
    ["whitespace-only", "   ", /summary is required\./i],
    ["4 characters", "abc ", /summary must contain at least 5 characters/i],
  ])("rejects %s Summary", async (_name, value, error) => {
    await enterShellAndFillValidForm();
    const user = userEvent.setup();
    const summaryInput = screen.getByLabelText(/ticket summary \*/i);

    await user.clear(summaryInput);
    await user.type(summaryInput, value);

    await user.click(submitButton());
    expect(screen.getByText(error)).toBeInTheDocument();
    expect(summaryInput).toHaveAttribute("aria-invalid", "true");
  });

  it("accepts Summary at exact lower boundary of 5 trimmed chars", async () => {
    await enterShellAndFillValidForm();
    const user = userEvent.setup();
    const summaryInput = screen.getByLabelText(/ticket summary \*/i);

    await user.clear(summaryInput);
    await user.type(summaryInput, " abcde ");

    await user.click(submitButton());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("enforces maxLength=120 on Summary input", async () => {
    await enterShellAndFillValidForm();
    const summaryInput = screen.getByLabelText(/ticket summary \*/i) as HTMLInputElement;
    expect(summaryInput).toHaveAttribute("maxlength", "120");

    // Verify the browser truncates beyond 120 chars
    expect(summaryInput.maxLength).toBe(120);
  });

  it("rejects Summary above the 120-character maximum when a programmatic change delivers more than maxLength allows", async () => {
    await enterShellAndFillValidForm();
    const user = userEvent.setup();
    const summaryInput = screen.getByLabelText(/ticket summary \*/i) as HTMLInputElement;

    fireEvent.change(summaryInput, { target: { value: "a".repeat(121) } });

    await user.click(submitButton());
    expect(screen.getByText(/summary must contain at most 120 characters after trimming\./i)).toBeInTheDocument();
    expect(summaryInput).toHaveAttribute("aria-invalid", "true");
  });

  it.each([
    ["whitespace-only description", "   ", /description is required\./i],
    ["9-char description", "123456789", /description must contain at least 10/i],
  ])("rejects %s", async (_name, value, error) => {
    await enterShellAndFillValidForm();
    const user = userEvent.setup();
    const descTextarea = screen.getByLabelText(/description \*/i);

    await user.clear(descTextarea);
    await user.type(descTextarea, value);

    await user.click(submitButton());
    expect(screen.getByText(error)).toBeInTheDocument();
    expect(descTextarea).toHaveAttribute("aria-invalid", "true");
  });

  it("accepts Description at exact lower boundary of 10 trimmed chars", async () => {
    await enterShellAndFillValidForm();
    const user = userEvent.setup();
    const descTextarea = screen.getByLabelText(/description \*/i);

    await user.clear(descTextarea);
    await user.type(descTextarea, "   0123456789   ");

    await user.click(submitButton());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("enforces maxLength=2000 on Description textarea", async () => {
    await enterShellAndFillValidForm();
    const descTextarea = screen.getByLabelText(/description \*/i) as HTMLTextAreaElement;
    expect(descTextarea).toHaveAttribute("maxlength", "2000");
    expect(descTextarea.maxLength).toBe(2000);
  });

  it("rejects Description above the 2000-character maximum when a programmatic change delivers more than maxLength allows", async () => {
    await enterShellAndFillValidForm();
    const user = userEvent.setup();
    const descTextarea = screen.getByLabelText(/description \*/i) as HTMLTextAreaElement;

    fireEvent.change(descTextarea, { target: { value: "x".repeat(2001) } });

    await user.click(submitButton());
    expect(screen.getByText(/description must contain at most 2000 characters after trimming\./i)).toBeInTheDocument();
    expect(descTextarea).toHaveAttribute("aria-invalid", "true");
  });

  it("rejects missing Requested Priority without calling the API", async () => {
    const fetchMock = stubFetch();
    render(<App />);
    const user = userEvent.setup();
    const select = await screen.findByRole("combobox", { name: /development requester/i });
    await user.selectOptions(select, "1");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByRole("option", { name: "Hardware" });
    await screen.findByRole("option", { name: "Library Portal" });

    // Fill everything except Requested Priority
    await user.selectOptions(screen.getByRole("combobox", { name: /category \*/i }), "2");
    await user.selectOptions(screen.getByRole("combobox", { name: /related system \*/i }), "3");
    await user.type(screen.getByLabelText(/ticket summary \*/i), "Cannot access university email");
    await user.type(screen.getByLabelText(/description \*/i), "Sign-in repeatedly returns an access denied message.");

    let createTicketCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes("/api/tickets"));
    expect(createTicketCalls).toHaveLength(0);

    await user.click(submitButton());

    expect(screen.getByText(/please select a requested priority\./i)).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /requested priority \*/i })).toHaveAttribute("aria-invalid", "true");

    createTicketCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes("/api/tickets"));
    expect(createTicketCalls).toHaveLength(0);
  });

  it("moves focus to first invalid field when multiple fields are invalid", async () => {
    stubFetch();
    render(<App />);
    const user = userEvent.setup();
    const select = await screen.findByRole("combobox", { name: /development requester/i });
    await user.selectOptions(select, "1");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByRole("option", { name: "Hardware" });

    await user.click(submitButton());
    expect(document.activeElement).toBe(screen.getByRole("combobox", { name: /category \*/i }));
  });

  it("preserves entered values after validation failure", async () => {
    stubFetch();
    render(<App />);
    const user = userEvent.setup();
    const select = await screen.findByRole("combobox", { name: /development requester/i });
    await user.selectOptions(select, "1");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByRole("option", { name: "Hardware" });

    await user.selectOptions(screen.getByRole("combobox", { name: /category \*/i }), "2");
    const summaryInput = screen.getByLabelText(/ticket summary \*/i);
    await user.type(summaryInput, "Short");

    await user.click(submitButton());

    expect(summaryInput).toHaveValue("Short");
    expect(screen.getByRole("combobox", { name: /category \*/i })).toHaveValue("2");
  });
});
