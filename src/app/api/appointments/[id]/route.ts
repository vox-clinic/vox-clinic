import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true },
  })
  if (!user?.workspace) {
    return NextResponse.json({ error: "Workspace not configured" }, { status: 400 })
  }

  const { id } = await params

  const appointment = await db.appointment.findFirst({
    where: { id, workspaceId: user.workspace.id },
    include: {
      patient: { select: { id: true, name: true } },
    },
  })

  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
  }

  return NextResponse.json({
    id: appointment.id,
    patientId: appointment.patientId,
    patientName: appointment.patient.name,
    date: appointment.date,
    procedures: appointment.procedures,
    notes: appointment.notes,
    aiSummary: appointment.aiSummary,
    hasAudio: !!appointment.audioUrl,
    transcript: appointment.transcript,
  })
}
