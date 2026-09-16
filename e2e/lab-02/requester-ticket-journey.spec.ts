import { test, expect } from "@playwright/test";
import { createE2eFixture, countFixtureTickets, destroyE2eFixture, type E2eFixture } from "./support/fixtures.js";
import { createTicketFromUi, loginRequester, logoutRequester, openRequesterShell } from "./support/ui.js";

let fixture: E2eFixture;
test.beforeAll(async () => { fixture = await createE2eFixture("journey", 0); });
test.afterAll(async () => { await destroyE2eFixture(fixture); });

test("E2E-01 creates and scopes a Ticket across authenticated Requester sessions", async ({ page }) => {
  const summary = `${fixture.tag} requester journey`;
  await openRequesterShell(page, fixture.requesterA);
  const ticketNumber = await createTicketFromUi(page, fixture.category.id, fixture.relatedSystem.id, summary, `${fixture.tag} journey description with enough detail.`);
  expect(ticketNumber).toMatch(/^TKT-\d{8}-[A-Z0-9]{6}$/);

  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "My Tickets" }).click();
  await expect(page.getByText(summary).first()).toBeVisible();
  await expect(page.getByText(ticketNumber).first()).toBeVisible();

  await logoutRequester(page);
  await loginRequester(page, fixture.requesterB);
  await expect(page.getByRole("heading", { name: "No tickets yet" })).toBeVisible();
  await expect(page.getByText(summary)).toHaveCount(0);

  await logoutRequester(page);
  await loginRequester(page, fixture.requesterA);
  await expect(page.getByText(summary).first()).toBeVisible();
  expect(await countFixtureTickets(fixture)).toBe(1);
});
