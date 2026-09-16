import type { APIRequestContext, Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { E2E_REQUESTER_PASSWORD } from "./fixtures.js";

const API_URL = "http://127.0.0.1:4311";
const FRONTEND_ORIGIN = "http://127.0.0.1:4312";

export type LoginRequester = { email: string };

export async function loginRequester(page: Page, requester: LoginRequester): Promise<void> {
  await page.goto("/#/login");
  const loginHeading = page.getByRole("heading", { name: "Login" });
  const ticketsHeading = page.getByRole("heading", { name: "My Tickets" });
  await Promise.race([
    loginHeading.waitFor(),
    ticketsHeading.waitFor(),
  ]);
  if (await ticketsHeading.isVisible().catch(() => false)) return;
  await page.getByLabel("Email").fill(requester.email);
  await page.getByLabel("Password").fill(E2E_REQUESTER_PASSWORD);
  await page.getByRole("button", { name: "Login" }).click();
  await page.getByRole("heading", { name: "My Tickets" }).waitFor();
}

export async function logoutRequester(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Logout" }).click();
  await page.getByRole("heading", { name: "Login" }).waitFor();
}

export async function csrfToken(request: APIRequestContext): Promise<string> {
  const response = await request.get(`${API_URL}/api/auth/csrf`, { headers: { Origin: FRONTEND_ORIGIN } });
  if (response.status() !== 200) throw new Error(`Unable to load E2E CSRF token: ${response.status()}`);
  const body = await response.json() as { csrfToken?: string };
  if (!body.csrfToken) throw new Error("E2E CSRF response did not include csrfToken");
  return body.csrfToken;
}

export async function unsafeApiHeaders(request: APIRequestContext): Promise<Record<string, string>> {
  return { Origin: FRONTEND_ORIGIN, "X-CSRF-Token": await csrfToken(request) };
}

export async function openRequesterShell(page: Page, requester: LoginRequester): Promise<void> {
  await loginRequester(page, requester);
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "Create Ticket" }).click();
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

export async function assertSelectedOptionTextFits(page: Page, selectors: string[], extraArrowSpace = 32): Promise<void> {
  const failures = await page.evaluate(({ selectors: requested, extraArrowSpace: arrowSpace }) => requested.flatMap((selector) => {
    const elements = Array.from(document.querySelectorAll<HTMLSelectElement>(selector));
    return elements.flatMap((element) => {
      const style = getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") return [];
      const selectedText = element.selectedOptions[0]?.textContent?.trim() ?? "";
      if (!selectedText) return [];

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) return [`${selector}: unable to measure selected option text`];

      context.font = style.font;
      const textWidth = context.measureText(selectedText).width;
      const paddingLeft = Number.parseFloat(style.paddingLeft) || 0;
      const paddingRight = Number.parseFloat(style.paddingRight) || 0;
      const requiredWidth = Math.ceil(textWidth + paddingLeft + paddingRight + arrowSpace);
      const actualWidth = Math.floor(element.getBoundingClientRect().width);
      return actualWidth + 1 < requiredWidth
        ? [`${selector}: selected option "${selectedText}" requires about ${requiredWidth}px but control is ${actualWidth}px wide`]
        : [];
    });
  }), { selectors, extraArrowSpace });
  if (failures.length > 0) throw new Error(`Select value readability failures: ${failures.join("; ")}`);
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
