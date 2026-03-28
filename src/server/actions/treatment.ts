"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { logAudit } from "@/lib/audit"
import { ERR_UNAUTHORIZED, ERR_WORKSPACE_NOT_CONFIGURED, ERR_PATIENT_NOT_FOUND, ERR_TREATMENT_NOT_FOUND, ActionError, safeAction } from "@/lib/error-messages"

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

export async function getTreatmentPlans(patientId: string) {
  const { workspaceId } = await getAuthContext()

  // Verify patient belongs to workspace
  const patient = await db.patient.findFirst({
    where: { id: patientId, workspaceId },
  })
  if (!patient) throw new Error(ERR_PATIENT_NOT_FOUND)

  const plans = await db.treatmentPlan.findMany({
    where: { patientId, workspaceId },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return plans.map((p) => ({
    id: p.id,
    name: p.name,
    procedures: p.procedures as string[],
    totalSessions: p.totalSessions,
    completedSessions: p.completedSessions,
    status: p.status,
    notes: p.notes,
    startDate: p.startDate.toISOString(),
    estimatedEndDate: p.estimatedEndDate?.toISOString() ?? null,
    completedAt: p.completedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
  }))
}

export const createTreatmentPlan = safeAction(async (data: {
  patientId: string
  name: string
  procedures: string[]
  totalSessions: number
  notes?: string
  estimatedEndDate?: string
}) => {
  const { userId, workspaceId } = await getAuthContext()

  // Verify patient
  const patient = await db.patient.findFirst({
    where: { id: data.patientId, workspaceId },
  })
  if (!patient) throw new Error(ERR_PATIENT_NOT_FOUND)

  if (data.totalSessions < 1) throw new ActionError("Total de sessões deve ser pelo menos 1")
  if (data.totalSessions > 365) throw new ActionError("Máximo de 365 sessões permitido.")

  const plan = await db.treatmentPlan.create({
    data: {
      patientId: data.patientId,
      workspaceId,
      name: data.name,
      procedures: data.procedures,
      totalSessions: data.totalSessions,
      notes: data.notes || null,
      estimatedEndDate: data.estimatedEndDate ? new Date(data.estimatedEndDate) : null,
    },
  })

  await logAudit({
    workspaceId,
    userId,
    action: "treatmentPlan.created",
    entityType: "TreatmentPlan",
    entityId: plan.id,
  })

  return { id: plan.id }
})

export const addSessionToTreatment = safeAction(async (planId: string) => {
  const { userId, workspaceId } = await getAuthContext()

  const updated = await db.$transaction(async (tx) => {
    // Lock the row to prevent concurrent session increments
    const rows = await tx.$queryRawUnsafe<Array<{
      id: string
      completedSessions: number
      totalSessions: number
      status: string
    }>>(
      `SELECT id, "completedSessions", "totalSessions", status FROM "TreatmentPlan" WHERE id = $1 AND "workspaceId" = $2 FOR UPDATE`,
      planId,
      workspaceId
    )

    const plan = rows[0]
    if (!plan) throw new Error(ERR_TREATMENT_NOT_FOUND)
    if (plan.status !== "active") throw new ActionError("Plano não está ativo")
    if (plan.completedSessions >= plan.totalSessions) throw new ActionError("Todas as sessões já foram concluídas")

    const newCompleted = plan.completedSessions + 1
    const isComplete = newCompleted >= plan.totalSessions

    return tx.treatmentPlan.update({
      where: { id: planId },
      data: {
        completedSessions: newCompleted,
        status: isComplete ? "completed" : "active",
        completedAt: isComplete ? new Date() : null,
      },
    })
  })

  await logAudit({
    workspaceId,
    userId,
    action: "treatmentPlan.sessionAdded",
    entityType: "TreatmentPlan",
    entityId: planId,
    details: { completedSessions: updated.completedSessions, totalSessions: updated.totalSessions },
  })

  return {
    id: updated.id,
    completedSessions: updated.completedSessions,
    status: updated.status,
  }
})

export const updateTreatmentPlanStatus = safeAction(async (planId: string, status: string) => {
  const { userId, workspaceId } = await getAuthContext()

  const validStatuses = ["active", "completed", "cancelled", "paused"]
  if (!validStatuses.includes(status)) throw new ActionError("Status inválido")

  const plan = await db.treatmentPlan.findFirst({
    where: { id: planId, workspaceId },
  })
  if (!plan) throw new Error(ERR_TREATMENT_NOT_FOUND)

  const updated = await db.treatmentPlan.update({
    where: { id: planId },
    data: {
      status,
      completedAt: status === "completed" ? new Date() : null,
    },
  })

  await logAudit({
    workspaceId,
    userId,
    action: "treatmentPlan.statusChanged",
    entityType: "TreatmentPlan",
    entityId: planId,
    details: { from: plan.status, to: status },
  })

  return { id: updated.id, status: updated.status }
})

export const deleteTreatmentPlan = safeAction(async (planId: string) => {
  const { userId, workspaceId } = await getAuthContext()

  const plan = await db.treatmentPlan.findFirst({
    where: { id: planId, workspaceId },
  })
  if (!plan) throw new Error(ERR_TREATMENT_NOT_FOUND)

  await db.treatmentPlan.delete({ where: { id: planId } })

  await logAudit({
    workspaceId,
    userId,
    action: "treatmentPlan.deleted",
    entityType: "TreatmentPlan",
    entityId: planId,
  })

  return { success: true }
})
