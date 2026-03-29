"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { checkAgendaLimit } from "@/lib/plan-enforcement"
import { getWorkspaceIdCached } from "@/lib/workspace-cache"
import { ERR_UNAUTHORIZED, ERR_WORKSPACE_NOT_CONFIGURED, ERR_AGENDA_NOT_FOUND, ActionError, safeAction } from "@/lib/error-messages"
import { validateSchedulingRules, type OperatingHoursMap } from "@/lib/scheduling-rules"

async function getWorkspaceId() {
  const { userId } = await auth()
  if (!userId) throw new Error(ERR_UNAUTHORIZED)

  const cached = await getWorkspaceIdCached(userId)
  if (!cached) throw new Error(ERR_WORKSPACE_NOT_CONFIGURED)

  return cached
}

export async function getAgendas() {
  const workspaceId = await getWorkspaceId()

  const agendas = await db.agenda.findMany({
    where: { workspaceId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    include: {
      _count: { select: { appointments: true } },
    },
  })

  return agendas.map((a) => ({
    id: a.id,
    name: a.name,
    color: a.color,
    isDefault: a.isDefault,
    isActive: a.isActive,
    appointmentCount: a._count.appointments,
    slotDuration: a.slotDuration,
    bufferBefore: a.bufferBefore,
    bufferAfter: a.bufferAfter,
    conflictWindow: a.conflictWindow,
    operatingHours: a.operatingHours as OperatingHoursMap,
    maxBookingsPerDay: a.maxBookingsPerDay,
    minNoticeMinutes: a.minNoticeMinutes,
  }))
}

export async function getDefaultAgendaId() {
  const workspaceId = await getWorkspaceId()

  const agenda = await db.agenda.findFirst({
    where: { workspaceId, isDefault: true },
    select: { id: true },
  })

  if (!agenda) {
    // Fallback: create default agenda if missing
    const created = await db.agenda.create({
      data: {
        workspaceId,
        name: "Agenda Principal",
        color: "#14B8A6",
        isDefault: true,
      },
    })
    return created.id
  }

  return agenda.id
}

// Internal helper (not exported as server action) for use within other actions
export async function getDefaultAgendaIdForWorkspace(workspaceId: string) {
  const agenda = await db.agenda.findFirst({
    where: { workspaceId, isDefault: true },
    select: { id: true },
  })

  if (!agenda) {
    const created = await db.agenda.create({
      data: {
        workspaceId,
        name: "Agenda Principal",
        color: "#14B8A6",
        isDefault: true,
      },
    })
    return created.id
  }

  return agenda.id
}

export const createAgenda = safeAction(async (data: { name: string; color?: string }) => {
  const workspaceId = await getWorkspaceId()

  if (!data.name.trim()) throw new ActionError("Nome da agenda é obrigatório")

  // Plan enforcement: check agenda limit
  const workspace = await db.workspace.findUnique({ where: { id: workspaceId }, select: { plan: true } })
  const planCheck = await checkAgendaLimit(workspaceId, workspace?.plan ?? "free")
  if (!planCheck.allowed) throw new ActionError(planCheck.reason!)

  const agenda = await db.agenda.create({
    data: {
      workspaceId,
      name: data.name.trim(),
      color: data.color || "#14B8A6",
    },
  })

  return {
    id: agenda.id,
    name: agenda.name,
    color: agenda.color,
    isDefault: agenda.isDefault,
    isActive: agenda.isActive,
    appointmentCount: 0,
  }
})

export interface UpdateAgendaData {
  name?: string
  color?: string
  isActive?: boolean
  slotDuration?: number
  bufferBefore?: number
  bufferAfter?: number
  conflictWindow?: number
  operatingHours?: OperatingHoursMap
  maxBookingsPerDay?: number | null
  minNoticeMinutes?: number
}

export const updateAgenda = safeAction(async (
  id: string,
  data: UpdateAgendaData
) => {
  const workspaceId = await getWorkspaceId()

  const existing = await db.agenda.findFirst({
    where: { id, workspaceId },
  })
  if (!existing) throw new ActionError(ERR_AGENDA_NOT_FOUND)

  // Cannot deactivate default agenda
  if (existing.isDefault && data.isActive === false) {
    throw new ActionError("Não é possível desativar a agenda padrão")
  }

  // Validate scheduling rules
  const validation = validateSchedulingRules(data)
  if (validation !== true) throw new ActionError(validation)

  const updated = await db.agenda.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.slotDuration !== undefined && { slotDuration: data.slotDuration }),
      ...(data.bufferBefore !== undefined && { bufferBefore: data.bufferBefore }),
      ...(data.bufferAfter !== undefined && { bufferAfter: data.bufferAfter }),
      ...(data.conflictWindow !== undefined && { conflictWindow: data.conflictWindow }),
      ...(data.operatingHours !== undefined && { operatingHours: data.operatingHours ?? "null" }),
      ...(data.maxBookingsPerDay !== undefined && { maxBookingsPerDay: data.maxBookingsPerDay }),
      ...(data.minNoticeMinutes !== undefined && { minNoticeMinutes: data.minNoticeMinutes }),
    },
  })

  return {
    id: updated.id,
    name: updated.name,
    color: updated.color,
    isDefault: updated.isDefault,
    isActive: updated.isActive,
    slotDuration: updated.slotDuration,
    bufferBefore: updated.bufferBefore,
    bufferAfter: updated.bufferAfter,
    conflictWindow: updated.conflictWindow,
    operatingHours: updated.operatingHours as OperatingHoursMap,
    maxBookingsPerDay: updated.maxBookingsPerDay,
    minNoticeMinutes: updated.minNoticeMinutes,
  }
})

export const deleteAgenda = safeAction(async (id: string) => {
  const workspaceId = await getWorkspaceId()

  const existing = await db.agenda.findFirst({
    where: { id, workspaceId },
    include: { _count: { select: { appointments: true, blockedSlots: true } } },
  })
  if (!existing) throw new ActionError(ERR_AGENDA_NOT_FOUND)

  if (existing.isDefault) {
    throw new ActionError("Não é possível excluir a agenda padrão")
  }

  if (existing._count.appointments > 0) {
    throw new ActionError(
      `Esta agenda possui ${existing._count.appointments} consulta(s). Mova as consultas para outra agenda antes de excluir.`
    )
  }

  await db.agenda.delete({ where: { id } })

  return { success: true }
})
