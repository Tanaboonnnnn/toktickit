import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TicketDetail from "../../src/TicketDetail.js";
import { RequesterContextProvider } from "../../src/requester-context.js";

const requester = { id: 1, name: "Test Requester", email: "test@example.test" };
const baseTicket = { id: 9, ticketNumber: "TKT-20260829-ABC123", requester, category: { id: 1, name: "Hardware" }, relatedSystem: { id: 1, name: "Wi-Fi" }, summary: "Network issue", requestedPriority: "LOW" as const, currentStatus: "NEW" as const, createdAt: "2026-08-29T00:00:00.000Z", updatedAt: "2026-08-29T00:00:00.000Z", description: "A sufficiently detailed test description.", attachments: [] };
function json(body: unknown, ok = true, status = 200) { return { ok, status, json: async () => body, blob: async () => new Blob(["bytes"]) }; }

describe("UI-09 AttachmentPanel", () => {
  beforeEach(() => { sessionStorage.setItem("toktickit.developmentRequesterId", "1"); });
  afterEach(() => { cleanup(); sessionStorage.clear(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("supports selected and uploading states, then refreshes after upload", async () => {
    let ticket = baseTicket;
    const refreshTicket = { ...baseTicket, attachments: [{ id: 2, ticketId: 9, originalName: "proof.png", mimeType: "image/png", sizeBytes: 8, state: "ACTIVE" as const, createdAt: "2026-08-29T00:01:00.000Z", removedAt: null, removalReason: null, downloadUrl: "/api/tickets/9/attachments/2/download" }] };
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("development-requesters")) return Promise.resolve(json([requester]));
      if (url.endsWith("/attachments") && init?.method === "POST") return Promise.resolve(json({ attachment: refreshTicket.attachments[0] }, true, 201));
      return Promise.resolve(json({ ticket }));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<RequesterContextProvider><TicketDetail ticketId={9} onBack={vi.fn()} /></RequesterContextProvider>);
    expect(await screen.findByText("Add an Attachment")).toBeInTheDocument();
    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], "proof.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Add an Attachment"), { target: { files: [file] } });
    expect(screen.getByText("Selected")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: /upload attachment/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/attachments"), expect.objectContaining({ method: "POST" })));
  });

  it("shows the active five-file limit and removed metadata without actions", async () => {
    const active = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, ticketId: 9, originalName: `a${i}.png`, mimeType: "image/png", sizeBytes: 8, state: "ACTIVE" as const, createdAt: "2026-08-29T00:00:00.000Z", removedAt: null, removalReason: null, downloadUrl: `/download/${i}` }));
    const removed = { id: 6, ticketId: 9, originalName: "old.pdf", mimeType: "application/pdf", sizeBytes: 8, state: "REMOVED" as const, createdAt: "2026-08-29T00:00:00.000Z", removedAt: "2026-08-29T01:00:00.000Z", removalReason: "Old file", downloadUrl: null };
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => String(input).includes("development-requesters") ? Promise.resolve(json([requester])) : Promise.resolve(json({ ticket: { ...baseTicket, attachments: [...active, removed] } }))));
    render(<RequesterContextProvider><TicketDetail ticketId={9} onBack={vi.fn()} /></RequesterContextProvider>);
    expect(await screen.findByText(/Maximum five active Attachments reached/i)).toBeInTheDocument();
    expect(screen.getByText("old.pdf")).toBeInTheDocument();
    const removedCard = screen.getByText("old.pdf").closest("article");
    expect(removedCard).not.toBeNull();
    expect(within(removedCard as HTMLElement).queryByRole("button", { name: /download|remove/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Add an Attachment")).toBeDisabled();
  });

  it("validates removal reason, supports cancel, and refreshes after successful removal", async () => {
    const active = { id: 3, ticketId: 9, originalName: "to-remove.png", mimeType: "image/png", sizeBytes: 8, state: "ACTIVE" as const, createdAt: "2026-08-29T00:00:00.000Z", removedAt: null, removalReason: null, downloadUrl: "/download" };
    let refreshes = 0;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("development-requesters")) return Promise.resolve(json([requester]));
      if (url.endsWith("/attachments/3") && init?.method === "DELETE") return Promise.resolve(json({ attachment: { ...active, state: "REMOVED", removedAt: "2026-08-29T02:00:00.000Z", removalReason: "done", downloadUrl: null } }));
      if (url.includes("/api/tickets/9") && !url.includes("/attachments/3")) { refreshes += 1; return Promise.resolve(json({ ticket: { ...baseTicket, attachments: [active] } })); }
      return Promise.resolve(json({ ticket: { ...baseTicket, attachments: [active] } }));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<RequesterContextProvider><TicketDetail ticketId={9} onBack={vi.fn()} /></RequesterContextProvider>);
    await screen.findByText("to-remove.png");
    await userEvent.setup().click(screen.getByRole("button", { name: "Remove attachment" }));
    expect(screen.getByLabelText(/removal reason/i)).toBeRequired();
    await userEvent.setup().click(screen.getByRole("button", { name: "Remove attachment" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/3 to 200/);
    await userEvent.setup().click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByLabelText(/removal reason/i)).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Remove attachment" }));
    await userEvent.setup().type(screen.getByLabelText(/removal reason/i), "done");
    await userEvent.setup().click(screen.getByRole("button", { name: "Remove attachment" }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(true));
    expect(refreshes).toBeGreaterThan(0);
  });

  it("shows safe upload and download failures and preserves long filenames", async () => {
    const longName = `${"very-long-".repeat(20)}.png`;
    const active = { id: 4, ticketId: 9, originalName: longName, mimeType: "image/png", sizeBytes: 8, state: "ACTIVE" as const, createdAt: "2026-08-29T00:00:00.000Z", removedAt: null, removalReason: null, downloadUrl: "/download" };
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("development-requesters")) return Promise.resolve(json([requester]));
      if (url.includes("/download")) return Promise.resolve(json({ error: { code: "INTERNAL_ERROR", message: "bad internal detail" } }, false, 500));
      if (url.includes("/attachments") && init?.method === "POST") return Promise.resolve(json({ error: { code: "INTERNAL_ERROR", message: "Unable to upload attachment" } }, false, 500));
      return Promise.resolve(json({ ticket: { ...baseTicket, attachments: [active] } }));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<RequesterContextProvider><TicketDetail ticketId={9} onBack={vi.fn()} /></RequesterContextProvider>);
    expect(await screen.findByText(longName)).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: new RegExp(`Download ${longName}`) }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/unable to complete|unable to download/i));
    expect(screen.getByRole("alert")).not.toHaveTextContent(/bad internal detail|Prisma|path/i);
  });
});
