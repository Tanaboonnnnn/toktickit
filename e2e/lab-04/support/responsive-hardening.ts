import { expect, type Page } from "@playwright/test";
import { assertNoHorizontalOverflow, assertTouchTargets, assertVisibleWithinViewport } from "../../lab-02/support/ui.js";
import { captureReleaseEvidence } from "../../lab-03/support/release-evidence.js";
import { signIn, signOut, type Issue79Fixture } from "./issue79-fixture.js";

export interface EvidenceViewport {
  name: "desktop" | "tablet" | "mobile";
  width: number;
  height: number;
  testId: "RESP-01" | "RESP-02" | "RESP-03";
}

export async function checkIssue79ResponsiveScreens(page: Page, fixture: Issue79Fixture, viewport: EvidenceViewport): Promise<void> {
  const size = `${viewport.width}x${viewport.height}`;
  await page.setViewportSize({ width: viewport.width, height: viewport.height });

  await signIn(page, fixture, fixture.requester.email, "Dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await assertVisibleWithinViewport(page, [".lab2-shell-header", ".lab2-navigation", ".lab4-dashboard"]);
  await assertTouchTargets(page, [".lab2-navigation button", ".lab4-dashboard-metric a"], 40);
  await captureReleaseEvidence(page, {
    file: `requester-dashboard/${viewport.name}-issue79.png`, role: "Requester", route: "#/dashboard",
    scenario: `${viewport.name} Requester Dashboard with an owned Ticket`, scenarioId: "L4-REQ-DASHBOARD",
    mapping: ["AC-15", "AC-25"], testId: viewport.testId, rubricPart: "P9", viewport: size,
  });

  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "My Tickets" }).click();
  await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
  await expect(page.getByText("Campus access point disconnects during online classes", { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await assertTouchTargets(page, [".lab2-my-tickets button", ".lab2-my-tickets a"], 40);
  await captureReleaseEvidence(page, {
    file: `regression/${viewport.name}-issue79-my-tickets.png`, role: "Requester", route: "#/tickets",
    scenario: `${viewport.name} retained My Tickets list for the signed-in Requester`, scenarioId: "L4-RETAINED-REGRESSION",
    mapping: ["AC-21", "AC-22", "AC-25"], testId: viewport.testId, rubricPart: "P8", viewport: size,
  });

  await page.goto(`/#/tickets/${fixture.ticketId}`);
  await expect(page.getByRole("heading", { name: "Ticket Detail" })).toBeVisible();
  const requesterActions = page.getByRole("region", { name: "Actions Taken" });
  await expect(requesterActions).toContainText("Completed");
  await expect(requesterActions.getByRole("button", { name: /Create Action|Edit Action|Complete Action|Cancel Action/ })).toHaveCount(0);
  await assertNoHorizontalOverflow(page);
  await assertVisibleWithinViewport(page, [".lab2-ticket-detail", ".lab2-attachments-section", ".lab4-actions", ".lab4-action-card"]);
  await assertTouchTargets(page, [".lab2-ticket-detail button"], 40);
  await captureReleaseEvidence(page, {
    file: `actions-taken/${viewport.name}-issue79-requester.png`, role: "Requester", route: `#/tickets/${fixture.ticketId}`,
    scenario: `${viewport.name} read-only Requester Actions and Attachment error state`, scenarioId: "L4-REQ-ACTIONS",
    mapping: ["AC-06", "AC-24", "AC-25"], testId: viewport.testId, rubricPart: "P9", viewport: size,
  });

  await signOut(page);
  await signIn(page, fixture, fixture.staff.email, "Staff Dashboard");
  await assertNoHorizontalOverflow(page);
  await assertVisibleWithinViewport(page, [".lab2-shell-header", ".lab2-navigation", ".lab4-dashboard"]);
  await captureReleaseEvidence(page, {
    file: `staff-dashboard/${viewport.name}-issue79.png`, role: "IT Staff", route: "#/staff/dashboard",
    scenario: `${viewport.name} Staff Dashboard with current-user Actions`, scenarioId: "L4-STF-DASHBOARD",
    mapping: ["AC-16", "AC-25"], testId: viewport.testId, rubricPart: "P9", viewport: size,
  });

  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "Ticket Queue" }).click();
  await page.goto(`/#/staff/tickets/${fixture.ticketId}`);
  await expect(page.getByRole("heading", { name: "Staff Ticket Detail" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ticket workflow history" })).toBeVisible();
  await expect(page.getByText("Staff-only diagnostic: the west switch uplink recently renegotiated.")).toBeVisible();
  const createAction = page.getByRole("button", { name: "Create Action" });
  await createAction.focus();
  await page.keyboard.press("Enter");
  const closeEditor = page.getByRole("button", { name: "Close" });
  await page.keyboard.press("Tab");
  await expect(closeEditor).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Action Description")).toBeFocused();
  await page.getByRole("button", { name: "Save Action" }).click();
  await expect(page.getByText("Action Description is required.")).toBeVisible();
  await expect(page.getByLabel("Action Description")).toBeFocused();
  await assertNoHorizontalOverflow(page);
  await assertVisibleWithinViewport(page, [".lab2-ticket-detail", ".lab4-actions", ".lab4-action-card", ".lab4-action-editor", ".lab4-workflow-history"]);
  await assertTouchTargets(page, [".lab2-ticket-detail button", ".lab4-actions button"], 40);
  await captureReleaseEvidence(page, {
    file: `actions-taken/${viewport.name}-issue79-staff-validation.png`, role: "IT Staff", route: `#/staff/tickets/${fixture.ticketId}`,
    scenario: `${viewport.name} Staff Action validation, private note, and workflow history`, scenarioId: "L4-STF-ACTIONS",
    mapping: ["AC-03", "AC-23", "AC-24", "AC-25"], testId: viewport.testId, rubricPart: "P9", viewport: size,
  });

  await page.getByRole("button", { name: "Close" }).click();
  const nextStatus = page.getByRole("combobox", { name: "Next status" });
  await nextStatus.selectOption("RESOLVED");
  const resolutionSummary = page.getByRole("textbox", { name: "Resolution Summary" });
  const confirmStatus = page.getByRole("button", { name: "Confirm status change" });
  await expect(resolutionSummary).toBeVisible();
  await expect(confirmStatus).toBeDisabled();
  await page.getByRole("checkbox", { name: /Confirm transition and consequence/ }).check();
  await expect(confirmStatus).toBeDisabled();
  await assertNoHorizontalOverflow(page);
  await captureReleaseEvidence(page, {
    file: `ticket-workflow/${viewport.name}-issue79-validation.png`, role: "IT Staff", route: `#/staff/tickets/${fixture.ticketId}`,
    scenario: `${viewport.name} resolution remains disabled until its required summary is supplied`, scenarioId: "L4-TICKET-WORKFLOW",
    mapping: ["AC-10", "AC-11", "AC-25"], testId: viewport.testId, rubricPart: "P9", viewport: size,
  });
  await resolutionSummary.fill("Access restored and verified on the campus network.");
  await expect(confirmStatus).toBeEnabled();
  await confirmStatus.click();
  await expect(page.locator(".lab2-ticket-detail").getByText("Resolved", { exact: true })).toBeVisible();

  await signOut(page);
  await signIn(page, fixture, fixture.administrator.email, "Staff Dashboard");
  await assertNoHorizontalOverflow(page);
  await captureReleaseEvidence(page, {
    file: `administrator-dashboard/${viewport.name}-issue79.png`, role: "Administrator", route: "#/staff/dashboard",
    scenario: `${viewport.name} Administrator reuses the Staff Dashboard`, scenarioId: "L4-ADM-DASHBOARD",
    mapping: ["AC-16", "AC-25"], testId: viewport.testId, rubricPart: "P9", viewport: size,
  });
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "Users" }).click();
  await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await captureReleaseEvidence(page, {
    file: `regression/${viewport.name}-issue79-administrator-users.png`, role: "Administrator", route: "#/staff/users",
    scenario: `${viewport.name} retained Administrator User Management screen`, scenarioId: "L4-RETAINED-REGRESSION",
    mapping: ["AC-21", "AC-23", "AC-25"], testId: viewport.testId, rubricPart: "P8", viewport: size,
  });
}
