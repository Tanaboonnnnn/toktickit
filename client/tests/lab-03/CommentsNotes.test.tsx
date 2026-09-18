import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../src/auth-context.js";
import TicketDetail from "../../src/TicketDetail.js";
import StaffTicketDetail from "../../src/staff/StaffTicketDetail.js";

const requester = { id: 8, name: "Anan Student", email: "anan@example.test", role: "REQUESTER" as const, mustChangePassword: false };
const staff = { id: 21, name: "Niran Staff", email: "niran@example.test", role: "IT_STAFF" as const, mustChangePassword: false };
const requesterTicket = {
  id: 91, ticketNumber: "TKT-20260918-000091", summary: "VPN access unavailable",
  category: { id: 3, name: "Network" }, relatedSystem: { id: 5, name: "VPN" },
  requester: { id: 8, name: "Anan Student", email: "anan@example.test" }, description: "Long diagnostic description",
  requestedPriority: "HIGH" as const, currentStatus: "IN_PROGRESS" as const,
  createdAt: "2026-09-16T02:00:00.000Z", updatedAt: "2026-09-17T03:00:00.000Z", version: 2,
  attachments: [], resolutionSummary: null, resolvedAt: null, closedAt: null, cancelReason: null, cancelledAt: null,
  requesterResolutionIndicatedAt: null,
};
const staffTicket = {
  ...requesterTicket,
  itPriority: "MEDIUM" as const,
  owner: { id: 21, name: "Niran Staff", role: "IT_STAFF" as const },
};
const comments = [
  { id: 1, ticketId: 91, author: { id: 8, name: "Anan Student", role: "REQUESTER" as const }, body: "Requester update", createdAt: "2026-09-18T01:00:00.000Z" },
  { id: 2, ticketId: 91, author: { id: 21, name: "Niran Staff", role: "IT_STAFF" as const }, body: "<b>Use plain text</b>", createdAt: "2026-09-18T02:00:00.000Z" },
];
const notes = [
  { id: 7, ticketId: 91, author: { id: 21, name: "Niran Staff", role: "IT_STAFF" as const }, body: "Private diagnostic note", createdAt: "2026-09-18T02:30:00.000Z" },
];

function json(body: unknown, status = 200) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => body } as Response);
}

function renderRequester(fetchMock: ReturnType<typeof vi.fn>) {
  vi.stubGlobal("fetch", fetchMock);
  render(<AuthProvider initialUser={requester}><TicketDetail ticketId={91} onBack={vi.fn()} /></AuthProvider>);
}

function renderStaff(fetchMock: ReturnType<typeof vi.fn>) {
  vi.stubGlobal("fetch", fetchMock);
  render(<AuthProvider initialUser={staff}><StaffTicketDetail ticketId={91} queueContext="" onBack={vi.fn()} /></AuthProvider>);
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("UI-05 Public Comments, Internal Notes, and Requester indication", () => {
  it("shows Requester Public Comments as plain text, posts with CSRF, and never renders Internal Notes", async () => {
    const posted = { id: 3, ticketId: 91, author: { id: 8, name: "Anan Student", role: "REQUESTER" as const }, body: "New public update", createdAt: "2026-09-18T03:00:00.000Z" };
    let commentReads = 0;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/tickets/91") && !init?.method) return json({ ticket: requesterTicket });
      if (url.endsWith("/api/tickets/91/comments") && !init?.method) { commentReads += 1; return json({ items: commentReads === 1 ? comments : [...comments, posted] }); }
      if (url.endsWith("/api/auth/csrf")) return json({ csrfToken: "csrf-49" });
      if (url.endsWith("/api/tickets/91/comments") && init?.method === "POST") return json({ comment: posted }, 201);
      return json({});
    });
    renderRequester(fetchMock);
    expect(await screen.findByRole("heading", { name: "Public Comments" })).toBeInTheDocument();
    expect(await screen.findByText("Requester update")).toBeInTheDocument();
    expect(screen.getByText("<b>Use plain text</b>")).toBeInTheDocument();
    expect(screen.queryByText("Private diagnostic note")).not.toBeInTheDocument();
    expect(screen.queryByText(/Internal \/ Staff only/i)).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.type(screen.getByRole("textbox", { name: "Public Comment" }), "  New public update  ");
    await user.click(screen.getByRole("button", { name: "Post Public Comment" }));
    expect(await screen.findByText("New public update")).toBeInTheDocument();
    const call = fetchMock.mock.calls.find(([input, init]) => String(input).endsWith("/comments") && (init as RequestInit | undefined)?.method === "POST");
    expect(call?.[1]).toEqual(expect.objectContaining({ credentials: "include", method: "POST", body: JSON.stringify({ body: "New public update" }) }));
    expect((call?.[1]?.headers as Record<string, string>)["X-CSRF-Token"]).toBe("csrf-49");
  });

  it("preserves a Requester public draft after recoverable failure", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/tickets/91") && !init?.method) return json({ ticket: requesterTicket });
      if (url.endsWith("/api/tickets/91/comments") && !init?.method) return json({ items: [] });
      if (url.endsWith("/api/auth/csrf")) return json({ csrfToken: "csrf-49" });
      if (url.endsWith("/api/tickets/91/comments")) return json({ error: { code: "INTERNAL_ERROR", message: "Unable to add Public Comment" } }, 500);
      return json({});
    });
    renderRequester(fetchMock);
    const user = userEvent.setup();
    const draft = await screen.findByRole("textbox", { name: "Public Comment" });
    await user.type(draft, "Keep this draft");
    await user.click(screen.getByRole("button", { name: "Post Public Comment" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/unable to add public comment/i);
    expect(draft).toHaveValue("Keep this draft");
  });

  it("lets Requester confirm Problem Appears Resolved without changing formal status", async () => {
    const indicated = { id: 91, requesterResolutionIndicatedAt: "2026-09-18T04:00:00.000Z", version: 3 };
    const updatedTicket = { ...requesterTicket, requesterResolutionIndicatedAt: indicated.requesterResolutionIndicatedAt, version: 3 };
    let detailReads = 0;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/tickets/91") && !init?.method) { detailReads += 1; return json({ ticket: detailReads === 1 ? requesterTicket : updatedTicket }); }
      if (url.endsWith("/api/tickets/91/comments") && !init?.method) return json({ items: [] });
      if (url.endsWith("/api/auth/csrf")) return json({ csrfToken: "csrf-49" });
      if (url.endsWith("/resolution-indication")) return json({ ticket: indicated });
      return json({});
    });
    renderRequester(fetchMock);
    const user = userEvent.setup();
    const action = await screen.findByRole("button", { name: "Problem Appears Resolved" });
    await user.click(action);
    expect(screen.getByText(/does not formally resolve or close/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirm Problem Appears Resolved" }));
    expect(await screen.findByText(/resolution indication sent/i)).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    const call = fetchMock.mock.calls.find(([input]) => String(input).endsWith("/resolution-indication"));
    expect(call?.[1]?.body).toBe(JSON.stringify({ expectedVersion: 2, confirmed: true }));
  });

  it("keeps Public Comments and Internal Notes visually and semantically distinct for Staff", async () => {
    const publicPosted = { id: 3, ticketId: 91, author: { id: 21, name: "Niran Staff", role: "IT_STAFF" as const }, body: "Public staff reply", createdAt: "2026-09-18T03:00:00.000Z" };
    const privatePosted = { id: 8, ticketId: 91, author: { id: 21, name: "Niran Staff", role: "IT_STAFF" as const }, body: "Private staff follow-up", createdAt: "2026-09-18T03:10:00.000Z" };
    let publicReads = 0;
    let noteReads = 0;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/staff/tickets/91") && !init?.method) return json({ ticket: staffTicket });
      if (url.endsWith("/api/staff/assignees")) return json({ items: [staffTicket.owner] });
      if (url.endsWith("/api/tickets/91/comments") && !init?.method) { publicReads += 1; return json({ items: publicReads === 1 ? comments : [...comments, publicPosted] }); }
      if (url.endsWith("/api/staff/tickets/91/internal-notes") && !init?.method) { noteReads += 1; return json({ items: noteReads === 1 ? notes : [...notes, privatePosted] }); }
      if (url.endsWith("/api/auth/csrf")) return json({ csrfToken: "csrf-49" });
      if (url.endsWith("/api/tickets/91/comments") && init?.method === "POST") return json({ comment: publicPosted }, 201);
      if (url.endsWith("/api/staff/tickets/91/internal-notes") && init?.method === "POST") return json({ note: privatePosted }, 201);
      return json({});
    });
    renderStaff(fetchMock);
    const publicSection = (await screen.findByRole("heading", { name: "Public Comments" })).closest("section");
    const privateSection = screen.getByRole("heading", { name: "Internal Notes" }).closest("section");
    expect(publicSection).not.toBeNull();
    expect(privateSection).not.toBeNull();
    expect(within(privateSection as HTMLElement).getByText(/Internal \/ Staff only/i)).toBeInTheDocument();
    expect(within(publicSection as HTMLElement).queryByText(/Staff only/i)).not.toBeInTheDocument();
    expect(within(privateSection as HTMLElement).getByText("Private diagnostic note")).toBeInTheDocument();

    const user = userEvent.setup();
    await user.type(within(publicSection as HTMLElement).getByRole("textbox", { name: "Public Comment" }), "Public staff reply");
    await user.type(within(privateSection as HTMLElement).getByRole("textbox", { name: "Internal Note" }), "Private staff follow-up");
    await user.click(within(publicSection as HTMLElement).getByRole("button", { name: "Post Public Comment" }));
    await user.click(within(privateSection as HTMLElement).getByRole("button", { name: "Add Internal Note" }));
    expect(await within(publicSection as HTMLElement).findByText("Public staff reply")).toBeInTheDocument();
    expect(await within(privateSection as HTMLElement).findByText("Private staff follow-up")).toBeInTheDocument();
    expect(within(publicSection as HTMLElement).queryByText("Private staff follow-up")).not.toBeInTheDocument();
  });
});
