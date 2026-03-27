import { db } from "@/lib/db"
import { getPlanLimits, isWithinLimit, isFeatureAllowed } from "@/lib/plan-limits"
import type { PlanLimits } from "@/lib/plan-limits"

export interface PlanCheckResult {
  allowed: boolean
  reason?: string
  currentUsage?: number
  limit?: number
}

/**
 * Check if a workspace can add more patients (active count vs plan limit).
 */
export async function checkPatientLimit(workspaceId: string, plan: string): Promise<PlanCheckResult> {
  const limits = getPlanLimits(plan)
  if (limits.maxPatients === -1) return { allowed: true }

  const count = await db.patient.count({
    where: { workspaceId, isActive: true },
  })

  if (!isWithinLimit(limits.maxPatients, count)) {
    return {
      allowed: false,
      reason: `Limite de ${limits.maxPatients} pacientes atingido no plano atual. Faca upgrade para continuar.`,
      currentUsage: count,
      limit: limits.maxPatients,
    }
  }
  return { allowed: true, currentUsage: count, limit: limits.maxPatients }
}

/**
 * Check if a workspace can create more appointments this month.
 */
export async function checkAppointmentLimit(workspaceId: string, plan: string): Promise<PlanCheckResult> {
  const limits = getPlanLimits(plan)
  if (limits.maxAppointmentsPerMonth === -1) return { allowed: true }

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const count = await db.appointment.count({
    where: {
      workspaceId,
      createdAt: { gte: startOfMonth, lte: endOfMonth },
    },
  })

  if (!isWithinLimit(limits.maxAppointmentsPerMonth, count)) {
    return {
      allowed: false,
      reason: `Limite de ${limits.maxAppointmentsPerMonth} consultas/mes atingido no plano atual.`,
      currentUsage: count,
      limit: limits.maxAppointmentsPerMonth,
    }
  }
  return { allowed: true, currentUsage: count, limit: limits.maxAppointmentsPerMonth }
}

/**
 * Check if a workspace can create more recordings this month.
 */
export async function checkRecordingLimit(workspaceId: string, plan: string): Promise<PlanCheckResult> {
  const limits = getPlanLimits(plan)
  if (limits.maxRecordingsPerMonth === -1) return { allowed: true }

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const count = await db.recording.count({
    where: {
      workspaceId,
      createdAt: { gte: startOfMonth, lte: endOfMonth },
    },
  })

  if (!isWithinLimit(limits.maxRecordingsPerMonth, count)) {
    return {
      allowed: false,
      reason: `Limite de ${limits.maxRecordingsPerMonth} gravacoes/mes atingido no plano atual.`,
      currentUsage: count,
      limit: limits.maxRecordingsPerMonth,
    }
  }
  return { allowed: true, currentUsage: count, limit: limits.maxRecordingsPerMonth }
}

/**
 * Check if a workspace can add more team members.
 */
export async function checkTeamMemberLimit(workspaceId: string, plan: string): Promise<PlanCheckResult> {
  const limits = getPlanLimits(plan)
  if (limits.maxTeamMembers === -1) return { allowed: true }

  const count = await db.workspaceMember.count({
    where: { workspaceId },
  })

  if (!isWithinLimit(limits.maxTeamMembers, count)) {
    return {
      allowed: false,
      reason: `Limite de ${limits.maxTeamMembers} membros atingido no plano atual.`,
      currentUsage: count,
      limit: limits.maxTeamMembers,
    }
  }
  return { allowed: true, currentUsage: count, limit: limits.maxTeamMembers }
}

/**
 * Check if a workspace can add more agendas.
 */
export async function checkAgendaLimit(workspaceId: string, plan: string): Promise<PlanCheckResult> {
  const limits = getPlanLimits(plan)
  if (limits.maxAgendas === -1) return { allowed: true }

  const count = await db.agenda.count({
    where: { workspaceId, isActive: true },
  })

  if (!isWithinLimit(limits.maxAgendas, count)) {
    return {
      allowed: false,
      reason: `Limite de ${limits.maxAgendas} agendas atingido no plano atual.`,
      currentUsage: count,
      limit: limits.maxAgendas,
    }
  }
  return { allowed: true, currentUsage: count, limit: limits.maxAgendas }
}

/**
 * Check if a feature is available on the workspace's plan.
 */
export function checkFeatureAccess(plan: string, feature: keyof PlanLimits["features"]): PlanCheckResult {
  if (isFeatureAllowed(plan, feature)) {
    return { allowed: true }
  }
  return {
    allowed: false,
    reason: `Recurso nao disponivel no plano atual. Faca upgrade para acessar.`,
  }
}
