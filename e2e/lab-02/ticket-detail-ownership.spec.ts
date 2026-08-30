import { test, expect } from "@playwright/test";
import { createE2eFixture, createFixtureAttachment, destroyE2eFixture, type E2eFixture } from "./support/fixtures.js";
import { openRequesterShell } from "./support/ui.js";

let fixture: E2eFixture;
let attachmentId: number;
test.beforeAll(async () => {
  fixture = await createE2eFixture("detail", 1);
  attachmentId = (await createFixtureAttachment(fixture)).id;
});
test.afterAll(async () => { await destroyE2eFixture(fixture); });

test("E2E-05 renders owned read-only detail and denies a foreign Ticket", async ({ page }) => {
  const ticket = fixture.tickets[0];
  await openRequesterShell(page, fixture.requesterA.id);
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "My Tickets" }).click();
  await page.getByRole("button", { name: "View ticket" }).first().click();
  await expect(page.getByRole("heading", { name: "Ticket Detail" })).toBeVisible();
  await expect(page.getByText(ticket.ticketNumber)).toBeVisible();
  await expect(page.getByText(ticket.summary)).toBeVisible();
  await expect(page.getByText("Ticket information")).toBeVisible();
  await expect(page.getByText(`${fixture.tag}-removed.pdf`).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Attachments" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Download/ })).toHaveCount(1);

  await page.getByRole("button", { name: "Change Requester" }).click();
  await page.getByRole("combobox", { name: "Development Requester" }).selectOption(String(fixture.requesterB.id));
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "My Tickets" }).click();
  await expect(page.getByRole("heading", { name: "No tickets yet" })).toBeVisible();

  const denial = await page.evaluate(async ({ ticketId, requesterId }) => {
    const response = await fetch(`http://127.0.0.1:4311/api/tickets/${ticketId}`, { headers: { "X-Development-Requester-Id": String(requesterId) } });
    return { status: response.status, body: await response.json() };
  }, { ticketId: ticket.id, requesterId: fixture.requesterB.id });
  expect(denial).toEqual({ status: 404, body: { error: { code: "RESOURCE_NOT_FOUND", message: "Ticket not found" } } });
  expect(JSON.stringify(denial)).not.toContain(fixture.tag);
  const row = await fixture.prisma.attachment.findUniqueOrThrow({ where: { id: attachmentId } });
  expect(row.removedAt).toBeNull();
});
