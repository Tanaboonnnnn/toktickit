import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App.js";
import TicketDetail from "../../src/TicketDetail.js";
import { RequesterContextProvider } from "../../src/requester-context.js";

const requester = { id: 1, name: "A11y Requester", email: "a11y@example.test" };
const category = { id: 1, name: "Hardware" };
const relatedSystem = { id: 1, name: "University Email" };
const listTicket = {
  id: 42,
  ticketNumber: "TKT-20260829-A11Y01",
  category,
  relatedSystem,
  summary: "A readable ticket summary",
  requestedPriority: "HIGH" as const,
  currentStatus: "NEW" as const,
  createdAt: "2026-08-29T00:00:00.000Z",
  updatedAt: "2026-08-29T00:00:00.000Z",
};
const detailTicket = {
  ...listTicket,
  requester,
  description: "A sufficiently detailed description for accessibility checks.",
  attachments: [
    {
      id: 1,
      ticketId: 42,
      originalName: "active-evidence.png",
      mimeType: "image/png",
      sizeBytes: 8,
      state: "ACTIVE" as const,
      createdAt: "2026-08-29T00:00:00.000Z",
      removedAt: null,
      removalReason: null,
      downloadUrl: "/download",
    },
    {
      id: 2,
      ticketId: 42,
      originalName: "removed-evidence.pdf",
      mimeType: "application/pdf",
      sizeBytes: 8,
      state: "REMOVED" as const,
      createdAt: "2026-08-29T00:01:00.000Z",
      removedAt: "2026-08-29T00:02:00.000Z",
      removalReason: "Superseded file",
      downloadUrl: null,
    },
  ],
};

function json(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body, blob: async () => new Blob(["bytes"]) };
}

function appFetch() {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("development-requesters")) return Promise.resolve(json([requester]));
    if (url.includes("categories")) return Promise.resolve(json([category]));
    if (url.includes("related-systems")) return Promise.resolve(json([relatedSystem]));
    if (url.endsWith("/api/tickets/42")) return Promise.resolve(json({ ticket: detailTicket }));
    return Promise.resolve(json({ items: [listTicket], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("UI-10 accessibility contract", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("gives core Create Ticket controls visible names, required semantics, and associated validation", async () => {
    appFetch();
    sessionStorage.setItem("toktickit.developmentRequesterId", "1");
    render(<App />);
    const categorySelect = await screen.findByRole("combobox", { name: "Category *" });
    const relatedSelect = screen.getByRole("combobox", { name: "Related System *" });
    const summary = screen.getByRole("textbox", { name: "Ticket Summary *" });
    const priority = screen.getByRole("combobox", { name: "Requested Priority *" });
    const description = screen.getByRole("textbox", { name: "Description *" });

    expect(categorySelect).toBeRequired();
    expect(relatedSelect).toBeRequired();
    expect(summary).toBeRequired();
    expect(priority).toBeRequired();
    expect(description).toBeRequired();

    const form = within(screen.getByRole("region", { name: /create ticket/i }));
    await userEvent.setup().click(form.getByRole("button", { name: "Create Ticket" }));
    expect(categorySelect).toHaveAttribute("aria-invalid", "true");
    expect(categorySelect).toHaveAttribute("aria-describedby", "ticket-category-error");
    expect(document.activeElement).toBe(categorySelect);
    expect(screen.getByText("Category is required.")).toHaveAttribute("role", "alert");
  });

  it("supports keyboard activation while retaining native disabled semantics", async () => {
    appFetch();
    render(<App />);
    const user = userEvent.setup();
    const requesterSelect = await screen.findByRole("combobox", { name: "Development Requester" });
    const continueButton = screen.getByRole("button", { name: "Continue" });
    expect(continueButton).toBeDisabled();
    await user.selectOptions(requesterSelect, "1");
    expect(continueButton).toBeEnabled();
    continueButton.focus();
    await user.keyboard("[Enter]");
    expect(await screen.findByRole("heading", { name: "Create Ticket" })).toBeInTheDocument();
  });

  it("names list actions and communicates loading/busy/pagination state", async () => {
    appFetch();
    sessionStorage.setItem("toktickit.developmentRequesterId", "1");
    render(<App />);
    await userEvent.setup().click(await screen.findByRole("button", { name: "My Tickets" }));
    expect(await screen.findByRole("heading", { name: "My Tickets" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "View ticket" }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(screen.getByRole("navigation", { name: "My Tickets pagination" })).toBeInTheDocument();
    expect(screen.getByLabelText("My Tickets cards")).toBeInTheDocument();
  });

  it("identifies Attachment actions and keeps removed state understandable without color", async () => {
    appFetch();
    sessionStorage.setItem("toktickit.developmentRequesterId", "1");
    render(<RequesterContextProvider><TicketDetail ticketId={42} onBack={vi.fn()} /></RequesterContextProvider>);
    await screen.findByText("active-evidence.png");
    expect(screen.getByRole("button", { name: "Download active-evidence.png" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Remove attachment" })).toBeEnabled();
    const removedCard = screen.getByText("removed-evidence.pdf").closest("article");
    expect(removedCard).not.toBeNull();
    expect(within(removedCard as HTMLElement).getAllByText("Removed").length).toBeGreaterThanOrEqual(1);
    expect(within(removedCard as HTMLElement).getByText("Superseded file")).toBeInTheDocument();
    expect(within(removedCard as HTMLElement).queryByRole("button", { name: /download|remove/i })).not.toBeInTheDocument();
  });
});
