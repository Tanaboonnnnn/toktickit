import { Prisma, type PrismaClient } from "@prisma/client";
import type { Actor } from "../auth/actor.js";
import { ApiError } from "../errors.js";
import { hashPassword } from "../password.js";
import type { AdminUserDto, AdminUserQuery, CreateAdminUserInput, ResetInitialPasswordInput, UpdateAdminUserInput } from "./user-contract.js";

export const adminUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  mustChangePassword: true,
  active: true,
  version: true,
} satisfies Prisma.UserSelect;

export async function listAdminUsers(prisma: PrismaClient, query: AdminUserQuery): Promise<AdminUserDto[]> {
  return prisma.user.findMany({
    where: {
      ...(query.search ? {
        OR: [
          { name: { contains: query.search, mode: "insensitive" as const } },
          { email: { contains: query.search, mode: "insensitive" as const } },
        ],
      } : {}),
      ...(query.role ? { role: query.role } : {}),
    },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: adminUserSelect,
  });
}

function duplicateEmailConflict(): ApiError {
  return new ApiError(409, "CONFLICT", "Email address is already in use");
}

function isUniqueConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function createAdminUser(prisma: PrismaClient, input: CreateAdminUserInput): Promise<AdminUserDto> {
  const passwordHash = await hashPassword(input.initialPassword);
  try {
    return await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        role: input.role,
        active: input.active,
        passwordHash,
        mustChangePassword: true,
      },
      select: adminUserSelect,
    });
  } catch (error) {
    if (isUniqueConflict(error)) throw duplicateEmailConflict();
    throw error;
  }
}

function accountConflict(message = "User account changed or the requested operation is no longer available"): ApiError {
  return new ApiError(409, "CONFLICT", message);
}

const ADMIN_SAFETY_ADVISORY_LOCK = 50_334;

async function lockUser(tx: Prisma.TransactionClient, userId: number): Promise<void> {
  await tx.$queryRaw`SELECT id FROM "RequesterUser" WHERE id = ${userId} FOR UPDATE`;
}

async function assertAccountSafety(
  tx: Prisma.TransactionClient,
  actor: Actor,
  current: { id: number; role: AdminUserDto["role"]; active: boolean },
  input: UpdateAdminUserInput,
): Promise<void> {
  if (actor.id === current.id && input.active === false) {
    throw accountConflict("You cannot deactivate your own account");
  }

  const remainsEligibleOwner = input.active && (input.role === "IT_STAFF" || input.role === "ADMINISTRATOR");
  if (!remainsEligibleOwner) {
    const ownedTickets = await tx.ticket.count({ where: { ownerId: current.id } });
    if (ownedTickets > 0) {
      throw accountConflict("Reassign owned Tickets before deactivating or demoting this user");
    }
  }

  const removesActiveAdministrator = current.active
    && current.role === "ADMINISTRATOR"
    && (!input.active || input.role !== "ADMINISTRATOR");
  if (removesActiveAdministrator) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ADMIN_SAFETY_ADVISORY_LOCK})`;
    const activeAdministrators = await tx.user.count({ where: { active: true, role: "ADMINISTRATOR" } });
    if (activeAdministrators <= 1) {
      throw accountConflict("At least one active Administrator must remain");
    }
  }
}

export async function updateAdminUser(prisma: PrismaClient, actor: Actor, userId: number, input: UpdateAdminUserInput): Promise<AdminUserDto> {
  try {
    return await prisma.$transaction(async (tx) => {
      await lockUser(tx, userId);
      const current = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, role: true, active: true, version: true },
      });
      if (!current) throw new ApiError(404, "RESOURCE_NOT_FOUND", "Resource not found");
      if (current.version !== input.expectedVersion) throw accountConflict();
      await assertAccountSafety(tx, actor, current, input);
      const invalidatesAccess = current.email !== input.email || current.role !== input.role || current.active !== input.active;
      return tx.user.update({
        where: { id: userId },
        data: {
          name: input.name,
          email: input.email,
          role: input.role,
          active: input.active,
          version: { increment: 1 },
          ...(invalidatesAccess ? { authVersion: { increment: 1 } } : {}),
        },
        select: adminUserSelect,
      });
    });
  } catch (error) {
    if (isUniqueConflict(error)) throw duplicateEmailConflict();
    throw error;
  }
}

export async function resetInitialPassword(prisma: PrismaClient, userId: number, input: ResetInitialPasswordInput): Promise<AdminUserDto> {
  const passwordHash = await hashPassword(input.initialPassword);
  return prisma.$transaction(async (tx) => {
    await lockUser(tx, userId);
    const current = await tx.user.findUnique({ where: { id: userId }, select: { id: true, version: true } });
    if (!current) throw new ApiError(404, "RESOURCE_NOT_FOUND", "Resource not found");
    if (current.version !== input.expectedVersion) throw accountConflict();
    return tx.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: true,
        authVersion: { increment: 1 },
        version: { increment: 1 },
      },
      select: adminUserSelect,
    });
  });
}
