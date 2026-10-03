import { test } from "@playwright/test";
import { createIssue79Fixture, destroyIssue79Fixture, type Issue79Fixture } from "./support/issue79-fixture.js";
import { checkIssue79ResponsiveScreens } from "./support/responsive-hardening.js";

let fixture: Issue79Fixture;
test.beforeAll(async () => { fixture = await createIssue79Fixture(); });
test.afterAll(async () => { await destroyIssue79Fixture(fixture); });

test("RESP-03 mobile checks major Lab 4 and retained surfaces at 390x844", async ({ page }) => {
  await checkIssue79ResponsiveScreens(page, fixture, { name: "mobile", width: 390, height: 844, testId: "RESP-03" });
});
