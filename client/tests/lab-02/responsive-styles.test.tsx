import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return stylesheet.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? "";
}

describe("STYLE-03 responsive wrapping and reflow contract", () => {
  it("allows long summaries, descriptions, validation messages, and filenames to wrap", () => {
    expect(rule(".lab2-summary-cell")).toMatch(/overflow-wrap:\s*anywhere/);
    expect(rule(".lab2-detail-description")).toMatch(/white-space:\s*pre-wrap/);
    expect(rule(".lab2-filename")).toMatch(/overflow-wrap:\s*anywhere/);
    expect(rule(".lab2-filename")).toMatch(/word-break:\s*break-word/);
    expect(rule('.lab2-field-group p[role="alert"]')).not.toMatch(/white-space:\s*nowrap/);
  });

  it("keeps table overflow contained and defines mobile cards plus responsive control reflow", () => {
    expect(rule(".lab2-table-wrap")).toMatch(/overflow-x:\s*auto/);
    expect(rule(".lab2-ticket-table")).toMatch(/min-width:\s*820px/);
    expect(stylesheet).toMatch(/@media\s*\(max-width:\s*767\.98px\)[\s\S]*?\.lab2-table-wrap\s*\{[^}]*display:\s*none/);
    expect(stylesheet).toMatch(/@media\s*\(max-width:\s*767\.98px\)[\s\S]*?\.lab2-ticket-cards\s*\{[^}]*display:\s*grid/);
    expect(stylesheet).toMatch(/@media\s*\(max-width:\s*991\.98px\)[\s\S]*?\.lab2-ticket-controls\s*\{[^}]*grid-template-columns:\s*repeat\(3/);
    expect(stylesheet).toMatch(/@media\s*\(max-width:\s*767\.98px\)[\s\S]*?\.lab2-ticket-controls\s*\{[^}]*grid-template-columns:\s*1fr/);
  });
});
