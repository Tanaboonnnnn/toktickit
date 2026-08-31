import { test, expect } from "@playwright/test";
import { createE2eFixture, destroyE2eFixture, type E2eFixture } from "./support/fixtures.js";
import { openRequesterShell } from "./support/ui.js";

let fixture: E2eFixture;
test.beforeAll(async () => { fixture = await createE2eFixture("list", 12); });
test.afterAll(async () => { await destroyE2eFixture(fixture); });

test("E2E-04 exercises My Tickets search, filters, sorting, pagination, and states", async ({ page }) => {
  await openRequesterShell(page, fixture.requesterA.id);
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "My Tickets" }).click();
  const table = page.locator(".lab2-table-wrap");
  await expect(table).toBeVisible();
  await expect(page.getByText("12 total")).toBeVisible();

  const first = fixture.tickets[0];
  const search = page.getByLabel("Search Ticket Number or Summary");
  await search.fill(first.ticketNumber.slice(-6));
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(table.getByText(first.summary)).toBeVisible();
  await search.fill(first.summary.slice(-8));
  await search.press("Enter");
  await expect(table.getByText(first.summary)).toBeVisible();

  await page.getByRole("button", { name: "Clear search/filters" }).first().click();
  await page.getByLabel("Category").selectOption(String(fixture.secondCategory.id));
  await expect(table.locator("tbody tr")).toHaveCount(6);
  await page.getByLabel("Category").selectOption("");
  await page.getByLabel("Requested Priority").selectOption("HIGH");
  await expect(table.locator("tbody tr")).toHaveCount(4);
  await page.getByLabel("Current Status").selectOption("NEW");
  await expect(table.locator("tbody tr")).toHaveCount(4);

  const highTicket = fixture.tickets[2];
  await search.fill(highTicket.summary);
  await search.press("Enter");
  await expect(table.getByText(highTicket.summary)).toBeVisible();
  await expect(table.locator("tbody tr")).toHaveCount(1);
  await page.getByLabel("Sort by").selectOption("summary");
  await page.getByLabel("Sort direction").selectOption("asc");
  await expect(table.getByText(highTicket.summary)).toBeVisible();

  await page.getByRole("button", { name: "Clear search/filters" }).first().click();
  await page.getByLabel("Page size").selectOption("10");
  await expect(page.getByText(/Page 1 of 2/)).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText(/Page 2 of 2/)).toBeVisible();
  await page.getByLabel("Requested Priority").selectOption("HIGH");
  await expect(page.getByText(/Page 1 of 1/)).toBeVisible();
  await page.getByRole("button", { name: "Clear search/filters" }).first().click();
  await page.getByLabel("Page size").selectOption("20");
  await expect(page.getByText(/Page 1 of 1/)).toBeVisible();
  let recoveryInjected = false;
  await page.route("**/api/tickets?*", async (route) => {
    const url = new URL(route.request().url());
    if (!recoveryInjected && route.request().method() === "GET" && url.searchParams.get("pageSize") === "10" && !url.searchParams.has("search")) {
      recoveryInjected = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], page: 3, pageSize: 10, totalItems: 12, totalPages: 2 }),
      });
      return;
    }
    await route.continue();
  });
  await page.getByLabel("Page size").selectOption("10");
  await expect(page.getByText(/Page 2 of 2/)).toBeVisible();
  expect(recoveryInjected).toBe(true);
  await page.unroute("**/api/tickets?*");
  await page.getByRole("button", { name: "Previous" }).click();
  await expect(page.getByText(/Page 1 of 2/)).toBeVisible();
  await page.getByLabel("Page size").selectOption("20");
  await expect(page.getByText(/Page 1 of 1/)).toBeVisible();
  await page.getByLabel("Page size").selectOption("50");
  await expect(page.getByText(/Page 1 of 1/)).toBeVisible();

  const requestedUrls: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "GET" && request.url().includes("/api/tickets")) requestedUrls.push(request.url());
  });
  await search.fill(`${fixture.tag} definitely-no-match`);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No matching tickets" })).toBeVisible();
  expect(requestedUrls.some((url) => url.includes("page=1") && url.includes("pageSize=10") && !url.includes("definitely-no-match"))).toBe(true);
  await page.getByRole("button", { name: "Clear search/filters" }).last().click();
  await expect(search).toHaveValue("");
  await expect(page.getByText(/Page 1 of 2/)).toBeVisible();
  await expect(table.getByText(fixture.tickets[11].summary)).toBeVisible();

  await page.getByRole("button", { name: "Change Requester" }).click();
  await page.getByRole("combobox", { name: "Development Requester" }).selectOption(String(fixture.requesterB.id));
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "My Tickets" }).click();
  await expect(page.getByRole("heading", { name: "No tickets yet" })).toBeVisible();
  await expect(page.getByText(fixture.tickets[0].summary)).toHaveCount(0);
});
