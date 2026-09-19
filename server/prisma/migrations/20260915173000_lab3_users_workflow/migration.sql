-- Fail before any product mutation if two historical emails would collapse
-- to the same Lab 3 canonical identity.
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT lower(btrim("email"))
    FROM "RequesterUser"
    GROUP BY lower(btrim("email"))
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Lab 3 migration aborted: canonical email collision in RequesterUser';
  END IF;
END $$;

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('REQUESTER', 'IT_STAFF', 'ADMINISTRATOR');

-- ExtendEnum
ALTER TYPE "TicketStatus" ADD VALUE 'OPEN';
ALTER TYPE "TicketStatus" ADD VALUE 'IN_PROGRESS';
ALTER TYPE "TicketStatus" ADD VALUE 'WAITING_FOR_REQUESTER';
ALTER TYPE "TicketStatus" ADD VALUE 'RESOLVED';
ALTER TYPE "TicketStatus" ADD VALUE 'CLOSED';
ALTER TYPE "TicketStatus" ADD VALUE 'REOPENED';
ALTER TYPE "TicketStatus" ADD VALUE 'CANCELLED';

-- Canonicalize historical identities only after the collision preflight.
UPDATE "RequesterUser"
SET "email" = lower(btrim("email"));

-- Evolve the existing physical RequesterUser table in place.
ALTER TABLE "RequesterUser"
ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'REQUESTER',
ADD COLUMN "passwordHash" TEXT,
ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "authVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "RequesterUser"
ADD CONSTRAINT "RequesterUser_authVersion_positive" CHECK ("authVersion" > 0),
ADD CONSTRAINT "RequesterUser_version_positive" CHECK ("version" > 0);

-- Add Ticket workflow state. IT Priority is backfilled exactly once from the
-- immutable Requested Priority before it becomes required.
ALTER TABLE "Ticket"
ADD COLUMN "ownerId" INTEGER,
ADD COLUMN "itPriority" "RequestedPriority",
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "resolutionSummary" TEXT,
ADD COLUMN "resolvedAt" TIMESTAMP(3),
ADD COLUMN "closedAt" TIMESTAMP(3),
ADD COLUMN "cancelReason" TEXT,
ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "requesterResolutionIndicatedAt" TIMESTAMP(3);

UPDATE "Ticket"
SET "itPriority" = "requestedPriority"
WHERE "itPriority" IS NULL;

ALTER TABLE "Ticket"
ALTER COLUMN "itPriority" SET NOT NULL,
ADD CONSTRAINT "Ticket_version_positive" CHECK ("version" > 0);

-- CreateTable
CREATE TABLE "PublicComment" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PublicComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternalNote" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InternalNote_pkey" PRIMARY KEY ("id")
);

-- Migration-owned express-session PostgreSQL store table.
CREATE TABLE "session" (
    "sid" TEXT NOT NULL,
    "sess" JSONB NOT NULL,
    "expire" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);

-- CreateIndex
CREATE INDEX "RequesterUser_active_role_name_id_idx" ON "RequesterUser"("active", "role", "name", "id");
CREATE INDEX "Ticket_ownerId_currentStatus_updatedAt_id_idx" ON "Ticket"("ownerId", "currentStatus", "updatedAt", "id");
CREATE INDEX "Ticket_currentStatus_itPriority_updatedAt_id_idx" ON "Ticket"("currentStatus", "itPriority", "updatedAt", "id");
CREATE INDEX "PublicComment_ticketId_createdAt_id_idx" ON "PublicComment"("ticketId", "createdAt", "id");
CREATE INDEX "PublicComment_authorId_createdAt_id_idx" ON "PublicComment"("authorId", "createdAt", "id");
CREATE INDEX "InternalNote_ticketId_createdAt_id_idx" ON "InternalNote"("ticketId", "createdAt", "id");
CREATE INDEX "InternalNote_authorId_createdAt_id_idx" ON "InternalNote"("authorId", "createdAt", "id");
CREATE INDEX "session_expire_idx" ON "session"("expire");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "RequesterUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PublicComment" ADD CONSTRAINT "PublicComment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PublicComment" ADD CONSTRAINT "PublicComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "RequesterUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InternalNote" ADD CONSTRAINT "InternalNote_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InternalNote" ADD CONSTRAINT "InternalNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "RequesterUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
