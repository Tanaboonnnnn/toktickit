import { expect, test } from "@playwright/test";
import { createIssue79Fixture, destroyIssue79Fixture, type Issue79Fixture } from "./support/issue79-fixture.js";
import { checkIssue79ResponsiveScreens } from "./support/responsive-hardening.js";

let fixture: Issue79Fixture;
test.beforeAll(async () => { fixture = await createIssue79Fixture(); });
test.afterAll(async () => { await destroyIssue79Fixture(fixture); });

test("RESP-02 tablet checks major Lab 4 and retained surfaces at 834x1112", async ({ page }) => {
  await checkIssue79ResponsiveScreens(page, fixture, { name: "tablet", width: 834, height: 1112, testId: "RESP-02" });
  const administratorRow = page.getByRole("row").filter({ hasText: "Ploy Administrator" });
  await expect(administratorRow.locator('[data-label="Role"]')).toHaveCSS("white-space", "nowrap");
  await expect(page.locator(".lab3-user-table .lab3-account-badge.is-inactive").first()).toHaveCSS("white-space", "nowrap");
});
