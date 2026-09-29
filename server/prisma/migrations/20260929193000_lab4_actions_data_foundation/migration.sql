-- Lab 4 additive data foundation. Historical migrations remain unchanged.
CREATE TYPE "ActionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

ALTER TABLE "Ticket" ADD COLUMN "workflowCycle" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_workflowCycle_positive" CHECK ("workflowCycle" > 0);

CREATE TABLE "ActionTaken" (
  "id" SERIAL NOT NULL,
  "ticketId" INTEGER NOT NULL,
  "workflowCycle" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "recordedById" INTEGER NOT NULL,
  "assigneeId" INTEGER NOT NULL,
  "performedById" INTEGER,
  "description" TEXT NOT NULL,
  "result" TEXT,
  "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
  "followUpNote" TEXT,
  "attachmentNotes" TEXT,
  "status" "ActionStatus" NOT NULL DEFAULT 'PENDING',
  "version" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  "updatedById" INTEGER NOT NULL,
  "completedAt" TIMESTAMPTZ(6),
  "cancelledAt" TIMESTAMPTZ(6),
  "cancelledById" INTEGER,
  "cancellationReason" TEXT,
  "clientRequestId" TEXT NOT NULL,
  "createFingerprint" TEXT NOT NULL,
  CONSTRAINT "ActionTaken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ActionTaken_workflowCycle_positive" CHECK ("workflowCycle" > 0),
  CONSTRAINT "ActionTaken_version_positive" CHECK ("version" > 0),
  CONSTRAINT "ActionTaken_completion_consistency" CHECK (("status" = 'COMPLETED' AND "performedById" IS NOT NULL AND "completedAt" IS NOT NULL AND "result" IS NOT NULL) OR ("status" <> 'COMPLETED' AND "performedById" IS NULL AND "completedAt" IS NULL)),
  CONSTRAINT "ActionTaken_cancellation_consistency" CHECK (("status" = 'CANCELLED' AND "cancelledAt" IS NOT NULL AND "cancelledById" IS NOT NULL AND "cancellationReason" IS NOT NULL) OR ("status" <> 'CANCELLED' AND "cancelledAt" IS NULL AND "cancelledById" IS NULL AND "cancellationReason" IS NULL)),
  CONSTRAINT "ActionTaken_followup_consistency" CHECK (NOT "followUpRequired" OR ("followUpNote" IS NOT NULL AND length(btrim("followUpNote")) > 0))
);

CREATE TABLE "ActionTakenRevision" (
  "id" SERIAL NOT NULL,
  "actionId" INTEGER NOT NULL,
  "actionVersion" INTEGER NOT NULL,
  "eventType" TEXT NOT NULL,
  "actorId" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "snapshot" JSONB NOT NULL,
  CONSTRAINT "ActionTakenRevision_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ActionTakenRevision_actionVersion_positive" CHECK ("actionVersion" > 0)
);

CREATE TABLE "TicketWorkflowEvent" (
  "id" SERIAL NOT NULL,
  "ticketId" INTEGER NOT NULL,
  "ticketVersion" INTEGER NOT NULL,
  "workflowCycle" INTEGER NOT NULL,
  "fromStatus" "TicketStatus" NOT NULL,
  "toStatus" "TicketStatus" NOT NULL,
  "actorId" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolutionSummary" TEXT,
  "cancellationReason" TEXT,
  CONSTRAINT "TicketWorkflowEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TicketWorkflowEvent_ticketVersion_positive" CHECK ("ticketVersion" > 0),
  CONSTRAINT "TicketWorkflowEvent_workflowCycle_positive" CHECK ("workflowCycle" > 0)
);

CREATE UNIQUE INDEX "ActionTaken_recordedById_clientRequestId_key" ON "ActionTaken"("recordedById", "clientRequestId");
CREATE INDEX "ActionTaken_ticketId_workflowCycle_status_idx" ON "ActionTaken"("ticketId", "workflowCycle", "status");
CREATE INDEX "ActionTaken_ticketId_createdAt_id_idx" ON "ActionTaken"("ticketId", "createdAt", "id");
CREATE INDEX "ActionTaken_recordedById_updatedAt_id_idx" ON "ActionTaken"("recordedById", "updatedAt", "id");
CREATE INDEX "ActionTaken_assigneeId_status_updatedAt_id_idx" ON "ActionTaken"("assigneeId", "status", "updatedAt", "id");
CREATE INDEX "ActionTaken_performedById_updatedAt_id_idx" ON "ActionTaken"("performedById", "updatedAt", "id");
CREATE UNIQUE INDEX "ActionTakenRevision_actionId_actionVersion_key" ON "ActionTakenRevision"("actionId", "actionVersion");
CREATE INDEX "ActionTakenRevision_actionId_createdAt_id_idx" ON "ActionTakenRevision"("actionId", "createdAt", "id");
CREATE INDEX "ActionTakenRevision_actorId_createdAt_id_idx" ON "ActionTakenRevision"("actorId", "createdAt", "id");
CREATE UNIQUE INDEX "TicketWorkflowEvent_ticketId_ticketVersion_key" ON "TicketWorkflowEvent"("ticketId", "ticketVersion");
CREATE INDEX "TicketWorkflowEvent_ticketId_createdAt_id_idx" ON "TicketWorkflowEvent"("ticketId", "createdAt", "id");
CREATE INDEX "TicketWorkflowEvent_actorId_createdAt_id_idx" ON "TicketWorkflowEvent"("actorId", "createdAt", "id");

ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "RequesterUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "RequesterUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "RequesterUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "RequesterUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "RequesterUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionTakenRevision" ADD CONSTRAINT "ActionTakenRevision_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "ActionTaken"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionTakenRevision" ADD CONSTRAINT "ActionTakenRevision_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "RequesterUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketWorkflowEvent" ADD CONSTRAINT "TicketWorkflowEvent_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketWorkflowEvent" ADD CONSTRAINT "TicketWorkflowEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "RequesterUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
