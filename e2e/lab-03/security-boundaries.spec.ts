import { expect, test } from "@playwright/test";
import { loginIssue51, createIssue51Fixture, destroyIssue51Fixture, type Issue51Fixture } from "./support/issue51-fixture.js";

let fixture: Issue51Fixture;
test.beforeAll(async () => { fixture = await createIssue51Fixture("security"); });
test.afterAll(async () => { if (fixture) await destroyIssue51Fixture(fixture); });

test("SEC-01 browser session cannot bypass backend role or retired identity boundaries", async ({ page }) => {
  const api = "http://127.0.0.1:4311";
  const unauthenticated = await page.request.get(`${api}/api/staff/tickets`);
  expect(unauthenticated.status()).toBe(401);

  await loginIssue51(page, fixture.requester.email, "My Tickets");
  await expect(page.getByRole("button", { name: "Users" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Ticket Queue" })).toHaveCount(0);

  const staffDenied = await page.request.get(`${api}/api/staff/tickets`);
  expect(staffDenied.status()).toBe(403);
  expect((await staffDenied.json()).error.code).toBe("FORBIDDEN");
  const adminDenied = await page.request.get(`${api}/api/admin/users`);
  expect(adminDenied.status()).toBe(403);
  expect((await adminDenied.json()).error.code).toBe("FORBIDDEN");
  const privateDenied = await page.request.get(`${api}/api/staff/tickets/${fixture.ticketId}/internal-notes`);
  expect(privateDenied.status()).toBe(403);
  expect(JSON.stringify(await privateDenied.json())).not.toContain(fixture.tag);

  const retired = await page.request.get(`${api}/api/development-requesters`, {
    headers: { "X-Development-Requester-Id": String(fixture.staff.id) },
  });
  expect(retired.status()).toBe(404);

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
  const replay = await page.request.get(`${api}/api/tickets`);
  expect(replay.status()).toBe(401);
});
