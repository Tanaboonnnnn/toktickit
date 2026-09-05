import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App.js";
import TicketDetail from "../../src/TicketDetail.js";
import { RequesterContextProvider } from "../../src/requester-context.js";
import type { Ticket } from "../../src/api.js";

const requester = { id: 1, name: "Indicator Requester", email: "indicator@example.test" };
const category = { id: 1, name: "Hardware" };
const relatedSystem = { id: 1, name: "University Email" };
const baseTicket: Ticket = {
  id: 42,
  ticketNumber: "TKT-20260829-IND001",
  requester,
  category,
  relatedSystem,
  summary: "Readable state indicators",
  requestedPriority: "HIGH" as const,
  currentStatus: "NEW" as const,
  createdAt: "2026-08-29T00:00:00.000Z",
  updatedAt: "2026-08-29T00:00:00.000Z",
  description: "A sufficiently detailed description for state-indicator checks.",
  attachments: [],
};

function json(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body, blob: async () => new Blob(["bytes"]) };
}

function appFetch(postResponse: ReturnType<typeof json> = json({ ticket: baseTicket, replayed: false }, true, 201)) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("development-requesters")) return Promise.resolve(json([requester]));
    if (url.includes("categories")) return Promise.resolve(json([category]));
    if (url.includes("related-systems")) return Promise.resolve(json([relatedSystem]));
    if (init?.method === "POST" && url.endsWith("/api/tickets")) return Promise.resolve(postResponse);
    return Promise.resolve(json({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 }));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function detailFetch(ticket: typeof baseTicket) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => String(input).includes("development-requesters")
    ? Promise.resolve(json([requester]))
    : Promise.resolve(json({ ticket })));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function fillForm() {
  sessionStorage.setItem("toktickit.developmentRequesterId", "1");
  render(<App />);
  const user = userEvent.setup();
  await screen.findByRole("heading", { name: "Create Ticket" });
  await screen.findByRole("option", { name: "Hardware" });
  await screen.findByRole("option", { name: "University Email" });
  await user.selectOptions(screen.getByRole("combobox", { name: "Category *" }), "1");
  await user.selectOptions(screen.getByRole("combobox", { name: "Related System *" }), "1");
  await user.type(screen.getByRole("textbox", { name: "Ticket Summary *" }), "Readable state indicators");
  await user.selectOptions(screen.getByRole("combobox", { name: "Requested Priority *" }), "HIGH");
  await user.type(screen.getByRole("textbox", { name: "Description *" }), "A sufficiently detailed description for state-indicator checks.");
  return user;
}

async function fillAndSubmit() {
  const user = await fillForm();
  await user.click(within(screen.getByRole("region", { name: /create ticket/i })).getByRole("button", { name: "Create Ticket" }));
}

describe("STYLE-02 readable state indicators", () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => { cleanup(); sessionStorage.clear(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("renders textual success, priority, and status cues", async () => {
    appFetch();
    await fillAndSubmit();
    expect(await screen.findByText("Your Ticket has been created.")).toBeInTheDocument();
    expect(screen.getByText("Ticket Number")).toBeInTheDocument();
    expect(screen.getByText("HIGH")).toHaveClass("lab2-badge", "lab2-priority-high");
    expect(screen.getByText("New")).toHaveClass("lab2-badge", "lab2-status-new");
  });

  it("renders safe error text and visible disabled/limit explanations", async () => {
    const active = Array.from({ length: 5 }, (_, index) => ({
      id: index + 1, ticketId: 42, originalName: `active-${index}.png`, mimeType: "image/png",
      sizeBytes: 8, state: "ACTIVE" as const, createdAt: baseTicket.createdAt,
      removedAt: null, removalReason: null, downloadUrl: "/download",
    }));
    detailFetch({ ...baseTicket, attachments: active });
    sessionStorage.setItem("toktickit.developmentRequesterId", "1");
    render(<RequesterContextProvider><TicketDetail ticketId={42} onBack={vi.fn()} /></RequesterContextProvider>);
    expect(await screen.findByText(/maximum five active attachments reached/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Add an Attachment")).toBeDisabled();
    expect(screen.getByText(/remove one before uploading another/i)).toBeInTheDocument();
  });

  it("renders active and removed Attachment meaning with text and scoped actions", async () => {
    detailFetch({ ...baseTicket, attachments: [
      { id: 1, ticketId: 42, originalName: "active.png", mimeType: "image/png", sizeBytes: 8, state: "ACTIVE" as const, createdAt: baseTicket.createdAt, removedAt: null, removalReason: null, downloadUrl: "/download" },
      { id: 2, ticketId: 42, originalName: "removed.pdf", mimeType: "application/pdf", sizeBytes: 8, state: "REMOVED" as const, createdAt: baseTicket.createdAt, removedAt: "2026-08-29T00:01:00.000Z", removalReason: "Superseded", downloadUrl: null },
    ] });
    sessionStorage.setItem("toktickit.developmentRequesterId", "1");
    render(<RequesterContextProvider><TicketDetail ticketId={42} onBack={vi.fn()} /></RequesterContextProvider>);
    const activeCard = (await screen.findByText("active.png")).closest("article") as HTMLElement;
    const removedCard = screen.getByText("removed.pdf").closest("article") as HTMLElement;
    expect(within(activeCard).getByText("Active")).toBeInTheDocument();
    expect(within(activeCard).getByRole("button", { name: "Download active.png" })).toBeInTheDocument();
    expect(within(removedCard).getAllByText("Removed").length).toBeGreaterThanOrEqual(1);
    expect(within(removedCard).getByText("Superseded")).toBeInTheDocument();
    expect(within(removedCard).queryByRole("button", { name: /download|remove/i })).not.toBeInTheDocument();
  });

  it("keeps partial success understandable when one Attachment fails", async () => {
    const fetchMock = appFetch();
    const user = await fillForm();
    fireEvent.change(screen.getByLabelText("Select files"), { target: {
      files: [
        new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], "good.png", { type: "image/png" }),
        new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])], "bad.pdf", { type: "application/pdf" }),
      ],
    } });
    let uploads = 0;
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.body && typeof (init.body as FormData).get === "function") {
        uploads += 1;
        return uploads === 1
          ? Promise.resolve(json({ attachment: { id: 1, ticketId: 42, originalName: "good.png", mimeType: "image/png", sizeBytes: 8, state: "ACTIVE", createdAt: baseTicket.createdAt, removedAt: null, removalReason: null, downloadUrl: "/download" } }, true, 201))
          : Promise.resolve(json({ error: { code: "INTERNAL_ERROR", message: "Unable to upload attachment" } }, false, 500));
      }
      return Promise.resolve(json({ ticket: baseTicket, replayed: false }, true, 201));
    });
    await user.click(within(screen.getByRole("region", { name: /create ticket/i })).getByRole("button", { name: "Create Ticket" }));
    await waitFor(() => expect(screen.getByTestId("ticket-number")).toBeInTheDocument());
    expect(screen.getByText("Upload failed")).toBeInTheDocument();
    expect(screen.getByText("Uploaded")).toBeInTheDocument();
    expect(screen.getByText("Your Ticket has been created.")).toBeInTheDocument();
  });
});
