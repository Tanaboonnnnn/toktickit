import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "../../server/node_modules/@prisma/client/index.js";
import { hashPassword } from "../../server/dist/src/password.js";
import { assertNoHorizontalOverflow } from "../lab-02/support/ui.js";
import { captureReleaseEvidence } from "./support/release-evidence.js";

function readLocalEnv(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  const envPath = resolve(process.cwd(), "server/.env");
  if (!existsSync(envPath)) return undefined;
  const line = readFileSync(envPath, "utf8").split(/\r?\n/).find((candidate) => candidate.trimStart().startsWith(`${name}=`));
  return line?.slice(line.indexOf("=") + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
}

function testDatabaseUrl(): string {
  const development = readLocalEnv("DATABASE_URL");
  const testUrl = readLocalEnv("TEST_DATABASE_URL");
  if (!development || !testUrl) throw new Error("DATABASE_URL and TEST_DATABASE_URL are required for User Administration E2E");
  const developmentName = decodeURIComponent(new URL(development).pathname.replace(/^\/+/, "")).toLowerCase();
  const testName = decodeURIComponent(new URL(testUrl).pathname.replace(/^\/+/, "")).toLowerCase();
  if (!developmentName || developmentName === testName) throw new Error("User Administration E2E requires a distinct test database");
  return testUrl;
}

const adminPassword = "Administrator-E2E-Password-50!";
const initialPassword = "User-E2E-Initial-Password-50!";
const resetPassword = "User-E2E-Replacement-Password-50!";
const ADMIN_NAME = "Arisa Wattanakul";
const REQUESTER_NAME = "Ploy Srisuk";
const MANAGED_STAFF_NAME = "Kanya Prasert";
const MANAGED_STAFF_UPDATED_NAME = "Kanya Prasertchai";
let prisma: PrismaClient;
let administrator: { id: number; email: string; name: string };
let requesterId = 0;
let categoryId = 0;
let relatedSystemId = 0;
let targetUserId = 0;
let safetyTicketId = 0;

async function login(page: Page, email: string, password: string, expectedHeading: string): Promise<void> {
  await page.goto("/#/login");
  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("heading", { name: expectedHeading })).toBeVisible();
}

test.beforeAll(async () => {
  prisma = new PrismaClient({ datasources: { db: { url: testDatabaseUrl() } } });
  await prisma.$connect();
  const passwordHash = await hashPassword(adminPassword);
  administrator = await prisma.user.create({
    data: { name: ADMIN_NAME, email: "arisa.admin@example.test", active: true, role: "ADMINISTRATOR", passwordHash, mustChangePassword: false },
    select: { id: true, email: true, name: true },
  });
  requesterId = (await prisma.user.create({
    data: { name: REQUESTER_NAME, email: "ploy.srisuk@example.test", active: true, role: "REQUESTER", passwordHash, mustChangePassword: false },
    select: { id: true },
  })).id;
  categoryId = (await prisma.category.upsert({ where: { name: "Account and Access" }, update: { active: true }, create: { name: "Account and Access", active: true }, select: { id: true } })).id;
  relatedSystemId = (await prisma.relatedSystem.upsert({ where: { name: "Student Portal" }, update: { active: true }, create: { name: "Student Portal", active: true }, select: { id: true } })).id;
});

test.afterAll(async () => {
  if (!prisma) return;
  if (safetyTicketId) await prisma.ticket.deleteMany({ where: { id: safetyTicketId } });
  const userIds = [administrator?.id, requesterId, targetUserId].filter((id): id is number => Number.isSafeInteger(id) && id > 0);
  const sessions = await prisma.session.findMany({ select: { sid: true, sess: true } });
  const sessionIds = sessions.filter((row) => userIds.includes(Number((row.sess as Record<string, unknown>).userId))).map((row) => row.sid);
  if (sessionIds.length) await prisma.session.deleteMany({ where: { sid: { in: sessionIds } } });
  if (userIds.length) await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

test("E2E-05 Administrator creates, edits, resets and safely deactivates a User", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, administrator.email, adminPassword, "User Management");

  const search = page.getByRole("searchbox", { name: /search users by name or email/i });
  await search.fill(administrator.email);
  await search.press("Enter");
  await expect(page.getByText(administrator.email)).toBeVisible();
  await page.getByRole("button", { name: `Edit ${administrator.name}` }).click();
  await page.getByLabel("Active account").uncheck();
  await page.getByRole("button", { name: "Save user" }).click();
  await expect(page.getByRole("alert")).toContainText("You cannot deactivate your own account");
  await captureReleaseEvidence(page, {
    file: "states/admin/self-deactivation-safety.png",
    role: "Administrator",
    route: "/#/admin/users",
    scenario: "Administrator self-deactivation is rejected with clear safety feedback",
    mapping: ["E2E-05", "USER-03", "AC-25", "Answer Part 8"],
  });
  await page.getByRole("button", { name: "Close edit" }).click();
  await page.getByRole("button", { name: "Clear search/filters" }).click();

  const targetName = MANAGED_STAFF_NAME;
  const targetUpdatedName = MANAGED_STAFF_UPDATED_NAME;
  const targetEmail = "kanya.prasert@example.test";
  const targetUpdatedEmail = "kanya.prasertchai@example.test";
  await page.getByRole("button", { name: "Create User" }).click();
  await captureReleaseEvidence(page, {
    file: "states/admin/create-user-form.png",
    role: "Administrator",
    route: "/#/admin/users",
    scenario: "Minimal Create User form with one role, activation state and initial password",
    mapping: ["E2E-05", "UI-06", "AC-22", "Answer Part 8"],
  });
  await page.getByLabel("Name", { exact: true }).fill(targetName);
  await page.getByLabel("Email", { exact: true }).fill(targetEmail);
  await page.getByLabel("User role").selectOption("IT_STAFF");
  await page.getByLabel("Initial password", { exact: true }).fill(initialPassword);
  await page.getByLabel("Confirm initial password", { exact: true }).fill(initialPassword);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("User created successfully")).toBeVisible();
  const target = await prisma.user.findUniqueOrThrow({ where: { email: targetEmail } });
  targetUserId = target.id;
  expect(target.passwordHash).not.toBe(initialPassword);
  expect(target.mustChangePassword).toBe(true);

  await search.fill(targetEmail);
  await search.press("Enter");
  await expect(page.getByText(targetEmail)).toBeVisible();
  await page.getByRole("button", { name: `Edit ${targetName}` }).click();
  await page.getByLabel("Edit name").fill(targetUpdatedName);
  await page.getByLabel("Edit email").fill(targetUpdatedEmail);
  await page.getByRole("button", { name: "Save user" }).click();
  await expect(page.getByText("User updated successfully")).toBeVisible();

  await page.getByLabel("New initial password", { exact: true }).fill(resetPassword);
  await page.getByLabel("Confirm new initial password", { exact: true }).fill(resetPassword);
  await page.getByRole("checkbox", { name: /confirm setting a new initial password/i }).check();
  await captureReleaseEvidence(page, {
    file: "states/admin/edit-and-initial-password-reset.png",
    role: "Administrator",
    route: "/#/admin/users",
    scenario: "Edit User and separate confirmed Set New Initial Password action",
    mapping: ["E2E-05", "UI-06", "AC-23", "AC-24", "Answer Part 8"],
  });
  await page.getByRole("button", { name: "Set new initial password" }).click();
  await expect(page.getByText("Initial password reset successfully")).toBeVisible();

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
  await page.getByLabel("Email", { exact: true }).fill(targetUpdatedEmail);
  await page.getByLabel("Password", { exact: true }).fill(initialPassword);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("alert")).toContainText("Invalid email or password");
  await page.getByLabel("Password").fill(resetPassword);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("heading", { name: "Change Password" })).toBeVisible();

  await page.context().clearCookies();
  await page.reload();
  await login(page, administrator.email, adminPassword, "User Management");
  safetyTicketId = (await prisma.ticket.create({
    data: {
      ticketNumber: `TKT-20991252-${randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase()}`,
      clientRequestId: randomUUID(), requesterId, ownerId: targetUserId, categoryId, relatedSystemId,
      summary: "Assigned ticket blocks unsafe account deactivation", description: "This open ticket remains assigned so the Administrator must reassign it before deactivating the IT Staff account.",
      requestedPriority: "MEDIUM", itPriority: "MEDIUM", currentStatus: "NEW",
    },
    select: { id: true },
  })).id;

  await search.fill(targetUpdatedEmail);
  await search.press("Enter");
  await page.getByRole("button", { name: `Edit ${targetUpdatedName}` }).click();
  await page.getByLabel("Active account").uncheck();
  await page.getByRole("button", { name: "Save user" }).click();
  await expect(page.getByRole("alert")).toContainText("Reassign owned Tickets before deactivating or demoting this user");
  await captureReleaseEvidence(page, {
    file: "states/admin/assigned-owner-safety.png",
    role: "Administrator",
    route: "/#/admin/users",
    scenario: "Assigned primary Ticket Owner cannot be deactivated/demoted until Tickets are reassigned",
    mapping: ["E2E-05", "USER-03", "AC-25", "Answer Part 8"],
  });

  await prisma.ticket.update({ where: { id: safetyTicketId }, data: { ownerId: null } });
  await page.getByRole("button", { name: "Save user" }).click();
  await expect(page.getByText("User updated successfully")).toBeVisible();
  expect((await prisma.user.findUniqueOrThrow({ where: { id: targetUserId } })).active).toBe(false);

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
  await page.getByLabel("Email", { exact: true }).fill(targetUpdatedEmail);
  await page.getByLabel("Password", { exact: true }).fill(resetPassword);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("alert")).toContainText("Your account cannot sign in");
  await captureReleaseEvidence(page, {
    file: "states/auth/inactive-account-safe-failure.png",
    role: "Unauthenticated",
    route: "/#/login",
    scenario: "Inactive account receives safe sign-in failure feedback without protected account detail",
    mapping: ["E2E-05", "AUTH-01", "AC-01", "Answer Part 5"],
  });
});

test("Issue #50 User Management stays usable without page overflow at required viewports", async ({ page }) => {
  await login(page, administrator.email, adminPassword, "User Management");
  for (const viewport of [{ width: 1440, height: 900 }, { width: 834, height: 1112 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();
    await expect(page.getByRole("searchbox", { name: /search users by name or email/i })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Role" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create User" })).toBeVisible();
    await assertNoHorizontalOverflow(page);
  }
});
