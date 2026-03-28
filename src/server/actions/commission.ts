"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { logAudit } from "@/lib/audit"
import { normalizeProcedureNames } from "@/lib/json-helpers"
import {
  ERR_UNAUTHORIZED,
  ERR_WORKSPACE_NOT_CONFIGURED,
  ERR_APPOINTMENT_NOT_FOUND,
  ERR_COMMISSION_RULE_NOT_FOUND,
  ERR_COMMISSION_ENTRY_NOT_FOUND,
  ActionError,
  safeAction,
} from "@/lib/error-messages"
import { getWorkspaceIdCached } from "@/lib/workspace-cache"

async function getWorkspaceId() {
  const { userId } = await auth()
  if (!userId) throw new Error(ERR_UNAUTHORIZED)
  const cached = await getWorkspaceIdCached(userId)
  if (!cached) throw new Error(ERR_WORKSPACE_NOT_CONFIGURED)
  return { userId, workspaceId: cached }
}

// ============================================================
// Commission Rules CRUD
// ============================================================

export async function getCommissionRules() {
  const { workspaceId } = await getWorkspaceId()

  const rules = await db.commissionRule.findMany({
    where: { workspaceId },
    include: {
      member: {
        include: { user: { select: { name: true } } },
      },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  })

  return rules.map((r) => ({
    id: r.id,
    memberId: r.memberId,
    memberName: r.member?.user?.name ?? null,
    procedureName: r.procedureName,
    type: r.type,
    percentage: r.percentage,
    fixedAmount: r.fixedAmount,
    priority: r.priority,
    isActive: r.isActive,
    createdAt: r.createdAt.toISOString(),
  }))
}

export const createCommissionRule = safeAction(
  async (data: {
    memberId?: string | null
    procedureName?: string | null
    type: "percentage" | "fixed"
    percentage?: number | null
    fixedAmount?: number | null
  }) => {
    const { userId, workspaceId } = await getWorkspaceId()

    // Validate type-specific fields
    if (data.type === "percentage") {
      if (data.percentage == null || data.percentage < 0 || data.percentage > 100) {
        throw new ActionError("Percentual deve ser entre 0 e 100")
      }
    } else {
      if (data.fixedAmount == null || data.fixedAmount < 0) {
        throw new ActionError("Valor fixo deve ser maior que zero")
      }
    }

    // If memberId is provided, validate it belongs to workspace
    if (data.memberId) {
      const member = await db.workspaceMember.findFirst({
        where: { id: data.memberId, workspaceId },
      })
      if (!member) throw new ActionError("Membro nao encontrado neste workspace")
    }

    // Calculate priority: both fields = 3, member only = 2, procedure only = 1, global = 0
    let priority = 0
    if (data.memberId && data.procedureName) priority = 3
    else if (data.memberId) priority = 2
    else if (data.procedureName) priority = 1

    const rule = await db.commissionRule.create({
      data: {
        workspaceId,
        memberId: data.memberId || null,
        procedureName: data.procedureName || null,
        type: data.type,
        percentage: data.type === "percentage" ? data.percentage : null,
        fixedAmount: data.type === "fixed" ? data.fixedAmount : null,
        priority,
      },
    })

    await logAudit({
      workspaceId,
      userId,
      action: "commission_rule.created",
      entityType: "CommissionRule",
      entityId: rule.id,
    })

    return { id: rule.id }
  }
)

export const updateCommissionRule = safeAction(
  async (
    id: string,
    data: {
      memberId?: string | null
      procedureName?: string | null
      type: "percentage" | "fixed"
      percentage?: number | null
      fixedAmount?: number | null
      isActive?: boolean
    }
  ) => {
    const { userId, workspaceId } = await getWorkspaceId()

    const existing = await db.commissionRule.findFirst({
      where: { id, workspaceId },
    })
    if (!existing) throw new ActionError(ERR_COMMISSION_RULE_NOT_FOUND)

    if (data.type === "percentage") {
      if (data.percentage == null || data.percentage < 0 || data.percentage > 100) {
        throw new ActionError("Percentual deve ser entre 0 e 100")
      }
    } else {
      if (data.fixedAmount == null || data.fixedAmount < 0) {
        throw new ActionError("Valor fixo deve ser maior que zero")
      }
    }

    let priority = 0
    const memberId = data.memberId !== undefined ? data.memberId : existing.memberId
    const procedureName = data.procedureName !== undefined ? data.procedureName : existing.procedureName
    if (memberId && procedureName) priority = 3
    else if (memberId) priority = 2
    else if (procedureName) priority = 1

    const rule = await db.commissionRule.update({
      where: { id },
      data: {
        memberId: data.memberId !== undefined ? (data.memberId || null) : undefined,
        procedureName: data.procedureName !== undefined ? (data.procedureName || null) : undefined,
        type: data.type,
        percentage: data.type === "percentage" ? data.percentage : null,
        fixedAmount: data.type === "fixed" ? data.fixedAmount : null,
        priority,
        isActive: data.isActive,
      },
    })

    await logAudit({
      workspaceId,
      userId,
      action: "commission_rule.updated",
      entityType: "CommissionRule",
      entityId: rule.id,
    })

    return { id: rule.id }
  }
)

export const deleteCommissionRule = safeAction(async (id: string) => {
  const { userId, workspaceId } = await getWorkspaceId()

  const existing = await db.commissionRule.findFirst({
    where: { id, workspaceId },
  })
  if (!existing) throw new ActionError(ERR_COMMISSION_RULE_NOT_FOUND)

  await db.commissionRule.delete({ where: { id } })

  await logAudit({
    workspaceId,
    userId,
    action: "commission_rule.deleted",
    entityType: "CommissionRule",
    entityId: id,
  })

  return { success: true }
})

// ============================================================
// Commission Calculation
// ============================================================

/**
 * Resolve which commission rule applies for a given member + procedure.
 * Priority: specific (member+procedure) > member default > procedure default > global
 */
function resolveCommissionRule(
  rules: Array<{
    id: string
    memberId: string | null
    procedureName: string | null
    type: string
    percentage: number | null
    fixedAmount: number | null
    isActive: boolean
    priority: number
  }>,
  memberId: string,
  procedureName: string
) {
  const active = rules.filter((r) => r.isActive)

  // Specific: member + procedure
  const specific = active.find(
    (r) => r.memberId === memberId && r.procedureName === procedureName
  )
  if (specific) return specific

  // Member default: member + any procedure
  const memberDefault = active.find(
    (r) => r.memberId === memberId && !r.procedureName
  )
  if (memberDefault) return memberDefault

  // Procedure default: any member + procedure
  const procedureDefault = active.find(
    (r) => !r.memberId && r.procedureName === procedureName
  )
  if (procedureDefault) return procedureDefault

  // Global default: any member + any procedure
  const global = active.find((r) => !r.memberId && !r.procedureName)
  return global ?? null
}

/**
 * Calculate and upsert commission entries for a completed appointment.
 * Called after updateAppointmentStatus("completed") or price update.
 */
export async function calculateCommissions(appointmentId: string) {
  const { workspaceId } = await getWorkspaceId()

  const appointment = await db.appointment.findFirst({
    where: { id: appointmentId, workspaceId },
    include: { agenda: true },
  })
  if (!appointment) throw new Error(ERR_APPOINTMENT_NOT_FOUND)

  // No price = no commissions
  if (!appointment.price || appointment.price <= 0) return { entries: [] }

  // Determine the professional
  const memberId = appointment.professionalId
  if (!memberId) {
    // No professional assigned — skip commission calculation
    return { entries: [] }
  }

  // Get all rules for this workspace
  const rules = await db.commissionRule.findMany({
    where: { workspaceId },
  })
  if (rules.length === 0) return { entries: [] }

  // Get procedure names
  const procNames = normalizeProcedureNames(appointment.procedures)
  if (procNames.length === 0) {
    // If no procedures, treat the whole appointment as a single "Consulta"
    procNames.push("Consulta")
  }

  // Split price evenly across procedures (same logic as financial.ts)
  const priceInCentavos = Math.round(appointment.price * 100)
  const pricePerProc = Math.round(priceInCentavos / procNames.length)

  const entries: Array<{
    procedureName: string
    baseAmount: number
    amount: number
    ruleId: string | null
    percentage: number | null
    fixedAmount: number | null
  }> = []

  for (const procName of procNames) {
    const rule = resolveCommissionRule(rules, memberId, procName)
    if (!rule) continue

    let amount = 0
    if (rule.type === "percentage" && rule.percentage != null) {
      amount = Math.round(pricePerProc * (rule.percentage / 100))
    } else if (rule.type === "fixed" && rule.fixedAmount != null) {
      amount = rule.fixedAmount
    }

    entries.push({
      procedureName: procName,
      baseAmount: pricePerProc,
      amount,
      ruleId: rule.id,
      percentage: rule.type === "percentage" ? rule.percentage : null,
      fixedAmount: rule.type === "fixed" ? rule.fixedAmount : null,
    })
  }

  // Upsert entries atomically (one per member+procedure per appointment)
  await db.$transaction(
    entries.map((entry) =>
      db.commissionEntry.upsert({
        where: {
          appointmentId_memberId_procedureName: {
            appointmentId,
            memberId,
            procedureName: entry.procedureName,
          },
        },
        create: {
          workspaceId,
          memberId,
          appointmentId,
          ruleId: entry.ruleId,
          procedureName: entry.procedureName,
          baseAmount: entry.baseAmount,
          percentage: entry.percentage,
          fixedAmount: entry.fixedAmount,
          amount: entry.amount,
          status: "pending",
        },
        update: {
          ruleId: entry.ruleId,
          baseAmount: entry.baseAmount,
          percentage: entry.percentage,
          fixedAmount: entry.fixedAmount,
          amount: entry.amount,
        },
      })
    )
  )

  return {
    entries: entries.map((e) => ({
      procedureName: e.procedureName,
      baseAmount: e.baseAmount,
      amount: e.amount,
    })),
  }
}

// ============================================================
// Commission Report & Entries
// ============================================================

export async function getCommissionReport(
  period: "month" | "year",
  date: string,
  memberId?: string
) {
  const { workspaceId } = await getWorkspaceId()

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

  const where: any = {
    workspaceId,
    createdAt: { gte: startDate, lte: endDate },
  }
  if (memberId) where.memberId = memberId

  const entries = await db.commissionEntry.findMany({
    where,
    include: {
      member: {
        include: { user: { select: { name: true } } },
      },
      appointment: {
        select: {
          id: true,
          date: true,
          procedures: true,
          price: true,
          patient: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Aggregate per member
  const memberMap = new Map<
    string,
    {
      memberId: string
      memberName: string
      totalAppointments: Set<string>
      grossRevenue: number
      commissionAmount: number
      pendingAmount: number
      paidAmount: number
    }
  >()

  for (const entry of entries) {
    const key = entry.memberId
    if (!memberMap.has(key)) {
      memberMap.set(key, {
        memberId: key,
        memberName: entry.member?.user?.name ?? "Desconhecido",
        totalAppointments: new Set(),
        grossRevenue: 0,
        commissionAmount: 0,
        pendingAmount: 0,
        paidAmount: 0,
      })
    }
    const agg = memberMap.get(key)!
    agg.totalAppointments.add(entry.appointmentId)
    agg.grossRevenue += entry.baseAmount
    agg.commissionAmount += entry.amount
    if (entry.status === "pending" || entry.status === "approved") {
      agg.pendingAmount += entry.amount
    } else if (entry.status === "paid") {
      agg.paidAmount += entry.amount
    }
  }

  const totalPending = entries
    .filter((e) => e.status === "pending" || e.status === "approved")
    .reduce((sum, e) => sum + e.amount, 0)
  const totalPaid = entries
    .filter((e) => e.status === "paid")
    .reduce((sum, e) => sum + e.amount, 0)
  const totalGross = entries.reduce((sum, e) => sum + e.baseAmount, 0)
  const clinicRetention = totalGross - totalPending - totalPaid

  return {
    summary: {
      totalPending,
      totalPaid,
      totalGross,
      clinicRetention,
    },
    members: Array.from(memberMap.values()).map((m) => ({
      memberId: m.memberId,
      memberName: m.memberName,
      totalAppointments: m.totalAppointments.size,
      grossRevenue: m.grossRevenue,
      commissionAmount: m.commissionAmount,
      pendingAmount: m.pendingAmount,
      paidAmount: m.paidAmount,
    })),
    entries: entries.map((e) => ({
      id: e.id,
      memberId: e.memberId,
      memberName: e.member?.user?.name ?? "Desconhecido",
      appointmentId: e.appointmentId,
      appointmentDate: e.appointment?.date?.toISOString() ?? null,
      patientName: e.appointment?.patient?.name ?? null,
      procedureName: e.procedureName,
      baseAmount: e.baseAmount,
      percentage: e.percentage,
      fixedAmount: e.fixedAmount,
      amount: e.amount,
      status: e.status,
      paidAt: e.paidAt?.toISOString() ?? null,
      createdAt: e.createdAt.toISOString(),
    })),
  }
}

export async function getCommissionEntries(filters: {
  page?: number
  status?: string
  memberId?: string
  startDate?: string
  endDate?: string
}) {
  const { workspaceId } = await getWorkspaceId()
  const page = filters.page ?? 1
  const pageSize = 20
  const skip = (page - 1) * pageSize

  const where: any = { workspaceId }
  if (filters.status && filters.status !== "all") where.status = filters.status
  if (filters.memberId) where.memberId = filters.memberId
  if (filters.startDate || filters.endDate) {
    where.createdAt = {}
    if (filters.startDate) where.createdAt.gte = new Date(filters.startDate)
    if (filters.endDate) where.createdAt.lte = new Date(filters.endDate)
  }

  const [entries, total] = await Promise.all([
    db.commissionEntry.findMany({
      where,
      include: {
        member: {
          include: { user: { select: { name: true } } },
        },
        appointment: {
          select: {
            id: true,
            date: true,
            patient: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    db.commissionEntry.count({ where }),
  ])

  return {
    entries: entries.map((e) => ({
      id: e.id,
      memberId: e.memberId,
      memberName: e.member?.user?.name ?? "Desconhecido",
      appointmentId: e.appointmentId,
      appointmentDate: e.appointment?.date?.toISOString() ?? null,
      patientName: e.appointment?.patient?.name ?? null,
      procedureName: e.procedureName,
      baseAmount: e.baseAmount,
      percentage: e.percentage,
      fixedAmount: e.fixedAmount,
      amount: e.amount,
      status: e.status,
      paidAt: e.paidAt?.toISOString() ?? null,
      createdAt: e.createdAt.toISOString(),
    })),
    total,
    totalPages: Math.ceil(total / pageSize),
    page,
  }
}

export const markCommissionsPaid = safeAction(
  async (entryIds: string[], paidAt?: string) => {
    const { userId, workspaceId } = await getWorkspaceId()

    if (!entryIds.length) throw new ActionError("Nenhuma comissao selecionada")

    // Verify all entries belong to this workspace
    const entries = await db.commissionEntry.findMany({
      where: { id: { in: entryIds }, workspaceId },
    })
    if (entries.length !== entryIds.length) {
      throw new ActionError(ERR_COMMISSION_ENTRY_NOT_FOUND)
    }

    const paidDate = paidAt ? new Date(paidAt) : new Date()

    await db.commissionEntry.updateMany({
      where: { id: { in: entryIds }, workspaceId },
      data: { status: "paid", paidAt: paidDate },
    })

    await logAudit({
      workspaceId,
      userId,
      action: "commission.paid",
      entityType: "CommissionEntry",
      entityId: entryIds.join(","),
      details: { count: entryIds.length, paidAt: paidDate.toISOString() },
    })

    return { success: true, count: entryIds.length }
  }
)
