"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import type { Procedure } from "@/types"

export async function getFinancialData(period: "month" | "year", date: string) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true },
  })
  if (!user?.workspace) throw new Error("Workspace not configured")

  const workspaceId = user.workspace.id
  const baseDate = new Date(date)

  let startDate: Date
  let endDate: Date

  if (period === "month") {
    startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1)
    endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0, 23, 59, 59)
  } else {
    startDate = new Date(baseDate.getFullYear(), 0, 1)
    endDate = new Date(baseDate.getFullYear(), 11, 31, 23, 59, 59)
  }

  const appointments = await db.appointment.findMany({
    where: {
      workspaceId,
      date: { gte: startDate, lte: endDate },
    },
    include: {
      patient: { select: { id: true, name: true } },
    },
    orderBy: { date: "desc" },
  })

  // Calculate totals
  const appointmentsWithPrice = appointments.filter((a) => a.price != null)
  const totalRevenue = appointmentsWithPrice.reduce((sum, a) => sum + (a.price ?? 0), 0)
  const appointmentCount = appointments.length
  const averageTicket = appointmentsWithPrice.length > 0 ? totalRevenue / appointmentsWithPrice.length : 0

  // Group by procedure
  const procedureMap = new Map<string, { count: number; total: number }>()
  for (const apt of appointments) {
    const procs = apt.procedures as string[]
    const pricePerProc = apt.price != null && procs.length > 0 ? apt.price / procs.length : 0
    for (const proc of procs) {
      const existing = procedureMap.get(proc) ?? { count: 0, total: 0 }
      existing.count += 1
      existing.total += pricePerProc
      procedureMap.set(proc, existing)
    }
  }

  const procedureBreakdown = Array.from(procedureMap.entries())
    .map(([name, data]) => ({ name, count: data.count, total: data.total }))
    .sort((a, b) => b.total - a.total)

  // Monthly breakdown for year view
  let monthlyBreakdown: { month: number; revenue: number; count: number }[] = []
  if (period === "year") {
    const monthMap = new Map<number, { revenue: number; count: number }>()
    for (let m = 0; m < 12; m++) {
      monthMap.set(m, { revenue: 0, count: 0 })
    }
    for (const apt of appointments) {
      const month = new Date(apt.date).getMonth()
      const existing = monthMap.get(month)!
      existing.revenue += apt.price ?? 0
      existing.count += 1
      monthMap.set(month, existing)
    }
    monthlyBreakdown = Array.from(monthMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month - b.month)
  }

  // Recent transactions (last 10)
  const recentTransactions = appointments.slice(0, 10).map((a) => ({
    id: a.id,
    date: a.date,
    patientId: a.patient.id,
    patientName: a.patient.name,
    procedures: a.procedures as string[],
    price: a.price,
  }))

  return {
    totalRevenue,
    appointmentCount,
    averageTicket,
    procedureBreakdown,
    monthlyBreakdown,
    recentTransactions,
  }
}

export async function updateAppointmentPrice(appointmentId: string, price: number) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true },
  })
  if (!user?.workspace) throw new Error("Workspace not configured")

  const appointment = await db.appointment.findUnique({
    where: { id: appointmentId },
  })
  if (!appointment || appointment.workspaceId !== user.workspace.id) {
    throw new Error("Appointment not found")
  }

  await db.appointment.update({
    where: { id: appointmentId },
    data: { price },
  })

  return { success: true }
}

export async function updateProcedurePrice(procedureId: string, price: number) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true },
  })
  if (!user?.workspace) throw new Error("Workspace not configured")

  const procedures = (user.workspace.procedures as unknown as Procedure[]) ?? []
  const updatedProcedures = procedures.map((p) =>
    p.id === procedureId ? { ...p, price } : p
  )

  await db.workspace.update({
    where: { id: user.workspace.id },
    data: { procedures: updatedProcedures as unknown as any },
  })

  return { success: true }
}

export async function getWorkspaceProcedures() {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true },
  })
  if (!user?.workspace) throw new Error("Workspace not configured")

  return (user.workspace.procedures as unknown as Procedure[]) ?? []
}
