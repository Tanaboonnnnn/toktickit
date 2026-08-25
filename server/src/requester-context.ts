import type { PrismaClient } from "@prisma/client";
import { ApiError } from "./errors.js";

export const DEVELOPMENT_REQUESTER_HEADER = "X-Development-Requester-Id";

export type RequesterContext = {
  id: number;
  name: string;
  email: string;
};

export function parseRequesterIdHeader(value: string | undefined): number {
  if (!value || !/^[1-9]\d*$/.test(value)) {
    throw new ApiError(
      400,
      "INVALID_REQUESTER_CONTEXT",
      "Invalid Development Requester context",
    );
  }

  const id = Number(value);
  if (!Number.isSafeInteger(id)) {
    throw new ApiError(
      400,
      "INVALID_REQUESTER_CONTEXT",
      "Invalid Development Requester context",
    );
  }
  return id;
}

export async function resolveRequesterContext(
  prisma: Pick<PrismaClient, "requesterUser">,
  headerValue: string | undefined,
): Promise<RequesterContext> {
  const id = parseRequesterIdHeader(headerValue);
  const requester = await prisma.requesterUser.findFirst({
    where: { id, active: true },
    select: { id: true, name: true, email: true },
  });

  if (!requester) {
    throw new ApiError(404, "RESOURCE_NOT_FOUND", "Development Requester not found");
  }
  return requester;
}
