import { randomUUID } from "node:crypto";
import { PrismaClient } from "../../../server/node_modules/@prisma/client/index.js";
import { hashPassword } from "../../../server/dist/src/password.js";
import { assertDistinctTestDatabase } from "../../../server/dist/tests/lab-03/support/database.js";

const password = "Issue79-Regression-E2E-Password!";

function isolatedTestUrl(): string {
  const developmentUrl = process.env.DATABASE_URL;
  const testUrl = process.env.TEST_DATABASE_URL;
  assertDistinctTestDatabase({ developmentUrl, testUrl });
  return testUrl!;
}

export interface Issue79Fixture {
  prisma: PrismaClient;
  password: string;
  requester: { id: number; email: string };
  staff: { id: number; email: string };
  administrator: { id: number; email: string };
  ticketId: number;
  actionId: number;
  attachmentName: string;
  attachmentId: number;
}

export async function createIssue79Fixture(): Promise<Issue79Fixture> {
  const prisma = new PrismaClient({ datasources: { db: { url: isolatedTestUrl() } } });
  await prisma.$connect();
  const passwordHash = await hashPassword(password);
  const [requester, staff, administrator] = await Promise.all([
    prisma.user.create({ data: { name: "Mina Requester", email: "mina.requester@example.test", active: true, role: "REQUESTER", passwordHash, mustChangePassword: false }, select: { id: true, email: true } }),
    prisma.user.create({ data: { name: "Niran Staff", email: "niran.service-desk@example.test", active: true, role: "IT_STAFF", passwordHash, mustChangePassword: false }, select: { id: true, email: true } }),
    prisma.user.create({ data: { name: "Ploy Administrator", email: "ploy.administrator@example.test", active: true, role: "ADMINISTRATOR", passwordHash, mustChangePassword: false }, select: { id: true, email: true } }),
  ]);
  const [category, relatedSystem] = await Promise.all([
    prisma.category.findUnique({ where: { name: "Network" } }),
    prisma.relatedSystem.findUnique({ where: { name: "Campus Wi-Fi" } }),
  ]);
  if (!category?.active || !relatedSystem?.active) throw new Error("Issue #79 browser fixture requires active seeded Network and Campus Wi-Fi reference rows");
  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber: `TKT-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase()}`,
      clientRequestId: randomUUID(),
      requesterId: requester.id,
      ownerId: staff.id,
      categoryId: category.id,
      relatedSystemId: relatedSystem.id,
      summary: "Campus access point disconnects during online classes",
      description: "Investigate intermittent connectivity and document the service work for the affected study area.",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: "IN_PROGRESS",
      version: 2,
    },
  });
  const action = await prisma.actionTaken.create({
    data: {
      ticketId: ticket.id,
      workflowCycle: ticket.workflowCycle,
      recordedById: staff.id,
      assigneeId: staff.id,
      performedById: administrator.id,
      description: "Inspect the access point uplink, verify the west switch port, trace the cable path through the study area, and confirm nearby classrooms remain connected.",
      result: "The link is stable after the cable was reseated and throughput was verified.",
      followUpRequired: false,
      attachmentNotes: "Review the referenced access-point photo and confirm the cable label against the switch record.",
      status: "COMPLETED",
      version: 1,
      updatedById: administrator.id,
      completedAt: new Date(),
      clientRequestId: randomUUID(),
      createFingerprint: randomUUID(),
    },
  });
  await prisma.actionTakenRevision.create({
    data: {
      actionId: action.id,
      actionVersion: action.version,
      eventType: "CREATED",
      actorId: staff.id,
      snapshot: {
        description: action.description,
        result: action.result,
        followUpRequired: false,
        followUpNote: null,
        attachmentNotes: action.attachmentNotes,
        status: "COMPLETED",
        assignee: { id: staff.id, name: "Niran Staff", role: "IT_STAFF" },
        performedBy: { id: administrator.id, name: "Ploy Administrator", role: "ADMINISTRATOR" },
      },
    },
  });
  await prisma.publicComment.create({ data: { ticketId: ticket.id, authorId: requester.id, body: "The connection has dropped twice during class." } });
  await prisma.internalNote.create({ data: { ticketId: ticket.id, authorId: staff.id, body: "Staff-only diagnostic: the west switch uplink recently renegotiated." } });
  await prisma.ticketWorkflowEvent.create({
    data: {
      ticketId: ticket.id,
      ticketVersion: ticket.version,
      workflowCycle: ticket.workflowCycle,
      fromStatus: "OPEN",
      toStatus: "IN_PROGRESS",
      actorId: staff.id,
    },
  });
  const attachmentName = "switch-photo-unavailable.pdf";
  const attachment = await prisma.attachment.create({
    data: {
      ticketId: ticket.id,
      originalName: attachmentName,
      storedName: `${randomUUID()}.pdf`,
      mimeType: "application/pdf",
      sizeBytes: 32,
    },
  });

  return { prisma, password, requester, staff, administrator, ticketId: ticket.id, actionId: action.id, attachmentName, attachmentId: attachment.id };
}

export async function destroyIssue79Fixture(fixture: Issue79Fixture | undefined): Promise<void> {
  if (!fixture) return;
  const { prisma, ticketId, actionId, requester, staff, administrator } = fixture;
  await prisma.actionTakenRevision.deleteMany({ where: { actionId } });
  await prisma.actionTaken.deleteMany({ where: { id: actionId } });
  await prisma.ticketWorkflowEvent.deleteMany({ where: { ticketId } });
  await prisma.publicComment.deleteMany({ where: { ticketId } });
  await prisma.internalNote.deleteMany({ where: { ticketId } });
  await prisma.attachment.deleteMany({ where: { ticketId } });
  await prisma.ticket.deleteMany({ where: { id: ticketId } });
  const userIds = [requester.id, staff.id, administrator.id];
  const sessions = await prisma.session.findMany({ select: { sid: true, sess: true } });
  const sessionIds = sessions.filter((row) => userIds.includes(Number((row.sess as Record<string, unknown>).userId))).map((row) => row.sid);
  if (sessionIds.length) await prisma.session.deleteMany({ where: { sid: { in: sessionIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
}

export async function signIn(page: import("@playwright/test").Page, fixture: Issue79Fixture, email: string, home: string): Promise<void> {
  await page.goto("/#/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(fixture.password);
  await page.getByRole("button", { name: "Login" }).click();
  await page.getByRole("heading", { name: home }).waitFor();
}

export async function signOut(page: import("@playwright/test").Page): Promise<void> {
  await page.getByRole("button", { name: "Logout" }).click();
  await page.getByRole("heading", { name: "Login" }).waitFor();
}
