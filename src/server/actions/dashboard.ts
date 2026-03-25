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

  const [recentPatients, totalPatients, monthlyAppointments] =
    await Promise.all([
      db.patient.findMany({
        where: { workspaceId },
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
      db.patient.count({ where: { workspaceId } }),
      db.appointment.count({
        where: {
          workspaceId,
          date: { gte: startOfMonth },
        },
      }),
    ])

  return {
    recentPatients: recentPatients.map((p) => ({
      id: p.id,
      name: p.name,
      lastAppointment: p.appointments[0]?.date ?? null,
    })),
    totalPatients,
    monthlyAppointments,
  }
}

