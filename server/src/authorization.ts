import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@prisma/client";
import type { Actor } from "./auth/actor.js";
import { ApiError } from "./errors.js";

export type Capability =
  | "REFERENCE_DATA_READ"
  | "REQUESTER_TICKET_CREATE"
  | "REQUESTER_TICKET_READ_OWN"
  | "REQUESTER_ATTACHMENT_MANAGE_OWN"
  | "ATTACHMENT_READ_PERMITTED"
  | "STAFF_TICKET_QUEUE"
  | "STAFF_TICKET_OPERATE"
  | "PUBLIC_COMMENT"
  | "INTERNAL_NOTE"
  | "ADMIN_USER_MANAGE";

const ROLE_CAPABILITIES: Readonly<Record<UserRole, ReadonlySet<Capability>>> = {
  REQUESTER: new Set(["REFERENCE_DATA_READ", "REQUESTER_TICKET_CREATE", "REQUESTER_TICKET_READ_OWN", "REQUESTER_ATTACHMENT_MANAGE_OWN", "ATTACHMENT_READ_PERMITTED", "PUBLIC_COMMENT"]),
  IT_STAFF: new Set(["REFERENCE_DATA_READ", "ATTACHMENT_READ_PERMITTED", "STAFF_TICKET_QUEUE", "STAFF_TICKET_OPERATE", "PUBLIC_COMMENT", "INTERNAL_NOTE"]),
  ADMINISTRATOR: new Set(["REFERENCE_DATA_READ", "ATTACHMENT_READ_PERMITTED", "STAFF_TICKET_QUEUE", "STAFF_TICKET_OPERATE", "PUBLIC_COMMENT", "INTERNAL_NOTE", "ADMIN_USER_MANAGE"]),
};

export function assertCapability(actor: Actor, capability: string): asserts capability is Capability {
  if (!(ROLE_CAPABILITIES[actor.role] as ReadonlySet<string>).has(capability)) {
    throw new ApiError(403, "FORBIDDEN", "You do not have permission to perform this action");
  }
}

export function assertRequesterOwnership(actor: Actor, requesterId: number): void {
  if (actor.role !== "REQUESTER" || actor.id !== requesterId) {
    throw new ApiError(404, "RESOURCE_NOT_FOUND", "Resource not found");
  }
}

export function requireCapability(capability: Capability) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.actor) throw new ApiError(401, "AUTHENTICATION_REQUIRED", "Authentication required");
      assertCapability(req.actor, capability);
      next();
    } catch (error) {
      next(error);
    }
  };
}
