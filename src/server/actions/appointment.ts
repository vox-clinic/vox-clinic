"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { logAudit } from "@/lib/audit"
import { revalidateTag } from "next/cache"
import { checkAppointmentLimit } from "@/lib/plan-enforcement"
import { getWorkspaceIdCached } from "@/lib/workspace-cache"
import { invalidate } from "@/lib/cache"
import { ERR_UNAUTHORIZED, ERR_WORKSPACE_NOT_CONFIGURED, ERR_APPOINTMENT_NOT_FOUND, ERR_PATIENT_NOT_FOUND, ActionError, safeAction } from "@/lib/error-messages"
import { requirePermission, type WorkspaceRole } from "@/lib/permissions"
import { requireWorkspaceRole } from "@/lib/auth-context"

async function getWorkspaceId() {
  const { userId } = await auth()
  if (!userId) throw new Error(ERR_UNAUTHORIZED)

  const cached = await getWorkspaceIdCached(userId)
  if (!cached) throw new Error(ERR_WORKSPACE_NOT_CONFIGURED)

  return cached
}

/** Resolve the current user's role (used for permission checks on mutations). */
async function getRole(): Promise<WorkspaceRole> {
  const ctx = await requireWorkspaceRole()
  return ctx.role
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
      procedures: (Array.isArray(a.procedures) ? a.procedures : []).map((p: unknown) => typeof p === "string" ? p : (p as any)?.name ?? String(p)),
      notes: a.notes,
      aiSummary: a.aiSummary,
      status: a.status,
      cidCodes: (Array.isArray(a.cidCodes) ? a.cidCodes : []) as { code: string; description: string }[],
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
    procedures: (Array.isArray(a.procedures) ? a.procedures : []).map((p: unknown) => typeof p === "string" ? p : (p as any)?.name ?? String(p)),
    notes: a.notes,
    status: a.status,
    type: a.type,
    source: a.source,
    agendaId: a.agendaId,
    agenda: a.agenda,
    cidCodes: (Array.isArray(a.cidCodes) ? a.cidCodes : []) as { code: string; description: string }[],
  }))
}

export async function checkAppointmentConflicts(date: string, agendaId?: string, patientId?: string) {
  const workspaceId = await getWorkspaceId()
  const targetDate = new Date(date)

  // Use agenda's conflict window if available, otherwise default 30 min
  let conflictMinutes = 30
  if (agendaId) {
    const agendaConfig = await db.agenda.findFirst({
      where: { id: agendaId, workspaceId },
      select: { conflictWindow: true },
    })
    if (agendaConfig) conflictMinutes = agendaConfig.conflictWindow
  }
  const windowMs = conflictMinutes * 60 * 1000
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

  // Cross-agenda: check if same patient has overlapping appointment in ANY agenda
  let patientCrossAgendaConflicts: Array<{
    id: string
    date: string
    agendaName: string
    agendaColor: string | null
  }> = []

  if (patientId) {
    const patientConflicts = await db.appointment.findMany({
      where: {
        workspaceId,
        patientId,
        status: { in: ["scheduled", "completed"] },
        date: { gte: windowStart, lte: windowEnd },
        // Exclude appointments in the same agenda (already covered above)
        ...(agendaId ? { agendaId: { not: agendaId } } : {}),
      },
      include: { agenda: { select: { name: true, color: true } } },
      orderBy: { date: "asc" },
    })

    patientCrossAgendaConflicts = patientConflicts.map((a) => ({
      id: a.id,
      date: a.date.toISOString(),
      agendaName: a.agenda?.name ?? "Agenda removida",
      agendaColor: a.agenda?.color ?? null,
    }))
  }

  return {
    appointments: appointmentConflicts.map((a) => ({
      id: a.id,
      date: a.date.toISOString(),
      patient: a.patient,
      status: a.status,
    })),
    blockedSlots: blockedConflicts,
    patientCrossAgendaConflicts,
  }
}

export const scheduleAppointment = safeAction(async (data: {
  patientId: string
  date: string
  agendaId: string
  notes?: string
  procedures?: string[]
  forceSchedule?: boolean
  type?: "presencial" | "teleconsulta"
  price?: number
}) => {
  const { userId } = await auth()
  if (!userId) throw new ActionError(ERR_UNAUTHORIZED)
  const workspaceId = await getWorkspaceIdCached(userId)
  if (!workspaceId) throw new ActionError(ERR_WORKSPACE_NOT_CONFIGURED)
  requirePermission(await getRole(), "appointments.create")

  // Validate agenda belongs to workspace
  const agenda = await db.agenda.findFirst({
    where: { id: data.agendaId, workspaceId },
  })
  if (!agenda) throw new ActionError("Agenda não encontrada")

  // Verify patient belongs to workspace
  const patient = await db.patient.findFirst({
    where: { id: data.patientId, workspaceId },
  })
  if (!patient) throw new ActionError(ERR_PATIENT_NOT_FOUND)

  const targetDate = new Date(data.date)

  // Atomic conflict check + plan limit check + create to prevent double-booking and race on limits
  const appointment = await db.$transaction(async (tx) => {
    // Advisory lock on agendaId + 30-min bucket to serialize scheduling
    const thirtyMinBucket = Math.floor(targetDate.getTime() / (30 * 60 * 1000))
    const hourKey = `${data.agendaId}-${thirtyMinBucket}`
    const lockId = hashStringToInt(hourKey)
    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock($1)`, lockId)

    // Plan enforcement inside transaction (after lock) to prevent concurrent requests bypassing limits
    const workspace = await tx.workspace.findUnique({ where: { id: workspaceId }, select: { plan: true } })
    const planCheck = await checkAppointmentLimit(workspaceId, workspace?.plan ?? "free", tx)
    if (!planCheck.allowed) throw new ActionError(planCheck.reason!)

    if (!data.forceSchedule) {
      const windowMs = (agenda.conflictWindow ?? 30) * 60 * 1000
      const bufferBeforeMs = (agenda.bufferBefore ?? 0) * 60 * 1000
      const bufferAfterMs = (agenda.bufferAfter ?? 0) * 60 * 1000
      const windowStart = new Date(targetDate.getTime() - windowMs - bufferBeforeMs)
      const windowEnd = new Date(targetDate.getTime() + windowMs + bufferAfterMs)

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
        throw new ActionError(
          `CONFLICT:Já existe consulta próxima a este horário (${names}). Deseja agendar mesmo assim?`
        )
      }

      // Cross-agenda: check if same patient has overlapping appointment in ANY other agenda
      const patientConflicts = await tx.appointment.findMany({
        where: {
          workspaceId,
          patientId: data.patientId,
          agendaId: { not: data.agendaId },
          status: { in: ["scheduled", "completed"] },
          date: { gte: windowStart, lte: windowEnd },
        },
        include: { agenda: { select: { name: true } } },
      })

      if (patientConflicts.length > 0) {
        const details = patientConflicts.map((c) => {
          const time = c.date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
          return `${c.agenda?.name ?? "outra agenda"} às ${time}`
        }).join(", ")
        throw new ActionError(
          `CONFLICT:Paciente já agendado: ${details}. Deseja agendar mesmo assim?`
        )
      }

      // Check blocked slots (one-time + recurring weekly)
      const blockedConflict = await findBlockedSlotConflict(tx, workspaceId, data.agendaId, targetDate, agenda.slotDuration ?? 30)
      if (blockedConflict) {
        throw new ActionError(
          `CONFLICT:Horário bloqueado: ${blockedConflict}. Deseja agendar mesmo assim?`
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
        type: data.type || null,
        price: data.price ?? null,
      },
      include: {
        patient: {
          select: { id: true, name: true },
        },
      },
    })
  })

  await logAudit({
    workspaceId,
    userId,
    action: "appointment.scheduled",
    entityType: "Appointment",
    entityId: appointment.id,
  })

  revalidateTag("dashboard", "max")
  await invalidate(`ws:dashboard:${workspaceId}`)

  return {
    id: appointment.id,
    date: appointment.date.toISOString(),
    patient: appointment.patient,
    procedures: appointment.procedures as string[],
    notes: appointment.notes,
    status: appointment.status,
    agendaId: appointment.agendaId,
  }
})

/**
 * Check if an appointment time conflicts with any blocked slot (one-time or recurring weekly).
 * Returns the blocked slot title if conflict found, null otherwise.
 */
async function findBlockedSlotConflict(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  workspaceId: string,
  agendaId: string,
  appointmentDate: Date,
  durationMinutes: number,
): Promise<string | null> {
  const appointmentStart = appointmentDate.getTime()
  const appointmentEnd = appointmentStart + durationMinutes * 60 * 1000

  // Fetch all blocked slots for this agenda (both one-time and recurring)
  const blockedSlots = await tx.blockedSlot.findMany({
    where: { agendaId, workspaceId },
  })

  for (const slot of blockedSlots) {
    const slotStart = new Date(slot.startDate)
    const slotEnd = new Date(slot.endDate)

    if (slot.recurring === "weekly") {
      // For recurring weekly slots, check if the appointment falls on the same day-of-week
      // and the time ranges overlap
      const slotDayOfWeek = slotStart.getUTCDay()
      const appointmentDayOfWeek = appointmentDate.getUTCDay()

      if (slotDayOfWeek !== appointmentDayOfWeek) continue

      if (slot.allDay) {
        return slot.title
      }

      // Compare time-of-day only (use UTC to avoid timezone issues)
      const slotStartMinutes = slotStart.getUTCHours() * 60 + slotStart.getUTCMinutes()
      const slotEndMinutes = slotEnd.getUTCHours() * 60 + slotEnd.getUTCMinutes()
      const apptStartMinutes = appointmentDate.getUTCHours() * 60 + appointmentDate.getUTCMinutes()
      const apptEndMinutes = apptStartMinutes + durationMinutes

      // Overlap check: ranges overlap if one starts before the other ends
      if (apptStartMinutes < slotEndMinutes && apptEndMinutes > slotStartMinutes) {
        return slot.title
      }
    } else {
      // One-time slot: direct date overlap check
      if (slot.allDay) {
        // allDay slot blocks the entire day — check if same calendar day (UTC)
        const slotDate = slotStart.toISOString().slice(0, 10)
        const apptDate = appointmentDate.toISOString().slice(0, 10)
        if (slotDate === apptDate) {
          return slot.title
        }
        // Also check if appointment spans into the blocked day
        const apptEndDate = new Date(appointmentEnd).toISOString().slice(0, 10)
        if (apptEndDate === slotDate) {
          return slot.title
        }
      } else {
        if (appointmentStart < slotEnd.getTime() && appointmentEnd > slotStart.getTime()) {
          return slot.title
        }
      }
    }
  }

  return null
}

function hashStringToInt(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0
  }
  return hash
}

export const updateAppointmentStatus = safeAction(async (appointmentId: string, status: string) => {
  const { userId } = await auth()
  if (!userId) throw new ActionError(ERR_UNAUTHORIZED)
  const workspaceId = await getWorkspaceIdCached(userId)
  if (!workspaceId) throw new ActionError(ERR_WORKSPACE_NOT_CONFIGURED)
  requirePermission(await getRole(), "appointments.edit")

  const validStatuses = ["scheduled", "completed", "cancelled", "no_show"]
  if (!validStatuses.includes(status)) {
    throw new ActionError("Status inválido")
  }

  const existing = await db.appointment.findFirst({
    where: { id: appointmentId, workspaceId },
  })
  if (!existing) throw new ActionError(ERR_APPOINTMENT_NOT_FOUND)

  const updated = await db.appointment.update({
    where: { id: appointmentId },
    data: { status },
  })

  await logAudit({
    workspaceId,
    userId,
    action: `appointment.${status}`,
    entityType: "Appointment",
    entityId: appointmentId,
  })

  // Waitlist hook: when appointment is cancelled, find matching waitlist entries and notify staff
  let waitlistMatches = 0
  if (status === "cancelled" && existing.agendaId) {
    try {
      const { findMatchesForSlot } = await import("@/server/actions/waitlist")
      const matches = await findMatchesForSlot(workspaceId, existing.date, existing.agendaId)
      waitlistMatches = matches.length
      if (matches.length > 0) {
        const timeStr = existing.date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        const dateStr = existing.date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
        await db.notification.create({
          data: {
            workspaceId,
            userId,
            type: "waitlist_match",
            title: "Lista de espera: horario disponivel",
            body: `Horario disponivel: ${dateStr} as ${timeStr}. ${matches.length} paciente${matches.length > 1 ? "s" : ""} na lista de espera.`,
            entityType: "Appointment",
            entityId: appointmentId,
          },
        })
      }
    } catch {
      // Non-critical: don't fail the status update if waitlist check fails
    }
  }

  // Auto-calculate commissions when appointment is completed with a price
  if (status === "completed" && updated.price && updated.price > 0) {
    try {
      const { calculateCommissions } = await import("./commission")
      await calculateCommissions(appointmentId)
    } catch (err) {
      // Commission calculation failure should not block status update
      console.error("[updateAppointmentStatus] Commission calculation failed:", err)
    }
  }

  revalidateTag("dashboard", "max")
  await invalidate(`ws:dashboard:${workspaceId}`)

  return { id: updated.id, status: updated.status, waitlistMatches }
})

export const rescheduleAppointment = safeAction(async (appointmentId: string, newDate: string, forceSchedule = false) => {
  const { userId } = await auth()
  if (!userId) throw new ActionError(ERR_UNAUTHORIZED)
  const workspaceId = await getWorkspaceIdCached(userId)
  if (!workspaceId) throw new ActionError(ERR_WORKSPACE_NOT_CONFIGURED)
  requirePermission(await getRole(), "appointments.edit")

  const existing = await db.appointment.findFirst({
    where: { id: appointmentId, workspaceId },
  })
  if (!existing) throw new ActionError(ERR_APPOINTMENT_NOT_FOUND)

  // Fetch agenda config for conflict rules
  const agenda = await db.agenda.findFirst({
    where: { id: existing.agendaId, workspaceId },
    select: { conflictWindow: true, bufferBefore: true, bufferAfter: true, slotDuration: true },
  })

  const targetDate = new Date(newDate)

  // Conflict check with advisory lock (same pattern as scheduleAppointment)
  const updated = await db.$transaction(async (tx) => {
    const thirtyMinBucket = Math.floor(targetDate.getTime() / (30 * 60 * 1000))
    const hourKey = `${existing.agendaId}-${thirtyMinBucket}`
    const lockId = hashStringToInt(hourKey)
    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock($1)`, lockId)

    if (!forceSchedule) {
      const windowMs = (agenda?.conflictWindow ?? 30) * 60 * 1000
      const bufferBeforeMs = (agenda?.bufferBefore ?? 0) * 60 * 1000
      const bufferAfterMs = (agenda?.bufferAfter ?? 0) * 60 * 1000
      const windowStart = new Date(targetDate.getTime() - windowMs - bufferBeforeMs)
      const windowEnd = new Date(targetDate.getTime() + windowMs + bufferAfterMs)

      const conflicts = await tx.appointment.findMany({
        where: {
          workspaceId,
          agendaId: existing.agendaId,
          id: { not: appointmentId },
          status: { in: ["scheduled", "completed"] },
          date: { gte: windowStart, lte: windowEnd },
        },
        include: {
          patient: { select: { id: true, name: true } },
        },
      })

      if (conflicts.length > 0) {
        const names = conflicts.map((c) => c.patient.name).join(", ")
        throw new ActionError(`CONFLICT:Já existe consulta próxima a este horário (${names}). Deseja reagendar mesmo assim?`)
      }

      // Cross-agenda: check if same patient has overlapping appointment in ANY other agenda
      if (existing.patientId) {
        const patientConflicts = await tx.appointment.findMany({
          where: {
            workspaceId,
            patientId: existing.patientId,
            agendaId: { not: existing.agendaId! },
            id: { not: appointmentId },
            status: { in: ["scheduled", "completed"] },
            date: { gte: windowStart, lte: windowEnd },
          },
          include: { agenda: { select: { name: true } } },
        })

        if (patientConflicts.length > 0) {
          const details = patientConflicts.map((c) => {
            const time = c.date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
            return `${c.agenda?.name ?? "outra agenda"} às ${time}`
          }).join(", ")
          throw new ActionError(
            `CONFLICT:Paciente já agendado: ${details}. Deseja reagendar mesmo assim?`
          )
        }
      }

      // Check blocked slots (one-time + recurring weekly)
      const blockedConflict = await findBlockedSlotConflict(tx, workspaceId, existing.agendaId!, targetDate, agenda?.slotDuration ?? 30)
      if (blockedConflict) {
        throw new ActionError(
          `CONFLICT:Horário bloqueado: ${blockedConflict}. Deseja reagendar mesmo assim?`
        )
      }
    }

    return tx.appointment.update({
      where: { id: appointmentId },
      data: { date: targetDate },
    })
  })

  await logAudit({
    workspaceId,
    userId,
    action: "appointment.rescheduled",
    entityType: "Appointment",
    entityId: appointmentId,
  })

  return { id: updated.id, date: updated.date.toISOString() }
})

export const deleteAppointment = safeAction(async (appointmentId: string) => {
  const { userId } = await auth()
  if (!userId) throw new ActionError(ERR_UNAUTHORIZED)
  const workspaceId = await getWorkspaceIdCached(userId)
  if (!workspaceId) throw new ActionError(ERR_WORKSPACE_NOT_CONFIGURED)
  requirePermission(await getRole(), "appointments.edit")

  const existing = await db.appointment.findFirst({
    where: { id: appointmentId, workspaceId },
  })
  if (!existing) throw new ActionError(ERR_APPOINTMENT_NOT_FOUND)

  await db.appointment.delete({
    where: { id: appointmentId },
  })

  await logAudit({
    workspaceId,
    userId,
    action: "appointment.deleted",
    entityType: "Appointment",
    entityId: appointmentId,
  })

  revalidateTag("dashboard", "max")
  await invalidate(`ws:dashboard:${workspaceId}`)

  return { success: true }
})

export const scheduleRecurringAppointments = safeAction(async (data: {
  patientId: string
  startDate: string
  agendaId: string
  notes?: string
  procedures?: string[]
  recurrence: "weekly" | "biweekly"
  occurrences: number
  forceSchedule?: boolean
}) => {
  const workspaceId = await getWorkspaceId()
  requirePermission(await getRole(), "appointments.create")

  if (data.occurrences < 2 || data.occurrences > 52) {
    throw new ActionError("Número de ocorrências deve ser entre 2 e 52")
  }

  // Verify patient belongs to workspace
  const patient = await db.patient.findFirst({
    where: { id: data.patientId, workspaceId },
  })
  if (!patient) throw new ActionError(ERR_PATIENT_NOT_FOUND)

  // Fetch agenda config for conflict rules
  const agendaConfig = await db.agenda.findFirst({
    where: { id: data.agendaId, workspaceId },
    select: { conflictWindow: true, bufferBefore: true, bufferAfter: true, slotDuration: true },
  })

  const intervalDays = data.recurrence === "weekly" ? 7 : 14
  const baseDate = new Date(data.startDate)

  const dates: Date[] = []
  for (let i = 0; i < data.occurrences; i++) {
    const d = new Date(baseDate.getTime() + i * intervalDays * 24 * 60 * 60 * 1000)
    dates.push(d)
  }

  const conflictWindowMin = agendaConfig?.conflictWindow ?? 30
  const slotDuration = agendaConfig?.slotDuration ?? 30

  // Interactive transaction with advisory locks to prevent double-booking
  const appointments = await db.$transaction(async (tx) => {
    const results = []
    for (const date of dates) {
      // Advisory lock per agenda+30min bucket (same pattern as scheduleAppointment)
      const thirtyMinBucket = Math.floor(date.getTime() / (30 * 60 * 1000))
      const hourKey = `${data.agendaId}-${thirtyMinBucket}`
      const lockId = hashStringToInt(hourKey)
      await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock($1)`, lockId)

      const windowMs = conflictWindowMin * 60 * 1000
      const conflicts = await tx.appointment.findMany({
        where: {
          workspaceId,
          agendaId: data.agendaId,
          status: { in: ["scheduled", "completed"] },
          date: { gte: new Date(date.getTime() - windowMs), lte: new Date(date.getTime() + windowMs) },
        },
      })
      if (conflicts.length > 0 && !data.forceSchedule) {
        throw new ActionError(`CONFLICT:Conflito no horário ${date.toLocaleDateString("pt-BR")} ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`)
      }

      // Check blocked slots (one-time + recurring weekly)
      if (!data.forceSchedule) {
        const blockedConflict = await findBlockedSlotConflict(tx, workspaceId, data.agendaId, date, slotDuration)
        if (blockedConflict) {
          throw new ActionError(`CONFLICT:Horário bloqueado em ${date.toLocaleDateString("pt-BR")}: ${blockedConflict}`)
        }
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

  return {
    appointments: appointments.map((a) => ({
      id: a.id,
      date: a.date.toISOString(),
      patient: a.patient,
      procedures: (Array.isArray(a.procedures) ? a.procedures : []).map((p: unknown) => typeof p === "string" ? p : (p as any)?.name ?? String(p)),
      notes: a.notes,
      status: a.status,
      agendaId: a.agendaId,
    })),
  }
})
