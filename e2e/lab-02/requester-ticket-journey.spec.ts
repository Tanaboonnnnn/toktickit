import { test, expect } from "@playwright/test";
import { createE2eFixture, countFixtureTickets, destroyE2eFixture, type E2eFixture } from "./support/fixtures.js";
import { createTicketFromUi, openRequesterShell } from "./support/ui.js";

let fixture: E2eFixture;
test.beforeAll(async () => { fixture = await createE2eFixture("journey", 0); });
test.afterAll(async () => { await destroyE2eFixture(fixture); });

test("E2E-01 creates and scopes a Ticket across Requester switching", async ({ page }) => {
  const summary = `${fixture.tag} requester journey`;
  await openRequesterShell(page, fixture.requesterA.id);
  const ticketNumber = await createTicketFromUi(page, fixture.category.id, fixture.relatedSystem.id, summary, `${fixture.tag} journey description with enough detail.`);
  expect(ticketNumber).toMatch(/^TKT-\d{8}-[A-Z0-9]{6}$/);

  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "My Tickets" }).click();
  await expect(page.getByText(summary).first()).toBeVisible();
  await expect(page.getByText(ticketNumber).first()).toBeVisible();

  await page.getByRole("button", { name: "Change Requester" }).click();
  await page.getByRole("combobox", { name: "Development Requester" }).selectOption(String(fixture.requesterB.id));
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "My Tickets" }).click();
  await expect(page.getByRole("heading", { name: "No tickets yet" })).toBeVisible();
  await expect(page.getByText(summary)).toHaveCount(0);

  await page.getByRole("button", { name: "Change Requester" }).click();
  await page.getByRole("combobox", { name: "Development Requester" }).selectOption(String(fixture.requesterA.id));
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "My Tickets" }).click();
  await expect(page.getByText(summary).first()).toBeVisible();
  expect(await countFixtureTickets(fixture)).toBe(1);
});
