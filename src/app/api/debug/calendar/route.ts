import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  const results: Record<string, any> = {}

  try {
    // 1. Test auth
    const { userId } = await auth()
    results.auth = { userId: userId ? "OK" : "MISSING" }

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated", results })
    }

    // 2. Test user lookup
    const user = await db.user.findUnique({
      where: { clerkId: userId },
      include: { workspace: true },
    })
    results.user = {
      found: !!user,
      hasWorkspace: !!user?.workspace,
      workspaceId: user?.workspace?.id || null,
    }

    if (!user?.workspace) {
      return NextResponse.json({ error: "No workspace", results })
    }

    const workspaceId = user.workspace.id

    // 3. Test agendas
    const agendas = await db.agenda.findMany({ where: { workspaceId } })
    results.agendas = { count: agendas.length, ids: agendas.map((a) => a.id) }

    // 4. Test appointments query
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay() + 1)
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)

    const appointments = await db.appointment.findMany({
      where: {
        workspaceId,
        date: { gte: weekStart, lte: weekEnd },
      },
      include: {
        patient: { select: { id: true, name: true } },
        agenda: { select: { id: true, name: true, color: true } },
      },
    })
    results.appointments = { count: appointments.length }

    // 5. Test blocked slots
    const slots = await db.blockedSlot.findMany({
      where: { workspaceId },
    })
    results.blockedSlots = { count: slots.length }

    // 6. Test transaction with advisory lock
    try {
      await db.$transaction(async (tx) => {
        await tx.$queryRawUnsafe(`SELECT pg_advisory_xact_lock($1)`, 12345)
        return true
      })
      results.advisoryLock = "OK"
    } catch (e: any) {
      results.advisoryLock = { error: e.message, code: e.code }
    }

    // 7. Test appointment create (dry run - rollback)
    if (agendas.length > 0) {
      const patients = await db.patient.findMany({ where: { workspaceId }, take: 1 })
      if (patients.length > 0) {
        try {
          await db.$transaction(async (tx) => {
            const created = await tx.appointment.create({
              data: {
                workspaceId,
                agendaId: agendas[0].id,
                patientId: patients[0].id,
                date: new Date(),
                notes: "DEBUG TEST - WILL ROLLBACK",
                procedures: [],
                status: "scheduled",
              },
            })
            results.createTest = { success: true, id: created.id }
            // Rollback by throwing
            throw new Error("ROLLBACK_DEBUG")
          })
        } catch (e: any) {
          if (e.message === "ROLLBACK_DEBUG") {
            results.createTest = { success: true, note: "Rolled back successfully" }
          } else {
            results.createTest = { error: e.message, code: e.code, name: e.name }
          }
        }
      } else {
        results.createTest = { skipped: "No patients found" }
      }
    }

    // 8. Prisma version and connection info
    results.prisma = { version: "check_package_json" }
    results.dbUrl = process.env.DATABASE_URL ? "SET (length: " + process.env.DATABASE_URL.length + ")" : "MISSING"
    results.directUrl = process.env.DIRECT_URL ? "SET" : "MISSING"

    return NextResponse.json({ status: "OK", results })
  } catch (e: any) {
    return NextResponse.json({
      status: "ERROR",
      error: { message: e.message, name: e.name, code: e.code },
      results,
    })
  }
}
