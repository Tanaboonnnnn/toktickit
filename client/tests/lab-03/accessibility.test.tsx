import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../src/auth-context.js";
import AppShell from "../../src/AppShell.js";
import Login from "../../src/Login.js";
import StaffTicketQueue from "../../src/staff/StaffTicketQueue.js";

const requester = { id: 51, name: "A11y Requester", email: "requester51@example.test", role: "REQUESTER" as const, mustChangePassword: false };
const staff = { id: 52, name: "A11y Staff", email: "staff51@example.test", role: "IT_STAFF" as const, mustChangePassword: false };

function response(body: unknown, status = 200): Promise<Response> {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => body } as Response);
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("A11Y-01 Lab 3 accessibility conventions", () => {
  it("uses visible labels, required semantics, password autocomplete, and keyboard-submit on Login", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network unavailable")));
    render(<AuthProvider initialUser={requester}><Login /></AuthProvider>);
    const email = screen.getByRole("textbox", { name: "Email" });
    const password = screen.getByLabelText("Password");
    expect(email).toBeRequired();
    expect(email).toHaveAttribute("autocomplete", "username");
    expect(password).toBeRequired();
    expect(password).toHaveAttribute("type", "password");
    expect(password).toHaveAttribute("autocomplete", "current-password");
    await userEvent.setup().type(email, "a11y@example.test");
    await userEvent.setup().type(password, "Accessible-Password-51!{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to sign in");
  });

  it("gives the authenticated shell named navigation and text role/state meaning without color dependency", () => {
    render(<AuthProvider initialUser={requester}><AppShell route="#/staff/tickets" /></AuthProvider>);
    const nav = screen.getByRole("navigation", { name: "Primary navigation" });
    expect(within(nav).getByRole("button", { name: "My Tickets" })).toBeEnabled();
    expect(screen.getByRole("heading", { name: "Access Denied" })).toBeInTheDocument();
    expect(screen.getByLabelText("Current authenticated user")).toHaveTextContent("Requester");
    expect(screen.getByRole("button", { name: "Change Password" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Logout" })).toBeEnabled();
  });

  it("labels every Staff Queue control and communicates empty state in text", async () => {
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/categories")) return response([]);
      if (url.includes("/api/staff/assignees")) return response({ items: [] });
      if (url.includes("/api/staff/tickets")) return response({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
      return response({});
    }));
    render(<AuthProvider initialUser={staff}><StaffTicketQueue /></AuthProvider>);
    await screen.findByRole("heading", { name: "Ticket Queue" });
    for (const name of ["Search Ticket Number, Summary, or Requester", "Category", "Current Status", "Requested Priority", "IT Priority", "Owner", "Sort by", "Sort direction", "Page size"]) {
      expect(screen.getByLabelText(name)).toBeInTheDocument();
    }
    const empty = await screen.findByRole("status");
    expect(empty).toHaveTextContent("No tickets in the queue");
    expect(empty).toHaveTextContent("There are no Tickets to work on yet.");
  });
});
