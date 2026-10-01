import { expect, test } from "@playwright/test";
import { captureReleaseEvidence } from "../lab-03/support/release-evidence.js";
import { createIssue79Fixture, destroyIssue79Fixture, signIn, signOut, type Issue79Fixture } from "./support/issue79-fixture.js";

let fixture: Issue79Fixture;

test.beforeAll(async () => {
  fixture = await createIssue79Fixture();
});

test.afterAll(async () => {
  await destroyIssue79Fixture(fixture);
});

test("E2E-04 keeps Requester privacy, Staff/Admin work, and recoverable safe failures intact", async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const unexpectedHttpErrors: string[] = [];
  let unauthenticatedBootstrapCount = 0;
  let missingAttachmentFailureCount = 0;
  const missingAttachmentRoute = `/api/tickets/${fixture.ticketId}/attachments/${fixture.attachmentId}/download`;
  await page.addInitScript(() => {
    const target = window as Window & { __issue79Unhandled?: string[] };
    target.__issue79Unhandled = [];
    window.addEventListener("unhandledrejection", (event) => target.__issue79Unhandled?.push(String(event.reason)));
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() < 400) return;
    const path = new URL(response.url()).pathname;
    if (response.status() === 401 && path === "/api/auth/me") { unauthenticatedBootstrapCount += 1; return; }
    if (response.status() === 500 && path === missingAttachmentRoute) { missingAttachmentFailureCount += 1; return; }
    unexpectedHttpErrors.push(`${response.status()} ${path}`);
  });
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    // The unauthenticated bootstrap and deliberately missing test Attachment return these expected HTTP statuses.
    if (/^Failed to load resource: the server responded with a status of (401 \(Unauthorized\)|500 \(Internal Server Error\))$/.test(message.text())) return;
    consoleErrors.push(message.text());
  });

  await signIn(page, fixture, fixture.requester.email, "Dashboard");
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "My Tickets" }).click();
  await page.goto(`/#/tickets/${fixture.ticketId}`);
  await expect(page.getByRole("heading", { name: "Ticket Detail" })).toBeVisible();
  await expect(page.getByText("The connection has dropped twice during class.")).toBeVisible();
  await expect(page.getByRole("region", { name: "Actions Taken" })).toBeVisible();
  await expect(page.getByText("Inspect the access point uplink", { exact: false })).toBeVisible();
  await expect(page.getByText("Staff-only diagnostic: the west switch uplink recently renegotiated.")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Create Action" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: `Edit Action #${fixture.actionId}` })).toHaveCount(0);
  await page.getByRole("button", { name: `Download ${fixture.attachmentName}` }).click();
  await expect(page.getByRole("alert")).toContainText(/unable to download attachment/i);
  await expect(page.getByRole("alert")).not.toContainText(/storedName|Prisma|SQL|C:\\/i);
  await captureReleaseEvidence(page, {
    file: "regression/issue79-requester-ticket-detail.png",
    role: "Requester",
    route: `#/tickets/${fixture.ticketId}`,
    scenario: "Requester reads owned Ticket and Actions while Internal Notes remain private after an Attachment failure",
    scenarioId: "L4-RETAINED-REGRESSION",
    mapping: ["AC-06", "AC-21", "AC-22", "AC-24", "AC-25"],
    testId: "E2E-04",
    rubricPart: "P8",
  });

  await signOut(page);
  await signIn(page, fixture, fixture.staff.email, "Staff Dashboard");
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "Ticket Queue" }).click();
  await page.goto(`/#/staff/tickets/${fixture.ticketId}`);
  await expect(page.getByRole("heading", { name: "Staff Ticket Detail" })).toBeVisible();
  await expect(page.getByText("Staff-only diagnostic: the west switch uplink recently renegotiated.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ticket workflow history" })).toBeVisible();
  await expect(page.getByText("Changed by Niran Staff")).toBeVisible();
  await expect(page.getByRole("article", { name: `Action #${fixture.actionId}` })).toContainText("Completed");
  await page.getByRole("button", { name: `Download ${fixture.attachmentName}` }).click();
  await expect(page.getByRole("alert")).toContainText(/unable to download switch-photo-unavailable\.pdf/i);
  await page.getByRole("combobox", { name: "Next status" }).selectOption("RESOLVED");
  const resolutionSummary = page.getByRole("textbox", { name: "Resolution Summary" });
  const confirmStatus = page.getByRole("button", { name: "Confirm status change" });
  await expect(resolutionSummary).toBeVisible();
  await expect(confirmStatus).toBeDisabled();
  await page.getByRole("checkbox", { name: /Confirm transition and consequence/ }).check();
  await expect(confirmStatus).toBeDisabled();
  await captureReleaseEvidence(page, {
    file: "regression/issue79-staff-resolution-gate.png",
    role: "IT Staff",
    route: `#/staff/tickets/${fixture.ticketId}`,
    scenario: "Staff sees the resolution action remain disabled until a summary is entered",
    scenarioId: "L4-RETAINED-REGRESSION",
    mapping: ["AC-23", "AC-25"],
    testId: "E2E-04",
    rubricPart: "P8",
  });
  await resolutionSummary.fill("Access restored and verified on the campus network.");
  await expect(confirmStatus).toBeEnabled();
  await confirmStatus.click();
  await expect(page.locator(".lab2-ticket-detail").getByText("Resolved", { exact: true })).toBeVisible();
  await signOut(page);
  await signIn(page, fixture, fixture.administrator.email, "Staff Dashboard");
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "Users" }).click();
  await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create User" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create Ticket" })).toHaveCount(0);

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
  expect(unexpectedHttpErrors).toEqual([]);
  expect(unauthenticatedBootstrapCount).toBeGreaterThan(0);
  expect(missingAttachmentFailureCount).toBe(2);
  expect(await page.evaluate(() => (window as Window & { __issue79Unhandled?: string[] }).__issue79Unhandled ?? [])).toEqual([]);
});
