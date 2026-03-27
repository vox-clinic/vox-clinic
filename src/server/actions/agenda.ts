"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { checkAgendaLimit } from "@/lib/plan-enforcement"

async function getWorkspaceId() {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true, memberships: { select: { workspaceId: true }, take: 1 } },
  })

  const workspaceId = user?.workspace?.id ?? user?.memberships?.[0]?.workspaceId
  if (!workspaceId) throw new Error("Workspace not configured")

  return workspaceId
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

export async function createAgenda(data: { name: string; color?: string }) {
  const workspaceId = await getWorkspaceId()

  if (!data.name.trim()) throw new Error("Nome da agenda e obrigatorio")

  // Plan enforcement: check agenda limit
  const workspace = await db.workspace.findUnique({ where: { id: workspaceId }, select: { plan: true } })
  const planCheck = await checkAgendaLimit(workspaceId, workspace?.plan ?? "free")
  if (!planCheck.allowed) throw new Error(planCheck.reason!)

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
}

export async function updateAgenda(
  id: string,
  data: { name?: string; color?: string; isActive?: boolean }
) {
  const workspaceId = await getWorkspaceId()

  const existing = await db.agenda.findFirst({
    where: { id, workspaceId },
  })
  if (!existing) throw new Error("Agenda nao encontrada")

  // Cannot deactivate default agenda
  if (existing.isDefault && data.isActive === false) {
    throw new Error("Nao e possivel desativar a agenda padrao")
  }

  const updated = await db.agenda.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  })

  return {
    id: updated.id,
    name: updated.name,
    color: updated.color,
    isDefault: updated.isDefault,
    isActive: updated.isActive,
  }
}

export async function deleteAgenda(id: string) {
  const workspaceId = await getWorkspaceId()

  const existing = await db.agenda.findFirst({
    where: { id, workspaceId },
    include: { _count: { select: { appointments: true, blockedSlots: true } } },
  })
  if (!existing) throw new Error("Agenda nao encontrada")

  if (existing.isDefault) {
    throw new Error("Nao e possivel excluir a agenda padrao")
  }

  if (existing._count.appointments > 0) {
    throw new Error(
      `Esta agenda possui ${existing._count.appointments} consulta(s). Mova as consultas para outra agenda antes de excluir.`
    )
  }

  await db.agenda.delete({ where: { id } })

  return { success: true }
}
