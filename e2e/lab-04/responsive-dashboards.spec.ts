import { expect, test } from "@playwright/test";
import { assertNoHorizontalOverflow, assertVisibleWithinViewport } from "../lab-02/support/ui.js";
import { captureReleaseEvidence } from "../lab-03/support/release-evidence.js";

const resolvedWindow = { from: "2026-09-24T00:00:00.000Z", before: "2026-10-01T00:00:00.000Z" };
const requesterData = {
  asOf: resolvedWindow.before, resolvedWindow, metrics: { myActiveTickets: 3, waitingForMe: 1, recentlyResolved: 2 },
  recentTickets: [{ id: 41, ticketNumber: "TKT-20261001-000041", category: { id: 1, name: "Network" }, relatedSystem: { id: 1, name: "Campus network" }, summary: "A long Ticket summary that should wrap within the dashboard card instead of creating horizontal page overflow", requestedPriority: "HIGH", currentStatus: "OPEN", createdAt: resolvedWindow.from, updatedAt: resolvedWindow.before }],
  attentionTickets: [],
  drillDown: { myActiveTickets: "#/tickets?statusGroup=active", waitingForMe: "#/tickets?currentStatus=WAITING_FOR_REQUESTER", recentlyResolved: "#/tickets?statusGroup=resolved&resolvedFrom=2026-09-24T00%3A00%3A00.000Z&resolvedBefore=2026-10-01T00%3A00%3A00.000Z" },
};
const staffData = {
  asOf: resolvedWindow.before, metrics: { unassignedActive: 1, myActiveTickets: 3, highPriorityActive: 2, waitingForRequester: 1 },
  recentTickets: [], myActions: [{
    action: { id: 51, ticketId: 91, workflowCycle: 1, createdAt: resolvedWindow.from, recordedBy: { id: 21, name: "Staff", role: "IT_STAFF" }, assignee: { id: 21, name: "Staff", role: "IT_STAFF" }, performedBy: { id: 21, name: "Staff", role: "IT_STAFF" }, description: "Replace the access point and verify network connectivity across the full second-floor corridor", result: "Access restored", followUpRequired: false, followUpNote: null, attachmentNotes: null, status: "COMPLETED", version: 2, updatedAt: resolvedWindow.before, updatedBy: { id: 21, name: "Staff", role: "IT_STAFF" }, completedAt: resolvedWindow.before, cancelledAt: null, cancelledBy: null, cancellationReason: null, readOnly: false, capabilities: { canEdit: true, canReassign: true, permittedTransitions: [] } },
    ticket: { id: 91, ticketNumber: "TKT-20261001-000091", summary: "Long WiFi outage summary that wraps on smaller displays" }, attribution: ["RECORDED", "ASSIGNED", "PERFORMED"],
  }],
  drillDown: { unassignedActive: "#/staff/tickets?owner=unassigned&statusGroup=active", myActiveTickets: "#/staff/tickets?owner=me&statusGroup=active", highPriorityActive: "#/staff/tickets?itPriority=HIGH&statusGroup=active", waitingForRequester: "#/staff/tickets?currentStatus=WAITING_FOR_REQUESTER" },
};
const viewports = [
  { name: "desktop", size: { width: 1440, height: 900 }, testId: "RESP-01" },
  { name: "tablet", size: { width: 834, height: 1112 }, testId: "RESP-02" },
  { name: "mobile", size: { width: 390, height: 844 }, testId: "RESP-03" },
];
const roles = [
  { key: "requester", user: { id: 11, name: "Requester", email: "requester@example.test", role: "REQUESTER", mustChangePassword: false }, route: "#/dashboard", heading: "Dashboard", scenarioId: "L4-REQ-DASHBOARD", data: requesterData, metric: "My active Tickets" },
  { key: "staff", user: { id: 21, name: "Staff", email: "staff@example.test", role: "IT_STAFF", mustChangePassword: false }, route: "#/staff/dashboard", heading: "Staff Dashboard", scenarioId: "L4-STF-DASHBOARD", data: staffData, metric: "Unassigned active" },
  { key: "administrator", user: { id: 31, name: "Administrator", email: "administrator@example.test", role: "ADMINISTRATOR", mustChangePassword: false }, route: "#/staff/dashboard", heading: "Staff Dashboard", scenarioId: "L4-ADM-DASHBOARD", data: staffData, metric: "Unassigned active" },
];

for (const role of roles) for (const viewport of viewports) {
  test(`${viewport.testId} ${role.key} Dashboard fits ${viewport.size.width}x${viewport.size.height}`, async ({ page }) => {
    await page.setViewportSize(viewport.size);
    await page.route("**/api/auth/me", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: role.user }) }));
    await page.route("**/api/dashboard/requester", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(requesterData) }));
    await page.route("**/api/dashboard/staff", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(staffData) }));
    await page.goto(`/${role.route}`);
    await expect(page.getByRole("heading", { name: role.heading })).toBeVisible();
    await expect(page.getByRole("heading", { name: role.metric })).toBeVisible();
    if (role.key === "requester") await expect(page.getByText(requesterData.recentTickets[0].summary)).toBeVisible();
    else await expect(page.getByText("Recorded · Assigned · Performed")).toBeVisible();
    await assertVisibleWithinViewport(page, ["h1", ".lab4-dashboard-metric", ".lab2-navigation"]);
    await assertNoHorizontalOverflow(page);
    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toBeVisible();
    await captureReleaseEvidence(page, {
      file: `${role.key}-dashboard/${viewport.name}.png`, role: role.key === "requester" ? "Requester" : role.key === "staff" ? "IT Staff" : "Administrator",
      route: role.route, scenario: `${role.key} Dashboard at ${viewport.name} viewport`, scenarioId: role.scenarioId,
      mapping: ["AC-25"], testId: viewport.testId, rubricPart: "P9", viewport: `${viewport.size.width}x${viewport.size.height}`,
    });
  });
}
