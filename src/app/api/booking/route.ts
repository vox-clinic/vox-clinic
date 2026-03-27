import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAvailableSlots } from "@/lib/booking-availability"

// GET /api/booking?token=abc123 — Validate token + return workspace booking config
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")
  if (!token) {
    return NextResponse.json({ error: "Token obrigatorio" }, { status: 400 })
  }

  const config = await db.bookingConfig.findUnique({
    where: { token },
    include: {
      workspace: {
        select: {
          id: true,
          professionType: true,
          procedures: true,
          agendas: {
            where: { isActive: true },
            select: { id: true, name: true, color: true },
          },
          user: {
            select: { clinicName: true },
          },
        },
      },
    },
  })

  if (!config || !config.isActive) {
    return NextResponse.json({ error: "Agendamento online nao disponivel" }, { status: 404 })
  }

  // Filter procedures if allowedProcedureIds is set
  let procedures = config.workspace.procedures as any[]
  if (config.allowedProcedureIds.length > 0) {
    procedures = procedures.filter((p: any) => config.allowedProcedureIds.includes(p.id))
  }

  // Filter agendas if allowedAgendaIds is set
  let agendas = config.workspace.agendas
  if (config.allowedAgendaIds.length > 0) {
    agendas = agendas.filter((a) => config.allowedAgendaIds.includes(a.id))
  }

  return NextResponse.json({
    clinicName: config.workspace.user.clinicName || "Clinica",
    professionType: config.workspace.professionType,
    welcomeMessage: config.welcomeMessage,
    maxDaysAhead: config.maxDaysAhead,
    startHour: config.startHour,
    endHour: config.endHour,
    procedures: procedures.map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category || "",
      duration: p.duration || 30,
      price: p.price,
    })),
    agendas: agendas.map((a) => ({
      id: a.id,
      name: a.name,
      color: a.color,
    })),
  })
}

// POST /api/booking — Submit booking (create patient + appointment)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, procedureId, agendaId, date, patient } = body

    if (!token || !agendaId || !date || !patient?.name || !patient?.phone) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
    }

    // Validate token
    const config = await db.bookingConfig.findUnique({
      where: { token },
      include: {
        workspace: {
          select: {
            id: true,
            procedures: true,
          },
        },
      },
    })

    if (!config || !config.isActive) {
      return NextResponse.json({ error: "Agendamento online nao disponivel" }, { status: 404 })
    }

    const workspaceId = config.workspace.id
    const targetDate = new Date(date)

    // Validate date is not in the past
    const now = new Date()
    now.setSeconds(0, 0)
    if (targetDate < now) {
      return NextResponse.json(
        { error: "Nao e possivel agendar em uma data no passado" },
        { status: 400 }
      )
    }

    // Validate date is not beyond maxDaysAhead
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + config.maxDaysAhead)
    maxDate.setHours(23, 59, 59, 999)
    if (targetDate > maxDate) {
      return NextResponse.json(
        { error: `Agendamento permitido apenas para os proximos ${config.maxDaysAhead} dias` },
        { status: 400 }
      )
    }

    // Validate agenda belongs to workspace
    const agenda = await db.agenda.findFirst({
      where: { id: agendaId, workspaceId, isActive: true },
    })
    if (!agenda) {
      return NextResponse.json({ error: "Agenda nao encontrada" }, { status: 400 })
    }

    // Find procedure info
    const procedures = config.workspace.procedures as any[]
    const procedure = procedureId
      ? procedures.find((p: any) => p.id === procedureId)
      : null
    const duration = procedure?.duration || 30

    // Verify slot is still available
    const slots = await getAvailableSlots(
      date,
      duration,
      agendaId,
      workspaceId,
      config.startHour,
      config.endHour
    )
    const timeStr = `${String(targetDate.getHours()).padStart(2, "0")}:${String(targetDate.getMinutes()).padStart(2, "0")}`
    const targetSlot = slots.find((s) => s.time === timeStr)
    if (!targetSlot?.available) {
      return NextResponse.json({ error: "Horario nao disponivel" }, { status: 409 })
    }

    // Atomic: find/create patient + create appointment with advisory lock
    const result = await db.$transaction(async (tx) => {
      // Advisory lock to prevent double-booking
      const hourKey = `${agendaId}-${targetDate.toISOString().slice(0, 13)}`
      let hash = 0
      for (let i = 0; i < hourKey.length; i++) {
        hash = ((hash << 5) - hash + hourKey.charCodeAt(i)) | 0
      }
      await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock($1)`, hash)

      // Re-check conflicts inside lock
      const windowMs = duration * 60 * 1000
      const windowStart = new Date(targetDate.getTime())
      const windowEnd = new Date(targetDate.getTime() + windowMs)

      const conflicts = await tx.appointment.findMany({
        where: {
          workspaceId,
          agendaId,
          status: { in: ["scheduled", "completed"] },
          date: { gte: new Date(windowStart.getTime() - 60000), lt: windowEnd },
        },
      })

      if (conflicts.length > 0) {
        throw new Error("SLOT_TAKEN")
      }

      // Find or create patient
      const phone = patient.phone.replace(/\D/g, "")
      let existingPatient = await tx.patient.findFirst({
        where: { workspaceId, phone },
      })

      if (!existingPatient && patient.email) {
        existingPatient = await tx.patient.findFirst({
          where: { workspaceId, email: patient.email },
        })
      }

      const patientRecord = existingPatient || await tx.patient.create({
        data: {
          workspaceId,
          name: patient.name.trim(),
          phone,
          email: patient.email || null,
          source: "online",
        },
      })

      // Create appointment
      const appointment = await tx.appointment.create({
        data: {
          workspaceId,
          agendaId,
          patientId: patientRecord.id,
          date: targetDate,
          procedures: procedure ? [{ name: procedure.name, duration: procedure.duration }] : [],
          notes: null,
          source: "online",
          status: "scheduled",
        },
      })

      return { appointment, patient: patientRecord }
    })

    return NextResponse.json({
      success: true,
      appointmentId: result.appointment.id,
      date: result.appointment.date.toISOString(),
      procedure: procedure?.name || null,
      patientName: result.patient.name,
    })
  } catch (err: any) {
    if (err.message === "SLOT_TAKEN") {
      return NextResponse.json({ error: "Horario ja foi reservado. Escolha outro horario." }, { status: 409 })
    }
    console.error("Booking error:", err)
    return NextResponse.json({ error: "Erro ao agendar. Tente novamente." }, { status: 500 })
  }
}
