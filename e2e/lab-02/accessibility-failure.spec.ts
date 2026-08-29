import { test, expect } from "@playwright/test";
import { createE2eFixture, destroyE2eFixture, type E2eFixture } from "./support/fixtures.js";
import { openRequesterShell } from "./support/ui.js";

let fixture: E2eFixture;
test.beforeAll(async () => { fixture = await createE2eFixture("a11y-e2e", 1); });
test.afterAll(async () => { await destroyE2eFixture(fixture); });

test("E2E-07 supports keyboard focus, validation, and non-color cues", async ({ page }) => {
  await openRequesterShell(page, fixture.requesterA.id);
  const createRegion = page.getByRole("region", { name: /create ticket/i });
  await createRegion.getByRole("button", { name: "Create Ticket", exact: true }).focus();
  await page.keyboard.press("Tab");
  const focusRing = await page.evaluate(() => getComputedStyle(document.activeElement as Element).boxShadow);
  expect(focusRing).not.toBe("none");

  await expect(page.getByLabel("Category *")).toBeEnabled();
  await expect(page.getByLabel("Related System *")).toBeEnabled();
  await page.getByLabel("Category *").focus();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Related System *")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Ticket Summary *")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Requested Priority *")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Description *")).toBeFocused();

  await createRegion.getByRole("button", { name: "Create Ticket", exact: true }).click();
  await expect(page.locator("#ticket-category")).toBeFocused();
  await expect(page.locator("#ticket-category")).toHaveAttribute("aria-describedby", "ticket-category-error");
  await expect(page.getByText("Category is required.")).toBeVisible();

  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "My Tickets" }).focus();
  await page.keyboard.press(" ");
  await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
  await expect(page.locator(".lab2-table-wrap").getByText("Low")).toBeVisible();
  await expect(page.locator(".lab2-table-wrap").getByText("New")).toBeVisible();
  await expect(page.getByRole("button", { name: "Previous" })).toBeDisabled();
  await expect(page.locator(".lab2-table-wrap").getByText(fixture.tickets[0].summary)).toBeVisible();
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "Create Ticket" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Create Ticket" })).toBeVisible();
});

test("E2E-07 presents a safe 500 failure without server internals", async ({ page }) => {
  await openRequesterShell(page, fixture.requesterA.id);
  await page.route("**/api/tickets**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Unable to load tickets" } }) });
    } else await route.continue();
  });
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "My Tickets" }).click();
  await expect(page.getByRole("alert")).toContainText("Unable to load tickets");
  await expect(page.getByRole("alert")).not.toContainText(/Prisma|SQL|DATABASE_URL|storedName|C:\\|stack/i);
  await page.unroute("**/api/tickets**");
});
