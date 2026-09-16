import { expect, test } from "@playwright/test";
import {
  createE2eFixture,
  destroyE2eFixture,
  type E2eFixture,
  validBytes,
} from "../lab-02/support/fixtures.js";
import {
  loginRequester,
  logoutRequester,
  openRequesterShell,
  unsafeApiHeaders,
} from "../lab-02/support/ui.js";

const API_URL = "http://127.0.0.1:4311";

let fixture: E2eFixture;

test.beforeAll(async () => {
  fixture = await createE2eFixture("requester-regression", 0);
});

test.afterAll(async () => {
  await destroyE2eFixture(fixture);
});

test("E2E-02 preserves authenticated Requester create/upload/list/detail/remove/isolation", async ({ page }) => {
  const summary = `${fixture.tag} authenticated continuity`;
  const description = `${fixture.tag} authenticated Requester regression description.`;
  const observedUnsafeRequests: Array<{ url: string; headers: Record<string, string>; body: string | null }> = [];
  page.on("request", (request) => {
    if (request.method() !== "POST") return;
    if (!request.url().includes("/api/tickets")) return;
    observedUnsafeRequests.push({
      url: request.url(),
      headers: request.headers(),
      body: request.postData(),
    });
  });

  await openRequesterShell(page, fixture.requesterA);
  await page.getByLabel("Category *").selectOption(String(fixture.category.id));
  await page.getByLabel("Related System *").selectOption(String(fixture.relatedSystem.id));
  await page.getByLabel("Ticket Summary *").fill(summary);
  await page.getByLabel("Requested Priority *").selectOption("HIGH");
  await page.getByLabel("Description *").fill(description);
  await page.getByLabel("Select files").setInputFiles([
    { name: "remove-after-create.png", mimeType: "image/png", buffer: validBytes.png },
    { name: "owner-only.pdf", mimeType: "application/pdf", buffer: validBytes.pdf },
  ]);
  await page.getByRole("region", { name: /create ticket/i }).getByRole("button", { name: "Create Ticket", exact: true }).click();

  const ticketNumber = (await page.getByTestId("ticket-number").textContent())?.trim() ?? "";
  expect(ticketNumber).toMatch(/^TKT-\d{8}-[A-Z0-9]{6}$/);
  await expect(page.getByText("Uploaded")).toHaveCount(2);

  const persistedTicket = await fixture.prisma.ticket.findFirstOrThrow({
    where: { ticketNumber, requesterId: fixture.requesterA.id },
    select: { id: true, itPriority: true, requestedPriority: true },
  });
  expect(persistedTicket.itPriority).toBe("HIGH");
  expect(persistedTicket.requestedPriority).toBe("HIGH");

  await fixture.prisma.ticket.update({
    where: { id: persistedTicket.id },
    data: { currentStatus: "REOPENED" },
  });

  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "My Tickets" }).click();
  await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
  await expect(page.getByText(summary).first()).toBeVisible();
  await expect(page.getByText(ticketNumber).first()).toBeVisible();
  await expect(page.locator(".lab2-status-reopened").first()).toHaveText("Reopened");
  await page.getByLabel("Current Status").selectOption("REOPENED");
  await expect(page.getByText(summary).first()).toBeVisible();

  await page.locator(".lab2-table-wrap").getByRole("button", { name: "View ticket" }).first().click();
  await expect(page.getByRole("heading", { name: "Ticket Detail" })).toBeVisible();
  await expect(page.getByText(summary)).toBeVisible();
  await expect(page.locator(".lab2-status-reopened")).toHaveText("Reopened");
  await expect(page.getByRole("heading", { name: "remove-after-create.png", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "owner-only.pdf", exact: true })).toBeVisible();

  const removableCard = page.getByRole("heading", { name: "remove-after-create.png", exact: true }).locator("..");
  await removableCard.getByRole("button", { name: "Remove attachment" }).click();
  await page.getByLabel("Removal Reason").fill("Requester replaced this evidence");
  await page.locator(".lab2-remove-confirm").getByRole("button", { name: "Remove attachment" }).click();
  await expect(page.getByRole("heading", { name: "remove-after-create.png", exact: true }).locator("..").getByText("Removed").first()).toBeVisible();
  await expect(page.getByText("Requester replaced this evidence")).toBeVisible();

  const activeAttachment = await fixture.prisma.attachment.findFirstOrThrow({
    where: { ticketId: persistedTicket.id, originalName: "owner-only.pdf" },
    select: { id: true, removedAt: true },
  });
  expect(activeAttachment.removedAt).toBeNull();

  expect(observedUnsafeRequests.length).toBeGreaterThanOrEqual(3);
  for (const observed of observedUnsafeRequests) {
    expect(observed.headers["x-development-requester-id"]).toBeUndefined();
    expect(observed.headers["x-csrf-token"]).toBeTruthy();
  }
  const createRequest = observedUnsafeRequests.find((entry) => entry.url.endsWith("/api/tickets"));
  expect(createRequest).toBeDefined();
  expect(createRequest?.body ?? "").not.toMatch(/requesterId|ownerId|itPriority|currentStatus/i);

  await logoutRequester(page);
  await loginRequester(page, fixture.requesterB);
  await expect(page.getByRole("heading", { name: "No tickets yet" })).toBeVisible();
  await expect(page.getByText(summary)).toHaveCount(0);

  const foreignDetail = await page.request.get(`${API_URL}/api/tickets/${persistedTicket.id}`);
  expect(foreignDetail.status()).toBe(404);
  const foreignList = await page.request.get(`${API_URL}/api/tickets/${persistedTicket.id}/attachments`);
  expect(foreignList.status()).toBe(404);
  const foreignDownload = await page.request.get(`${API_URL}/api/tickets/${persistedTicket.id}/attachments/${activeAttachment.id}/download`);
  expect(foreignDownload.status()).toBe(404);
  const foreignRemove = await page.request.delete(
    `${API_URL}/api/tickets/${persistedTicket.id}/attachments/${activeAttachment.id}`,
    {
      headers: await unsafeApiHeaders(page.request),
      data: { removalReason: "foreign attempt" },
    },
  );
  expect(foreignRemove.status()).toBe(404);
  expect(JSON.stringify(await foreignList.json())).not.toMatch(/owner-only|storedName|uploads/i);

  const unchangedAttachment = await fixture.prisma.attachment.findUniqueOrThrow({
    where: { id: activeAttachment.id },
    select: { removedAt: true, removalReason: true },
  });
  expect(unchangedAttachment.removedAt).toBeNull();
  expect(unchangedAttachment.removalReason).toBeNull();
});
