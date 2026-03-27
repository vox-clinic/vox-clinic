"use server"

import { db } from "@/lib/db"
import { getWorkspaceId } from "./_helpers"

interface BlockedSlotItem {
  id: string
  title: string
  startDate: string
  endDate: string
  allDay: boolean
  recurring: string | null
  isExpanded?: boolean
  agendaId: string
}

export async function getCalendarData(
  startDate: string,
  endDate: string,
  agendaIds?: string[]
) {
  const workspaceId = await getWorkspaceId()

  const agendaFilter: any = agendaIds && agendaIds.length > 0 ? { in: agendaIds } : undefined

  const [appointments, oneTimeSlots, recurringSlots, agendas] = await Promise.all([
    db.appointment.findMany({
      where: {
        workspaceId,
        date: { gte: new Date(startDate), lte: new Date(endDate) },
        ...(agendaFilter && { agendaId: agendaFilter }),
      },
      include: {
        patient: { select: { id: true, name: true } },
        agenda: { select: { id: true, name: true, color: true } },
      },
      orderBy: { date: "asc" },
    }),
    db.blockedSlot.findMany({
      where: {
        workspaceId,
        recurring: null,
        startDate: { lte: new Date(endDate) },
        endDate: { gte: new Date(startDate) },
        ...(agendaFilter && { agendaId: agendaFilter }),
      },
      orderBy: { startDate: "asc" },
    }),
    db.blockedSlot.findMany({
      where: {
        workspaceId,
        recurring: "weekly",
        startDate: { lte: new Date(endDate) },
        ...(agendaFilter && { agendaId: agendaFilter }),
      },
      orderBy: { startDate: "asc" },
    }),
    db.agenda.findMany({
      where: { workspaceId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      include: { _count: { select: { appointments: true } } },
    }),
  ])

  // Expand recurring weekly blocked slots
  const rangeStart = new Date(startDate)
  const rangeEnd = new Date(endDate)
  const blockedSlots: BlockedSlotItem[] = oneTimeSlots.map((s) => ({
    id: s.id,
    title: s.title,
    startDate: s.startDate.toISOString(),
    endDate: s.endDate.toISOString(),
    allDay: s.allDay,
    recurring: s.recurring,
    agendaId: s.agendaId,
  }))

  for (const slot of recurringSlots) {
    const slotStart = new Date(slot.startDate)
    const slotEnd = new Date(slot.endDate)
    const durationMs = slotEnd.getTime() - slotStart.getTime()
    const diffMs = rangeStart.getTime() - slotStart.getTime()
    const weeksOffset = Math.max(0, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)))

    for (let i = 0; i < 200; i++) {
      const occStart = new Date(slotStart.getTime() + (weeksOffset + i) * 7 * 24 * 60 * 60 * 1000)
      const occEnd = new Date(occStart.getTime() + durationMs)
      if (occStart.getTime() > rangeEnd.getTime()) break
      if (occEnd.getTime() >= rangeStart.getTime()) {
        blockedSlots.push({
          id: slot.id,
          title: slot.title,
          startDate: occStart.toISOString(),
          endDate: occEnd.toISOString(),
          allDay: slot.allDay,
          recurring: slot.recurring,
          isExpanded: true,
          agendaId: slot.agendaId,
        })
      }
    }
  }

  blockedSlots.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())

  return {
    appointments: appointments.map((a) => ({
      id: a.id,
      date: a.date.toISOString(),
      patient: a.patient,
      procedures: a.procedures as string[],
      notes: a.notes,
      status: a.status,
      agendaId: a.agendaId,
      agenda: a.agenda,
    })),
    blockedSlots,
    agendas: agendas.map((a) => ({
      id: a.id,
      name: a.name,
      color: a.color,
      isDefault: a.isDefault,
      isActive: a.isActive,
      appointmentCount: a._count.appointments,
    })),
  }
}
