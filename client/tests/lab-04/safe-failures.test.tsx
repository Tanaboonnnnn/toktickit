import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import ActionsTaken from "../../src/actions/ActionsTaken.js";
import { AuthProvider } from "../../src/auth-context.js";

const staff = { id: 21, name: "Niran Staff", email: "niran@example.test", role: "IT_STAFF" as const, mustChangePassword: false };
const action = {
  id: 501,
  ticketId: 91,
  workflowCycle: 1,
  createdAt: "2026-09-30T08:15:00.000Z",
  recordedBy: { id: 21, name: "Niran Staff", role: "IT_STAFF" },
  assignee: { id: 21, name: "Niran Staff", role: "IT_STAFF" },
  performedBy: null,
  description: "Original server description",
  result: null,
  followUpRequired: false,
  followUpNote: null,
  attachmentNotes: null,
  status: "PENDING",
  version: 1,
  updatedAt: "2026-09-30T08:15:00.000Z",
  updatedBy: { id: 21, name: "Niran Staff", role: "IT_STAFF" },
  completedAt: null,
  cancelledAt: null,
  cancelledBy: null,
  cancellationReason: null,
  readOnly: false,
  capabilities: { canEdit: true, canReassign: true, permittedTransitions: ["IN_PROGRESS", "COMPLETED", "CANCELLED"] },
};

function json(body: unknown): Promise<Response> {
  return Promise.resolve({ ok: true, status: 200, json: async () => body } as Response);
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("SAFE-01 recoverable Action network failure", () => {
  it("keeps an edited Action draft and handles a lost network response without an unhandled promise", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/tickets/91/actions-taken?") && !init?.method) return json({ items: [action], page: 1, pageSize: 20, totalItems: 1, totalPages: 1, capabilities: { canCreate: true } });
      if (url.endsWith("/api/staff/assignees")) return json({ items: [staff] });
      if (url.endsWith("/api/auth/csrf")) return json({ csrfToken: "csrf-safe-79" });
      if (url.endsWith("/api/staff/tickets/91/actions-taken/501") && init?.method === "PATCH") return Promise.reject(new TypeError("Failed to fetch"));
      return json({});
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<AuthProvider initialUser={staff}><ActionsTaken mode="staff" ticketId={91} ticketNumber="TKT-91" ticketVersion={1} /></AuthProvider>);

    await user.click(await screen.findByRole("button", { name: "Edit Action #501" }));
    const description = screen.getByRole("textbox", { name: "Edit Action Description" });
    await user.clear(description);
    await user.type(description, "Keep this diagnostic draft after connection loss");
    await user.click(screen.getByRole("button", { name: "Save Action changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/draft has been kept/i);
    expect(description).toHaveValue("Keep this diagnostic draft after connection loss");
    expect(screen.getByRole("button", { name: "Save Action changes" })).toBeEnabled();
    expect(fetchMock.mock.calls.some(([input, init]) => String(input).endsWith("/actions-taken/501") && init?.method === "PATCH")).toBe(true);
  });
});
