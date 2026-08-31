import { test, expect } from "@playwright/test";
import http from "node:http";
import { createE2eFixture, createOwnedTicket, destroyE2eFixture, type E2eFixture, validBytes } from "./support/fixtures.js";
import { createTicketFromUi, fillCreateTicket, openRequesterShell } from "./support/ui.js";

const API_URL = "http://127.0.0.1:4311";
let fixture: E2eFixture;

async function createLostResponseProxy() {
  let backendStatus: number | null = null;
  let backendBody = "";
  let backendError: string | null = null;
  const server = http.createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", async () => {
      try {
        const contentType = request.headers["content-type"];
        const requesterId = request.headers["x-development-requester-id"];
        const forwarded = await fetch(`${API_URL}${request.url ?? ""}`, {
          method: request.method,
          headers: {
            "content-type": Array.isArray(contentType) ? contentType[0] : String(contentType ?? ""),
            "x-development-requester-id": Array.isArray(requesterId) ? requesterId[0] : String(requesterId ?? ""),
          },
          body: Buffer.concat(chunks),
        });
        backendStatus = forwarded.status;
        backendBody = await forwarded.text();
      } catch (error) {
        backendError = error instanceof Error ? error.message : String(error);
      }
      // The API operation has completed; only the browser-facing response is
      // lost, producing a genuine ambiguous client outcome.
      response.destroy();
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Lost-response proxy did not expose a TCP port");
  return {
    url: `http://127.0.0.1:${address.port}`,
    get backendStatus() { return backendStatus; },
    get backendBody() { return backendBody; },
    get backendError() { return backendError; },
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

test.beforeAll(async () => { fixture = await createE2eFixture("attachments", 1); });
test.afterAll(async () => { await destroyE2eFixture(fixture); });

async function openDetailForSummary(page: import("@playwright/test").Page, summary: string): Promise<void> {
  await openRequesterShell(page, fixture.requesterA.id);
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "My Tickets" }).click();
  const search = page.getByLabel("Search Ticket Number or Summary");
  await search.fill(summary);
  await search.press("Enter");
  await page.locator(".lab2-table-wrap").getByRole("button", { name: "View ticket" }).first().click();
  await expect(page.getByRole("heading", { name: "Ticket Detail" })).toBeVisible();
}

async function uploadViaApi(page: import("@playwright/test").Page, ticketId: number, requesterId: number, name: string, mimeType: string, buffer: Buffer) {
  return page.request.post(`${API_URL}/api/tickets/${ticketId}/attachments`, {
    headers: { "X-Development-Requester-Id": String(requesterId) },
    multipart: { file: { name, mimeType, buffer } },
  });
}

test("E2E-06 covers valid upload, download, removal, and replacement", async ({ page }) => {
  const summary = fixture.tickets[0].summary;
  await openDetailForSummary(page, summary);
  const beforeUpdated = await page.locator(".lab2-detail-grid dd").nth(3).textContent();
  await page.getByLabel("Add an Attachment").setInputFiles({ name: "evidence.png", mimeType: "image/png", buffer: validBytes.png });
  await page.getByRole("button", { name: "Upload attachment" }).click();
  const activeCard = page.getByText("evidence.png").locator("..");
  await expect(activeCard).toBeVisible();
  await expect(activeCard.getByText("Active")).toBeVisible();
  await expect(page.getByRole("button", { name: "Download evidence.png" })).toBeVisible();
  await expect(page.locator(".lab2-detail-grid dd").nth(3)).not.toHaveText(beforeUpdated ?? "");

  const attachment = await fixture.prisma.attachment.findFirstOrThrow({ where: { ticketId: fixture.tickets[0].id, originalName: "evidence.png" } });
  const downloaded = await page.request.get(`${API_URL}/api/tickets/${fixture.tickets[0].id}/attachments/${attachment.id}/download`, { headers: { "X-Development-Requester-Id": String(fixture.requesterA.id) } });
  expect(downloaded.status()).toBe(200);
  expect(await downloaded.body()).toEqual(validBytes.png);
  await page.getByRole("button", { name: "Download evidence.png" }).click();

  await page.getByRole("button", { name: "Remove attachment" }).click();
  await page.getByLabel("Removal Reason").fill("Replaced with a newer file");
  await page.getByRole("button", { name: "Remove attachment" }).click();
  const removedCard = page.getByText("evidence.png").locator("..");
  await expect(removedCard.getByText("Removed").first()).toBeVisible();
  await expect(removedCard.getByText("Replaced with a newer file")).toBeVisible();
  await expect(removedCard.getByRole("button", { name: /download|remove/i })).toHaveCount(0);
  const removedDownload = await page.request.get(`${API_URL}/api/tickets/${fixture.tickets[0].id}/attachments/${attachment.id}/download`, { headers: { "X-Development-Requester-Id": String(fixture.requesterA.id) } });
  expect(removedDownload.status()).toBe(404);

  await page.getByLabel("Add an Attachment").setInputFiles({ name: "replacement.pdf", mimeType: "application/pdf", buffer: validBytes.pdf });
  await page.getByRole("button", { name: "Upload attachment" }).click();
  await expect(page.getByText("replacement.pdf").locator("..").getByText("Active")).toBeVisible();
});

test("E2E-06 rejects invalid type and oversized files before upload", async ({ page }) => {
  const ticket = await createOwnedTicket(fixture, fixture.requesterA.id, `${fixture.tag} local validation`);
  await openDetailForSummary(page, ticket.summary);
  await page.getByLabel("Add an Attachment").setInputFiles({ name: "malware.exe", mimeType: "application/x-msdownload", buffer: Buffer.from("not allowed") });
  await expect(page.getByRole("alert")).toContainText(/unsupported file type/i);
  await expect(page.getByRole("button", { name: /upload attachment/i })).toHaveCount(0);

  await page.getByLabel("Add an Attachment").setInputFiles({ name: "oversized.png", mimeType: "image/png", buffer: Buffer.alloc(5_242_881, 0) });
  await expect(page.getByRole("alert")).toContainText(/must not exceed 5 MB/i);
  await expect(page.getByRole("button", { name: /upload attachment/i })).toHaveCount(0);
});

test("E2E-06 enforces five active files and re-enables selection after removal", async ({ page }) => {
  const ticket = await createOwnedTicket(fixture, fixture.requesterA.id, `${fixture.tag} active limit`);
  for (let i = 0; i < 5; i += 1) {
    const response = await uploadViaApi(page, ticket.id, fixture.requesterA.id, `limit-${i}.png`, "image/png", validBytes.png);
    expect(response.status()).toBe(201);
  }
  await openDetailForSummary(page, ticket.summary);
  await expect(page.getByText(/maximum five active attachments reached/i)).toBeVisible();
  await expect(page.getByLabel("Add an Attachment")).toBeDisabled();
  await expect(page.getByText(/remove one before uploading another/i)).toBeVisible();
  const firstRemove = page.getByRole("button", { name: "Remove attachment" }).first();
  await firstRemove.click();
  await page.getByLabel("Removal Reason").fill("Make room for replacement");
  await page.locator(".lab2-remove-confirm").getByRole("button", { name: "Remove attachment" }).click();
  await expect(page.getByLabel("Add an Attachment")).toBeEnabled();
});

test("E2E-06 preserves a created Ticket during deterministic partial success", async ({ page }) => {
  await openRequesterShell(page, fixture.requesterA.id);
  const summary = `${fixture.tag} partial success`;
  await fillCreateTicket(page, fixture.category.id, fixture.relatedSystem.id, summary, `${fixture.tag} partial attachment description.`);
  await page.getByLabel("Select files").setInputFiles([
    { name: "partial-good.png", mimeType: "image/png", buffer: validBytes.png },
    { name: "partial-failed.pdf", mimeType: "application/pdf", buffer: validBytes.pdf },
  ]);
  let uploads = 0;
  await page.route("**/api/tickets/*/attachments", async (route) => {
    if (route.request().method() !== "POST") { await route.continue(); return; }
    uploads += 1;
    if (uploads === 2) await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Unable to upload attachment" } }) });
    else await route.continue();
  });
  await page.getByRole("region", { name: /create ticket/i }).getByRole("button", { name: "Create Ticket", exact: true }).click();
  await expect(page.getByTestId("ticket-number")).toBeVisible();
  await expect(page.getByText("Uploaded")).toBeVisible();
  await expect(page.getByText("Upload failed")).toBeVisible();
  await expect(page.getByText(summary).first()).toBeVisible();
});

test("E2E-06 reconciles an ambiguous upload before offering manual retry", async ({ page }) => {
  const ticket = await createOwnedTicket(fixture, fixture.requesterA.id, `${fixture.tag} ambiguous upload`);
  const proxy = await createLostResponseProxy();
  let uploadRequests = 0;
  let firstUploadRouted = false;
  let reconciliationRequests = 0;
  let detailRequests = 0;
  let reconciliationHeld = false;
  let releaseReconciliation: (() => void) | null = null;
  const reconciliationGate = new Promise<void>((resolve) => { releaseReconciliation = resolve; });
  page.on("request", (request) => {
    const url = request.url();
    if (request.method() === "POST" && url.includes("/attachments")) uploadRequests += 1;
    if (request.method() === "GET" && /\/api\/tickets\/\d+$/.test(new URL(url).pathname)) detailRequests += 1;
  });
  try {
    await openDetailForSummary(page, ticket.summary);
    const detailRequestsBeforeUpload = detailRequests;
    await page.route("**/api/tickets/*/attachments", async (route) => {
      if (route.request().method() === "POST" && !firstUploadRouted) {
        firstUploadRouted = true;
        await route.continue({ url: `${proxy.url}${new URL(route.request().url()).pathname}` });
        return;
      }
      if (route.request().method() === "GET" && !reconciliationHeld) {
        reconciliationHeld = true;
        reconciliationRequests += 1;
        await reconciliationGate;
      }
      await route.continue();
    });
    await page.getByLabel("Add an Attachment").setInputFiles({ name: "ambiguous-faithful.png", mimeType: "image/png", buffer: validBytes.png });
    await page.getByRole("button", { name: "Upload attachment" }).click();

    await expect.poll(() => proxy.backendStatus).toBe(201);
    expect(proxy.backendError).toBeNull();
    expect(proxy.backendBody).toContain("ambiguous-faithful.png");
    expect(uploadRequests).toBe(1);
    await expect.poll(() => reconciliationHeld).toBe(true);
    await expect(page.getByText(/checking upload status/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry upload" })).toHaveCount(0);
    releaseReconciliation?.();
    await expect.poll(() => reconciliationRequests).toBe(1);

    const persisted = await fixture.prisma.attachment.findMany({ where: { ticketId: ticket.id, originalName: "ambiguous-faithful.png" } });
    expect(persisted).toHaveLength(1);
    const downloaded = await page.request.get(`${API_URL}/api/tickets/${ticket.id}/attachments/${persisted[0].id}/download`, { headers: { "X-Development-Requester-Id": String(fixture.requesterA.id) } });
    expect(downloaded.status()).toBe(200);
    expect(await downloaded.body()).toEqual(validBytes.png);

    await expect(page.getByText("ambiguous-faithful.png").locator("..").getByText("Active")).toBeVisible();
    expect(detailRequests).toBeGreaterThan(detailRequestsBeforeUpload);
    await expect(page.getByRole("button", { name: "Retry upload" })).toHaveCount(0);
    expect(await fixture.prisma.attachment.count({ where: { ticketId: ticket.id, originalName: "ambiguous-faithful.png" } })).toBe(1);
  } finally {
    releaseReconciliation?.();
    await page.unroute("**/api/tickets/*/attachments");
    await proxy.close();
  }
});

test("E2E-06 denies cross-owner Attachment operations without leaking metadata", async ({ page }) => {
  const ticket = fixture.tickets[0];
  const created = await uploadViaApi(page, ticket.id, fixture.requesterA.id, "owner-only.png", "image/png", validBytes.png);
  expect(created.status()).toBe(201);
  const body = await created.json() as { attachment: { id: number } };
  const attachmentId = body.attachment.id;
  const headers = { "X-Development-Requester-Id": String(fixture.requesterB.id) };
  const list = await page.request.get(`${API_URL}/api/tickets/${ticket.id}/attachments`, { headers });
  expect(list.status()).toBe(404);
  const upload = await page.request.post(`${API_URL}/api/tickets/${ticket.id}/attachments`, { headers, multipart: { file: { name: "foreign.png", mimeType: "image/png", buffer: validBytes.png } } });
  expect(upload.status()).toBe(404);
  const download = await page.request.get(`${API_URL}/api/tickets/${ticket.id}/attachments/${attachmentId}/download`, { headers });
  expect(download.status()).toBe(404);
  const remove = await page.request.delete(`${API_URL}/api/tickets/${ticket.id}/attachments/${attachmentId}`, { headers, data: { removalReason: "foreign attempt" } });
  expect(remove.status()).toBe(404);
  expect(JSON.stringify(await list.json())).not.toMatch(/owner-only|storedName|uploads/i);
  expect((await fixture.prisma.attachment.findUniqueOrThrow({ where: { id: attachmentId } })).removedAt).toBeNull();
});
