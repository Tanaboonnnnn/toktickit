import type { Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export async function openRequesterShell(page: Page, requesterId: number): Promise<void> {
  await page.goto("/");
  const requester = page.getByRole("combobox", { name: "Development Requester" });
  await requester.waitFor();
  await requester.selectOption(String(requesterId));
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("heading", { name: "Create Ticket" }).waitFor();
}

export async function fillCreateTicket(page: Page, categoryId: number, relatedSystemId: number, summary: string, description: string, priority = "MEDIUM"): Promise<void> {
  await page.getByLabel("Category *").selectOption(String(categoryId));
  await page.getByLabel("Related System *").selectOption(String(relatedSystemId));
  await page.getByLabel("Ticket Summary *").fill(summary);
  await page.getByLabel("Requested Priority *").selectOption(priority);
  await page.getByLabel("Description *").fill(description);
}

export async function assertNoHorizontalOverflow(page: Page, tolerance = 2): Promise<void> {
  const widths = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  if (widths.scrollWidth > widths.clientWidth + tolerance) {
    throw new Error(`Page horizontal overflow: scrollWidth=${widths.scrollWidth}, clientWidth=${widths.clientWidth}`);
  }
}

export async function assertVisibleWithinViewport(page: Page, selectors: string[], tolerance = 1): Promise<void> {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("Viewport size is required for containment checks");
  const failures = await page.evaluate(({ selectors: requested, width, tolerance: allowance }) => requested.flatMap((selector) => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
    return elements.filter((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden"
        && (rect.left < -allowance || rect.right > width + allowance || rect.width <= 0 || rect.height <= 0);
    }).map((element) => `${selector}: ${element.tagName} ${element.textContent?.trim().slice(0, 60) ?? ""}`);
  }), { selectors, width: viewport.width, tolerance });
  if (failures.length > 0) throw new Error(`Viewport containment failures: ${failures.join("; ")}`);
}

export async function assertTouchTargets(page: Page, selectors: string[], minimum = 40): Promise<void> {
  const failures = await page.evaluate(({ selectors: requested, minimum: size }) => requested.flatMap((selector) => Array.from(document.querySelectorAll<HTMLElement>(selector)).filter((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && (rect.width < size || rect.height < size);
  }).map((element) => `${selector}: ${element.tagName} ${element.textContent?.trim().slice(0, 60) ?? ""}`)), { selectors, minimum });
  if (failures.length > 0) throw new Error(`Touch target failures: ${failures.join("; ")}`);
}

export async function screenshot(page: Page, relativePath: string): Promise<void> {
  const absolutePath = resolve(process.cwd(), relativePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  await page.screenshot({ path: absolutePath, fullPage: true });
}

export async function createTicketFromUi(page: Page, categoryId: number, relatedSystemId: number, summary: string, description: string, priority = "MEDIUM"): Promise<string> {
  await fillCreateTicket(page, categoryId, relatedSystemId, summary, description, priority);
  await page.getByRole("region", { name: /create ticket/i }).getByRole("button", { name: "Create Ticket", exact: true }).click();
  const number = page.getByTestId("ticket-number");
  await number.waitFor();
  return (await number.textContent())?.trim() ?? "";
}
