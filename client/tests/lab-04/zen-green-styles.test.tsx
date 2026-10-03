import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const styles = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`).exec(styles);
  if (!match) throw new Error(`Missing stylesheet rule: ${selector}`);
  return match[1];
}

describe("STYLE-01 Zen Green and responsive Action semantics", () => {
  it("keeps primary, page, text, and read-only colors on shared design tokens", () => {
    const root = rule(":root");
    expect(root).toContain("--color-primary: #006b3c;");
    expect(root).toContain("--color-page: #f5f7f6;");
    expect(root).toContain("--color-text: #17352a;");
    expect(root).toContain("--color-readonly-bg: #f0f3ef;");
    expect(rule(".lab4-action-status")).toContain("background: var(--color-pale-green);");
    expect(rule(".lab4-action-revision")).toContain("background: var(--color-readonly-bg);");
  });

  it("wraps long Action content and stacks Action details and editors on mobile", () => {
    expect(rule(".lab4-action-details dd")).toContain("overflow-wrap: anywhere;");
    expect(rule(".lab4-action-details dd")).toContain("white-space: pre-wrap;");
    expect(styles).toMatch(/@media \(max-width: 767\.98px\)[\s\S]*?\.lab4-action-form-grid,\s*\.lab4-action-details\s*\{\s*grid-template-columns: 1fr;/);
  });
});
