"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { readProcedures, normalizeProcedureNames, toJsonValue } from "@/lib/json-helpers"
import type { Procedure } from "@/types"

export async function getFinancialData(period: "month" | "year", date: string) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true, memberships: { select: { workspaceId: true }, take: 1 } },
  })
  const workspaceId = user?.workspace?.id ?? user?.memberships?.[0]?.workspaceId
  if (!workspaceId) throw new Error("Workspace not configured")

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
    const procNames = normalizeProcedureNames(apt.procedures)
    const pricePerProc = apt.price != null && procNames.length > 0 ? apt.price / procNames.length : 0
    for (const name of procNames) {
      const existing = procedureMap.get(name) ?? { count: 0, total: 0 }
      existing.count += 1
      existing.total += pricePerProc
      procedureMap.set(name, existing)
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
  const recentTransactions = appointments.slice(0, 10).map((a) => {
    const procNames = normalizeProcedureNames(a.procedures)
    return {
      id: a.id,
      date: a.date,
      patientId: a.patient.id,
      patientName: a.patient.name,
      procedures: procNames,
      price: a.price,
    }
  })

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
  if (!Number.isFinite(price) || price < 0) throw new Error("Preco invalido")

  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true, memberships: { select: { workspaceId: true }, take: 1 } },
  })
  const workspaceId = user?.workspace?.id ?? user?.memberships?.[0]?.workspaceId
  if (!workspaceId) throw new Error("Workspace not configured")

  const appointment = await db.appointment.findUnique({
    where: { id: appointmentId },
  })
  if (!appointment || appointment.workspaceId !== workspaceId) {
    throw new Error("Appointment not found")
  }

  await db.appointment.update({
    where: { id: appointmentId },
    data: { price },
  })

  return { success: true }
}

export async function updateProcedurePrice(procedureId: string, price: number) {
  if (!Number.isFinite(price) || price < 0) throw new Error("Preco invalido")

  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true, memberships: { select: { workspaceId: true }, take: 1 } },
  })
  const workspaceId = user?.workspace?.id ?? user?.memberships?.[0]?.workspaceId
  if (!workspaceId) throw new Error("Workspace not configured")

  const MAX_RETRIES = 3

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const workspace = await db.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      select: { procedures: true, updatedAt: true },
    })

    const procedures = readProcedures(workspace.procedures)
    const updatedProcedures = procedures.map((p) =>
      p.id === procedureId ? { ...p, price } : p
    )

    const result = await db.workspace.updateMany({
      where: { id: workspaceId, updatedAt: workspace.updatedAt },
      data: { procedures: toJsonValue(updatedProcedures) },
    })

    if (result.count > 0) return { success: true }
  }

  throw new Error("Nao foi possivel atualizar o preco. Tente novamente.")
}

export async function getWorkspaceProcedures() {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true, memberships: { select: { workspaceId: true }, take: 1 } },
  })
  const workspaceId = user?.workspace?.id ?? user?.memberships?.[0]?.workspaceId
  if (!workspaceId) throw new Error("Workspace not configured")

  if (user?.workspace) {
    return readProcedures(user.workspace.procedures)
  }

  const workspace = await db.workspace.findUnique({ where: { id: workspaceId } })
  return workspace ? readProcedures(workspace.procedures) : []
}
