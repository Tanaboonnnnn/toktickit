import { cleanup, render, screen } from "@testing-library/react";
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

describe("UI-04 Action draft lifetime", () => {
  it("preserves a create draft across an unrelated parent Ticket refresh but clears it on Ticket identity change", async () => {
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/actions-taken?")) {
        return json({ items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 0, capabilities: { canCreate: true } });
      }
      if (url.endsWith("/api/staff/assignees")) {
        return json({ items: [{ id: 21, name: "Niran Staff", role: "IT_STAFF" }] });
      }
      return json({});
    }));
    const user = userEvent.setup();
    const { rerender } = render(
      <AuthProvider initialUser={staff}>
        <ActionsTaken mode="staff" ticketId={91} ticketNumber="TKT-20261001-000091" ticketVersion={7} />
      </AuthProvider>,
    );

    await user.click(await screen.findByRole("button", { name: "Create Action" }));
    await user.type(screen.getByRole("textbox", { name: "Action Description" }), "Keep this diagnostic draft");
    await user.type(screen.getByRole("textbox", { name: "Attachment Notes" }), "Reference the existing port photo");

    rerender(<AuthProvider initialUser={staff}><ActionsTaken mode="staff" ticketId={91} ticketNumber="TKT-20261001-000091" ticketVersion={8} /></AuthProvider>);
    expect(screen.getByRole("textbox", { name: "Action Description" })).toHaveValue("Keep this diagnostic draft");
    expect(screen.getByRole("textbox", { name: "Attachment Notes" })).toHaveValue("Reference the existing port photo");

    rerender(<AuthProvider initialUser={staff}><ActionsTaken mode="staff" ticketId={92} ticketNumber="TKT-20261001-000092" ticketVersion={1} /></AuthProvider>);
    expect(screen.queryByRole("textbox", { name: "Action Description" })).not.toBeInTheDocument();
    expect(await screen.findByText("No Actions Taken yet.")).toBeInTheDocument();
  });
});
