"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { cached } from "@/lib/cache"
import { ERR_UNAUTHORIZED, ERR_WORKSPACE_NOT_FOUND } from "@/lib/error-messages"

async function fetchDashboardData(workspaceId: string, clinicName: string, profession: string) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

  const [
    recentPatients,
    totalPatients,
    monthlyAppointments,
    lastMonthAppointments,
    todayAppointments,
    scheduledAppointments,
    monthlyRevenue,
    pendingCharges,
    recentAppointments,
  ] = await Promise.all([
    db.patient.findMany({
      where: { workspaceId, isActive: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: {
        appointments: {
          orderBy: { date: "desc" },
          take: 1,
          select: { date: true },
        },
      },
    }),
    db.patient.count({ where: { workspaceId, isActive: true } }),
    db.appointment.count({
      where: { workspaceId, date: { gte: startOfMonth } },
    }),
    db.appointment.count({
      where: {
        workspaceId,
        date: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
    }),
    db.appointment.findMany({
      where: {
        workspaceId,
        date: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        patient: { select: { id: true, name: true } },
        agenda: { select: { id: true, name: true, color: true } },
      },
      orderBy: { date: "asc" },
    }),
    db.appointment.count({
      where: {
        workspaceId,
        status: "scheduled",
        date: { gte: now },
      },
    }),
    db.payment.aggregate({
      where: {
        workspaceId,
        status: "paid",
        paidAt: { gte: startOfMonth },
      },
      _sum: { paidAmount: true },
    }),
    db.charge.aggregate({
      where: {
        workspaceId,
        status: { in: ["pending", "partial"] },
      },
      _sum: { netAmount: true },
      _count: true,
    }),
    db.appointment.findMany({
      where: { workspaceId },
      orderBy: { date: "desc" },
      take: 7,
      include: {
        patient: { select: { id: true, name: true } },
      },
    }),
  ])

  return {
    clinicName,
    profession,
    recentPatients: recentPatients.map((p) => ({
      id: p.id,
      name: p.name,
      lastAppointment: p.appointments[0]?.date ?? null,
    })),
    totalPatients,
    monthlyAppointments,
    lastMonthAppointments,
    todayAppointments: todayAppointments.map((a) => ({
      id: a.id,
      date: a.date,
      status: a.status,
      procedures: a.procedures as string[],
      notes: a.notes,
      patient: a.patient,
      agenda: a.agenda,
    })),
    scheduledAppointments,
    monthlyRevenue: monthlyRevenue._sum.paidAmount ?? 0,
    pendingAmount: pendingCharges._sum.netAmount ?? 0,
    pendingChargesCount: pendingCharges._count,
    recentAppointments: recentAppointments.map((a) => ({
      id: a.id,
      date: a.date,
      status: a.status,
      procedures: a.procedures as string[],
      patient: a.patient,
    })),
  }
}

export async function getDashboardData() {
  const { userId } = await auth()
  if (!userId) throw new Error(ERR_UNAUTHORIZED)

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true, memberships: { select: { workspaceId: true }, take: 1 } },
  })
  const workspaceId = user?.workspace?.id ?? user?.memberships?.[0]?.workspaceId
  if (!user || !workspaceId) throw new Error(ERR_WORKSPACE_NOT_FOUND)

  // Load workspace professionType if not available via ownership (member fallback)
  const professionType = user.workspace?.professionType
    ?? (await db.workspace.findUnique({ where: { id: workspaceId }, select: { professionType: true } }))?.professionType
    ?? "Profissional"

  const clinicName = user.clinicName ?? "Minha Clinica"
  const profession = user.profession ?? professionType

  return cached(
    `ws:dashboard:${workspaceId}`,
    60, // 60 seconds
    () => fetchDashboardData(workspaceId, clinicName, profession),
  )
}
