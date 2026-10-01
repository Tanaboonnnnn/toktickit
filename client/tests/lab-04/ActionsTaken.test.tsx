import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import ActionsTaken from "../../src/actions/ActionsTaken.js";
import { AuthProvider } from "../../src/auth-context.js";

const staff = {
  id: 21,
  name: "Niran Staff",
  email: "niran@example.test",
  role: "IT_STAFF" as const,
  mustChangePassword: false,
};

const pendingAction = {
  id: 501,
  ticketId: 91,
  workflowCycle: 2,
  createdAt: "2026-09-30T08:15:00.000Z",
  recordedBy: { id: 21, name: "Niran Staff", role: "IT_STAFF" },
  assignee: { id: 31, name: "Ada Admin", role: "ADMINISTRATOR" },
  performedBy: null,
  description: "Inspect the access switch and verify the uplink",
  result: null,
  followUpRequired: true,
  followUpNote: "Confirm connectivity after the replacement cable arrives",
  attachmentNotes: "See switch-port-photo.png on this Ticket",
  status: "PENDING",
  version: 3,
  updatedAt: "2026-09-30T08:20:00.000Z",
  updatedBy: { id: 21, name: "Niran Staff", role: "IT_STAFF" },
  completedAt: null,
  cancelledAt: null,
  cancelledBy: null,
  cancellationReason: null,
  readOnly: false,
  capabilities: {
    canEdit: true,
    canReassign: true,
    permittedTransitions: ["IN_PROGRESS", "COMPLETED", "CANCELLED"],
  },
};

function json(body: unknown, status = 200): Promise<Response> {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("UI-01 Staff Actions Taken", () => {
  it("locates a Dashboard target Action on page two and focuses it", async () => {
    const target = { ...pendingAction, id: 777, description: "Target from the Dashboard" };
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/tickets/91/actions-taken?page=1&pageSize=20")) return json({ items: [pendingAction], page: 1, pageSize: 20, totalItems: 21, totalPages: 2, capabilities: { canCreate: true } });
      if (url.endsWith("/api/tickets/91/actions-taken?page=2&pageSize=20")) return json({ items: [target], page: 2, pageSize: 20, totalItems: 21, totalPages: 2, capabilities: { canCreate: true } });
      if (url.endsWith("/api/staff/assignees")) return json({ items: [staff, pendingAction.assignee] });
      return json({});
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AuthProvider initialUser={staff}><ActionsTaken mode="staff" ticketId={91} ticketNumber="TKT-91" ticketVersion={7} targetActionId={777} /></AuthProvider>);
    expect(await screen.findByText("Target from the Dashboard")).toBeInTheDocument();
    const card = screen.getByRole("article", { name: /Target Action 777/ });
    await waitFor(() => expect(card).toHaveFocus());
    expect(fetchMock.mock.calls.map(([input]) => String(input)).filter((url) => url.includes("/actions-taken?page="))).toEqual(expect.arrayContaining([
      expect.stringContaining("page=1&pageSize=20"), expect.stringContaining("page=2&pageSize=20"),
    ]));
  });

  it("does not steal focus back to a deep-linked Action after another Action is saved", async () => {
    const target = { ...pendingAction, id: 777, description: "Target from the Dashboard" };
    const other = { ...pendingAction, id: 888, description: "Another Action" };
    const updated = { ...other, description: "Another Action updated", version: 4 };
    let pageTwoReads = 0;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/tickets/91/actions-taken?page=1&pageSize=20")) {
        return json({ items: [pendingAction], page: 1, pageSize: 20, totalItems: 22, totalPages: 2, capabilities: { canCreate: true } });
      }
      if (url.endsWith("/api/tickets/91/actions-taken?page=2&pageSize=20")) {
        pageTwoReads += 1;
        return json({ items: [target, pageTwoReads === 1 ? other : updated], page: 2, pageSize: 20, totalItems: 22, totalPages: 2, capabilities: { canCreate: true } });
      }
      if (url.endsWith("/api/staff/assignees")) return json({ items: [staff, pendingAction.assignee] });
      if (url.endsWith("/api/auth/csrf")) return json({ csrfToken: "csrf-79" });
      if (url.endsWith("/api/staff/tickets/91/actions-taken/888") && init?.method === "PATCH") {
        return json({ action: updated, ticketVersion: 8, changed: true });
      }
      return json({});
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<AuthProvider initialUser={staff}><ActionsTaken mode="staff" ticketId={91} ticketNumber="TKT-91" ticketVersion={7} targetActionId={777} /></AuthProvider>);

    const targetCard = await screen.findByRole("article", { name: /Target Action 777/ });
    await waitFor(() => expect(targetCard).toHaveFocus());
    await user.click(screen.getByRole("button", { name: "Edit Action #888" }));
    const description = screen.getByRole("textbox", { name: "Edit Action Description" });
    await user.clear(description);
    await user.type(description, "Another Action updated");
    await user.click(screen.getByRole("button", { name: "Save Action changes" }));

    expect(await screen.findByText("Another Action updated")).toBeInTheDocument();
    expect(targetCard).not.toHaveFocus();
    expect(pageTwoReads).toBeGreaterThan(1);
  });

  it("associates create validation errors and focuses the first invalid editable field", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/tickets/91/actions-taken?")) {
        return json({ items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 0, capabilities: { canCreate: true } });
      }
      if (url.endsWith("/api/staff/assignees")) return json({ items: [staff, pendingAction.assignee] });
      return json({});
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(
      <AuthProvider initialUser={staff}>
        <ActionsTaken mode="staff" ticketId={91} ticketNumber="TKT-20260930-000091" ticketVersion={7} />
      </AuthProvider>,
    );

    await user.click(await screen.findByRole("button", { name: "Create Action" }));
    await user.click(screen.getByRole("checkbox", { name: "Follow-Up Required" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Assigned to" }), "");
    await user.click(screen.getByRole("button", { name: "Save Action" }));

    const description = screen.getByRole("textbox", { name: "Action Description" });
    const assignee = screen.getByRole("combobox", { name: "Assigned to" });
    const followUp = screen.getByRole("textbox", { name: "Follow-up Note" });
    expect(description).toHaveFocus();
    expect(description).toHaveAttribute("aria-describedby", expect.stringMatching(/action-description-error/));
    expect(assignee).toHaveAttribute("aria-describedby", expect.stringMatching(/action-assignee-error/));
    expect(followUp).toHaveAttribute("aria-describedby", expect.stringMatching(/action-follow-up-error/));
  });

  it("renders the authoritative public Action fields and keeps recorder, assignee, and performer distinct", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/tickets/91/actions-taken?page=1&pageSize=20")) {
        return json({ items: [pendingAction], page: 1, pageSize: 20, totalItems: 1, totalPages: 1, capabilities: { canCreate: true } });
      }
      if (url.endsWith("/api/staff/assignees")) {
        return json({ items: [staff, pendingAction.assignee] });
      }
      return json({});
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AuthProvider initialUser={staff}>
        <ActionsTaken
          mode="staff"
          ticketId={91}
          ticketNumber="TKT-20260930-000091"
          ticketVersion={7}
          onTicketChanged={vi.fn()}
        />
      </AuthProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Actions Taken" })).toBeInTheDocument();
    expect(screen.getByText(pendingAction.description)).toBeInTheDocument();
    expect(screen.getByText("Niran Staff", { selector: "dd" })).toBeInTheDocument();
    expect(screen.getByText(/Ada Admin \(Administrator\)/, { selector: "dd" })).toBeInTheDocument();
    expect(screen.getByText("Not completed")).toBeInTheDocument();
    expect(screen.getByText("Follow-up required")).toBeInTheDocument();
    expect(screen.getByText(pendingAction.followUpNote)).toBeInTheDocument();
    expect(screen.getByText(pendingAction.attachmentNotes)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Action" })).toBeInTheDocument();
  });

  it("UI-04 preserves one logical create UUID and original payload after an ambiguous network result", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("00000000-0000-4000-8000-000000000076");
    let creates = 0;
    const createBodies: Record<string, unknown>[] = [];
    const createdAction = {
      ...pendingAction,
      id: 576,
      assignee: { id: 21, name: "Niran Staff", role: "IT_STAFF" },
      description: "Inspect the failed access point",
      followUpRequired: false,
      followUpNote: null,
      attachmentNotes: "See the existing AP photo",
      version: 1,
    };
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/tickets/91/actions-taken?") && !init?.method) {
        return json({ items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 0, capabilities: { canCreate: true } });
      }
      if (url.endsWith("/api/staff/assignees")) {
        return json({ items: [staff, pendingAction.assignee] });
      }
      if (url.endsWith("/api/auth/csrf")) return json({ csrfToken: "csrf-76" });
      if (url.endsWith("/api/staff/tickets/91/actions-taken") && init?.method === "POST") {
        creates += 1;
        createBodies.push(JSON.parse(String(init.body)) as Record<string, unknown>);
        if (creates === 1) return Promise.reject(new TypeError("Failed to fetch"));
        return json({ action: createdAction, ticketVersion: 8, replayed: true });
      }
      return json({});
    });
    vi.stubGlobal("fetch", fetchMock);
    const onTicketChanged = vi.fn();
    const user = userEvent.setup();

    render(
      <AuthProvider initialUser={staff}>
        <ActionsTaken
          mode="staff"
          ticketId={91}
          ticketNumber="TKT-20260930-000091"
          ticketVersion={7}
          onTicketChanged={onTicketChanged}
        />
      </AuthProvider>,
    );

    await user.click(await screen.findByRole("button", { name: "Create Action" }));
    await user.type(screen.getByRole("textbox", { name: "Action Description" }), "  Inspect the failed access point  ");
    await user.type(screen.getByRole("textbox", { name: "Attachment Notes" }), "  See the existing AP photo  ");
    await user.selectOptions(screen.getByRole("combobox", { name: "Assigned to" }), "21");
    await user.click(screen.getByRole("button", { name: "Save Action" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/result is uncertain/i);
    expect(screen.getByRole("textbox", { name: "Action Description" })).toBeDisabled();
    expect(creates).toBe(1);

    await user.click(screen.getByRole("button", { name: "Retry same Action" }));
    await waitFor(() => expect(creates).toBe(2));
    expect(createBodies[0]).toEqual(createBodies[1]);
    expect(createBodies[0]).toEqual({
      clientRequestId: "00000000-0000-4000-8000-000000000076",
      expectedTicketVersion: 7,
      description: "Inspect the failed access point",
      result: null,
      assigneeId: 21,
      followUpRequired: false,
      followUpNote: null,
      attachmentNotes: "See the existing AP photo",
    });
    expect(onTicketChanged).toHaveBeenCalledWith(8);
    expect(await screen.findByText(/Action saved successfully/i)).toBeInTheDocument();
  });

  it("uses backend-projected capabilities and both optimistic versions for edit/reassignment", async () => {
    const updated = {
      ...pendingAction,
      assignee: { id: 21, name: "Niran Staff", role: "IT_STAFF" },
      description: "Inspect the uplink and replace the damaged cable",
      version: 4,
    };
    let reads = 0;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/tickets/91/actions-taken?") && !init?.method) {
        reads += 1;
        return json({ items: [reads === 1 ? pendingAction : updated], page: 1, pageSize: 20, totalItems: 1, totalPages: 1, capabilities: { canCreate: true } });
      }
      if (url.endsWith("/api/staff/assignees")) return json({ items: [staff, pendingAction.assignee] });
      if (url.endsWith("/api/auth/csrf")) return json({ csrfToken: "csrf-76" });
      if (url.endsWith("/api/staff/tickets/91/actions-taken/501") && init?.method === "PATCH") {
        return json({ action: updated, ticketVersion: 8, changed: true });
      }
      return json({});
    });
    vi.stubGlobal("fetch", fetchMock);
    const onTicketChanged = vi.fn();
    const user = userEvent.setup();
    render(
      <AuthProvider initialUser={staff}>
        <ActionsTaken mode="staff" ticketId={91} ticketNumber="TKT-20260930-000091" ticketVersion={7} onTicketChanged={onTicketChanged} />
      </AuthProvider>,
    );

    await user.click(await screen.findByRole("button", { name: "Edit Action #501" }));
    const description = screen.getByRole("textbox", { name: "Edit Action Description" });
    await user.clear(description);
    await user.type(description, "Inspect the uplink and replace the damaged cable");
    await user.selectOptions(screen.getByRole("combobox", { name: "Edit Assigned to" }), "21");
    await user.click(screen.getByRole("button", { name: "Save Action changes" }));

    const call = fetchMock.mock.calls.find(([input, init]) => String(input).endsWith("/actions-taken/501") && init?.method === "PATCH");
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({
      expectedTicketVersion: 7,
      expectedActionVersion: 3,
      description: "Inspect the uplink and replace the damaged cable",
      assigneeId: 21,
    });
    expect(onTicketChanged).toHaveBeenCalledWith(8);
    expect(await screen.findByText("Inspect the uplink and replace the damaged cable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start Action #501" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Complete Action #501" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel Action #501" })).toBeInTheDocument();
  });

  it("UI-04 keeps an edit draft on 409, refreshes authoritative versions, and never blindly retries", async () => {
    const authoritative = {
      ...pendingAction,
      version: 4,
      description: "Another staff member updated this Action",
    };
    const saved = {
      ...authoritative,
      version: 5,
      description: "My deliberately reapplied draft",
    };
    let reads = 0;
    let patches = 0;
    const patchBodies: Record<string, unknown>[] = [];
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/tickets/91/actions-taken?") && !init?.method) {
        reads += 1;
        const item = reads === 1 ? pendingAction : reads === 2 ? authoritative : saved;
        return json({ items: [item], page: 1, pageSize: 20, totalItems: 1, totalPages: 1, capabilities: { canCreate: true } });
      }
      if (url.endsWith("/api/staff/assignees")) return json({ items: [staff, pendingAction.assignee] });
      if (url.endsWith("/api/auth/csrf")) return json({ csrfToken: "csrf-76" });
      if (url.endsWith("/api/staff/tickets/91/actions-taken/501") && init?.method === "PATCH") {
        patches += 1;
        patchBodies.push(JSON.parse(String(init.body)) as Record<string, unknown>);
        if (patches === 1) return json({ error: { code: "CONFLICT", message: "Ticket changed or the operation is no longer available" } }, 409);
        return json({ action: saved, ticketVersion: 9, changed: true });
      }
      return json({});
    });
    vi.stubGlobal("fetch", fetchMock);
    const onConflict = vi.fn(async () => 8);
    const user = userEvent.setup();
    render(
      <AuthProvider initialUser={staff}>
        <ActionsTaken mode="staff" ticketId={91} ticketNumber="TKT-20260930-000091" ticketVersion={7} onConflict={onConflict} />
      </AuthProvider>,
    );

    await user.click(await screen.findByRole("button", { name: "Edit Action #501" }));
    const draft = screen.getByRole("textbox", { name: "Edit Action Description" });
    await user.clear(draft);
    await user.type(draft, "My deliberately reapplied draft");
    await user.click(screen.getByRole("button", { name: "Save Action changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/ticket changed/i);
    expect(patches).toBe(1);
    expect(onConflict).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("textbox", { name: "Edit Action Description" })).toHaveValue("My deliberately reapplied draft");
    await waitFor(() => expect(reads).toBeGreaterThanOrEqual(2));

    await user.click(screen.getByRole("button", { name: "Save Action changes" }));
    await waitFor(() => expect(patches).toBe(2));
    expect(patchBodies[0]).toMatchObject({ expectedTicketVersion: 7, expectedActionVersion: 3 });
    expect(patchBodies[1]).toMatchObject({ expectedTicketVersion: 8, expectedActionVersion: 4, description: "My deliberately reapplied draft" });
  });

  it("starts, completes, and cancels only through backend-projected transition controls", async () => {
    const cancellable = { ...pendingAction, id: 502, description: "Retire stale work item", followUpRequired: false, followUpNote: null };
    const inProgress = {
      ...pendingAction,
      status: "IN_PROGRESS",
      version: 4,
      capabilities: { canEdit: true, canReassign: true, permittedTransitions: ["COMPLETED", "CANCELLED"] },
    };
    const completed = {
      ...inProgress,
      status: "COMPLETED",
      version: 5,
      result: "Connectivity restored",
      performedBy: pendingAction.recordedBy,
      capabilities: { canEdit: true, canReassign: false, permittedTransitions: [] },
    };
    const cancelled = {
      ...cancellable,
      status: "CANCELLED",
      version: 4,
      cancellationReason: "Duplicate investigation",
      capabilities: { canEdit: false, canReassign: false, permittedTransitions: [] },
      readOnly: true,
    };
    let first: Record<string, unknown> = pendingAction;
    let second: Record<string, unknown> = cancellable;
    let ticketVersion = 7;
    const statusBodies: Record<string, unknown>[] = [];
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/tickets/91/actions-taken?") && !init?.method) {
        return json({ items: [first, second], page: 1, pageSize: 20, totalItems: 2, totalPages: 1, capabilities: { canCreate: true } });
      }
      if (url.endsWith("/api/staff/assignees")) return json({ items: [staff, pendingAction.assignee] });
      if (url.endsWith("/api/auth/csrf")) return json({ csrfToken: "csrf-76" });
      if (url.includes("/status") && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as Record<string, unknown>;
        statusBodies.push(body);
        ticketVersion += 1;
        if (url.includes("/501/")) {
          first = body.status === "IN_PROGRESS" ? inProgress : completed;
          return json({ action: first, ticketVersion });
        }
        second = cancelled;
        return json({ action: second, ticketVersion });
      }
      return json({});
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<AuthProvider initialUser={staff}><ActionsTaken mode="staff" ticketId={91} ticketNumber="TKT-20260930-000091" ticketVersion={7} /></AuthProvider>);

    await user.click(await screen.findByRole("button", { name: "Start Action #501" }));
    expect(await screen.findByText("In Progress")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Complete Action #501" }));
    expect(screen.getByText(/TKT-20260930-000091, Action #501.*In Progress.*Completed/i)).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "Completion Result" }), "Connectivity restored");
    await user.click(screen.getByRole("checkbox", { name: "Confirm Action completion" }));
    await user.click(screen.getByRole("button", { name: "Confirm complete Action" }));
    expect(await screen.findByText("Connectivity restored")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel Action #502" }));
    expect(screen.getByText(/TKT-20260930-000091, Action #502.*Pending.*Cancelled/i)).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "Cancellation Reason" }), "Duplicate investigation");
    await user.click(screen.getByRole("checkbox", { name: "Confirm Action cancellation" }));
    await user.click(screen.getByRole("button", { name: "Confirm cancel Action" }));
    expect(await screen.findByText("Duplicate investigation")).toBeInTheDocument();

    expect(statusBodies).toEqual([
      { expectedTicketVersion: 7, expectedActionVersion: 3, status: "IN_PROGRESS" },
      expect.objectContaining({ expectedTicketVersion: 8, expectedActionVersion: 4, status: "COMPLETED", result: "Connectivity restored", confirmation: true }),
      expect.objectContaining({ expectedTicketVersion: 9, expectedActionVersion: 3, status: "CANCELLED", cancellationReason: "Duplicate investigation", confirmation: true }),
    ]);
  });

  it("keeps the create draft editable when a previously eligible assignee becomes inactive", async () => {
    let assigneeReads = 0;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/tickets/91/actions-taken?") && !init?.method) {
        return json({ items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 0, capabilities: { canCreate: true } });
      }
      if (url.endsWith("/api/staff/assignees")) {
        assigneeReads += 1;
        return json({ items: assigneeReads === 1 ? [staff, pendingAction.assignee] : [staff] });
      }
      if (url.endsWith("/api/auth/csrf")) return json({ csrfToken: "csrf-76" });
      if (url.endsWith("/api/staff/tickets/91/actions-taken") && init?.method === "POST") {
        return json({ error: { code: "CONFLICT", message: "Selected Action assignee is inactive or no longer eligible" } }, 409);
      }
      return json({});
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<AuthProvider initialUser={staff}><ActionsTaken mode="staff" ticketId={91} ticketNumber="TKT-20260930-000091" ticketVersion={7} /></AuthProvider>);

    await user.click(await screen.findByRole("button", { name: "Create Action" }));
    await user.type(screen.getByRole("textbox", { name: "Action Description" }), "Preserve this draft after assignee rejection");
    await user.selectOptions(screen.getByRole("combobox", { name: "Assigned to" }), String(pendingAction.assignee.id));
    await user.click(screen.getByRole("button", { name: "Save Action" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/inactive or no longer eligible/i);
    expect(screen.getByRole("textbox", { name: "Action Description" })).toHaveValue("Preserve this draft after assignee rejection");
    expect(screen.getByRole("textbox", { name: "Action Description" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Retry same Action" })).not.toBeInTheDocument();
    await waitFor(() => expect(assigneeReads).toBe(2));
    expect(screen.queryByRole("option", { name: /Ada Admin/ })).not.toBeInTheDocument();
  });
});

describe("UI-02 Requester Actions Taken", () => {
  it("shows all statuses/cycles and public revision history read-only with no mutation controls", async () => {
    const requester = { id: 8, name: "Anan Student", email: "anan@example.test", role: "REQUESTER" as const, mustChangePassword: false };
    const previousCompleted = {
      ...pendingAction,
      id: 500,
      workflowCycle: 1,
      status: "COMPLETED",
      result: "Previous-cycle work completed",
      performedBy: { id: 41, name: "Mali Staff", role: "IT_STAFF" },
      readOnly: true,
      capabilities: { canEdit: false, canReassign: false, permittedTransitions: [] },
    };
    const currentCancelled = {
      ...pendingAction,
      id: 501,
      workflowCycle: 2,
      status: "CANCELLED",
      cancellationReason: "Superseded by a new work item",
      readOnly: true,
      capabilities: { canEdit: false, canReassign: false, permittedTransitions: [] },
    };
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/tickets/91/actions-taken?") && !url.includes("/revisions")) {
        return json({ items: [previousCompleted, currentCancelled], page: 1, pageSize: 20, totalItems: 2, totalPages: 1, capabilities: { canCreate: false } });
      }
      if (url.includes("/api/tickets/91/actions-taken/500/revisions")) {
        const page = new URL(url).searchParams.get("page") === "2" ? 2 : 1;
        return json({
          items: [page === 1 ? {
            actionId: 500,
            actionVersion: 1,
            eventType: "CREATED",
            actor: { id: 21, name: "Niran Staff", role: "IT_STAFF" },
            occurredAt: "2026-09-29T10:00:00.000Z",
            snapshot: {
              assignee: previousCompleted.assignee,
              performedBy: null,
              description: "Initial previous-cycle work",
              result: null,
              followUpRequired: false,
              followUpNote: null,
              attachmentNotes: null,
              status: "PENDING",
            },
          } : {
            actionId: 500,
            actionVersion: 2,
            eventType: "COMPLETED",
            actor: { id: 41, name: "Mali Staff", role: "IT_STAFF" },
            occurredAt: "2026-09-29T11:00:00.000Z",
            snapshot: {
              assignee: previousCompleted.assignee,
              performedBy: { id: 41, name: "Mali Staff", role: "IT_STAFF" },
              description: "Initial previous-cycle work",
              result: "Previous-cycle work completed",
              followUpRequired: false,
              followUpNote: null,
              attachmentNotes: null,
              status: "COMPLETED",
            },
          }],
          page,
          pageSize: 20,
          totalItems: 2,
          totalPages: 2,
        });
      }
      return json({});
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(
      <AuthProvider initialUser={requester}>
        <ActionsTaken mode="requester" ticketId={91} ticketNumber="TKT-20260930-000091" />
      </AuthProvider>,
    );

    expect(await screen.findByText("Previous-cycle work completed")).toBeInTheDocument();
    expect(screen.getByText("Superseded by a new work item")).toBeInTheDocument();
    expect(screen.getByText("1", { selector: "dd" })).toBeInTheDocument();
    expect(screen.getByText("2", { selector: "dd" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create Action" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /edit action/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /complete action/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "History for Action #500" }));
    expect(await screen.findByText("Initial previous-cycle work")).toBeInTheDocument();
    expect(screen.getByText(/Created by Niran Staff/i)).toBeInTheDocument();
    expect(screen.getByText(/Revision page 1 of 2/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next revision history page for Action #500" }));
    expect(await screen.findByText(/Completed by Mali Staff/i)).toBeInTheDocument();
    expect(screen.getByText(/Revision page 2 of 2/i)).toBeInTheDocument();
  });
});
