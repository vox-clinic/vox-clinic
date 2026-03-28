"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { logAudit } from "@/lib/audit"
import {
  ERR_UNAUTHORIZED,
  ERR_USER_NOT_FOUND,
  ERR_WORKSPACE_NOT_CONFIGURED,
  ERR_PRESCRIPTION_NOT_FOUND,
  ActionError,
  safeAction,
} from "@/lib/error-messages"

async function getAuthContext() {
  const { userId } = await auth()
  if (!userId) throw new Error(ERR_UNAUTHORIZED)

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true, memberships: { select: { workspaceId: true }, take: 1 } },
  })
  if (!user) throw new Error(ERR_USER_NOT_FOUND)
  const workspaceId = user.workspace?.id ?? user.memberships?.[0]?.workspaceId
  if (!workspaceId) throw new Error(ERR_WORKSPACE_NOT_CONFIGURED)

  return { userId, user, workspaceId }
}

export const getTemplates = safeAction(async () => {
  const { workspaceId } = await getAuthContext()

  const templates = await db.prescriptionTemplate.findMany({
    where: { workspaceId },
    orderBy: { usageCount: "desc" },
  })

  return {
    templates: templates.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      specialty: t.specialty,
      items: t.items as { name: string; dosage: string; frequency: string; duration: string; instructions?: string }[],
      notes: t.notes,
      isShared: t.isShared,
      usageCount: t.usageCount,
      createdAt: t.createdAt.toISOString(),
    })),
  }
})

export const createTemplate = safeAction(async (data: {
  name: string
  description?: string
  specialty?: string
  items: { name: string; dosage: string; frequency: string; duration: string; instructions?: string }[]
  notes?: string
  isShared?: boolean
}) => {
  const { userId, workspaceId } = await getAuthContext()

  if (!data.name?.trim()) throw new ActionError("Nome do template é obrigatório.")
  if (!data.items?.length) throw new ActionError("Adicione pelo menos um medicamento ao template.")

  for (const item of data.items) {
    if (!item.name?.trim()) throw new ActionError("Nome do medicamento é obrigatório em todos os itens.")
  }

  const template = await db.prescriptionTemplate.create({
    data: {
      workspaceId,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      specialty: data.specialty?.trim() || null,
      items: data.items,
      notes: data.notes?.trim() || null,
      isShared: data.isShared ?? false,
      createdBy: userId,
    },
  })

  await logAudit({
    workspaceId,
    userId,
    action: "prescription_template.created",
    entityType: "PrescriptionTemplate",
    entityId: template.id,
  })

  return { id: template.id }
})

export const applyTemplate = safeAction(async (templateId: string) => {
  const { workspaceId } = await getAuthContext()

  const template = await db.prescriptionTemplate.findFirst({
    where: { id: templateId, workspaceId },
  })
  if (!template) throw new ActionError("Template de prescrição não encontrado.")

  await db.prescriptionTemplate.update({
    where: { id: templateId },
    data: { usageCount: { increment: 1 } },
  })

  return {
    id: template.id,
    name: template.name,
    items: template.items as { name: string; dosage: string; frequency: string; duration: string; instructions?: string }[],
    notes: template.notes,
  }
})

export const deleteTemplate = safeAction(async (templateId: string) => {
  const { userId, workspaceId } = await getAuthContext()

  const template = await db.prescriptionTemplate.findFirst({
    where: { id: templateId, workspaceId },
  })
  if (!template) throw new ActionError("Template de prescrição não encontrado.")

  await db.prescriptionTemplate.delete({ where: { id: templateId } })

  await logAudit({
    workspaceId,
    userId,
    action: "prescription_template.deleted",
    entityType: "PrescriptionTemplate",
    entityId: templateId,
  })

  return { success: true }
})

export const saveAsTemplate = safeAction(async (data: {
  prescriptionId: string
  name: string
  specialty?: string
}) => {
  const { userId, workspaceId } = await getAuthContext()

  if (!data.name?.trim()) throw new ActionError("Nome do template é obrigatório.")

  const prescription = await db.prescription.findFirst({
    where: { id: data.prescriptionId, workspaceId },
  })
  if (!prescription) throw new ActionError(ERR_PRESCRIPTION_NOT_FOUND)

  const medications = prescription.medications as { name: string; dosage: string; frequency: string; duration: string; notes?: string }[]

  const template = await db.prescriptionTemplate.create({
    data: {
      workspaceId,
      name: data.name.trim(),
      specialty: data.specialty?.trim() || null,
      items: medications.map((m) => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        instructions: m.notes || undefined,
      })),
      notes: prescription.notes || null,
      createdBy: userId,
    },
  })

  await logAudit({
    workspaceId,
    userId,
    action: "prescription_template.created_from_prescription",
    entityType: "PrescriptionTemplate",
    entityId: template.id,
  })

  return { id: template.id }
})
