import { randomUUID } from "node:crypto";
import type { ActionStatus, TicketStatus, UserRole } from "@prisma/client";
import request from "supertest";
import { hashPassword } from "../../../src/password.js";
import {
  createAuthFixture,
  csrf,
  destroyAuthFixture,
  login,
  type AuthFixture,
} from "../../lab-03/support/auth-fixture.js";

export interface ActionsFixture extends AuthFixture {
  categoryId: number;
  relatedSystemId: number;
  extraStaff: { id: number; email: string };
  inactiveStaff: { id: number; email: string };
  requesterWorker: { id: number; email: string };
  ticketIds: number[];
  extraUserIds: number[];
}

const tag = `issue74-${process.pid}-${Date.now()}`;

export async function createActionsFixture(): Promise<ActionsFixture> {
  const base = await createAuthFixture();
  await base.prisma.user.update({ where: { id: base.requester.id }, data: { mustChangePassword: false } });
  const [category, system] = await Promise.all([
    base.prisma.category.create({ data: { name: `${tag}-category`, active: true } }),
    base.prisma.relatedSystem.create({ data: { name: `${tag}-system`, active: true } }),
  ]);
  const passwordHash = await hashPassword(base.password);

  async function user(label: string, role: UserRole, active: boolean) {
    return base.prisma.user.create({
      data: {
        name: `${tag}-${label}`,
        email: `${tag}-${label.toLowerCase()}@example.test`,
        role,
        active,
        passwordHash,
        mustChangePassword: false,
      },
      select: { id: true, email: true },
    });
  }

  const extraStaff = await user("extra-staff", "IT_STAFF", true);
  const inactiveStaff = await user("inactive-staff", "IT_STAFF", false);
  const requesterWorker = await user("requester-worker", "REQUESTER", true);

  return {
    ...base,
    categoryId: category.id,
    relatedSystemId: system.id,
    extraStaff,
    inactiveStaff,
    requesterWorker,
    ticketIds: [],
    extraUserIds: [extraStaff.id, inactiveStaff.id, requesterWorker.id],
  };
}

export async function createActionTicket(
  fixture: ActionsFixture,
  options: {
    requesterId?: number;
    ownerId?: number | null;
    status?: TicketStatus;
    workflowCycle?: number;
  } = {},
) {
  const sequence = fixture.ticketIds.length + 1;
  const ticket = await fixture.prisma.ticket.create({
    data: {
      ticketNumber: `TKT-74-${randomUUID()}`,
      clientRequestId: randomUUID(),
      requesterId: options.requesterId ?? fixture.normalRequester.id,
      ownerId: options.ownerId === undefined ? fixture.staff.id : options.ownerId,
      categoryId: fixture.categoryId,
      relatedSystemId: fixture.relatedSystemId,
      summary: `${tag} ticket ${sequence}`,
      description: `${tag} Action API fixture`,
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: options.status ?? "OPEN",
      workflowCycle: options.workflowCycle ?? 1,
    },
  });
  fixture.ticketIds.push(ticket.id);
  return ticket;
}

export async function createStoredAction(
  fixture: ActionsFixture,
  ticket: { id: number; workflowCycle: number },
  options: {
    recordedById?: number;
    assigneeId?: number;
    performedById?: number | null;
    description?: string;
    result?: string | null;
    followUpRequired?: boolean;
    followUpNote?: string | null;
    attachmentNotes?: string | null;
    status?: ActionStatus;
    workflowCycle?: number;
    createdAt?: Date;
    clientRequestId?: string;
  } = {},
) {
  const status = options.status ?? "PENDING";
  const recordedById = options.recordedById ?? fixture.staff.id;
  const assigneeId = options.assigneeId ?? fixture.extraStaff.id;
  const performedById = status === "COMPLETED" ? (options.performedById ?? fixture.administrator.id) : null;
  const completedAt = status === "COMPLETED" ? new Date() : null;
  const cancelledAt = status === "CANCELLED" ? new Date() : null;
  const cancelledById = status === "CANCELLED" ? fixture.staff.id : null;
  const cancellationReason = status === "CANCELLED" ? "No longer required" : null;
  return fixture.prisma.actionTaken.create({
    data: {
      ticketId: ticket.id,
      workflowCycle: options.workflowCycle ?? ticket.workflowCycle,
      ...(options.createdAt ? { createdAt: options.createdAt } : {}),
      recordedById,
      assigneeId,
      performedById,
      description: options.description ?? `${tag} stored action`,
      result: status === "COMPLETED" ? (options.result ?? "Work completed") : (options.result ?? null),
      followUpRequired: options.followUpRequired ?? false,
      followUpNote: options.followUpNote ?? null,
      attachmentNotes: options.attachmentNotes ?? null,
      status,
      updatedById: recordedById,
      completedAt,
      cancelledAt,
      cancelledById,
      cancellationReason,
      clientRequestId: options.clientRequestId ?? randomUUID(),
      createFingerprint: `fixture-${randomUUID()}`,
    },
  });
}

export async function agentFor(fixture: ActionsFixture, email: string) {
  const agent = request.agent(fixture.app);
  const response = await login(agent, fixture, email);
  if (response.status !== 200) throw new Error(`Unable to log in ${email}: ${response.status}`);
  return agent;
}

export async function postJson(
  fixture: ActionsFixture,
  agent: ReturnType<typeof request.agent>,
  path: string,
  body: Record<string, unknown>,
) {
  const token = await csrf(agent, fixture);
  return agent.post(path).set("Origin", fixture.origin).set("X-CSRF-Token", token).send(body);
}

export async function patchJson(
  fixture: ActionsFixture,
  agent: ReturnType<typeof request.agent>,
  path: string,
  body: Record<string, unknown>,
) {
  const token = await csrf(agent, fixture);
  return agent.patch(path).set("Origin", fixture.origin).set("X-CSRF-Token", token).send(body);
}

export async function destroyActionsFixture(fixture: ActionsFixture): Promise<void> {
  if (!fixture) return;
  if (fixture.ticketIds.length > 0) {
    const actions = await fixture.prisma.actionTaken.findMany({
      where: { ticketId: { in: fixture.ticketIds } },
      select: { id: true },
    });
    const actionIds = actions.map((row) => row.id);
    if (actionIds.length > 0) {
      await fixture.prisma.actionTakenRevision.deleteMany({ where: { actionId: { in: actionIds } } });
      await fixture.prisma.actionTaken.deleteMany({ where: { id: { in: actionIds } } });
    }
    await fixture.prisma.ticketWorkflowEvent.deleteMany({ where: { ticketId: { in: fixture.ticketIds } } });
    await fixture.prisma.internalNote.deleteMany({ where: { ticketId: { in: fixture.ticketIds } } });
    await fixture.prisma.publicComment.deleteMany({ where: { ticketId: { in: fixture.ticketIds } } });
    await fixture.prisma.attachment.deleteMany({ where: { ticketId: { in: fixture.ticketIds } } });
    await fixture.prisma.ticket.deleteMany({ where: { id: { in: fixture.ticketIds } } });
  }
  if (fixture.extraUserIds.length > 0) {
    await fixture.prisma.user.deleteMany({ where: { id: { in: fixture.extraUserIds } } });
  }
  await fixture.prisma.category.deleteMany({ where: { id: fixture.categoryId } });
  await fixture.prisma.relatedSystem.deleteMany({ where: { id: fixture.relatedSystemId } });
  await destroyAuthFixture(fixture);
}
