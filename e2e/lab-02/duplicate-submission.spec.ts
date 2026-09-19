import { test, expect } from "@playwright/test";
import http from "node:http";
import { createE2eFixture, countFixtureTickets, destroyE2eFixture, type E2eFixture } from "./support/fixtures.js";
import { fillCreateTicket, openRequesterShell } from "./support/ui.js";

const API_URL = "http://127.0.0.1:4311";
let fixture: E2eFixture;
test.beforeAll(async () => { fixture = await createE2eFixture("duplicate", 0); });
test.afterAll(async () => { await destroyE2eFixture(fixture); });

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
        const cookie = request.headers.cookie;
        const origin = request.headers.origin;
        const csrf = request.headers["x-csrf-token"];
        const forwarded = await fetch(`${API_URL}${request.url ?? ""}`, {
          method: request.method,
          headers: {
            "content-type": Array.isArray(contentType) ? contentType[0] : String(contentType ?? ""),
            cookie: Array.isArray(cookie) ? cookie[0] : String(cookie ?? ""),
            origin: Array.isArray(origin) ? origin[0] : String(origin ?? ""),
            "x-csrf-token": Array.isArray(csrf) ? csrf[0] : String(csrf ?? ""),
          },
          body: Buffer.concat(chunks),
        });
        backendStatus = forwarded.status;
        backendBody = await forwarded.text();
      } catch (error) {
        backendError = error instanceof Error ? error.message : String(error);
      }
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

test("E2E-03 reconciles a lost Ticket-create response with the same request key", async ({ page }) => {
  await openRequesterShell(page, fixture.requesterA);
  const summary = `${fixture.tag} ambiguous create`;
  await fillCreateTicket(page, fixture.category.id, fixture.relatedSystem.id, summary, `${fixture.tag} ambiguous response description.`);
  const proxy = await createLostResponseProxy();
  const payloads: Array<Record<string, unknown>> = [];
  let firstRouted = false;
  await page.route("**/api/tickets", async (route) => {
    if (route.request().method() !== "POST") { await route.continue(); return; }
    payloads.push(route.request().postDataJSON() as Record<string, unknown>);
    if (!firstRouted) {
      firstRouted = true;
      await route.continue({ url: `${proxy.url}${new URL(route.request().url()).pathname}` });
      return;
    }
    await route.continue();
  });

  try {
    const createRegion = page.getByRole("region", { name: /create ticket/i });
    await createRegion.getByRole("button", { name: "Create Ticket", exact: true }).click();
    await expect.poll(() => proxy.backendStatus).toBe(201);
    expect(proxy.backendError).toBeNull();
    expect(proxy.backendBody).toContain(summary);
    await expect(page.getByRole("alert")).toContainText(/result is uncertain/i);
    await expect(page.getByLabel("Ticket Summary *")).toBeDisabled();
    await expect(page.getByLabel("Description *")).toBeDisabled();
    await expect(page.getByRole("button", { name: "Retry same submission" })).toBeEnabled();

    await page.getByRole("button", { name: "Retry same submission" }).click();
    await expect(page.getByText(/already exists and has been shown again/i)).toBeVisible();
    expect(payloads).toHaveLength(2);
    expect(payloads[0].clientRequestId).toBe(payloads[1].clientRequestId);
    expect(payloads[0].summary).toBe(payloads[1].summary);
    expect(payloads[0].description).toBe(payloads[1].description);
    expect(await countFixtureTickets(fixture)).toBe(1);
  } finally {
    await page.unroute("**/api/tickets");
    await proxy.close();
  }
});
