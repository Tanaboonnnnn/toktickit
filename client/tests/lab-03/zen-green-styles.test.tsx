import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../src/auth-context.js";
import Login from "../../src/Login.js";
import StaffTicketQueue from "../../src/staff/StaffTicketQueue.js";

const staff = { id: 51, name: "Integrated Staff", email: "staff51@example.test", role: "IT_STAFF" as const, mustChangePassword: false };
const requester = { id: 50, name: "Integrated Requester", email: "requester51@example.test", role: "REQUESTER" as const, mustChangePassword: false };

function response(body: unknown, status = 200): Promise<Response> {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => body } as Response);
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("STYLE-01 Lab 3 Zen Green continuity", () => {
  it("keeps the approved Zen Green tokens and uses them in Lab 3 surfaces", () => {
    const css = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");
    const expected: Record<string, string> = {
      "--color-primary": "#006b3c",
      "--color-secondary": "#0b7a46",
      "--color-pale-green": "#eaf6ef",
      "--color-page": "#f5f7f6",
      "--color-surface": "#ffffff",
      "--color-text": "#17352a",
      "--color-muted": "#52665d",
      "--color-border": "#cbd8d1",
      "--color-readonly-bg": "#f0f3ef",
      "--color-readonly-border": "#b9c6bf",
      "--color-error": "#8b1e1e",
      "--color-error-bg": "#fcecec",
      "--color-warning": "#8a5500",
      "--color-warning-bg": "#fff4d6",
    };
    for (const [token, value] of Object.entries(expected)) {
      expect(css.match(new RegExp(`${token}\\s*:\\s*([^;]+);`))?.[1]?.trim().toLowerCase()).toBe(value);
    }
    expect(css).toMatch(/\.lab3-communication-section[\s\S]*background:\s*var\(--color-surface\)/);
    expect(css).toMatch(/\.lab3-ticket-operations\s*\{[^}]*var\(--color-primary\)/);
    expect(css).toMatch(/\.lab3-account-badge\.is-active\s*\{[^}]*var\(--color-pale-green\)/);
    expect(css).toMatch(/\.lab3-message-composer textarea:focus-visible\s*\{[^}]*var\(--focus-ring\)/);
  });

  it("reuses the shared card, field, button, status, and badge hierarchy on Lab 3 screens", async () => {
    const { rerender } = render(<AuthProvider initialUser={requester}><Login /></AuthProvider>);
    expect(screen.getByRole("heading", { name: "Login" }).closest("section")).toHaveClass("lab2-card", "lab3-auth-card");
    expect(screen.getByRole("button", { name: "Login" })).toHaveClass("lab2-button", "lab2-button-primary");

    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/categories")) return response([]);
      if (url.includes("/api/staff/assignees")) return response({ items: [] });
      if (url.includes("/api/staff/tickets")) return response({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
      return response({});
    }));
    rerender(<AuthProvider initialUser={staff}><StaffTicketQueue /></AuthProvider>);
    expect(await screen.findByRole("heading", { name: "Ticket Queue" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Search" })).toHaveClass("lab2-button", "lab2-button-primary");
    expect(screen.getByRole("button", { name: "Clear search/filters" })).toHaveClass("lab2-button", "lab2-button-secondary");
    expect(await screen.findByRole("heading", { name: "No tickets in the queue" })).toBeInTheDocument();
  });
});
