"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { checkFeatureAccess } from "@/lib/plan-enforcement"

async function getWorkspaceId() {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true, memberships: { select: { workspaceId: true }, take: 1 } },
  })

  const workspaceId = user?.workspace?.id ?? user?.memberships?.[0]?.workspaceId
  if (!workspaceId) throw new Error("Workspace not configured")

  return workspaceId
}

export async function getBookingConfig() {
  const workspaceId = await getWorkspaceId()

  const config = await db.bookingConfig.findUnique({
    where: { workspaceId },
  })

  if (!config) return null

  return {
    id: config.id,
    token: config.token,
    isActive: config.isActive,
    allowedAgendaIds: config.allowedAgendaIds,
    allowedProcedureIds: config.allowedProcedureIds,
    maxDaysAhead: config.maxDaysAhead,
    startHour: config.startHour,
    endHour: config.endHour,
    welcomeMessage: config.welcomeMessage,
  }
}

export async function toggleBooking(enabled: boolean) {
  const workspaceId = await getWorkspaceId()

  // Plan enforcement: check online booking feature access
  if (enabled) {
    const workspace = await db.workspace.findUnique({ where: { id: workspaceId }, select: { plan: true } })
    const planCheck = checkFeatureAccess(workspace?.plan ?? "free", "onlineBooking")
    if (!planCheck.allowed) throw new Error(planCheck.reason!)
  }

  const config = await db.bookingConfig.upsert({
    where: { workspaceId },
    update: { isActive: enabled },
    create: {
      workspaceId,
      isActive: enabled,
    },
  })

  return {
    token: config.token,
    isActive: config.isActive,
  }
}

export async function updateBookingConfig(data: {
  allowedAgendaIds?: string[]
  allowedProcedureIds?: string[]
  maxDaysAhead?: number
  startHour?: number
  endHour?: number
  welcomeMessage?: string | null
}) {
  const workspaceId = await getWorkspaceId()

  const config = await db.bookingConfig.upsert({
    where: { workspaceId },
    update: data,
    create: {
      workspaceId,
      ...data,
    },
  })

  return {
    id: config.id,
    token: config.token,
    isActive: config.isActive,
    allowedAgendaIds: config.allowedAgendaIds,
    allowedProcedureIds: config.allowedProcedureIds,
    maxDaysAhead: config.maxDaysAhead,
    startHour: config.startHour,
    endHour: config.endHour,
    welcomeMessage: config.welcomeMessage,
  }
}

export async function regenerateBookingToken() {
  const workspaceId = await getWorkspaceId()

  const existing = await db.bookingConfig.findUnique({
    where: { workspaceId },
  })
  if (!existing) throw new Error("Booking config nao encontrada")

  // Generate a new random token
  const newToken = crypto.randomUUID().replace(/-/g, "").slice(0, 24)

  const config = await db.bookingConfig.update({
    where: { workspaceId },
    data: { token: newToken },
  })

  return { token: config.token }
}
