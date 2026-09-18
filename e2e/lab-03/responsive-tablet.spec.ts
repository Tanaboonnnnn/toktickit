import { test } from "@playwright/test";
import { createIssue51Fixture, destroyIssue51Fixture, exerciseMajorScreens, type Issue51Fixture } from "./support/issue51-fixture.js";

let fixture: Issue51Fixture;
test.beforeAll(async () => { fixture = await createIssue51Fixture("tablet"); });
test.afterAll(async () => { if (fixture) await destroyIssue51Fixture(fixture); });

test("RESP-02 tablet 834x1112 covers all major Lab 3 role screens without page overflow", async ({ page }) => {
  await page.setViewportSize({ width: 834, height: 1112 });
  await exerciseMajorScreens(page, fixture, "tablet-834x1112");
});
