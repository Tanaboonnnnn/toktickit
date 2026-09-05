import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const requester = { id: 1, name: "Style Requester", email: "style@example.test" };
const category = { id: 1, name: "Hardware" };
const relatedSystem = { id: 1, name: "University Email" };

function json(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body, blob: async () => new Blob(["bytes"]) };
}

function styleFetch() {
  vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("development-requesters")) return Promise.resolve(json([requester]));
    if (url.includes("categories")) return Promise.resolve(json([category]));
    if (url.includes("related-systems")) return Promise.resolve(json([relatedSystem]));
    return Promise.resolve(json({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 }));
  }));
}

describe("STYLE-01 Zen Green tokens", () => {
  beforeEach(() => {
    sessionStorage.setItem("toktickit.developmentRequesterId", "1");
    styleFetch();
  });

  afterEach(() => {
    cleanup();
    sessionStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("exposes the exact UI-spec color, focus, and elevation tokens", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "Create Ticket" });
    const stylesheet = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");
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
      "--focus-ring": "0 0 0 3px rgba(0, 107, 60, .28)",
      "--surface-shadow": "0 2px 10px rgba(23, 53, 42, .08)",
    };
    for (const [token, value] of Object.entries(expected)) {
      const declaration = stylesheet.match(new RegExp(`${token}\\s*:\\s*([^;]+);`))?.[1]?.trim();
      expect(declaration?.toLowerCase()).toBe(value);
    }
  });

  it("uses reusable state and hierarchy classes instead of inline color styling", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "Create Ticket" });
    const stylesheet = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");
    const headerRule = stylesheet.match(/\.lab2-shell-header\s*\{([\s\S]*?)\}/)?.[1] ?? "";
    expect(headerRule).toMatch(/background\s*:\s*var\(--color-primary\)\s*;/i);
    expect(within(screen.getByRole("region", { name: /create ticket/i })).getByRole("button", { name: "Create Ticket" })).toHaveClass("lab2-button-primary");
    const readOnlyOutputs = Array.from(document.querySelectorAll("output"));
    expect(readOnlyOutputs).toHaveLength(3);
    for (const output of readOnlyOutputs) {
      expect(output.parentElement).toHaveClass("lab2-field-group");
    }
    expect(document.querySelector(".lab2-create-ticket" )?.querySelector(".lab2-field-group input")).not.toHaveAttribute("style");
  });
});
