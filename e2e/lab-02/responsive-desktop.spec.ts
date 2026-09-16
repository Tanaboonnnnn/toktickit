import { test, expect } from "@playwright/test";
import { createE2eFixture, destroyE2eFixture, type E2eFixture } from "./support/fixtures.js";
import { assertNoHorizontalOverflow, assertSelectedOptionTextFits, assertVisibleWithinViewport, createTicketFromUi, loginRequester, logoutRequester, openRequesterShell, screenshot } from "./support/ui.js";

test.use({ viewport: { width: 1440, height: 900 } });

let fixture: E2eFixture;
test.beforeAll(async () => { fixture = await createE2eFixture("desktop", 1); });
test.afterAll(async () => { await destroyE2eFixture(fixture); });

test.describe("RESP-01 desktop 1440x900", () => {
  test("renders Login without clipping", async ({ page }) => {
    await page.goto("/#/login");
    await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await assertVisibleWithinViewport(page, [".lab2-auth-card", ".lab2-auth-card input", ".lab2-auth-card button"]);
    await screenshot(page, "artifacts/lab-03/screenshots/login/login-desktop.png");
  });

  test("keeps Create Ticket fields and actions usable", async ({ page }) => {
    await openRequesterShell(page, fixture.requesterA);
    await expect(page.locator(".lab2-shell-header")).toHaveCSS("background-color", "rgb(0, 107, 60)");
    await expect(page.getByLabel("Description *")).toBeVisible();
    await expect(page.getByRole("region", { name: /create ticket/i }).getByRole("button", { name: "Create Ticket", exact: true })).toBeEnabled();
    await assertNoHorizontalOverflow(page);
    await assertVisibleWithinViewport(page, ["#create-ticket-heading", ".lab2-create-ticket label", ".lab2-create-ticket button"]);
    await screenshot(page, "artifacts/lab-03/screenshots/create-ticket/create-ticket-desktop.png");

    await createTicketFromUi(
      page,
      fixture.category.id,
      fixture.relatedSystem.id,
      `${fixture.tag} Zen Green success evidence`,
      `${fixture.tag} success evidence with visible Zen Green status and priority badges.`,
      "HIGH",
    );
    await expect(page.locator(".lab2-priority-high")).toHaveText("HIGH");
    await expect(page.locator(".lab2-status-new")).toHaveText("New");
    await screenshot(page, "artifacts/lab-03/screenshots/create-ticket/create-ticket-success-desktop.png");
  });

  test("uses the desktop My Tickets table and supports an empty state", async ({ page }) => {
    await openRequesterShell(page, fixture.requesterA);
    await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "My Tickets" }).click();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.locator(".lab2-table-wrap").getByText(fixture.tickets[0].summary)).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await assertVisibleWithinViewport(page, ["#my-tickets-heading", ".lab2-ticket-controls", ".lab2-table-wrap", ".lab2-pagination button"]);
    await assertSelectedOptionTextFits(page, [".lab2-ticket-controls select"]);
    await screenshot(page, "artifacts/lab-03/screenshots/my-tickets/my-tickets-desktop.png");

    await logoutRequester(page);
    await loginRequester(page, fixture.requesterB);
    await expect(page.getByRole("heading", { name: "No tickets yet" })).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await assertVisibleWithinViewport(page, ["#my-tickets-heading", ".lab2-ticket-controls", ".lab2-list-empty", ".lab2-list-empty button"]);
    await assertSelectedOptionTextFits(page, [".lab2-ticket-controls select"]);
    await screenshot(page, "artifacts/lab-03/screenshots/my-tickets/my-tickets-empty-desktop.png");
  });

  test("renders read-only Ticket Detail with Attachment panel", async ({ page }) => {
    await openRequesterShell(page, fixture.requesterA);
    await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "My Tickets" }).click();
    await page.getByRole("button", { name: "View ticket" }).first().click();
    await expect(page.getByRole("heading", { name: "Ticket Detail" })).toBeVisible();
    await expect(page.getByText("Ticket information")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Attachments" })).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await screenshot(page, "artifacts/lab-03/screenshots/ticket-detail/ticket-detail-desktop.png");
  });
});
