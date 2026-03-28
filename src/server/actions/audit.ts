"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { ERR_UNAUTHORIZED, ERR_WORKSPACE_NOT_CONFIGURED } from "@/lib/error-messages"

export async function getAuditLogs(page: number = 1, pageSize: number = 30) {
  const { userId } = await auth()
  if (!userId) throw new Error(ERR_UNAUTHORIZED)
  const user = await db.user.findUnique({ where: { clerkId: userId }, include: { workspace: true } })
  if (!user?.workspace) throw new Error(ERR_WORKSPACE_NOT_CONFIGURED)

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where: { workspaceId: user.workspace.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.auditLog.count({ where: { workspaceId: user.workspace.id } }),
  ])

  return {
    logs: logs.map(l => ({
      id: l.id,
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      createdAt: l.createdAt.toISOString(),
      userId: l.userId,
    })),
    total,
    totalPages: Math.ceil(total / pageSize),
    page,
  }
}
