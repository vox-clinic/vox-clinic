"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { uploadAudio } from "@/lib/storage"
import { transcribeAudio } from "@/lib/openai"
import { generateConsultationSummary } from "@/lib/claude"
import type { AppointmentSummary } from "@/types"

export async function processConsultation(formData: FormData, patientId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true },
  })
  if (!user) throw new Error("User not found")
  if (!user.workspace) throw new Error("Workspace not configured")

  const audioFile = formData.get("audio") as File | null
  if (!audioFile) throw new Error("No audio file provided")

  if (audioFile.size > 50 * 1024 * 1024) {
    throw new Error("Arquivo de audio excede o limite de 50MB")
  }

  const arrayBuffer = await audioFile.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // 1. Upload audio
  const audioPath = await uploadAudio(buffer, audioFile.name || "consultation.webm")

  // 2. Transcribe via Whisper
  const transcript = await transcribeAudio(buffer, audioFile.name || "consultation.webm")

  // 3. Generate summary with Claude
  const workspaceProcedures = user.workspace.procedures as any[]
  const summary: AppointmentSummary = await generateConsultationSummary(
    transcript,
    workspaceProcedures
  )

  // 4. Create Recording only (no Appointment yet - confirmation-before-save)
  const recording = await db.recording.create({
    data: {
      audioUrl: audioPath,
      transcript,
      aiExtractedData: summary as any,
      status: "processed",
      patientId,
    },
  })

  return {
    transcript,
    summary,
    recordingId: recording.id,
    audioPath,
  }
}

export async function confirmConsultation(data: {
  recordingId: string
  patientId: string
  summary: AppointmentSummary
  audioPath: string
  transcript: string
}) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true },
  })
  if (!user?.workspace) throw new Error("Workspace not configured")

  const workspaceId = user.workspace.id

  // Create Appointment only on confirmation
  const appointment = await db.appointment.create({
    data: {
      patientId: data.patientId,
      workspaceId,
      procedures: data.summary.procedures,
      notes: data.summary.observations,
      aiSummary: JSON.stringify(data.summary),
      audioUrl: data.audioPath,
      transcript: data.transcript,
    },
  })

  // Link recording to appointment
  await db.recording.update({
    where: { id: data.recordingId },
    data: { appointmentId: appointment.id },
  })

  return {
    appointmentId: appointment.id,
    patientId: data.patientId,
  }
}
