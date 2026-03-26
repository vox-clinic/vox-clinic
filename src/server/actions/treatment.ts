"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { logAudit } from "@/lib/audit"

async function getAuthContext() {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true },
  })
  if (!user?.workspace) throw new Error("Workspace not configured")

  return { userId, workspaceId: user.workspace.id }
}

export async function getTreatmentPlans(patientId: string) {
  const { workspaceId } = await getAuthContext()

  // Verify patient belongs to workspace
  const patient = await db.patient.findFirst({
    where: { id: patientId, workspaceId },
  })
  if (!patient) throw new Error("Paciente nao encontrado")

  const plans = await db.treatmentPlan.findMany({
    where: { patientId, workspaceId },
    orderBy: { createdAt: "desc" },
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

export async function createTreatmentPlan(data: {
  patientId: string
  name: string
  procedures: string[]
  totalSessions: number
  notes?: string
  estimatedEndDate?: string
}) {
  const { userId, workspaceId } = await getAuthContext()

  // Verify patient
  const patient = await db.patient.findFirst({
    where: { id: data.patientId, workspaceId },
  })
  if (!patient) throw new Error("Paciente nao encontrado")

  if (data.totalSessions < 1) throw new Error("Total de sessoes deve ser pelo menos 1")

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
}

export async function addSessionToTreatment(planId: string) {
  const { userId, workspaceId } = await getAuthContext()

  // Atomic increment inside transaction to prevent lost updates
  const updated = await db.$transaction(async (tx) => {
    const plan = await tx.treatmentPlan.findFirst({
      where: { id: planId, workspaceId },
    })
    if (!plan) throw new Error("Plano de tratamento nao encontrado")
    if (plan.status !== "active") throw new Error("Plano nao esta ativo")
    if (plan.completedSessions >= plan.totalSessions) throw new Error("Todas as sessoes ja foram concluidas")

    const isComplete = plan.completedSessions + 1 >= plan.totalSessions

    return tx.treatmentPlan.update({
      where: { id: planId },
      data: {
        completedSessions: { increment: 1 },
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
}

export async function updateTreatmentPlanStatus(planId: string, status: string) {
  const { userId, workspaceId } = await getAuthContext()

  const validStatuses = ["active", "completed", "cancelled", "paused"]
  if (!validStatuses.includes(status)) throw new Error("Status invalido")

  const plan = await db.treatmentPlan.findFirst({
    where: { id: planId, workspaceId },
  })
  if (!plan) throw new Error("Plano de tratamento nao encontrado")

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
}

export async function deleteTreatmentPlan(planId: string) {
  const { userId, workspaceId } = await getAuthContext()

  const plan = await db.treatmentPlan.findFirst({
    where: { id: planId, workspaceId },
  })
  if (!plan) throw new Error("Plano de tratamento nao encontrado")

  await db.treatmentPlan.delete({ where: { id: planId } })

  await logAudit({
    workspaceId,
    userId,
    action: "treatmentPlan.deleted",
    entityType: "TreatmentPlan",
    entityId: planId,
  })

  return { success: true }
}
