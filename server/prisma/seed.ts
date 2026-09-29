import { Prisma, type PrismaClient, type UserRole } from "@prisma/client";
import { getPrisma } from "../src/prisma.js";
import { generateInitialPassword } from "../src/provisioning.js";
import { hashPassword } from "../src/password.js";

const categories = ["Account and Access", "Hardware", "Software", "Network"] as const;
const relatedSystems = [
  "Student Portal",
  "Learning Management System",
  "Campus Wi-Fi",
  "University Email",
  "Library System",
  "Finance and Registration",
] as const;

const users = [
  { name: "Anan Kittisak", email: "anan.student@example.test", active: true, role: "REQUESTER" },
  { name: "Mali Charoensuk", email: "mali.student@example.test", active: true, role: "REQUESTER" },
  { name: "Niran Prasert", email: "niran.student@example.test", active: true, role: "REQUESTER" },
  { name: "Ploy Rattanakorn", email: "ploy.student@example.test", active: true, role: "REQUESTER" },
  { name: "Somchai Wattanapong", email: "somchai.former@example.test", active: false, role: "REQUESTER" },
  { name: "Nida Chaiyasit", email: "nida.it@example.test", active: true, role: "IT_STAFF" },
  { name: "Korn Sombat", email: "korn.it@example.test", active: true, role: "IT_STAFF" },
  { name: "Dao Kittipong", email: "dao.it@example.test", active: true, role: "IT_STAFF" },
  { name: "Som Prasert", email: "som.it@example.test", active: false, role: "IT_STAFF" },
  { name: "Kanya Wattanakul", email: "admin.lab3@example.test", active: true, role: "ADMINISTRATOR" },
] as const satisfies ReadonlyArray<{ name: string; email: string; active: boolean; role: UserRole }>;

async function ensureReferenceData(prisma: PrismaClient): Promise<void> {
  for (const name of categories) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name, active: true } });
  }
  for (const name of relatedSystems) {
    await prisma.relatedSystem.upsert({ where: { name }, update: {}, create: { name, active: true } });
  }
}

async function ensureUser(
  prisma: PrismaClient,
  fixture: (typeof users)[number],
): Promise<{ id: number; email: string }> {
  const existing = await prisma.user.findUnique({
    where: { email: fixture.email },
    select: { id: true, email: true },
  });
  if (existing) return existing;

  const password = generateInitialPassword();
  const passwordHash = await hashPassword(password);
  try {
    const created = await prisma.user.create({
      data: {
        ...fixture,
        passwordHash,
        mustChangePassword: true,
      },
      select: { id: true, email: true },
    });
    console.log(`[local-only seed credential] ${created.email} ${password}`);
    return created;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const winner = await prisma.user.findUnique({
        where: { email: fixture.email },
        select: { id: true, email: true },
      });
      if (winner) return winner;
    }
    throw error;
  }
}

async function ensureTicketFixtures(prisma: PrismaClient, userIds: Map<string, number>): Promise<void> {
  const category = await prisma.category.findUniqueOrThrow({ where: { name: "Hardware" } });
  const system = await prisma.relatedSystem.findUniqueOrThrow({ where: { name: "University Email" } });
  const ticketFixtures = [
    { suffix: "01", requester: users[0].email, owner: null, requestedPriority: "LOW", itPriority: "LOW", currentStatus: "NEW", summary: "Laptop cannot join campus Wi-Fi" },
    { suffix: "02", requester: users[1].email, owner: users[5].email, requestedPriority: "HIGH", itPriority: "MEDIUM", currentStatus: "OPEN", summary: "University email access is blocked" },
    { suffix: "03", requester: users[2].email, owner: users[6].email, requestedPriority: "MEDIUM", itPriority: "HIGH", currentStatus: "IN_PROGRESS", summary: "Student Portal intermittently times out" },
    { suffix: "04", requester: users[3].email, owner: users[7].email, requestedPriority: "HIGH", itPriority: "HIGH", currentStatus: "WAITING_FOR_REQUESTER", summary: "Need more information about printer failure" },
    { suffix: "05", requester: users[0].email, owner: users[5].email, requestedPriority: "MEDIUM", itPriority: "MEDIUM", currentStatus: "RESOLVED", summary: "Reset cached email credentials", resolutionSummary: "Cleared cached credentials and verified a successful sign-in.", resolvedAt: new Date("2026-09-14T03:00:00.000Z") },
    { suffix: "06", requester: users[1].email, owner: users[6].email, requestedPriority: "LOW", itPriority: "LOW", currentStatus: "CLOSED", summary: "Replace damaged keyboard", resolutionSummary: "Replaced the damaged keyboard and confirmed normal key input.", resolvedAt: new Date("2026-09-13T03:00:00.000Z"), closedAt: new Date("2026-09-14T04:00:00.000Z") },
    { suffix: "07", requester: users[2].email, owner: users[7].email, requestedPriority: "HIGH", itPriority: "MEDIUM", currentStatus: "REOPENED", summary: "Campus Wi-Fi issue returned" },
    { suffix: "08", requester: users[3].email, owner: users[5].email, requestedPriority: "MEDIUM", itPriority: "MEDIUM", currentStatus: "CANCELLED", summary: "Duplicate access request", cancelReason: "Duplicate request", cancelledAt: new Date("2026-09-14T05:00:00.000Z") },
  ] as const;

  const ticketIds = new Map<string, number>();
  for (const fixture of ticketFixtures) {
    const ticketNumber = `TKT-20260915-L300${fixture.suffix}`;
    const existing = await prisma.ticket.findUnique({ where: { ticketNumber }, select: { id: true } });
    if (existing) {
      ticketIds.set(ticketNumber, existing.id);
      continue;
    }
    const created = await prisma.ticket.create({
      data: {
        ticketNumber,
        clientRequestId: `00000000-0000-4000-8000-0000000000${fixture.suffix}`,
        requesterId: userIds.get(fixture.requester)!,
        ownerId: fixture.owner ? userIds.get(fixture.owner)! : null,
        categoryId: category.id,
        relatedSystemId: system.id,
        summary: fixture.summary,
        description: `Lab 3 seed fixture for ${fixture.summary}.`,
        requestedPriority: fixture.requestedPriority,
        itPriority: fixture.itPriority,
        currentStatus: fixture.currentStatus,
        ...(fixture.currentStatus === "RESOLVED" || fixture.currentStatus === "CLOSED"
          ? { resolutionSummary: fixture.resolutionSummary, resolvedAt: fixture.resolvedAt }
          : {}),
        ...(fixture.currentStatus === "CLOSED" ? { closedAt: fixture.closedAt } : {}),
        ...(fixture.currentStatus === "CANCELLED"
          ? { cancelReason: fixture.cancelReason, cancelledAt: fixture.cancelledAt }
          : {}),
      },
      select: { id: true },
    });
    ticketIds.set(ticketNumber, created.id);
  }

  const openTicket = ticketIds.get("TKT-20260915-L30002")!;
  const waitingTicket = ticketIds.get("TKT-20260915-L30004")!;
  const publicFixtures = [
    { ticketId: openTicket, authorId: userIds.get(users[1].email)!, body: "I still cannot sign in from the lab computer." },
    { ticketId: openTicket, authorId: userIds.get(users[5].email)!, body: "We are checking the account and will update you here." },
  ];
  for (const fixture of publicFixtures) {
    const existing = await prisma.publicComment.findFirst({ where: fixture, select: { id: true } });
    if (!existing) await prisma.publicComment.create({ data: fixture });
  }
  const noteFixture = {
    ticketId: waitingTicket,
    authorId: userIds.get(users[7].email)!,
    body: "Need the device serial number before arranging a replacement.",
  };
  const existingNote = await prisma.internalNote.findFirst({ where: noteFixture, select: { id: true } });
  if (!existingNote) await prisma.internalNote.create({ data: noteFixture });
}

async function ensureLab4Fixtures(prisma: PrismaClient, userIds: Map<string, number>): Promise<void> {
  const emptyRequesterEmail = "empty.dashboard.lab4@example.test";
  if (!await prisma.user.findUnique({ where: { email: emptyRequesterEmail }, select: { id: true } })) {
    const password = generateInitialPassword();
    await prisma.user.create({ data: { name: "Lab 4 Empty Dashboard", email: emptyRequesterEmail, active: true, role: "REQUESTER", passwordHash: await hashPassword(password), mustChangePassword: true } });
  }
  const category = await prisma.category.findUniqueOrThrow({ where: { name: "Network" } });
  const system = await prisma.relatedSystem.findUniqueOrThrow({ where: { name: "Campus Wi-Fi" } });
  const ticketFixtures = [
    { suffix: "01", requester: users[0].email, owner: null, requestedPriority: "LOW", itPriority: "LOW", currentStatus: "NEW", summary: "Lab 4 empty requester dashboard fixture" },
    { suffix: "02", requester: users[1].email, owner: users[5].email, requestedPriority: "HIGH", itPriority: "MEDIUM", currentStatus: "OPEN", summary: "Investigate unstable wireless connection" },
    { suffix: "03", requester: users[2].email, owner: users[6].email, requestedPriority: "MEDIUM", itPriority: "HIGH", currentStatus: "IN_PROGRESS", summary: "Repair lab access point uplink" },
    { suffix: "04", requester: users[3].email, owner: users[7].email, requestedPriority: "HIGH", itPriority: "HIGH", currentStatus: "WAITING_FOR_REQUESTER", summary: "Confirm device after network repair" },
    { suffix: "05", requester: users[0].email, owner: users[5].email, requestedPriority: "MEDIUM", itPriority: "MEDIUM", currentStatus: "RESOLVED", summary: "Restore campus Wi-Fi profile", resolutionSummary: "Rebuilt the wireless profile and verified connectivity.", resolvedAt: new Date("2026-09-29T03:00:00.000Z") },
    { suffix: "06", requester: users[1].email, owner: users[6].email, requestedPriority: "LOW", itPriority: "LOW", currentStatus: "CLOSED", summary: "Replace damaged network cable", resolutionSummary: "Replaced the cable and verified stable connectivity.", resolvedAt: new Date("2026-09-28T03:00:00.000Z"), closedAt: new Date("2026-09-29T04:00:00.000Z") },
    { suffix: "07", requester: users[2].email, owner: users[7].email, requestedPriority: "HIGH", itPriority: "MEDIUM", currentStatus: "REOPENED", summary: "Wireless issue returned after repair" },
    { suffix: "08", requester: users[3].email, owner: users[5].email, requestedPriority: "MEDIUM", itPriority: "MEDIUM", currentStatus: "CANCELLED", summary: "Duplicate wireless support request", cancelReason: "Duplicate request", cancelledAt: new Date("2026-09-29T05:00:00.000Z") },
  ] as const;

  const ticketIds = new Map<string, number>();
  for (const fixture of ticketFixtures) {
    const ticketNumber = `TKT-20260929-L4${fixture.suffix}`;
    const existing = await prisma.ticket.findUnique({ where: { ticketNumber }, select: { id: true } });
    if (existing) { ticketIds.set(ticketNumber, existing.id); continue; }
    const created = await prisma.ticket.create({
      data: {
        ticketNumber,
        clientRequestId: `10000000-0000-4000-8000-0000000000${fixture.suffix}`,
        requesterId: userIds.get(fixture.requester)!,
        ownerId: fixture.owner ? userIds.get(fixture.owner)! : null,
        categoryId: category.id,
        relatedSystemId: system.id,
        summary: fixture.summary,
        description: `Lab 4 seed fixture for ${fixture.summary}.`,
        requestedPriority: fixture.requestedPriority,
        itPriority: fixture.itPriority,
        currentStatus: fixture.currentStatus,
        workflowCycle: fixture.currentStatus === "REOPENED" ? 2 : 1,
        ...(fixture.currentStatus === "RESOLVED" || fixture.currentStatus === "CLOSED" ? { resolutionSummary: fixture.resolutionSummary, resolvedAt: fixture.resolvedAt } : {}),
        ...(fixture.currentStatus === "CLOSED" ? { closedAt: fixture.closedAt } : {}),
        ...(fixture.currentStatus === "CANCELLED" ? { cancelReason: fixture.cancelReason, cancelledAt: fixture.cancelledAt } : {}),
      }, select: { id: true },
    });
    ticketIds.set(ticketNumber, created.id);
  }

  const actionFixtures = [
    { ticket: "02", key: "01", recorder: users[5].email, assignee: users[6].email, description: "Inspect wireless authentication logs", status: "PENDING", followUpRequired: false },
    { ticket: "03", key: "02", recorder: users[5].email, assignee: users[6].email, description: "Trace the access point uplink", status: "IN_PROGRESS", followUpRequired: false },
    { ticket: "03", key: "03", recorder: users[6].email, assignee: users[7].email, performer: users[5].email, description: "Replace damaged uplink patch cable", result: "Cable replaced and link negotiated normally.", status: "COMPLETED", followUpRequired: false },
    { ticket: "04", key: "04", recorder: users[7].email, assignee: users[7].email, performer: users[7].email, description: "Apply repaired wireless profile", result: "Profile applied; requester confirmation still required.", status: "COMPLETED", followUpRequired: true, followUpNote: "Ask requester to confirm from the original device." },
    { ticket: "05", key: "05", recorder: users[5].email, assignee: users[5].email, performer: users[6].email, description: "Rebuild campus Wi-Fi profile", result: "Connectivity verified after profile rebuild.", status: "COMPLETED", followUpRequired: false },
    { ticket: "06", key: "06", recorder: users[6].email, assignee: users[6].email, performer: users[6].email, description: "Replace network cable", result: "Replacement cable passed connectivity test.", status: "COMPLETED", followUpRequired: false },
    { ticket: "07", key: "07", recorder: users[7].email, assignee: users[5].email, description: "Recheck reopened wireless symptoms", status: "PENDING", followUpRequired: false },
    { ticket: "08", key: "08", recorder: users[5].email, assignee: users[5].email, description: "Inspect duplicate request", status: "CANCELLED", followUpRequired: false, cancellationReason: "Ticket was confirmed as duplicate." },
  ] as const;

  for (const fixture of actionFixtures) {
    const recordedById = userIds.get(fixture.recorder)!;
    const clientRequestId = `20000000-0000-4000-8000-0000000000${fixture.key}`;
    const existing = await prisma.actionTaken.findUnique({ where: { recordedById_clientRequestId: { recordedById, clientRequestId } }, select: { id: true } });
    if (existing) continue;
    const assigneeId = userIds.get(fixture.assignee)!;
    const performedById = "performer" in fixture ? userIds.get(fixture.performer)! : null;
    const isCompleted = fixture.status === "COMPLETED";
    const isCancelled = fixture.status === "CANCELLED";
    const action = await prisma.actionTaken.create({ data: {
      ticketId: ticketIds.get(`TKT-20260929-L4${fixture.ticket}`)!,
      workflowCycle: fixture.ticket === "07" ? 2 : 1,
      recordedById,
      assigneeId,
      performedById,
      description: fixture.description,
      result: "result" in fixture ? fixture.result : null,
      followUpRequired: fixture.followUpRequired,
      followUpNote: "followUpNote" in fixture ? fixture.followUpNote : null,
      attachmentNotes: fixture.ticket === "03" ? "See existing network-cabinet photo on the Ticket." : null,
      status: fixture.status,
      updatedById: performedById ?? recordedById,
      completedAt: isCompleted ? new Date("2026-09-29T06:00:00.000Z") : null,
      cancelledAt: isCancelled ? new Date("2026-09-29T06:30:00.000Z") : null,
      cancelledById: isCancelled ? recordedById : null,
      cancellationReason: "cancellationReason" in fixture ? fixture.cancellationReason : null,
      clientRequestId,
      createFingerprint: `lab4-seed-${fixture.ticket}-${fixture.key}`,
    } });
    await prisma.actionTakenRevision.create({ data: {
      actionId: action.id,
      actionVersion: 1,
      eventType: "CREATED",
      actorId: recordedById,
      snapshot: {
        description: fixture.description,
        result: "result" in fixture ? fixture.result : null,
        followUpRequired: fixture.followUpRequired,
        followUpNote: "followUpNote" in fixture ? fixture.followUpNote : null,
        status: fixture.status,
        assigneeId,
        performedById,
      },
    } });
  }
}

async function main(): Promise<void> {
  const prisma = getPrisma();
  await ensureReferenceData(prisma);
  const userIds = new Map<string, number>();
  for (const fixture of users) {
    const user = await ensureUser(prisma, fixture);
    userIds.set(user.email, user.id);
  }
  await ensureTicketFixtures(prisma, userIds);
  await ensureLab4Fixtures(prisma, userIds);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
