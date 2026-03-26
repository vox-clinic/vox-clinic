"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"

export async function getDashboardData() {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true },
  })
  if (!user || !user.workspace) throw new Error("Workspace not found")

  const workspaceId = user.workspace.id

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
    totalRecordings,
    recentAppointments,
  ] = await Promise.all([
    // Recent patients (active only)
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
    // Total patients (active only)
    db.patient.count({ where: { workspaceId, isActive: true } }),
    // This month appointments
    db.appointment.count({
      where: { workspaceId, date: { gte: startOfMonth } },
    }),
    // Last month appointments (for comparison)
    db.appointment.count({
      where: {
        workspaceId,
        date: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
    }),
    // Today's appointments
    db.appointment.findMany({
      where: {
        workspaceId,
        date: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        patient: { select: { id: true, name: true } },
      },
      orderBy: { date: "asc" },
    }),
    // Upcoming scheduled
    db.appointment.count({
      where: {
        workspaceId,
        status: "scheduled",
        date: { gte: now },
      },
    }),
    // Total recordings (include orphaned recordings linked to workspace patients)
    db.recording.count({
      where: {
        OR: [
          { workspaceId },
          { patient: { workspaceId } },
        ],
      },
    }),
    // Recent appointments (last 7 with patient info)
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
    clinicName: user.clinicName ?? "Minha Clinica",
    profession: user.profession ?? user.workspace.professionType,
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
    })),
    scheduledAppointments,
    totalRecordings,
    recentAppointments: recentAppointments.map((a) => ({
      id: a.id,
      date: a.date,
      status: a.status,
      procedures: a.procedures as string[],
      patient: a.patient,
    })),
  }
}
