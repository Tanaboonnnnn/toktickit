import { test, expect } from "@playwright/test";
import { createE2eFixture, destroyE2eFixture, type E2eFixture } from "./support/fixtures.js";
import { assertNoHorizontalOverflow, assertVisibleWithinViewport, fillCreateTicket, openRequesterShell, screenshot } from "./support/ui.js";

test.use({ viewport: { width: 834, height: 1112 } });

let fixture: E2eFixture;
test.beforeAll(async () => { fixture = await createE2eFixture("tablet", 1); });
test.afterAll(async () => { await destroyE2eFixture(fixture); });

test.describe("RESP-02 tablet 834x1112", () => {
  test("reflows filters and keeps Summary/Description readable", async ({ page }) => {
    await openRequesterShell(page, fixture.requesterA.id);
    await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "My Tickets" }).click();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByLabel("Search Ticket Number or Summary")).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await assertVisibleWithinViewport(page, ["#my-tickets-heading", ".lab2-ticket-controls", ".lab2-table-wrap", ".lab2-pagination button"]);
  });

  test("captures a real partial-success Create Ticket state", async ({ page }) => {
    await openRequesterShell(page, fixture.requesterA.id);
    await fillCreateTicket(page, fixture.category.id, fixture.relatedSystem.id, `${fixture.tag} partial tablet`, `${fixture.tag} tablet partial-success description.`);
    await page.getByLabel("Select files").setInputFiles([
      { name: "tablet-good.png", mimeType: "image/png", buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]) },
      { name: "tablet-failed.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7\nfixture") },
    ]);
    let uploads = 0;
    await page.route("**/api/tickets/*/attachments", async (route) => {
      if (route.request().method() !== "POST") { await route.continue(); return; }
      uploads += 1;
      if (uploads === 2) {
        await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Unable to upload attachment" } }) });
      } else await route.continue();
    });
    await page.getByRole("region", { name: /create ticket/i }).getByRole("button", { name: "Create Ticket", exact: true }).click();
    await expect(page.getByTestId("ticket-number")).toBeVisible();
    await expect(page.getByText("Upload failed")).toBeVisible();
    await expect(page.getByText("Uploaded")).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await assertVisibleWithinViewport(page, ["#create-ticket-heading", ".lab2-success", ".lab2-success-actions button"]);
    await screenshot(page, "artifacts/lab-02/screenshots/create-ticket/create-ticket-partial-failure-tablet.png");
  });

  test("keeps Ticket Detail and Attachment actions usable", async ({ page }) => {
    await openRequesterShell(page, fixture.requesterA.id);
    await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "My Tickets" }).click();
    await page.getByRole("button", { name: "View ticket" }).first().click();
    await expect(page.getByRole("heading", { name: "Ticket Detail" })).toBeVisible();
    await expect(page.getByLabel("Add an Attachment")).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await assertVisibleWithinViewport(page, ["#ticket-detail-heading", ".lab2-readonly-section", ".lab2-attachments-section", ".lab2-ticket-detail button"]);
  });
});
