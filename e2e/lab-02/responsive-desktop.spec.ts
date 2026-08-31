import { test, expect } from "@playwright/test";
import { createE2eFixture, destroyE2eFixture, type E2eFixture } from "./support/fixtures.js";
import { assertNoHorizontalOverflow, assertSelectedOptionTextFits, assertVisibleWithinViewport, openRequesterShell, screenshot } from "./support/ui.js";

test.use({ viewport: { width: 1440, height: 900 } });

let fixture: E2eFixture;
test.beforeAll(async () => { fixture = await createE2eFixture("desktop", 1); });
test.afterAll(async () => { await destroyE2eFixture(fixture); });

test.describe("RESP-01 desktop 1440x900", () => {
  test("renders Development Requester Selection without clipping", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Select a Development Requester" })).toBeVisible();
    await expect(page.locator(`#development-requester option[value="${fixture.requesterA.id}"]`)).toHaveCount(1);
    await assertNoHorizontalOverflow(page);
    await assertVisibleWithinViewport(page, ["#requester-selection-heading", "#development-requester", "button"]);
    await screenshot(page, "artifacts/lab-02/screenshots/requester-selection/requester-selection-desktop.png");
  });

  test("keeps Create Ticket fields and actions usable", async ({ page }) => {
    await openRequesterShell(page, fixture.requesterA.id);
    await expect(page.getByLabel("Description *")).toBeVisible();
    await expect(page.getByRole("region", { name: /create ticket/i }).getByRole("button", { name: "Create Ticket", exact: true })).toBeEnabled();
    await assertNoHorizontalOverflow(page);
    await assertVisibleWithinViewport(page, ["#create-ticket-heading", ".lab2-create-ticket label", ".lab2-create-ticket button"]);
    await screenshot(page, "artifacts/lab-02/screenshots/create-ticket/create-ticket-desktop.png");
  });

  test("uses the desktop My Tickets table and supports an empty state", async ({ page }) => {
    await openRequesterShell(page, fixture.requesterA.id);
    await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "My Tickets" }).click();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.locator(".lab2-table-wrap").getByText(fixture.tickets[0].summary)).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await assertVisibleWithinViewport(page, ["#my-tickets-heading", ".lab2-ticket-controls", ".lab2-table-wrap", ".lab2-pagination button"]);
    await assertSelectedOptionTextFits(page, [".lab2-ticket-controls select"]);
    await screenshot(page, "artifacts/lab-02/screenshots/my-tickets/my-tickets-desktop.png");

    await page.getByRole("button", { name: "Change Requester" }).click();
    await page.getByRole("combobox", { name: "Development Requester" }).selectOption(String(fixture.requesterB.id));
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "My Tickets" }).click();
    await expect(page.getByRole("heading", { name: "No tickets yet" })).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await assertVisibleWithinViewport(page, ["#my-tickets-heading", ".lab2-ticket-controls", ".lab2-list-empty", ".lab2-list-empty button"]);
    await assertSelectedOptionTextFits(page, [".lab2-ticket-controls select"]);
    await screenshot(page, "artifacts/lab-02/screenshots/my-tickets/my-tickets-empty-desktop.png");
  });

  test("renders read-only Ticket Detail with Attachment panel", async ({ page }) => {
    await openRequesterShell(page, fixture.requesterA.id);
    await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "My Tickets" }).click();
    await page.getByRole("button", { name: "View ticket" }).first().click();
    await expect(page.getByRole("heading", { name: "Ticket Detail" })).toBeVisible();
    await expect(page.getByText("Ticket information")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Attachments" })).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await screenshot(page, "artifacts/lab-02/screenshots/ticket-detail/ticket-detail-desktop.png");
  });
});
