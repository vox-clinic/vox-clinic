"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { logAudit } from "@/lib/audit"

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

export async function getAppointments(page: number = 1, status?: string) {
  const workspaceId = await getWorkspaceId()
  const pageSize = 20
  const skip = (page - 1) * pageSize

  const where: { workspaceId: string; status?: string } = { workspaceId }
  if (status && status !== "all") {
    where.status = status
  }

  const [appointments, total] = await Promise.all([
    db.appointment.findMany({
      where,
      include: {
        patient: {
          select: { id: true, name: true },
        },
      },
      orderBy: { date: "desc" },
      skip,
      take: pageSize,
    }),
    db.appointment.count({ where }),
  ])

  return {
    appointments: appointments.map((a) => ({
      id: a.id,
      date: a.date.toISOString(),
      patient: a.patient,
      procedures: a.procedures as string[],
      notes: a.notes,
      aiSummary: a.aiSummary,
      status: a.status,
    })),
    total,
    totalPages: Math.ceil(total / pageSize),
    page,
  }
}

export async function getAppointmentsByDateRange(startDate: string, endDate: string, agendaIds?: string[]) {
  const workspaceId = await getWorkspaceId()

  const where: any = {
    workspaceId,
    date: {
      gte: new Date(startDate),
      lte: new Date(endDate),
    },
  }
  if (agendaIds && agendaIds.length > 0) {
    where.agendaId = { in: agendaIds }
  }

  const appointments = await db.appointment.findMany({
    where,
    include: {
      patient: {
        select: {
          id: true,
          name: true,
        },
      },
      agenda: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
    },
    orderBy: { date: "asc" },
  })

  return appointments.map((a) => ({
    id: a.id,
    date: a.date.toISOString(),
    patient: a.patient,
    procedures: a.procedures as string[],
    notes: a.notes,
    status: a.status,
    agendaId: a.agendaId,
    agenda: a.agenda,
  }))
}

export async function checkAppointmentConflicts(date: string, agendaId?: string) {
  const workspaceId = await getWorkspaceId()
  const targetDate = new Date(date)

  // Check for appointments within ±30 minutes
  const windowMs = 30 * 60 * 1000
  const windowStart = new Date(targetDate.getTime() - windowMs)
  const windowEnd = new Date(targetDate.getTime() + windowMs)

  const appointmentWhere: any = {
    workspaceId,
    status: { in: ["scheduled", "completed"] },
    date: { gte: windowStart, lte: windowEnd },
  }
  if (agendaId) appointmentWhere.agendaId = agendaId

  const blockedSlotWhere: any = {
    workspaceId,
    startDate: { lte: windowEnd },
    endDate: { gte: windowStart },
  }
  if (agendaId) blockedSlotWhere.agendaId = agendaId

  const recurringWhere: any = {
    workspaceId,
    recurring: "weekly",
    startDate: { lte: windowEnd },
  }
  if (agendaId) recurringWhere.agendaId = agendaId

  const [appointmentConflicts, blockedSlots] = await Promise.all([
    db.appointment.findMany({
      where: appointmentWhere,
      include: {
        patient: { select: { id: true, name: true } },
      },
      orderBy: { date: "asc" },
    }),
    // Check blocked slots that overlap with the target time
    db.blockedSlot.findMany({
      where: blockedSlotWhere,
    }),
  ])

  // Also check recurring weekly blocked slots
  const recurringSlots = await db.blockedSlot.findMany({
    where: recurringWhere,
  })

  const blockedConflicts: Array<{ id: string; title: string; startDate: string; endDate: string; type: "blocked" }> = []

  // One-time blocked slots
  for (const slot of blockedSlots) {
    if (!slot.recurring) {
      blockedConflicts.push({
        id: slot.id,
        title: slot.title,
        startDate: slot.startDate.toISOString(),
        endDate: slot.endDate.toISOString(),
        type: "blocked",
      })
    }
  }

  // Expand recurring weekly slots to check if any occurrence overlaps
  for (const slot of recurringSlots) {
    const slotStart = new Date(slot.startDate)
    const slotEnd = new Date(slot.endDate)
    const durationMs = slotEnd.getTime() - slotStart.getTime()

    const diffMs = windowStart.getTime() - slotStart.getTime()
    const weeksOffset = Math.max(0, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)))

    for (let i = 0; i < 3; i++) {
      const occStart = new Date(slotStart.getTime() + (weeksOffset + i) * 7 * 24 * 60 * 60 * 1000)
      const occEnd = new Date(occStart.getTime() + durationMs)
      if (occStart.getTime() > windowEnd.getTime()) break
      if (occEnd.getTime() >= windowStart.getTime() && occStart.getTime() <= windowEnd.getTime()) {
        blockedConflicts.push({
          id: slot.id,
          title: slot.title,
          startDate: occStart.toISOString(),
          endDate: occEnd.toISOString(),
          type: "blocked",
        })
        break
      }
    }
  }

  return {
    appointments: appointmentConflicts.map((a) => ({
      id: a.id,
      date: a.date.toISOString(),
      patient: a.patient,
      status: a.status,
    })),
    blockedSlots: blockedConflicts,
  }
}

export async function scheduleAppointment(data: {
  patientId: string
  date: string
  agendaId: string
  notes?: string
  procedures?: string[]
  forceSchedule?: boolean
}) {
  const workspaceId = await getWorkspaceId()

  // Validate agenda belongs to workspace
  const agenda = await db.agenda.findFirst({
    where: { id: data.agendaId, workspaceId },
  })
  if (!agenda) throw new Error("Agenda nao encontrada")

  // Verify patient belongs to workspace
  const patient = await db.patient.findFirst({
    where: { id: data.patientId, workspaceId },
  })
  if (!patient) throw new Error("Paciente nao encontrado")

  const targetDate = new Date(data.date)

  // Atomic conflict check + create to prevent double-booking
  const appointment = await db.$transaction(async (tx) => {
    // Advisory lock on agendaId + hour window to serialize scheduling
    const hourKey = `${data.agendaId}-${targetDate.toISOString().slice(0, 13)}`
    const lockId = hashStringToInt(hourKey)
    await tx.$queryRawUnsafe(`SELECT pg_advisory_xact_lock($1)`, lockId)

    if (!data.forceSchedule) {
      const windowMs = 30 * 60 * 1000
      const windowStart = new Date(targetDate.getTime() - windowMs)
      const windowEnd = new Date(targetDate.getTime() + windowMs)

      const conflicts = await tx.appointment.findMany({
        where: {
          workspaceId,
          agendaId: data.agendaId,
          status: { in: ["scheduled", "completed"] },
          date: { gte: windowStart, lte: windowEnd },
        },
        include: {
          patient: { select: { id: true, name: true } },
        },
      })

      if (conflicts.length > 0) {
        const names = conflicts.map((c) => c.patient.name).join(", ")
        throw new Error(
          `CONFLICT:Ja existe consulta proxima a este horario (${names}). Deseja agendar mesmo assim?`
        )
      }
    }

    return tx.appointment.create({
      data: {
        workspaceId,
        agendaId: data.agendaId,
        patientId: data.patientId,
        date: targetDate,
        notes: data.notes || null,
        procedures: data.procedures || [],
        status: "scheduled",
      },
      include: {
        patient: {
          select: { id: true, name: true },
        },
      },
    })
  })

  const { userId } = await auth()
  await logAudit({
    workspaceId,
    userId: userId!,
    action: "appointment.scheduled",
    entityType: "Appointment",
    entityId: appointment.id,
  })

  return {
    id: appointment.id,
    date: appointment.date.toISOString(),
    patient: appointment.patient,
    procedures: appointment.procedures as string[],
    notes: appointment.notes,
    status: appointment.status,
    agendaId: appointment.agendaId,
  }
}

function hashStringToInt(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0
  }
  return hash
}

export async function updateAppointmentStatus(appointmentId: string, status: string) {
  const workspaceId = await getWorkspaceId()

  const validStatuses = ["scheduled", "completed", "cancelled", "no_show"]
  if (!validStatuses.includes(status)) {
    throw new Error("Status invalido")
  }

  const existing = await db.appointment.findFirst({
    where: { id: appointmentId, workspaceId },
  })
  if (!existing) throw new Error("Consulta nao encontrada")

  const updated = await db.appointment.update({
    where: { id: appointmentId },
    data: { status },
  })

  const { userId } = await auth()
  await logAudit({
    workspaceId,
    userId: userId!,
    action: `appointment.${status}`,
    entityType: "Appointment",
    entityId: appointmentId,
  })

  return { id: updated.id, status: updated.status }
}

export async function rescheduleAppointment(appointmentId: string, newDate: string) {
  const workspaceId = await getWorkspaceId()

  const existing = await db.appointment.findFirst({
    where: { id: appointmentId, workspaceId },
  })
  if (!existing) throw new Error("Consulta nao encontrada")

  const targetDate = new Date(newDate)

  // Conflict check with advisory lock (same pattern as scheduleAppointment)
  const updated = await db.$transaction(async (tx) => {
    const hourKey = `${existing.agendaId}-${targetDate.toISOString().slice(0, 13)}`
    const lockId = hashStringToInt(hourKey)
    await tx.$queryRawUnsafe(`SELECT pg_advisory_xact_lock($1)`, lockId)

    const windowMs = 30 * 60 * 1000
    const windowStart = new Date(targetDate.getTime() - windowMs)
    const windowEnd = new Date(targetDate.getTime() + windowMs)

    const conflicts = await tx.appointment.findMany({
      where: {
        workspaceId,
        agendaId: existing.agendaId,
        id: { not: appointmentId },
        status: { in: ["scheduled", "completed"] },
        date: { gte: windowStart, lte: windowEnd },
      },
      include: { patient: { select: { name: true } } },
    })

    if (conflicts.length > 0) {
      const names = conflicts.map((c) => c.patient.name).join(", ")
      throw new Error(`CONFLICT:Ja existe consulta proxima a este horario (${names}).`)
    }

    return tx.appointment.update({
      where: { id: appointmentId },
      data: { date: targetDate },
    })
  })

  const { userId } = await auth()
  await logAudit({
    workspaceId,
    userId: userId!,
    action: "appointment.rescheduled",
    entityType: "Appointment",
    entityId: appointmentId,
  })

  return { id: updated.id, date: updated.date.toISOString() }
}

export async function deleteAppointment(appointmentId: string) {
  const workspaceId = await getWorkspaceId()

  const existing = await db.appointment.findFirst({
    where: { id: appointmentId, workspaceId },
  })
  if (!existing) throw new Error("Consulta nao encontrada")

  await db.appointment.delete({
    where: { id: appointmentId },
  })

  const { userId } = await auth()
  await logAudit({
    workspaceId,
    userId: userId!,
    action: "appointment.deleted",
    entityType: "Appointment",
    entityId: appointmentId,
  })

  return { success: true }
}

export async function scheduleRecurringAppointments(data: {
  patientId: string
  startDate: string
  agendaId: string
  notes?: string
  procedures?: string[]
  recurrence: "weekly" | "biweekly"
  occurrences: number
}) {
  const workspaceId = await getWorkspaceId()

  if (data.occurrences < 2 || data.occurrences > 52) {
    throw new Error("Numero de ocorrencias deve ser entre 2 e 52")
  }

  // Verify patient belongs to workspace
  const patient = await db.patient.findFirst({
    where: { id: data.patientId, workspaceId },
  })
  if (!patient) throw new Error("Paciente nao encontrado")

  const intervalDays = data.recurrence === "weekly" ? 7 : 14
  const baseDate = new Date(data.startDate)

  const dates: Date[] = []
  for (let i = 0; i < data.occurrences; i++) {
    const d = new Date(baseDate.getTime() + i * intervalDays * 24 * 60 * 60 * 1000)
    dates.push(d)
  }

  // Interactive transaction with advisory locks to prevent double-booking
  const appointments = await db.$transaction(async (tx) => {
    const results = []
    for (const date of dates) {
      // Advisory lock per agenda+hour (same pattern as scheduleAppointment)
      const hourKey = `${data.agendaId}-${date.toISOString().slice(0, 13)}`
      const lockId = hashStringToInt(hourKey)
      await tx.$queryRawUnsafe(`SELECT pg_advisory_xact_lock($1)`, lockId)

      const windowMs = 30 * 60 * 1000
      const conflicts = await tx.appointment.findMany({
        where: {
          workspaceId,
          agendaId: data.agendaId,
          status: { in: ["scheduled", "completed"] },
          date: { gte: new Date(date.getTime() - windowMs), lte: new Date(date.getTime() + windowMs) },
        },
      })
      if (conflicts.length > 0) {
        throw new Error(`CONFLICT:Conflito no horario ${date.toLocaleDateString("pt-BR")} ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`)
      }

      results.push(await tx.appointment.create({
        data: {
          workspaceId,
          agendaId: data.agendaId,
          patientId: data.patientId,
          date,
          notes: data.notes || null,
          procedures: data.procedures || [],
          status: "scheduled",
        },
        include: {
          patient: { select: { id: true, name: true } },
        },
      }))
    }
    return results
  })

  return appointments.map((a) => ({
    id: a.id,
    date: a.date.toISOString(),
    patient: a.patient,
    procedures: a.procedures as string[],
    notes: a.notes,
    status: a.status,
    agendaId: a.agendaId,
  }))
}
