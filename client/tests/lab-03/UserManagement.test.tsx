import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../src/auth-context.js";
import UserManagement from "../../src/admin/UserManagement.js";

const administrator = { id: 31, name: "Ada Admin", email: "ada@example.test", role: "ADMINISTRATOR" as const, mustChangePassword: false };
const staff = { id: 41, name: "Niran Staff", email: "niran@example.test", role: "IT_STAFF" as const, mustChangePassword: false, active: true, version: 3 };
const requester = { id: 42, name: "Anan Requester", email: "anan@example.test", role: "REQUESTER" as const, mustChangePassword: true, active: false, version: 2 };

function json(body: unknown, status = 200) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => body } as Response);
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("UI-06 Administrator User Management", () => {
  it("loads the safe list and applies name/email search plus one-role filter", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => json({ items: [staff, requester] }));
    vi.stubGlobal("fetch", fetchMock);
    render(<AuthProvider initialUser={administrator}><UserManagement /></AuthProvider>);

    expect(await screen.findByRole("heading", { name: "User Management" })).toBeInTheDocument();
    expect(screen.getByText("Niran Staff")).toBeInTheDocument();
    expect(screen.getByText("niran@example.test")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.type(screen.getByRole("searchbox", { name: /search users by name or email/i }), "niran@example.test");
    await user.keyboard("{Enter}");
    await user.selectOptions(screen.getByRole("combobox", { name: "Role" }), "IT_STAFF");
    await waitFor(() => {
      const urls = fetchMock.mock.calls.map(([input]) => String(input)).filter((url) => url.includes("/api/admin/users"));
      const latest = new URL(urls.at(-1)!);
      expect(latest.searchParams.get("search")).toBe("niran@example.test");
      expect(latest.searchParams.get("role")).toBe("IT_STAFF");
    });
  });

  it("creates a User with one role and an initial password through CSRF transport", async () => {
    let list = [staff];
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/auth/csrf")) return json({ csrfToken: "csrf-create" });
      if (url.endsWith("/api/admin/users") && init?.method === "POST") {
        list = [...list, { id: 55, name: "New Staff", email: "new.staff@example.test", role: "IT_STAFF", mustChangePassword: true, active: true, version: 1 }];
        return json({ user: list.at(-1) }, 201);
      }
      if (url.includes("/api/admin/users")) return json({ items: list });
      return json({});
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AuthProvider initialUser={administrator}><UserManagement /></AuthProvider>);
    await screen.findByText("Niran Staff");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Create User" }));
    await user.type(screen.getByLabelText("Name", { selector: "input" }), "New Staff");
    await user.type(screen.getByLabelText("Email", { selector: "input" }), "new.staff@example.test");
    await user.selectOptions(screen.getByLabelText("User role"), "IT_STAFF");
    await user.type(screen.getByLabelText("Initial password"), "Issue50 Initial Password!");
    await user.type(screen.getByLabelText("Confirm initial password"), "Issue50 Initial Password!");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("User created successfully")).toBeInTheDocument();
    expect(await screen.findByText("new.staff@example.test")).toBeInTheDocument();
    const post = fetchMock.mock.calls.find(([input, init]) => String(input).endsWith("/api/admin/users") && init?.method === "POST");
    expect(post?.[1]).toEqual(expect.objectContaining({
      credentials: "include",
      headers: expect.objectContaining({ "X-CSRF-Token": "csrf-create" }),
    }));
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({
      name: "New Staff",
      email: "new.staff@example.test",
      role: "IT_STAFF",
      active: true,
      initialPassword: "Issue50 Initial Password!",
      confirmPassword: "Issue50 Initial Password!",
    });
  });

  it("keeps edit fields separate from a confirmed initial-password reset", async () => {
    let current = staff;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/auth/csrf")) return json({ csrfToken: "csrf-edit" });
      if (url.endsWith(`/api/admin/users/${staff.id}`) && init?.method === "PATCH") {
        current = { ...current, name: "Niran Updated", version: 4 };
        return json({ user: current });
      }
      if (url.endsWith(`/api/admin/users/${staff.id}/initial-password`) && init?.method === "POST") {
        current = { ...current, mustChangePassword: true, version: 5 };
        return json({ user: current });
      }
      if (url.includes("/api/admin/users")) return json({ items: [current] });
      return json({});
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AuthProvider initialUser={administrator}><UserManagement /></AuthProvider>);
    await screen.findByText("Niran Staff");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Edit Niran Staff" }));
    expect(screen.queryByDisplayValue(/password/i)).not.toBeInTheDocument();
    const name = screen.getByLabelText("Edit name");
    await user.clear(name);
    await user.type(name, "Niran Updated");
    await user.click(screen.getByRole("button", { name: "Save user" }));
    expect(await screen.findByText("User updated successfully")).toBeInTheDocument();

    await user.type(screen.getByLabelText("New initial password"), "Replacement Password 50!");
    await user.type(screen.getByLabelText("Confirm new initial password"), "Replacement Password 50!");
    await user.click(screen.getByRole("checkbox", { name: /confirm setting a new initial password/i }));
    await user.click(screen.getByRole("button", { name: "Set new initial password" }));
    expect(await screen.findByText("Initial password reset successfully")).toBeInTheDocument();
    const reset = fetchMock.mock.calls.find(([input, init]) => String(input).endsWith(`/api/admin/users/${staff.id}/initial-password`) && init?.method === "POST");
    expect(JSON.parse(String(reset?.[1]?.body))).toEqual({
      initialPassword: "Replacement Password 50!",
      confirmPassword: "Replacement Password 50!",
      expectedVersion: 4,
      confirmed: true,
    });
  });

  it("shows safe conflict feedback without silently retrying a rejected account change", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/auth/csrf")) return json({ csrfToken: "csrf-conflict" });
      if (url.endsWith(`/api/admin/users/${staff.id}`) && init?.method === "PATCH") {
        return json({ error: { code: "CONFLICT", message: "Reassign owned Tickets before deactivating or demoting this user" } }, 409);
      }
      if (url.includes("/api/admin/users")) return json({ items: [staff] });
      return json({});
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AuthProvider initialUser={administrator}><UserManagement /></AuthProvider>);
    await screen.findByText("Niran Staff");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Edit Niran Staff" }));
    await user.click(screen.getByLabelText("Active account"));
    await user.click(screen.getByRole("button", { name: "Save user" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Reassign owned Tickets before deactivating or demoting this user");
    expect(fetchMock.mock.calls.filter(([input, init]) => String(input).endsWith(`/api/admin/users/${staff.id}`) && init?.method === "PATCH")).toHaveLength(1);
  });

  it("distinguishes empty, no-results, forbidden, and recoverable API-failure states", async () => {
    vi.stubGlobal("fetch", vi.fn(() => json({ items: [] })));
    render(<AuthProvider initialUser={administrator}><UserManagement /></AuthProvider>);
    expect(await screen.findByRole("heading", { name: "No users" })).toBeInTheDocument();
    cleanup(); vi.unstubAllGlobals();

    let searchCalls = 0;
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      if (String(input).includes("search=missing")) { searchCalls += 1; return json({ items: [] }); }
      return json({ items: [staff] });
    }));
    render(<AuthProvider initialUser={administrator}><UserManagement /></AuthProvider>);
    await screen.findByText("Niran Staff");
    await userEvent.setup().type(screen.getByRole("searchbox", { name: /search users by name or email/i }), "missing{Enter}");
    expect(await screen.findByRole("heading", { name: "No matching users" })).toBeInTheDocument();
    expect(searchCalls).toBe(1);
    cleanup(); vi.unstubAllGlobals();

    vi.stubGlobal("fetch", vi.fn(() => json({ error: { code: "FORBIDDEN", message: "You do not have permission to perform this action" } }, 403)));
    render(<AuthProvider initialUser={administrator}><UserManagement /></AuthProvider>);
    expect(await screen.findByRole("heading", { name: "Access Denied" })).toBeInTheDocument();
    cleanup(); vi.unstubAllGlobals();

    let attempts = 0;
    vi.stubGlobal("fetch", vi.fn(() => attempts++ === 0
      ? json({ error: { code: "INTERNAL_ERROR", message: "Unable to load users" } }, 500)
      : json({ items: [staff] })));
    render(<AuthProvider initialUser={administrator}><UserManagement /></AuthProvider>);
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load users");
    await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Niran Staff")).toBeInTheDocument();
  });
});
