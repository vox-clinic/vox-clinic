"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import {
  startMigration as startMigrationService,
  confirmMigration as confirmMigrationService,
  cancelMigration as cancelMigrationService,
  getMigrationHistory as getMigrationHistoryService,
  autoMapColumns as autoMapColumnsService,
} from "@/lib/migration"
import type { MigrationSource, MigrationAdapterConfig, MigrationPreview, MigrationResult } from "@/lib/migration"

async function getWorkspaceContext() {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true },
  })
  if (!user?.workspace) throw new Error("Workspace not configured")

  return { userId, workspaceId: user.workspace.id }
}

export async function startMigrationAction(
  source: MigrationSource,
  config: MigrationAdapterConfig,
  data: unknown,
  fileName?: string
): Promise<MigrationPreview> {
  const { userId, workspaceId } = await getWorkspaceContext()
  return startMigrationService(workspaceId, userId, source, config, data, fileName)
}

export async function confirmMigrationAction(
  sessionId: string,
  resolutions: Record<string, "keep" | "overwrite" | "merge">
): Promise<MigrationResult> {
  const { userId, workspaceId } = await getWorkspaceContext()

  // Get default agenda for appointment linking
  const agenda = await db.agenda.findFirst({
    where: { workspaceId, isDefault: true },
    select: { id: true },
  })
  const agendaId = agenda?.id || ""

  return confirmMigrationService(sessionId, workspaceId, userId, agendaId, resolutions)
}

export async function cancelMigrationAction(sessionId: string): Promise<void> {
  const { workspaceId } = await getWorkspaceContext()
  return cancelMigrationService(sessionId, workspaceId)
}

export async function getMigrationHistoryAction(page?: number, limit?: number) {
  const { workspaceId } = await getWorkspaceContext()
  return getMigrationHistoryService(workspaceId, page, limit)
}

export async function getAutoColumnMapping(headers: string[]): Promise<{
  mapping: Record<string, string>
  dataType: "patients" | "appointments" | "mixed"
}> {
  return autoMapColumnsService(headers)
}
