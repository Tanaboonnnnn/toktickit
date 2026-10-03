import { cleanup, render, screen, within } from "@testing-library/react";
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
  description: "Check the VPN gateway and confirm the route",
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

describe("A11Y-01 Actions Taken semantics and keyboard order", () => {
  it("exposes a named region, text-bearing status, labelled fields, and logical Tab order", async () => {
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/tickets/91/actions-taken?")) return json({ items: [action], page: 1, pageSize: 20, totalItems: 1, totalPages: 1, capabilities: { canCreate: true } });
      if (url.endsWith("/api/staff/assignees")) return json({ items: [staff] });
      return json({});
    }));
    const user = userEvent.setup();
    render(<AuthProvider initialUser={staff}><ActionsTaken mode="staff" ticketId={91} ticketNumber="TKT-91" ticketVersion={1} /></AuthProvider>);

    const region = await screen.findByRole("region", { name: "Actions Taken" });
    expect(within(region).getByRole("heading", { level: 2, name: "Actions Taken" })).toBeInTheDocument();
    expect(within(region).getByText("Pending")).toBeInTheDocument();

    const create = within(region).getByRole("button", { name: "Create Action" });
    await user.click(create);
    await user.tab();
    expect(within(region).getByRole("button", { name: "Close" })).toHaveFocus();
    await user.tab();
    const description = within(region).getByRole("textbox", { name: "Action Description" });
    expect(description).toHaveFocus();
    expect(within(region).getByRole("combobox", { name: "Assigned to" })).toBeInTheDocument();

    await user.click(within(region).getByRole("button", { name: "Save Action" }));
    expect(description).toHaveFocus();
    expect(description).toHaveAttribute("aria-invalid", "true");
    const error = within(region).getByText("Action Description is required.");
    expect(description).toHaveAttribute("aria-describedby", error.id);
  });
});
