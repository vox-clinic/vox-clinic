"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { checkFeatureAccess } from "@/lib/plan-enforcement"
import { ERR_UNAUTHORIZED, ERR_WORKSPACE_NOT_CONFIGURED, ActionError } from "@/lib/error-messages"

async function getWorkspaceId() {
  const { userId } = await auth()
  if (!userId) throw new Error(ERR_UNAUTHORIZED)
  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true, memberships: { select: { workspaceId: true }, take: 1 } },
  })
  const workspaceId = user?.workspace?.id ?? user?.memberships?.[0]?.workspaceId
  if (!workspaceId) throw new Error(ERR_WORKSPACE_NOT_CONFIGURED)
  return workspaceId
}

export async function getReportsData(period: "3m" | "6m" | "12m") {
  const workspaceId = await getWorkspaceId()

  // Plan enforcement: check reports feature access
  const workspace = await db.workspace.findUnique({ where: { id: workspaceId }, select: { plan: true } })
  const planCheck = checkFeatureAccess(workspace?.plan ?? "free", "reports")
  if (!planCheck.allowed) throw new ActionError(planCheck.reason!)

  const now = new Date()

  const monthsBack = period === "3m" ? 3 : period === "6m" ? 6 : 12
  const startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1)

  // All appointments in period
  const appointments = await db.appointment.findMany({
    where: {
      workspaceId,
      date: { gte: startDate },
      status: { in: ["completed", "scheduled", "no_show"] },
    },
    include: {
      patient: { select: { id: true, name: true } },
    },
    orderBy: { date: "asc" },
  })

  // Total patients
  const totalPatients = await db.patient.count({ where: { workspaceId, isActive: true } })

  // New patients per month
  const newPatients = await db.patient.findMany({
    where: { workspaceId, createdAt: { gte: startDate } },
    select: { createdAt: true },
  })

  // ── Monthly revenue chart ──
  const monthlyRevenue: { month: string; revenue: number; count: number }[] = []
  const monthlyPatients: { month: string; newPatients: number }[] = []
  const procedureCounts: Record<string, number> = {}
  const hourCounts: Record<number, number> = {}
  const statusCounts: Record<string, number> = { completed: 0, scheduled: 0, cancelled: 0, no_show: 0 }
  const patientFrequency: Record<string, number> = {}

  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const label = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`

    const monthAppts = appointments.filter((a) => {
      const ad = new Date(a.date)
      return ad.getFullYear() === d.getFullYear() && ad.getMonth() === d.getMonth()
    })

    const revenue = monthAppts.reduce((sum, a) => sum + (a.price ?? 0), 0)
    monthlyRevenue.push({ month: label, revenue, count: monthAppts.length })

    const monthNew = newPatients.filter((p) => {
      const pd = new Date(p.createdAt)
      return pd.getFullYear() === d.getFullYear() && pd.getMonth() === d.getMonth()
    })
    monthlyPatients.push({ month: label, newPatients: monthNew.length })
  }

  // Aggregate stats
  for (const apt of appointments) {
    // Status counts
    statusCounts[apt.status] = (statusCounts[apt.status] ?? 0) + 1

    // Procedure counts — handle both string[] and {name}[] formats
    const rawProcs = Array.isArray(apt.procedures) ? apt.procedures : []
    for (const proc of rawProcs) {
      const name = typeof proc === "string" ? proc : (proc as any)?.name ?? String(proc)
      procedureCounts[name] = (procedureCounts[name] ?? 0) + 1
    }

    // Hour heatmap
    const hour = new Date(apt.date).getHours()
    hourCounts[hour] = (hourCounts[hour] ?? 0) + 1

    // Patient frequency
    patientFrequency[apt.patient.id] = (patientFrequency[apt.patient.id] ?? 0) + 1
  }

  // Top procedures
  const topProcedures = Object.entries(procedureCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }))

  // Hour distribution
  const hourDistribution = Array.from({ length: 14 }, (_, i) => ({
    hour: `${String(i + 7).padStart(2, "0")}h`,
    count: hourCounts[i + 7] ?? 0,
  }))

  // Return rate (patients with 2+ appointments)
  const returningPatients = Object.values(patientFrequency).filter((c) => c >= 2).length
  const uniquePatients = Object.keys(patientFrequency).length
  const returnRate = uniquePatients > 0 ? Math.round((returningPatients / uniquePatients) * 100) : 0

  // No-show rate
  const totalCompleted = statusCounts.completed ?? 0
  const totalNoShow = statusCounts.no_show ?? 0
  const totalAll = appointments.length
  const noShowRate = totalAll > 0 ? Math.round((totalNoShow / totalAll) * 100) : 0

  const totalRevenue = appointments.reduce((sum, a) => sum + (a.price ?? 0), 0)

  // NPS data
  const npsResponses = await db.npsSurvey.findMany({
    where: { workspaceId, answeredAt: { not: null }, sentAt: { gte: startDate } },
    select: { score: true },
  })
  const npsScores = npsResponses.filter(r => r.score !== null).map(r => r.score!)
  const npsAvg = npsScores.length > 0 ? Math.round(npsScores.reduce((s, v) => s + v, 0) / npsScores.length * 10) / 10 : null
  const npsPromoters = npsScores.filter(s => s >= 9).length
  const npsDetractors = npsScores.filter(s => s <= 6).length
  const npsScore = npsScores.length > 0 ? Math.round(((npsPromoters - npsDetractors) / npsScores.length) * 100) : null

  // Patient ranking by frequency and revenue
  const patientStats: Record<string, { name: string; visits: number; revenue: number }> = {}
  for (const apt of appointments) {
    if (!patientStats[apt.patient.id]) {
      patientStats[apt.patient.id] = { name: apt.patient.name, visits: 0, revenue: 0 }
    }
    patientStats[apt.patient.id].visits++
    patientStats[apt.patient.id].revenue += apt.price ?? 0
  }

  const topPatientsByFrequency = Object.values(patientStats)
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 10)

  const topPatientsByRevenue = Object.values(patientStats)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  return {
    totalPatients,
    totalAppointments: appointments.length,
    totalRevenue,
    returnRate,
    noShowRate,
    monthlyRevenue,
    monthlyPatients,
    topProcedures,
    hourDistribution,
    statusCounts,
    topPatientsByFrequency,
    topPatientsByRevenue,
    nps: { score: npsScore, average: npsAvg, total: npsScores.length, promoters: npsPromoters, detractors: npsDetractors },
  }
}

export async function getNpsSurveys(period: string = "6m") {
  const { userId } = await auth()
  if (!userId) throw new Error(ERR_UNAUTHORIZED)
  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true, memberships: { select: { workspaceId: true }, take: 1 } },
  })
  const workspaceId = user?.workspace?.id ?? user?.memberships?.[0]?.workspaceId
  if (!workspaceId) throw new Error(ERR_WORKSPACE_NOT_CONFIGURED)

  const months = period === "3m" ? 3 : period === "12m" ? 12 : 6
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - months)

  const surveys = await db.npsSurvey.findMany({
    where: {
      workspaceId,
      answeredAt: { not: null },
      sentAt: { gte: startDate },
    },
    orderBy: { answeredAt: "desc" },
    take: 50,
  })

  // Manual join since NpsSurvey has no Prisma relation to Patient
  const patientIds = [...new Set(surveys.map(s => s.patientId))]
  const patients = patientIds.length > 0
    ? await db.patient.findMany({
        where: { id: { in: patientIds } },
        select: { id: true, name: true },
      })
    : []
  const patientMap = new Map(patients.map(p => [p.id, p]))

  return surveys.map(s => {
    const patient = patientMap.get(s.patientId)
    return {
      id: s.id,
      patientName: patient?.name || "Paciente",
      patientId: patient?.id,
      score: s.score!,
      comment: s.comment,
      answeredAt: s.answeredAt!.toISOString(),
    }
  })
}
