"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { ERR_UNAUTHORIZED, ERR_WORKSPACE_NOT_CONFIGURED, safeAction } from "@/lib/error-messages"

async function getAuthContext() {
  const { userId } = await auth()
  if (!userId) throw new Error(ERR_UNAUTHORIZED)
  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true, memberships: { select: { workspaceId: true }, take: 1 } },
  })
  const workspaceId = user?.workspace?.id ?? user?.memberships?.[0]?.workspaceId
  if (!workspaceId) throw new Error(ERR_WORKSPACE_NOT_CONFIGURED)
  return { userId, workspaceId }
}

export async function getNotifications() {
  const { userId, workspaceId } = await getAuthContext()

  const notifications = await db.notification.findMany({
    where: { workspaceId, userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  })

  return notifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    entityType: n.entityType,
    entityId: n.entityId,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  }))
}

export async function getUnreadCount() {
  const { userId, workspaceId } = await getAuthContext()

  return db.notification.count({
    where: { workspaceId, userId, read: false },
  })
}

export const markAsRead = safeAction(async (notificationId: string) => {
  const { userId, workspaceId } = await getAuthContext()

  const notification = await db.notification.findFirst({
    where: { id: notificationId, workspaceId, userId },
  })
  if (!notification) return { success: true }

  await db.notification.update({
    where: { id: notificationId },
    data: { read: true },
  })

  return { success: true }
})

export const markAllAsRead = safeAction(async () => {
  const { userId, workspaceId } = await getAuthContext()

  await db.notification.updateMany({
    where: { workspaceId, userId, read: false },
    data: { read: true },
  })

  return { success: true }
})

export async function generateUpcomingNotifications() {
  const { userId, workspaceId } = await getAuthContext()

  const now = new Date()
  const in30min = new Date(now.getTime() + 30 * 60 * 1000)

  // Find appointments in next 30 minutes that don't have notifications yet
  const upcoming = await db.appointment.findMany({
    where: {
      workspaceId,
      status: "scheduled",
      date: { gte: now, lte: in30min },
    },
    include: { patient: { select: { name: true } } },
  })

  const created: string[] = []
  for (const apt of upcoming) {
    // Check if notification already exists for this appointment
    const time = apt.date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    const created_notif = await db.notification.findFirst({
      where: {
        workspaceId,
        userId,
        entityType: "Appointment",
        entityId: apt.id,
        type: "appointment_soon",
      },
    })
    if (created_notif) continue

    await db.notification.create({
      data: {
        workspaceId,
        userId,
        type: "appointment_soon",
        title: `Consulta em breve`,
        body: `${apt.patient.name} as ${time}`,
        entityType: "Appointment",
        entityId: apt.id,
      },
    })
    created.push(apt.id)
  }

  // Find no-shows from today (appointments that passed without completion)
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const missed = await db.appointment.findMany({
    where: {
      workspaceId,
      status: "scheduled",
      date: { gte: startOfDay, lt: now },
    },
    include: { patient: { select: { name: true } } },
  })

  for (const apt of missed) {
    const existingMissed = await db.notification.findFirst({
      where: {
        workspaceId,
        userId,
        entityType: "Appointment",
        entityId: apt.id,
        type: "appointment_missed",
      },
    })
    if (existingMissed) continue

    await db.notification.create({
      data: {
        workspaceId,
        userId,
        type: "appointment_missed",
        title: `Consulta nao realizada`,
        body: `${apt.patient.name} — consulta agendada nao foi concluida`,
        entityType: "Appointment",
        entityId: apt.id,
      },
    })
    created.push(apt.id)
  }

  return { generated: created.length }
}
