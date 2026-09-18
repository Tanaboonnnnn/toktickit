import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "../../server/node_modules/@prisma/client/index.js";
import { hashPassword } from "../../server/dist/src/password.js";
import { captureReleaseEvidence } from "./support/release-evidence.js";

function readLocalEnv(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  const envPath = resolve(process.cwd(), "server/.env");
  if (!existsSync(envPath)) return undefined;
  const line = readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((candidate) => candidate.trimStart().startsWith(`${name}=`));
  return line?.slice(line.indexOf("=") + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
}

function testDatabaseUrl(): string {
  const development = readLocalEnv("DATABASE_URL");
  const testUrl = readLocalEnv("TEST_DATABASE_URL");
  if (!development || !testUrl) throw new Error("DATABASE_URL and TEST_DATABASE_URL are required for E2E authentication");
  const developmentName = decodeURIComponent(new URL(development).pathname.replace(/^\/+/, "")).toLowerCase();
  const testName = decodeURIComponent(new URL(testUrl).pathname.replace(/^\/+/, "")).toLowerCase();
  if (!developmentName || developmentName === testName) throw new Error("Authentication E2E requires a distinct test database");
  return testUrl;
}

test("E2E-01 login -> forced password change -> Requester app -> logout -> protected access denied", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const prisma = new PrismaClient({ datasources: { db: { url: testDatabaseUrl() } } });
  const tag = `e2e-auth-${process.pid}-${Date.now()}-${randomUUID().slice(0, 6)}`;
  const email = `${tag}@example.test`;
  const initialPassword = "Initial-E2E-Password-45!";
  const newPassword = "Changed-E2E-Password-45!";
  const passwordHash = await hashPassword(initialPassword);
  const user = await prisma.user.create({
    data: {
      name: "Issue 45 Requester",
      email,
      active: true,
      role: "REQUESTER",
      passwordHash,
      mustChangePassword: true,
    },
    select: { id: true },
  });

  try {
    await page.goto("/#/tickets");
    await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
    await expect(page.getByText(/development requester/i)).toHaveCount(0);

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(initialPassword);
    await page.getByRole("button", { name: "Login" }).click();

    await expect(page.getByRole("heading", { name: "Change Password" })).toBeVisible();
    await expect(page).toHaveURL(/#\/change-password$/);
    await captureReleaseEvidence(page, {
      file: "states/auth/mandatory-change-password.png",
      role: "Requester",
      route: "/#/change-password",
      scenario: "Initial-password login is gated on mandatory Change Password before normal application access",
      mapping: ["E2E-01", "UI-01", "AC-02", "Answer Part 5"],
    });
    await page.goto("/#/tickets/new");
    await expect(page.getByRole("heading", { name: "Change Password" })).toBeVisible();

    await page.getByLabel("Current password").fill(initialPassword);
    await page.getByLabel("New password", { exact: true }).fill(newPassword);
    await page.getByLabel("Confirm new password").fill(newPassword);
    await page.getByRole("button", { name: "Change Password" }).click();

    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
    await expect(page.getByText("Issue 45 Requester", { exact: true })).toBeVisible();
    await expect(page.getByText("Requester", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/#\/tickets$/);

    await page.reload();
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
    await page.goto("/#/tickets/new");
    await expect(page.getByRole("heading", { name: "Create Ticket" })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
    await page.goForward();
    await expect(page.getByRole("heading", { name: "Create Ticket" })).toBeVisible();

    const storageKeys = await page.evaluate(() => ({
      local: Object.keys(localStorage),
      session: Object.keys(sessionStorage),
    }));
    expect(storageKeys.local.join(" ")).not.toMatch(/token|password|credential|requester/i);
    expect(storageKeys.session.join(" ")).not.toMatch(/token|password|credential|requester/i);

    await page.getByRole("button", { name: "Logout" }).click();
    await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
    await expect(page).toHaveURL(/#\/login$/);

    const protectedResponse = await page.request.get("http://127.0.0.1:4311/api/tickets");
    expect(protectedResponse.status()).toBe(401);
    expect((await protectedResponse.json()).error.code).toBe("AUTHENTICATION_REQUIRED");

    await page.goto("/#/tickets");
    await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "My Tickets" })).toHaveCount(0);
  } finally {
    const sessions = await prisma.session.findMany({ select: { sid: true, sess: true } });
    const sessionIds = sessions
      .filter((row) => Number((row.sess as Record<string, unknown>).userId) === user.id)
      .map((row) => row.sid);
    if (sessionIds.length > 0) await prisma.session.deleteMany({ where: { sid: { in: sessionIds } } });
    await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
    await prisma.$disconnect();
  }
});
