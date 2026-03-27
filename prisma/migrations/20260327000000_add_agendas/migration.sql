-- CreateTable
CREATE TABLE "Agenda" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#14B8A6',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agenda_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Agenda_workspaceId_idx" ON "Agenda"("workspaceId");

-- AddForeignKey
ALTER TABLE "Agenda" ADD CONSTRAINT "Agenda_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert default agenda for every existing workspace
INSERT INTO "Agenda" ("id", "workspaceId", "name", "color", "isDefault", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", 'Agenda Principal', '#14B8A6', true, true, NOW(), NOW()
FROM "Workspace";

-- Add agendaId as nullable first
ALTER TABLE "Appointment" ADD COLUMN "agendaId" TEXT;
ALTER TABLE "BlockedSlot" ADD COLUMN "agendaId" TEXT;

-- Backfill agendaId from default agenda
UPDATE "Appointment" a
SET "agendaId" = ag."id"
FROM "Agenda" ag
WHERE ag."workspaceId" = a."workspaceId" AND ag."isDefault" = true;

UPDATE "BlockedSlot" bs
SET "agendaId" = ag."id"
FROM "Agenda" ag
WHERE ag."workspaceId" = bs."workspaceId" AND ag."isDefault" = true;

-- Make agendaId required
ALTER TABLE "Appointment" ALTER COLUMN "agendaId" SET NOT NULL;
ALTER TABLE "BlockedSlot" ALTER COLUMN "agendaId" SET NOT NULL;

-- AddForeignKeys
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_agendaId_fkey" FOREIGN KEY ("agendaId") REFERENCES "Agenda"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BlockedSlot" ADD CONSTRAINT "BlockedSlot_agendaId_fkey" FOREIGN KEY ("agendaId") REFERENCES "Agenda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndexes
CREATE INDEX "Appointment_agendaId_idx" ON "Appointment"("agendaId");
CREATE INDEX "Appointment_agendaId_date_idx" ON "Appointment"("agendaId", "date");
CREATE INDEX "BlockedSlot_agendaId_idx" ON "BlockedSlot"("agendaId");
CREATE INDEX "BlockedSlot_agendaId_startDate_endDate_idx" ON "BlockedSlot"("agendaId", "startDate", "endDate");
