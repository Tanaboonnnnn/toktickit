import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { PrismaClient } from "../../../server/node_modules/@prisma/client/index.js";
import { hashPassword } from "../../../server/dist/src/password.js";
import { assertNoHorizontalOverflow, assertTouchTargets, screenshot } from "../../lab-02/support/ui.js";

export const ISSUE51_PASSWORD = "Integrated-Verification-51!";

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
  if (!development || !testUrl) throw new Error("Issue #51 E2E requires DATABASE_URL and TEST_DATABASE_URL");
  const developmentName = decodeURIComponent(new URL(development).pathname.replace(/^\/+/, "")).toLowerCase();
  const testName = decodeURIComponent(new URL(testUrl).pathname.replace(/^\/+/, "")).toLowerCase();
  if (!developmentName || developmentName === testName) throw new Error("Issue #51 E2E requires a distinct test database");
  return testUrl;
}

export interface Issue51Fixture {
  prisma: PrismaClient;
  tag: string;
  requester: { id: number; email: string };
  staff: { id: number; email: string };
  administrator: { id: number; email: string };
  ticketId: number;
  categoryId: number;
  relatedSystemId: number;
}

export async function createIssue51Fixture(label: string): Promise<Issue51Fixture> {
  const prisma = new PrismaClient({ datasources: { db: { url: testDatabaseUrl() } } });
  await prisma.$connect();
  const tag = `issue51-${label}-${process.pid}-${Date.now()}-${randomUUID().slice(0, 6)}`;
  const passwordHash = await hashPassword(ISSUE51_PASSWORD);
  const requester = await prisma.user.create({ data: { name: `${tag} Requester`, email: `${tag}-requester@example.test`, role: "REQUESTER", active: true, passwordHash, mustChangePassword: false }, select: { id: true, email: true } });
  const staff = await prisma.user.create({ data: { name: `${tag} Staff`, email: `${tag}-staff@example.test`, role: "IT_STAFF", active: true, passwordHash, mustChangePassword: false }, select: { id: true, email: true } });
  const administrator = await prisma.user.create({ data: { name: `${tag} Admin`, email: `${tag}-admin@example.test`, role: "ADMINISTRATOR", active: true, passwordHash, mustChangePassword: false }, select: { id: true, email: true } });
  const category = await prisma.category.create({ data: { name: `${tag} Category`, active: true } });
  const system = await prisma.relatedSystem.create({ data: { name: `${tag} System`, active: true } });
  const ticket = await prisma.ticket.create({ data: {
    ticketNumber: `TKT-20995103-${randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase()}`,
    clientRequestId: randomUUID(), requesterId: requester.id, ownerId: staff.id,
    categoryId: category.id, relatedSystemId: system.id,
    summary: `${tag} long integrated verification summary that must wrap without clipping`,
    description: `${tag} integrated responsive and accessibility evidence with sufficiently long content to exercise wrapping.`,
    requestedPriority: "HIGH", itPriority: "MEDIUM", currentStatus: "IN_PROGRESS",
  }, select: { id: true } });
  await prisma.publicComment.create({ data: { ticketId: ticket.id, authorId: staff.id, body: `${tag} public comment with readable long content for responsive verification.` } });
  await prisma.internalNote.create({ data: { ticketId: ticket.id, authorId: staff.id, body: `${tag} private note visible only on the Staff detail.` } });
  return { prisma, tag, requester, staff, administrator, ticketId: ticket.id, categoryId: category.id, relatedSystemId: system.id };
}

export async function destroyIssue51Fixture(fixture: Issue51Fixture): Promise<void> {
  const ids = [fixture.requester.id, fixture.staff.id, fixture.administrator.id];
  await fixture.prisma.internalNote.deleteMany({ where: { ticketId: fixture.ticketId } });
  await fixture.prisma.publicComment.deleteMany({ where: { ticketId: fixture.ticketId } });
  await fixture.prisma.attachment.deleteMany({ where: { ticketId: fixture.ticketId } });
  await fixture.prisma.ticket.deleteMany({ where: { id: fixture.ticketId } });
  const sessions = await fixture.prisma.session.findMany({ select: { sid: true, sess: true } });
  const sessionIds = sessions.filter((row) => ids.includes(Number((row.sess as Record<string, unknown>).userId))).map((row) => row.sid);
  if (sessionIds.length) await fixture.prisma.session.deleteMany({ where: { sid: { in: sessionIds } } });
  await fixture.prisma.category.deleteMany({ where: { id: fixture.categoryId } });
  await fixture.prisma.relatedSystem.deleteMany({ where: { id: fixture.relatedSystemId } });
  await fixture.prisma.user.deleteMany({ where: { id: { in: ids } } });
  await fixture.prisma.$disconnect();
}

export async function loginIssue51(page: Page, email: string, home: "My Tickets" | "Ticket Queue" | "User Management"): Promise<void> {
  await page.goto("/#/login");
  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(ISSUE51_PASSWORD);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("heading", { name: home })).toBeVisible();
}

async function capture(page: Page, viewportName: string, name: string): Promise<void> {
  await assertNoHorizontalOverflow(page);
  if (page.viewportSize()?.width === 390) {
    await assertTouchTargets(page, ["button", "select", "input[type=text]", "input[type=email]", "input[type=password]", "input[type=search]"]);
  }
  await screenshot(page, `artifacts/lab-03/screenshots/issue-51/${viewportName}/${name}.png`);
}

export async function exerciseMajorScreens(page: Page, fixture: Issue51Fixture, viewportName: string): Promise<void> {
  await page.goto("/#/login");
  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
  await capture(page, viewportName, "01-login");

  await loginIssue51(page, fixture.requester.email, "My Tickets");
  await capture(page, viewportName, "02-requester-my-tickets");
  await page.goto("/#/tickets/new");
  await expect(page.getByRole("heading", { name: "Create Ticket" })).toBeVisible();
  await capture(page, viewportName, "03-requester-create");
  await page.goto(`/#/tickets/${fixture.ticketId}`);
  await expect(page.getByText(fixture.tag + " public comment with readable long content for responsive verification.")).toBeVisible();
  await expect(page.getByText(/private note visible only/i)).toHaveCount(0);
  await capture(page, viewportName, "04-requester-detail");
  await page.goto("/#/change-password");
  await expect(page.getByRole("heading", { name: "Change Password" })).toBeVisible();
  await capture(page, viewportName, "05-change-password");
  await page.goto("/#/staff/tickets");
  await expect(page.getByRole("heading", { name: "Access Denied" })).toBeVisible();
  await capture(page, viewportName, "06-requester-forbidden");
  await page.getByRole("button", { name: "Logout" }).click();

  await loginIssue51(page, fixture.staff.email, "Ticket Queue");
  await capture(page, viewportName, "07-staff-queue");
  await page.goto(`/#/staff/tickets/${fixture.ticketId}`);
  await expect(page.getByRole("heading", { name: "Ticket Detail" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Internal Notes" })).toBeVisible();
  await capture(page, viewportName, "08-staff-detail");
  await page.getByRole("button", { name: "Logout" }).click();

  await loginIssue51(page, fixture.administrator.email, "User Management");
  await expect(page.getByRole("searchbox", { name: /search users by name or email/i })).toBeVisible();
  await capture(page, viewportName, "09-admin-users");
}
