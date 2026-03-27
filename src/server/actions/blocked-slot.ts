"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"

async function getWorkspaceId() {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true },
  })
  if (!user?.workspace) throw new Error("Workspace not configured")

  return user.workspace.id
}

export interface BlockedSlotItem {
  id: string
  title: string
  startDate: string
  endDate: string
  allDay: boolean
  recurring: string | null
  isExpanded?: boolean // true if this is an expanded occurrence of a recurring slot
  agendaId: string
}

export async function getBlockedSlots(startDate: string, endDate: string, agendaIds?: string[]): Promise<BlockedSlotItem[]> {
  const workspaceId = await getWorkspaceId()
  const rangeStart = new Date(startDate)
  const rangeEnd = new Date(endDate)

  const baseWhere: any = { workspaceId }
  if (agendaIds && agendaIds.length > 0) {
    baseWhere.agendaId = { in: agendaIds }
  }

  // Fetch one-time slots that overlap with the range
  const oneTimeSlots = await db.blockedSlot.findMany({
    where: {
      ...baseWhere,
      recurring: null,
      startDate: { lte: rangeEnd },
      endDate: { gte: rangeStart },
    },
    orderBy: { startDate: "asc" },
  })

  // Fetch recurring weekly slots that started before the range end
  const recurringSlots = await db.blockedSlot.findMany({
    where: {
      ...baseWhere,
      recurring: "weekly",
      startDate: { lte: rangeEnd },
    },
    orderBy: { startDate: "asc" },
  })

  const results: BlockedSlotItem[] = oneTimeSlots.map((s) => ({
    id: s.id,
    title: s.title,
    startDate: s.startDate.toISOString(),
    endDate: s.endDate.toISOString(),
    allDay: s.allDay,
    recurring: s.recurring,
    agendaId: s.agendaId,
  }))

  // Expand recurring weekly slots into all occurrences within the range
  for (const slot of recurringSlots) {
    const slotStart = new Date(slot.startDate)
    const slotEnd = new Date(slot.endDate)
    const durationMs = slotEnd.getTime() - slotStart.getTime()

    // Find the first occurrence on or after rangeStart
    const diffMs = rangeStart.getTime() - slotStart.getTime()
    let weeksOffset = Math.max(0, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)))

    for (let i = 0; i < 200; i++) { // safety limit
      const occurrenceStart = new Date(slotStart.getTime() + (weeksOffset + i) * 7 * 24 * 60 * 60 * 1000)
      const occurrenceEnd = new Date(occurrenceStart.getTime() + durationMs)

      if (occurrenceStart.getTime() > rangeEnd.getTime()) break

      if (occurrenceEnd.getTime() >= rangeStart.getTime()) {
        results.push({
          id: slot.id,
          title: slot.title,
          startDate: occurrenceStart.toISOString(),
          endDate: occurrenceEnd.toISOString(),
          allDay: slot.allDay,
          recurring: slot.recurring,
          isExpanded: true,
          agendaId: slot.agendaId,
        })
      }
    }
  }

  return results.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
}

export async function createBlockedSlot(data: {
  title: string
  startDate: string
  endDate: string
  agendaId: string
  allDay?: boolean
  recurring?: string | null
}) {
  const workspaceId = await getWorkspaceId()

  if (!data.title.trim()) throw new Error("Titulo e obrigatorio")

  // Validate agenda belongs to workspace
  const agenda = await db.agenda.findFirst({
    where: { id: data.agendaId, workspaceId },
  })
  if (!agenda) throw new Error("Agenda nao encontrada")

  const startDate = new Date(data.startDate)
  const endDate = new Date(data.endDate)

  if (endDate <= startDate) throw new Error("Data final deve ser posterior a data inicial")

  const slot = await db.blockedSlot.create({
    data: {
      workspaceId,
      agendaId: data.agendaId,
      title: data.title.trim(),
      startDate,
      endDate,
      allDay: data.allDay ?? false,
      recurring: data.recurring || null,
    },
  })

  return {
    id: slot.id,
    title: slot.title,
    startDate: slot.startDate.toISOString(),
    endDate: slot.endDate.toISOString(),
    allDay: slot.allDay,
    recurring: slot.recurring,
    agendaId: slot.agendaId,
  }
}

export async function updateBlockedSlot(
  id: string,
  data: { title?: string; startDate?: string; endDate?: string; allDay?: boolean; recurring?: string | null }
) {
  const workspaceId = await getWorkspaceId()

  const existing = await db.blockedSlot.findFirst({
    where: { id, workspaceId },
  })
  if (!existing) throw new Error("Bloqueio nao encontrado")

  const updateData: any = {}
  if (data.title !== undefined) updateData.title = data.title.trim()
  if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate)
  if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate)
  if (data.allDay !== undefined) updateData.allDay = data.allDay
  if (data.recurring !== undefined) updateData.recurring = data.recurring || null

  const updated = await db.blockedSlot.update({
    where: { id },
    data: updateData,
  })

  return {
    id: updated.id,
    title: updated.title,
    startDate: updated.startDate.toISOString(),
    endDate: updated.endDate.toISOString(),
    allDay: updated.allDay,
    recurring: updated.recurring,
    agendaId: updated.agendaId,
  }
}

export async function deleteBlockedSlot(id: string) {
  const workspaceId = await getWorkspaceId()

  const existing = await db.blockedSlot.findFirst({
    where: { id, workspaceId },
  })
  if (!existing) throw new Error("Bloqueio nao encontrado")

  await db.blockedSlot.delete({ where: { id } })

  return { success: true }
}
