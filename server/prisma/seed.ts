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
  { name: "Anan Student", email: "anan.student@example.test", active: true, role: "REQUESTER" },
  { name: "Mali Student", email: "mali.student@example.test", active: true, role: "REQUESTER" },
  { name: "Niran Student", email: "niran.student@example.test", active: true, role: "REQUESTER" },
  { name: "Ploy Student", email: "ploy.student@example.test", active: true, role: "REQUESTER" },
  { name: "Somchai Former Student", email: "somchai.former@example.test", active: false, role: "REQUESTER" },
  { name: "Nida IT", email: "nida.it@example.test", active: true, role: "IT_STAFF" },
  { name: "Korn IT", email: "korn.it@example.test", active: true, role: "IT_STAFF" },
  { name: "Dao IT", email: "dao.it@example.test", active: true, role: "IT_STAFF" },
  { name: "Som IT (Inactive)", email: "som.it@example.test", active: false, role: "IT_STAFF" },
  { name: "Lab 3 Administrator", email: "admin.lab3@example.test", active: true, role: "ADMINISTRATOR" },
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

async function main(): Promise<void> {
  const prisma = getPrisma();
  await ensureReferenceData(prisma);
  const userIds = new Map<string, number>();
  for (const fixture of users) {
    const user = await ensureUser(prisma, fixture);
    userIds.set(user.email, user.id);
  }
  await ensureTicketFixtures(prisma, userIds);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
