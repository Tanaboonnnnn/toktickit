import { test, expect } from "@playwright/test";
import { createE2eFixture, createFixtureAttachment, destroyE2eFixture, type E2eFixture } from "./support/fixtures.js";
import { assertNoHorizontalOverflow, assertSelectedOptionTextFits, assertTouchTargets, assertVisibleWithinViewport, openRequesterShell, screenshot } from "./support/ui.js";

test.use({ viewport: { width: 390, height: 844 } });

let fixture: E2eFixture;
test.beforeAll(async () => { fixture = await createE2eFixture("mobile", 1); });
test.afterAll(async () => { await destroyE2eFixture(fixture); });

test.describe("RESP-03 mobile 390x844", () => {
  test("stacks Create Ticket fields and focuses the first invalid field", async ({ page }) => {
    await openRequesterShell(page, fixture.requesterA.id);
    await page.getByRole("region", { name: /create ticket/i }).getByRole("button", { name: "Create Ticket", exact: true }).click();
    await expect(page.getByText("Category is required.")).toBeVisible();
    await expect(page.locator("#ticket-category")).toBeFocused();
    await assertNoHorizontalOverflow(page);
    await assertVisibleWithinViewport(page, ["#create-ticket-heading", ".lab2-create-ticket label", ".lab2-create-ticket button"]);
    await assertTouchTargets(page, [".lab2-create-ticket button", ".lab2-create-ticket input", ".lab2-create-ticket select", ".lab2-create-ticket textarea"]);
    await screenshot(page, "artifacts/lab-02/screenshots/create-ticket/create-ticket-validation-mobile.png");
  });

  test("uses readable ticket cards and a no-results state", async ({ page }) => {
    await openRequesterShell(page, fixture.requesterA.id);
    await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "My Tickets" }).click();
    await expect(page.locator(".lab2-ticket-cards")).toBeVisible();
    await page.getByLabel("Search Ticket Number or Summary").fill(`${fixture.tag} no-match`);
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByRole("heading", { name: "No matching tickets" })).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await assertVisibleWithinViewport(page, ["#my-tickets-heading", ".lab2-ticket-controls", ".lab2-ticket-cards", ".lab2-pagination button"]);
    await assertSelectedOptionTextFits(page, [".lab2-ticket-controls select"]);
    await assertTouchTargets(page, [".lab2-ticket-controls button", ".lab2-ticket-controls input", ".lab2-ticket-controls select", ".lab2-ticket-card button"]);
    await screenshot(page, "artifacts/lab-02/screenshots/my-tickets/my-tickets-no-results-mobile.png");
  });

  test("wraps long removed Attachment metadata and hides unavailable actions", async ({ page }) => {
    const longFilename = `${"very-long-attachment-name-".repeat(12)}.pdf`;
    await createFixtureAttachment(fixture, fixture.tickets[0].id, true, longFilename);
    await openRequesterShell(page, fixture.requesterA.id);
    await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "My Tickets" }).click();
    await page.getByRole("button", { name: "View ticket" }).first().click();
    const removed = page.getByText(longFilename);
    await expect(removed).toBeVisible();
    const card = removed.locator("..", { has: removed }).locator("..");
    await expect(card.getByText("Removed").first()).toBeVisible();
    await expect(card.getByText("Superseded evidence")).toBeVisible();
    await expect(card.getByRole("button", { name: /download|remove/i })).toHaveCount(0);
    await assertNoHorizontalOverflow(page);
    await assertVisibleWithinViewport(page, ["#ticket-detail-heading", ".lab2-readonly-section", ".lab2-attachments-section", ".lab2-attachment-card", ".lab2-ticket-detail button"]);
    await assertTouchTargets(page, [".lab2-ticket-detail button", ".lab2-ticket-detail input"]);
    await screenshot(page, "artifacts/lab-02/screenshots/ticket-detail/ticket-detail-removed-attachment-mobile.png");
  });
});
