import { test } from "@playwright/test";
import { createIssue51Fixture, destroyIssue51Fixture, exerciseMajorScreens, type Issue51Fixture } from "./support/issue51-fixture.js";

let fixture: Issue51Fixture;
test.beforeAll(async () => { fixture = await createIssue51Fixture("desktop"); });
test.afterAll(async () => { if (fixture) await destroyIssue51Fixture(fixture); });

test("RESP-01 desktop 1440x900 covers all major Lab 3 role screens without page overflow", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await exerciseMajorScreens(page, fixture, "desktop-1440x900");
});
