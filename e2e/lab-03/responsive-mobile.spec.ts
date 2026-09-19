import { test } from "@playwright/test";
import { createIssue51Fixture, destroyIssue51Fixture, exerciseMajorScreens, type Issue51Fixture } from "./support/issue51-fixture.js";

let fixture: Issue51Fixture;
test.beforeAll(async () => { fixture = await createIssue51Fixture("mobile"); });
test.afterAll(async () => { if (fixture) await destroyIssue51Fixture(fixture); });

test("RESP-03 mobile 390x844 covers all major Lab 3 role screens without page overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await exerciseMajorScreens(page, fixture, "mobile-390x844");
});
