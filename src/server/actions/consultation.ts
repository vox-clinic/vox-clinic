"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { revalidateTag } from "next/cache"
import { uploadAudio } from "@/lib/storage"
import { transcribeAudio } from "@/lib/openai"
import { preprocessAudio } from "@/lib/audio-preprocessing"
import { generateConsultationSummary } from "@/lib/claude"
import { logAudit } from "@/lib/audit"
import { recordConsent } from "@/lib/consent"
import { getDefaultAgendaIdForWorkspace } from "@/server/actions/agenda"
import { readProcedures, toJsonValue, readMedicalHistory } from "@/lib/json-helpers"
import { logger } from "@/lib/logger"
import type { AppointmentSummary } from "@/types"

export async function processConsultation(formData: FormData, patientId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true, memberships: { select: { workspaceId: true }, take: 1 } },
  })
  const workspaceId = user?.workspace?.id ?? user?.memberships?.[0]?.workspaceId
  if (!workspaceId) throw new Error("Workspace not configured")

  // Load workspace if not available via ownership (member fallback)
  const workspace = user?.workspace ?? await db.workspace.findUnique({ where: { id: workspaceId } })
  if (!workspace) throw new Error("Workspace not configured")

  const audioFile = formData.get("audio") as File | null
  if (!audioFile) throw new Error("No audio file provided")

  if (audioFile.size > 25 * 1024 * 1024) {
    throw new Error("Arquivo de audio excede o limite de 25MB")
  }

  const arrayBuffer = await audioFile.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  let audioPath: string | null = null
  let transcript: string | null = null

  try {
    // 1. Upload audio
    audioPath = await uploadAudio(buffer, audioFile.name || "consultation.webm")

    // 2. Preprocess audio
    const { buffer: processedBuffer } = await preprocessAudio(buffer, audioFile.name || "consultation.webm")

    // 3. Transcribe via Whisper
    const workspaceProcedureNames = readProcedures(workspace.procedures).map((p) => p.name)
    const result = await transcribeAudio(
      processedBuffer,
      "processed.mp3",
      workspaceProcedureNames
    )
    transcript = result.text

    // 4. Generate summary with Claude
    const workspaceProcedures = readProcedures(workspace.procedures)
    const summary: AppointmentSummary = await generateConsultationSummary(
      transcript,
      workspaceProcedures
    )

    // 5. Create Recording + audit + consent in transaction
    const recording = await db.$transaction(async (tx) => {
      const rec = await tx.recording.create({
        data: {
          workspaceId,
          audioUrl: audioPath!,
          transcript,
          aiExtractedData: toJsonValue(summary),
          status: "processed",
          patientId,
          fileSize: audioFile.size,
        },
      })

      await logAudit({
        workspaceId,
        userId,
        action: "recording.created",
        entityType: "Recording",
        entityId: rec.id,
      })

      await recordConsent({
        workspaceId,
        patientId,
        recordingId: rec.id,
        consentType: "audio_recording",
        givenBy: userId,
      })

      return rec
    })

    return {
      transcript,
      summary,
      recordingId: recording.id,
      audioPath,
    }
  } catch (err) {
    // Save recording with error status — preserve audio and transcript when available
    if (audioPath) {
      try {
        await db.recording.create({
          data: {
            audioUrl: audioPath,
            transcript: transcript ?? undefined,
            aiExtractedData: undefined,
            status: "error",
            errorMessage: err instanceof Error ? err.message : "Erro desconhecido no processamento",
            workspaceId,
            patientId,
            fileSize: audioFile.size,
          },
        })
      } catch (saveErr) {
        logger.error("Failed to save error recording", { action: "processConsultation", workspaceId, entityType: "Patient", entityId: patientId }, saveErr)
      }
    }
    throw err
  }
}

export async function getRecordingForReview(recordingId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true, memberships: { select: { workspaceId: true }, take: 1 } },
  })
  const workspaceId = user?.workspace?.id ?? user?.memberships?.[0]?.workspaceId
  if (!workspaceId) throw new Error("Workspace not configured")

  const recording = await db.recording.findFirst({
    where: { id: recordingId, workspaceId },
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
    include: { workspace: true, memberships: { select: { workspaceId: true }, take: 1 } },
  })
  const workspaceId = user?.workspace?.id ?? user?.memberships?.[0]?.workspaceId
  if (!workspaceId) throw new Error("Workspace not configured")

  const agendaId = await getDefaultAgendaIdForWorkspace(workspaceId)

  // Atomic: Create Appointment + link Recording (with double-confirm guard via FOR UPDATE)
  const result = await db.$transaction(async (tx) => {
    // Lock the recording row to prevent concurrent double-confirms
    const rows = await tx.$queryRawUnsafe<Array<{
      id: string
      appointmentId: string | null
    }>>(
      `SELECT id, "appointmentId" FROM "Recording" WHERE id = $1 AND "workspaceId" = $2 FOR UPDATE`,
      data.recordingId,
      workspaceId
    )

    const recording = rows[0]
    if (!recording) throw new Error("Recording not found")
    if (recording.appointmentId) throw new Error("Consulta ja confirmada")

    const appointment = await tx.appointment.create({
      data: {
        patientId: data.patientId,
        workspaceId,
        agendaId,
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

    // Apply patient info updates if present
    const updates = data.summary.patientInfoUpdates
    if (updates && Object.keys(updates).length > 0) {
      const patient = await tx.patient.findUnique({
        where: { id: data.patientId },
        select: { medicalHistory: true, phone: true, insurance: true, address: true },
      })

      if (patient) {
        const patientUpdate: Record<string, any> = {}

        // Update phone if provided and patient has none
        if (updates.phone && !patient.phone) {
          patientUpdate.phone = updates.phone
        }

        // Update insurance if provided and patient has none
        if (updates.insurance && !patient.insurance) {
          patientUpdate.insurance = updates.insurance
        }

        // Update address if provided and patient has none
        if (updates.address && !patient.address) {
          patientUpdate.address = updates.address
        }

        // Merge medical history (allergies, medications, chronicDiseases)
        const existingHistory = readMedicalHistory(patient.medicalHistory) as Record<string, string[] | unknown>
        let historyChanged = false

        if (updates.allergies && updates.allergies.length > 0) {
          const existing = Array.isArray(existingHistory.allergies) ? existingHistory.allergies : []
          const merged = [...new Set([...existing, ...updates.allergies])]
          if (merged.length > existing.length) {
            existingHistory.allergies = merged
            historyChanged = true
          }
        }

        if (updates.medications && updates.medications.length > 0) {
          const existing = Array.isArray(existingHistory.medications) ? existingHistory.medications : []
          const merged = [...new Set([...existing, ...updates.medications])]
          if (merged.length > existing.length) {
            existingHistory.medications = merged
            historyChanged = true
          }
        }

        if (updates.chronicDiseases && updates.chronicDiseases.length > 0) {
          const existing = Array.isArray(existingHistory.chronicDiseases) ? existingHistory.chronicDiseases : []
          const merged = [...new Set([...existing, ...updates.chronicDiseases])]
          if (merged.length > existing.length) {
            existingHistory.chronicDiseases = merged
            historyChanged = true
          }
        }

        if (historyChanged) {
          patientUpdate.medicalHistory = existingHistory
        }

        if (Object.keys(patientUpdate).length > 0) {
          await tx.patient.update({
            where: { id: data.patientId },
            data: patientUpdate,
          })
        }
      }
    }

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

  revalidateTag("dashboard", "max")

  return {
    appointmentId: result.appointment.id,
    patientId: data.patientId,
  }
}
