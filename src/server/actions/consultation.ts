"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { uploadAudio } from "@/lib/storage"
import { transcribeAudio } from "@/lib/openai"
import { preprocessAudio } from "@/lib/audio-preprocessing"
import { generateConsultationSummary } from "@/lib/claude"
import { logAudit } from "@/lib/audit"
import { recordConsent } from "@/lib/consent"
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

  if (audioFile.size > 25 * 1024 * 1024) {
    throw new Error("Arquivo de audio excede o limite de 25MB")
  }

  const arrayBuffer = await audioFile.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // 1. Upload audio
  const audioPath = await uploadAudio(buffer, audioFile.name || "consultation.webm")

  // 2. Preprocess audio for transcription (silence removal + speed up)
  const { buffer: processedBuffer } = await preprocessAudio(buffer, audioFile.name || "consultation.webm")

  // 3. Transcribe the processed (smaller) audio via Whisper
  const workspaceProcedureNames = (user.workspace.procedures as any[]).map((p: any) => p.name)
  const { text: transcript } = await transcribeAudio(
    processedBuffer,
    "processed.mp3",  // always MP3 after preprocessing
    workspaceProcedureNames
  )

  // 4. Generate summary with Claude
  const workspaceProcedures = user.workspace.procedures as any[]
  const summary: AppointmentSummary = await generateConsultationSummary(
    transcript,
    workspaceProcedures
  )

  // 5. Create Recording only (no Appointment yet - confirmation-before-save)
  const recording = await db.recording.create({
    data: {
      workspaceId: user.workspace.id,
      audioUrl: audioPath,
      transcript,
      aiExtractedData: summary as any,
      status: "processed",
      patientId,
      fileSize: audioFile.size,
    },
  })

  // 6. Log audit and record consent
  await logAudit({
    workspaceId: user.workspace.id,
    userId,
    action: "recording.created",
    entityType: "Recording",
    entityId: recording.id,
  })

  await recordConsent({
    workspaceId: user.workspace.id,
    patientId,
    recordingId: recording.id,
    consentType: "audio_recording",
    givenBy: userId,
  })

  return {
    transcript,
    summary,
    recordingId: recording.id,
    audioPath,
  }
}

export async function getRecordingForReview(recordingId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true },
  })
  if (!user?.workspace) throw new Error("Workspace not configured")

  const recording = await db.recording.findFirst({
    where: { id: recordingId, workspaceId: user.workspace.id },
  })
  if (!recording) throw new Error("Recording not found")

  return {
    recordingId: recording.id,
    transcript: recording.transcript ?? "",
    summary: recording.aiExtractedData as AppointmentSummary | null,
    audioUrl: recording.audioUrl,
    patientId: recording.patientId,
  }
}

export async function confirmConsultation(data: {
  recordingId: string
  patientId: string
  summary: AppointmentSummary
  audioPath: string
  transcript: string
  price?: number
}) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true },
  })
  if (!user?.workspace) throw new Error("Workspace not configured")

  const workspaceId = user.workspace.id

  // Atomic: Create Appointment + link Recording (with double-confirm guard)
  const result = await db.$transaction(async (tx) => {
    // Guard: check recording not already confirmed
    const recording = await tx.recording.findUnique({
      where: { id: data.recordingId },
    })
    if (!recording) throw new Error("Recording not found")
    if (recording.appointmentId) throw new Error("Consulta ja confirmada")

    const appointment = await tx.appointment.create({
      data: {
        patientId: data.patientId,
        workspaceId,
        procedures: data.summary.procedures,
        notes: data.summary.observations,
        aiSummary: JSON.stringify(data.summary),
        audioUrl: data.audioPath,
        transcript: data.transcript,
        price: data.price ?? null,
      },
    })

    await tx.recording.update({
      where: { id: data.recordingId },
      data: { appointmentId: appointment.id },
    })

    return { appointment }
  })

  // Log audit for appointment creation
  await logAudit({
    workspaceId,
    userId,
    action: "appointment.created",
    entityType: "Appointment",
    entityId: result.appointment.id,
  })

  return {
    appointmentId: result.appointment.id,
    patientId: data.patientId,
  }
}
