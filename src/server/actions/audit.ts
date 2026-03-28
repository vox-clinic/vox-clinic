"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { ERR_UNAUTHORIZED, ERR_WORKSPACE_NOT_CONFIGURED } from "@/lib/error-messages"

export type AuditFilters = {
  entityType?: string
  action?: string
  dateFrom?: string // ISO string
  dateTo?: string   // ISO string
  userId?: string
}

export async function getAuditLogs(
  page: number = 1,
  pageSize: number = 30,
  filters?: AuditFilters
) {
  const { userId } = await auth()
  if (!userId) throw new Error(ERR_UNAUTHORIZED)
  const user = await db.user.findUnique({ where: { clerkId: userId }, include: { workspace: true } })
  if (!user?.workspace) throw new Error(ERR_WORKSPACE_NOT_CONFIGURED)

  const where: Record<string, unknown> = { workspaceId: user.workspace.id }

  if (filters?.entityType) where.entityType = filters.entityType
  if (filters?.action) where.action = { startsWith: filters.action }
  if (filters?.userId) where.userId = filters.userId
  if (filters?.dateFrom || filters?.dateTo) {
    const createdAt: Record<string, Date> = {}
    if (filters.dateFrom) createdAt.gte = new Date(filters.dateFrom)
    if (filters.dateTo) {
      const to = new Date(filters.dateTo)
      to.setHours(23, 59, 59, 999)
      createdAt.lte = to
    }
    where.createdAt = createdAt
  }

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.auditLog.count({ where }),
  ])

  // Resolve user names from clerkIds
  const userIds = [...new Set(logs.map(l => l.userId))]
  const users = userIds.length > 0
    ? await db.user.findMany({
        where: { clerkId: { in: userIds } },
        select: { clerkId: true, name: true },
      })
    : []
  const userMap = new Map(users.map(u => [u.clerkId, u.name]))

  // Get distinct entity types and action prefixes for filters
  const [entityTypes, actionPrefixes] = await Promise.all([
    db.auditLog.findMany({
      where: { workspaceId: user.workspace.id },
      distinct: ["entityType"],
      select: { entityType: true },
      take: 50,
    }),
    db.auditLog.findMany({
      where: { workspaceId: user.workspace.id },
      distinct: ["action"],
      select: { action: true },
      take: 100,
    }),
  ])

  // Get workspace members for user filter
  const members = await db.workspaceMember.findMany({
    where: { workspaceId: user.workspace.id },
    include: { user: { select: { clerkId: true, name: true } } },
  })

  return {
    logs: logs.map(l => ({
      id: l.id,
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      createdAt: l.createdAt.toISOString(),
      userId: l.userId,
      userName: userMap.get(l.userId) || "Usuario desconhecido",
      details: l.details as Record<string, unknown> | null,
    })),
    total,
    totalPages: Math.ceil(total / pageSize),
    page,
    filterOptions: {
      entityTypes: entityTypes.map(e => e.entityType).sort(),
      actions: actionPrefixes.map(a => a.action).sort(),
      members: members.map(m => ({ id: m.user.clerkId, name: m.user.name })),
    },
  }
}
