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
    let detailCalls = 0;
    const refreshTicket = { ...baseTicket, attachments: [{ id: 2, ticketId: 9, originalName: "proof.png", mimeType: "image/png", sizeBytes: 8, state: "ACTIVE" as const, createdAt: "2026-08-29T00:01:00.000Z", removedAt: null, removalReason: null, downloadUrl: "/api/tickets/9/attachments/2/download" }] };
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("development-requesters")) return Promise.resolve(json([requester]));
      if (url.endsWith("/attachments") && init?.method === "POST") return Promise.resolve(json({ attachment: refreshTicket.attachments[0] }, true, 201));
      detailCalls += 1;
      return Promise.resolve(json({ ticket: detailCalls > 1 ? { ...refreshTicket, updatedAt: "2026-08-29T01:00:00.000Z" } : baseTicket }));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<RequesterContextProvider><TicketDetail ticketId={9} onBack={vi.fn()} /></RequesterContextProvider>);
    expect(await screen.findByText("Add an Attachment")).toBeInTheDocument();
    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], "proof.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Add an Attachment"), { target: { files: [file] } });
    expect(screen.getByText("Selected")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: /upload attachment/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/attachments"), expect.objectContaining({ method: "POST" })));
    await waitFor(() => expect(detailCalls).toBe(2));
    expect(screen.getByText("proof.png")).toBeInTheDocument();
    expect(screen.getAllByText(/29\/8\/2569 08:00:00/).length).toBeGreaterThan(0);
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
    await userEvent.setup().click(screen.getAllByRole("button", { name: "Remove attachment" })[0]);
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

  it("gates an ambiguous Ticket Detail upload on successful reconciliation", async () => {
    const uploaded = { id: 8, ticketId: 9, originalName: "retry.png", mimeType: "image/png", sizeBytes: 8, state: "ACTIVE" as const, createdAt: "2026-08-29T02:00:00.000Z", removedAt: null, removalReason: null, downloadUrl: "/download" };
    let detailGets = 0; let statusGets = 0; let postCount = 0;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("development-requesters")) return Promise.resolve(json([requester]));
      if (url.endsWith("/attachments") && init?.method === "POST") { postCount += 1; return postCount === 1 ? Promise.reject(new TypeError("network lost")) : Promise.resolve(json({ attachment: uploaded }, true, 201)); }
      if (url.endsWith("/attachments")) { statusGets += 1; return Promise.resolve(json({ items: statusGets === 1 ? [] : [uploaded] })); }
      detailGets += 1; return Promise.resolve(json({ ticket: { ...baseTicket, updatedAt: detailGets > 1 ? "2026-08-29T02:00:00.000Z" : baseTicket.updatedAt, attachments: detailGets > 1 ? [uploaded] : [] } }));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<RequesterContextProvider><TicketDetail ticketId={9} onBack={vi.fn()} /></RequesterContextProvider>);
    await screen.findByText("Add an Attachment");
    const file = new File([new Uint8Array([1])], "retry.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Add an Attachment"), { target: { files: [file] } });
    await userEvent.setup().click(screen.getByRole("button", { name: /upload attachment/i }));
    expect(await screen.findByText(/upload result uncertain; status checked/i)).toBeInTheDocument();
    expect(postCount).toBe(1); expect(statusGets).toBe(1);
    expect(screen.getByRole("button", { name: /retry upload/i })).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: /retry upload/i }));
    await waitFor(() => expect(postCount).toBe(2));
    expect(detailGets).toBeGreaterThan(1);
  });

  it("offers only Retry status check when ambiguous reconciliation fails", async () => {
    let statusGets = 0; let postCount = 0;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("development-requesters")) return Promise.resolve(json([requester]));
      if (url.endsWith("/attachments") && init?.method === "POST") { postCount += 1; return Promise.reject(new TypeError("network lost")); }
      if (url.endsWith("/attachments")) { statusGets += 1; return statusGets === 1 ? Promise.resolve(json({}, false, 500)) : Promise.resolve(json({ items: [] })); }
      return Promise.resolve(json({ ticket: baseTicket }));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<RequesterContextProvider><TicketDetail ticketId={9} onBack={vi.fn()} /></RequesterContextProvider>);
    await screen.findByText("Add an Attachment");
    fireEvent.change(screen.getByLabelText("Add an Attachment"), { target: { files: [new File([new Uint8Array([1])], "uncertain.png", { type: "image/png" })] } });
    await userEvent.setup().click(screen.getByRole("button", { name: /upload attachment/i }));
    expect((await screen.findAllByText(/unable to check upload status/i)).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /retry upload/i })).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: /retry status check/i }));
    await waitFor(() => expect(statusGets).toBe(2));
    expect(screen.getByRole("button", { name: /retry upload/i })).toBeInTheDocument();
    expect(postCount).toBe(1);
  });

  it("revokes the temporary object URL after a successful download", async () => {
    const active = { ...baseTicket, attachments: [{ id: 10, ticketId: 9, originalName: "download.png", mimeType: "image/png", sizeBytes: 8, state: "ACTIVE" as const, createdAt: baseTicket.createdAt, removedAt: null, removalReason: null, downloadUrl: "/download" }] };
    const fetchMock = vi.fn((input: RequestInfo | URL) => String(input).includes("development-requesters") ? Promise.resolve(json([requester])) : String(input).includes("/download") ? Promise.resolve(json({}, true, 200)) : Promise.resolve(json({ ticket: active })));
    vi.stubGlobal("fetch", fetchMock);
    const createUrl = vi.fn().mockReturnValue("blob:test");
    const revokeUrl = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createUrl });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeUrl });
    render(<RequesterContextProvider><TicketDetail ticketId={9} onBack={vi.fn()} /></RequesterContextProvider>);
    await screen.findByText("download.png");
    await userEvent.setup().click(screen.getByRole("button", { name: /download download\.png/i }));
    await waitFor(() => expect(createUrl).toHaveBeenCalledTimes(1));
    expect(revokeUrl).toHaveBeenCalledWith("blob:test");
  });

  it("uses the post-mutation Ticket response as authoritative state and re-enables capacity after removal", async () => {
    const active = Array.from({ length: 5 }, (_, i) => ({ id: i + 20, ticketId: 9, originalName: `active-${i}.png`, mimeType: "image/png", sizeBytes: 8, state: "ACTIVE" as const, createdAt: "2026-08-29T00:00:00.000Z", removedAt: null, removalReason: null, downloadUrl: "/download" }));
    const removed = { ...active[0], state: "REMOVED" as const, removedAt: "2026-08-29T03:00:00.000Z", removalReason: "retired", downloadUrl: null };
    let detailGets = 0; const calls: string[] = [];
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input); calls.push(`${init?.method ?? "GET"} ${url}`);
      if (url.includes("development-requesters")) return Promise.resolve(json([requester]));
      if (init?.method === "DELETE") return Promise.resolve(json({ attachment: removed }));
      detailGets += 1;
      return Promise.resolve(json({ ticket: { ...baseTicket, updatedAt: detailGets > 1 ? "2026-08-29T03:00:00.000Z" : baseTicket.updatedAt, attachments: detailGets > 1 ? [removed, ...active.slice(1)] : active } }));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<RequesterContextProvider><TicketDetail ticketId={9} onBack={vi.fn()} /></RequesterContextProvider>);
    await screen.findByText("active-0.png");
    await userEvent.setup().click(screen.getAllByRole("button", { name: "Remove attachment" })[0]);
    await userEvent.setup().type(screen.getByLabelText(/removal reason/i), "retired");
    await userEvent.setup().click(screen.getAllByRole("button", { name: "Remove attachment" })[0]);
    await waitFor(() => expect(detailGets).toBe(2));
    const deleteIndex = calls.findIndex((value) => value.startsWith("DELETE"));
    const refreshIndex = calls.findIndex((value, index) => value.startsWith("GET") && index > deleteIndex);
    expect(deleteIndex).toBeLessThan(refreshIndex);
    expect(screen.getByText("retired")).toBeInTheDocument();
    expect(screen.getAllByText(/29\/8\/2569 10:00:00/).length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Add an Attachment")).toBeEnabled();
  });
});
