import { test, expect } from "@playwright/test";
import { createE2eFixture, countFixtureTickets, destroyE2eFixture, type E2eFixture } from "./support/fixtures.js";
import { fillCreateTicket, openRequesterShell } from "./support/ui.js";

let fixture: E2eFixture;
test.beforeAll(async () => { fixture = await createE2eFixture("retry", 0); });
test.afterAll(async () => { await destroyE2eFixture(fixture); });

test("E2E-02 validates locally, retains values, and retries a safe backend failure", async ({ page }) => {
  await openRequesterShell(page, fixture.requesterA.id);
  const createRegion = page.getByRole("region", { name: /create ticket/i });
  let createRequests = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/api/tickets")) createRequests += 1;
  });

  await createRegion.getByRole("button", { name: "Create Ticket", exact: true }).click();
  await expect(page.locator("#ticket-category")).toBeFocused();
  expect(createRequests).toBe(0);

  const summary = `${fixture.tag} corrected ticket`;
  const description = `${fixture.tag} corrected description with enough characters.`;
  await fillCreateTicket(page, fixture.category.id, fixture.relatedSystem.id, summary, description, "HIGH");

  let failOnce = true;
  await page.route("**/api/tickets", async (route) => {
    if (route.request().method() === "POST" && failOnce) {
      failOnce = false;
      await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Unable to create ticket" } }) });
      return;
    }
    await route.continue();
  });
  await createRegion.getByRole("button", { name: "Create Ticket", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Unable to create ticket");
  await expect(page.getByLabel("Ticket Summary *")).toHaveValue(summary);
  await expect(page.getByLabel("Description *")).toHaveValue(description);
  await page.unroute("**/api/tickets");

  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByTestId("ticket-number")).toBeVisible();
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "My Tickets" }).click();
  await expect(page.locator(".lab2-table-wrap").getByText(summary)).toBeVisible();
  expect(await countFixtureTickets(fixture)).toBe(1);
  expect(createRequests).toBe(2);
});
