import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { captureReleaseEvidence } from "../lab-03/support/release-evidence.js";

const window = { from: "2026-09-24T00:00:00.000Z", before: "2026-10-01T00:00:00.000Z" };
const requesterData = {
  asOf: window.before, resolvedWindow: window, metrics: { myActiveTickets: 0, waitingForMe: 0, recentlyResolved: 0 },
  recentTickets: [], attentionTickets: [],
  drillDown: { myActiveTickets: "#/tickets?statusGroup=active", waitingForMe: "#/tickets?currentStatus=WAITING_FOR_REQUESTER", recentlyResolved: "#/tickets?statusGroup=resolved&resolvedFrom=2026-09-24T00%3A00%3A00.000Z&resolvedBefore=2026-10-01T00%3A00%3A00.000Z" },
};
const staffData = {
  asOf: window.before, metrics: { unassignedActive: 0, myActiveTickets: 0, highPriorityActive: 0, waitingForRequester: 0 },
  recentTickets: [], myActions: [],
  drillDown: { unassignedActive: "#/staff/tickets?owner=unassigned&statusGroup=active", myActiveTickets: "#/staff/tickets?owner=me&statusGroup=active", highPriorityActive: "#/staff/tickets?itPriority=HIGH&statusGroup=active", waitingForRequester: "#/staff/tickets?currentStatus=WAITING_FOR_REQUESTER" },
};
const roles = [
  { key: "requester", name: "Requester", role: "REQUESTER", route: "#/dashboard", api: "requester", scenarioId: "L4-REQ-DASHBOARD", testId: "UI-05", rubricPart: "P8", data: requesterData },
  { key: "staff", name: "IT Staff", role: "IT_STAFF", route: "#/staff/dashboard", api: "staff", scenarioId: "L4-STF-DASHBOARD", testId: "UI-06", rubricPart: "P5", data: staffData },
  { key: "administrator", name: "Administrator", role: "ADMINISTRATOR", route: "#/staff/dashboard", api: "staff", scenarioId: "L4-ADM-DASHBOARD", testId: "UI-06", rubricPart: "P5", data: staffData },
];

function respond(status: number, body: unknown) {
  return { status, contentType: "application/json", body: JSON.stringify(body) };
}
async function authenticate(page: Page, role: typeof roles[number]) {
  await page.route("**/api/auth/me", (route) => route.fulfill(respond(200, {
    user: { id: 21, name: role.name, email: `${role.key}@example.test`, role: role.role, mustChangePassword: false },
  })));
}
async function capture(page: Page, role: typeof roles[number], state: string, description: string, displayRole = role.name) {
  const file = `${role.key}-dashboard/states/${state}.png`;
  await captureReleaseEvidence(page, {
    file, role: displayRole, route: role.route, scenario: `${displayRole} Dashboard ${description}`,
    scenarioId: role.scenarioId, mapping: role.key === "requester" ? ["AC-15", "AC-24"] : ["AC-16", "AC-24"],
    testId: role.testId, rubricPart: role.rubricPart,
  });
  const root = process.env.LAB4_EVIDENCE_ROOT?.trim();
  if (root) {
    const metadata = JSON.parse(readFileSync(resolve(process.cwd(), root, `${file}.meta.json`), "utf8")) as Record<string, unknown>;
    expect(metadata.sourceRevision).toBe(process.env.LAB4_EVIDENCE_SOURCE_REVISION?.trim() || null);
    expect(metadata.scenarioId).toBe(role.scenarioId);
    expect(metadata.testId).toBe(role.testId);
    expect(metadata.rubricPart).toBe(role.rubricPart);
  }
}

for (const role of roles) {
  test(`${role.testId} ${role.name} Dashboard loading state has scenario evidence`, async ({ page }) => {
    await authenticate(page, role);
    let release!: () => void;
    await page.route(`**/api/dashboard/${role.api}`, async (route) => {
      await new Promise<void>((resolveRequest) => { release = resolveRequest; });
      await route.fulfill(respond(200, role.data));
    });
    await page.goto(`/${role.route}`);
    await expect(page.getByRole("status")).toContainText("Loading Dashboard");
    await capture(page, role, "loading", "loading without placeholder metrics");
    release();
    await expect(page.locator(".lab4-dashboard-metric").first()).toBeVisible();
  });

  test(`${role.testId} ${role.name} Dashboard empty state has scenario evidence`, async ({ page }) => {
    await authenticate(page, role);
    await page.route(`**/api/dashboard/${role.api}`, (route) => route.fulfill(respond(200, role.data)));
    await page.goto(`/${role.route}`);
    await expect(page.getByText(role.key === "requester" ? "No recently updated Tickets." : "No recently updated Tickets.")).toBeVisible();
    await expect(page.getByText(role.key === "requester" ? "No Tickets are waiting for your response." : "No Actions are associated with you yet.")).toBeVisible();
    await capture(page, role, "empty", "empty state with backend-confirmed zero counts");
  });

  test(`${role.testId} ${role.name} Dashboard safe failure state has scenario evidence`, async ({ page }) => {
    await authenticate(page, role);
    await page.route(`**/api/dashboard/${role.api}`, (route) => route.fulfill(respond(500, { error: { code: "INTERNAL_ERROR", message: "Unable to load the Dashboard. Please try again." } })));
    await page.goto(`/${role.route}`);
    await expect(page.getByRole("alert")).toContainText("Unable to load the Dashboard");
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
    await capture(page, role, "safe-failure", "safe API failure with a retry action");
  });
}

for (const role of roles.filter((item) => item.key !== "requester")) {
  test(`${role.testId} ${role.name} Dashboard forbidden state has scenario evidence`, async ({ page }) => {
    await authenticate(page, role);
    await page.route(`**/api/dashboard/staff`, (route) => route.fulfill(respond(403, { error: { code: "FORBIDDEN", message: "You do not have permission to perform this action" } })));
    await page.goto(`/${role.route}`);
    await expect(page.getByRole("heading", { name: "Access Denied" })).toBeVisible();
    await capture(page, role, "forbidden", "forbidden state without dashboard data");
  });
}

test("UI-05 Requester Dashboard forbidden state is distinct from expired-session Login", async ({ page }) => {
  const role = roles[0];
  await authenticate(page, role);
  await page.route("**/api/dashboard/requester", (route) => route.fulfill(respond(403, { error: { code: "FORBIDDEN", message: "You do not have permission to perform this action" } })));
  await page.goto(`/${role.route}`);
  await expect(page.getByRole("heading", { name: "Access Denied" })).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("You do not have permission to open your Dashboard.");
  await expect(page.getByRole("button", { name: "Retry" })).toHaveCount(0);
  await capture(page, role, "forbidden", "forbidden state without Dashboard data");
});

test("UI-05 expired Requester session returns to Login without retaining Dashboard data", async ({ page }) => {
  const role = roles[0];
  await page.route("**/api/auth/me", (route) => route.fulfill(respond(401, { error: { code: "AUTHENTICATION_REQUIRED", message: "Authentication is required" } })));
  await page.goto(`/${role.route}`);
  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toHaveCount(0);
  await capture(page, role, "session-expired", "expired session routed to Login without protected data", "Unauthenticated");
});
