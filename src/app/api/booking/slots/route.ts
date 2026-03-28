import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAvailableSlots } from "@/lib/booking-availability"
import { logger } from "@/lib/logger"

// GET /api/booking/slots?token=abc&date=2026-04-01&agendaId=ag1&duration=30
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const token = searchParams.get("token")
    const date = searchParams.get("date")
    const agendaId = searchParams.get("agendaId")
    const duration = parseInt(searchParams.get("duration") || "30", 10)

    if (!token || !date || !agendaId) {
      return NextResponse.json({ error: "Parametros obrigatorios: token, date, agendaId" }, { status: 400 })
    }

    // Validate token
    const config = await db.bookingConfig.findUnique({
      where: { token },
      select: {
        isActive: true,
        startHour: true,
        endHour: true,
        maxDaysAhead: true,
        workspace: { select: { id: true, timezone: true } },
      },
    })

    if (!config || !config.isActive) {
      return NextResponse.json({ error: "Agendamento online nao disponivel" }, { status: 404 })
    }

    // Validate date is not too far ahead
    const targetDate = new Date(date)
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + config.maxDaysAhead)
    if (targetDate > maxDate) {
      return NextResponse.json({ error: "Data muito distante" }, { status: 400 })
    }

    // Validate date is not in the past
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (targetDate < today) {
      return NextResponse.json({ error: "Data no passado" }, { status: 400 })
    }

    const slots = await getAvailableSlots(
      date,
      duration,
      agendaId,
      config.workspace.id,
      config.startHour,
      config.endHour,
      config.workspace.timezone
    )

    return NextResponse.json({
      date,
      slots,
    })
  } catch (err) {
    logger.error("Booking slots fetch failed", { action: "GET /api/booking/slots" }, err)
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
}
