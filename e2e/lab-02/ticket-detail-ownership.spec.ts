import { test, expect } from "@playwright/test";
import { createE2eFixture, createFixtureAttachment, destroyE2eFixture, type E2eFixture } from "./support/fixtures.js";
import { loginRequester, logoutRequester, openRequesterShell } from "./support/ui.js";

let fixture: E2eFixture;
let attachmentId: number;
test.beforeAll(async () => {
  fixture = await createE2eFixture("detail", 1);
  attachmentId = (await createFixtureAttachment(fixture)).id;
});
test.afterAll(async () => { await destroyE2eFixture(fixture); });

test("E2E-05 renders owned read-only detail and denies a foreign Ticket", async ({ page }) => {
  const ticket = fixture.tickets[0];
  await openRequesterShell(page, fixture.requesterA);
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "My Tickets" }).click();
  await page.getByRole("button", { name: "View ticket" }).first().click();
  await expect(page.getByRole("heading", { name: "Ticket Detail" })).toBeVisible();
  await expect(page.getByText(ticket.ticketNumber)).toBeVisible();
  await expect(page.getByText(ticket.summary)).toBeVisible();
  await expect(page.getByText("Ticket information")).toBeVisible();
  await expect(page.getByText(`${fixture.tag}-removed.pdf`).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Attachments" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Download/ })).toHaveCount(1);

  await logoutRequester(page);
  await loginRequester(page, fixture.requesterB);
  await expect(page.getByRole("heading", { name: "No tickets yet" })).toBeVisible();

  const denial = await page.evaluate(async (ticketId) => {
    const response = await fetch(`http://127.0.0.1:4311/api/tickets/${ticketId}`, { credentials: "include" });
    return { status: response.status, body: await response.json() };
  }, ticket.id);
  expect(denial).toEqual({ status: 404, body: { error: { code: "RESOURCE_NOT_FOUND", message: "Ticket not found" } } });
  expect(JSON.stringify(denial)).not.toContain(fixture.tag);
  const row = await fixture.prisma.attachment.findUniqueOrThrow({ where: { id: attachmentId } });
  expect(row.removedAt).toBeNull();
});
