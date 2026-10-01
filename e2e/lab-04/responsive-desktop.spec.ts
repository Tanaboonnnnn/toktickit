import { test } from "@playwright/test";
import { createIssue79Fixture, destroyIssue79Fixture, type Issue79Fixture } from "./support/issue79-fixture.js";
import { checkIssue79ResponsiveScreens } from "./support/responsive-hardening.js";

let fixture: Issue79Fixture;
test.beforeAll(async () => { fixture = await createIssue79Fixture(); });
test.afterAll(async () => { await destroyIssue79Fixture(fixture); });

test("RESP-01 desktop checks major Lab 4 and retained surfaces at 1440x900", async ({ page }) => {
  await checkIssue79ResponsiveScreens(page, fixture, { name: "desktop", width: 1440, height: 900, testId: "RESP-01" });
});
