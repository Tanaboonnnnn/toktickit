import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

function makeFile(name: string, sizeBytes: number, type: string): File {
  const content = new Uint8Array(Math.max(1, sizeBytes));
  return new File([content], name, { type });
}

function uploadFilesDirectly(input: HTMLInputElement, files: File[]) {
  const fileList = Object.assign(files, {
    length: files.length,
    item: (index: number) => files[index] ?? null,
  });
  Object.defineProperty(input, "files", { value: fileList, configurable: true });
  fireEvent.change(input);
}

function stubFetch(options?: { createFailure?: boolean }) {
  const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/api/development-requesters")) return Promise.resolve(jsonResponse(activeRequesters));
    if (url.includes("/api/categories")) return Promise.resolve(jsonResponse(activeCategories));
    if (url.includes("/api/related-systems")) return Promise.resolve(jsonResponse(activeSystems));
    if (url.includes("/api/tickets")) {
      return options?.createFailure
        ? Promise.resolve({ ok: false, status: 400, json: async () => ({ error: { code: "VALIDATION_ERROR", message: "Request validation failed" } }) })
        : Promise.resolve(ticketResponse());
    }
    return Promise.reject(new Error("unexpected fetch"));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
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

describe("Create Ticket Attachment pre-selection", () => {
  beforeEach(() => sessionStorage.clear());

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders the Attachment section stating allowed types, 5 MB limit, and five-file limit", async () => {
    await enterShellAndFillValidForm();

    const section = screen.getByText(/attachments/i, { selector: "legend" }).closest("fieldset")!;
    expect(within(section as HTMLElement).getByText(/jpg\/jpeg, png, webp, pdf/i)).toBeInTheDocument();
    expect(within(section as HTMLElement).getByText(/5,242,880 bytes|5 mb/i)).toBeInTheDocument();
    expect(within(section as HTMLElement).getByText(/maximum five/i)).toBeInTheDocument();
    expect(within(section as HTMLElement).getByLabelText(/select files/i)).toBeInTheDocument();
  });

  it("selects a valid PNG file showing filename, readable size/type, Selected state, and Remove action", async () => {
    await enterShellAndFillValidForm();
    const user = userEvent.setup();

    const input = screen.getByLabelText(/select files/i) as HTMLInputElement;
    const png = makeFile("screenshot.png", 2048, "image/png");
    await user.upload(input, png);

    const section = screen.getByText(/attachments/i, { selector: "legend" }).closest("fieldset")!;
    const item = within(section as HTMLElement).getByText("screenshot.png").closest("li")!;
    expect(item).toHaveTextContent("Selected");
    expect(item.textContent).toMatch(/image\/png/i);
    expect(item.textContent).toMatch(/\d+(\.\d+)?\s*(B|KB|MB)/i);
    expect(within(item as HTMLElement).getByRole("button", { name: /remove/i })).toBeInTheDocument();
  });

  it.each([
    ["unsupported extension", [makeFile("virus.exe", 100, "application/octet-stream")]],
    ["extension/MIME mismatch", [new File([new Uint8Array(100)], "photo.png", { type: "image/jpeg" })]],
    ["empty file", [new File([], "empty.pdf", { type: "application/pdf" })]],
    ["oversized file", [makeFile("huge.png", 5_242_881, "image/png")]],
  ])("rejects %s with clear feedback while keeping previously valid selections", async (_name, incoming) => {
    await enterShellAndFillValidForm();
    const user = userEvent.setup();
    const input = screen.getByLabelText(/select files/i);

    await user.upload(input, makeFile("good.png", 100, "image/png"));
    uploadFilesDirectly(input as HTMLInputElement, incoming);

    const section = screen.getByText(/attachments/i, { selector: "legend" }).closest("fieldset")!;

    // Valid file retained
    expect(within(section as HTMLElement).getByText("good.png")).toBeInTheDocument();

    // Invalid feedback present; valid file not removed
    const alerts = within(section as HTMLElement).queryAllByRole("alert");
    expect(alerts.length).toBeGreaterThan(0);
  });

  it("accepts a file at exactly 5,242,880 bytes inclusive boundary", async () => {
    await enterShellAndFillValidForm();
    const user = userEvent.setup();
    const input = screen.getByLabelText(/select files/i);

    const exact = makeFile("boundary.pdf", 5_242_880, "application/pdf");
    await user.upload(input, exact);

    const section = screen.getByText(/attachments/i, { selector: "legend" }).closest("fieldset")!;
    expect(within(section as HTMLElement).getByText("boundary.pdf")).toBeInTheDocument();
    expect(within(section as HTMLElement).queryAllByRole("alert")).toHaveLength(0);
  });

  it("enforces maximum five selected files keeping first five valid", async () => {
    await enterShellAndFillValidForm();
    const user = userEvent.setup();
    const input = screen.getByLabelText(/select files/i);

    for (let i = 1; i <= 6; i += 1) {
      await user.upload(input, makeFile(`file-${i}.png`, 10, "image/png"));
    }

    const section = screen.getByText(/attachments/i, { selector: "legend" }).closest("fieldset")!;
    expect(within(section as HTMLElement).getByText("file-5.png")).toBeInTheDocument();
    expect(within(section as HTMLElement).getByText("file-6.png")).toBeInTheDocument(); // shown with error

    const alerts = within(section as HTMLElement).getAllByRole("alert");
    expect(alerts.some((a) => /maximum five/i.test(a.textContent ?? ""))).toBe(true);

    // Only five Selected badges among valid entries
    const selectedBadges = within(section as HTMLElement).getAllByText("Selected");
    expect(selectedBadges.length).toBe(5);
  });

  it("removes a selected file from local selection", async () => {
    await enterShellAndFillValidForm();
    const user = userEvent.setup();
    const input = screen.getByLabelText(/select files/i);

    await user.upload(input, makeFile("to-remove.png", 50, "image/png"));
    const section = screen.getByText(/attachments/i, { selector: "legend" }).closest("fieldset")!;
    await user.click(within(section as HTMLElement).getByRole("button", { name: /remove/i }));

    expect(within(section as HTMLElement).queryByText("to-remove.png")).not.toBeInTheDocument();
  });

  it("removes an invalid file from local selection", async () => {
    await enterShellAndFillValidForm();
    const user = userEvent.setup();
    const input = screen.getByLabelText(/select files/i) as HTMLInputElement;

    uploadFilesDirectly(input, [makeFile("invalid.exe", 100, "application/octet-stream")]);
    const section = screen.getByText(/attachments/i, { selector: "legend" }).closest("fieldset")!;
    const item = within(section as HTMLElement).getByText("invalid.exe").closest("li")!;
    expect(within(item as HTMLElement).getByRole("alert")).toBeInTheDocument();
    await user.click(within(item as HTMLElement).getByRole("button", { name: /remove/i }));
    expect(within(section as HTMLElement).queryByText("invalid.exe")).not.toBeInTheDocument();
  });

  it("retains eligible selected files after definitive Ticket-create failure", async () => {
    stubFetch({ createFailure: true });
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

    const input = screen.getByLabelText(/select files/i);
    await user.upload(input, makeFile("keep-me.png", 300, "image/png"));

    const submitButton = screen
      .getByText(/create ticket/i, { selector: "#create-ticket-heading" })
      .closest("section")!
      .querySelector<HTMLButtonElement>('button[type="submit"]')!;
    await user.click(submitButton);

    expect(await screen.findByText(/request validation failed/i)).toBeInTheDocument();

    const section = screen.getByText(/attachments/i, { selector: "legend" }).closest("fieldset")!;
    expect(within(section as HTMLElement).getByText("keep-me.png")).toBeInTheDocument();
    expect(within(section as HTMLElement).getByText("Selected")).toBeInTheDocument();
  });

  it("does not send any upload request when submitting the Ticket", async () => {
    const fetchMock = stubFetch();
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

    const input = screen.getByLabelText(/select files/i);
    await user.upload(input, makeFile("no-upload.png", 500, "image/png"));

    const submitButton = screen
      .getByText(/create ticket/i, { selector: "#create-ticket-heading" })
      .closest("section")!
      .querySelector<HTMLButtonElement>('button[type="submit"]')!;
    await user.click(submitButton);

    expect(await screen.findByText(/your ticket has been created/i)).toBeInTheDocument();
    const calls = fetchMock.mock.calls.map(([u]) => String(u));
    expect(calls.filter((c) => c.includes("/api/tickets/") && c.includes("attachments"))).toHaveLength(0);
  });
});
