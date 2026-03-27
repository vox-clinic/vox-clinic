"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { uploadAudio } from "@/lib/storage"
import { transcribeAudio } from "@/lib/openai"
import { preprocessAudio } from "@/lib/audio-preprocessing"
import { extractEntities } from "@/lib/claude"
import { logAudit } from "@/lib/audit"
import { recordConsent } from "@/lib/consent"
import { getDefaultAgendaIdForWorkspace } from "@/server/actions/agenda"
import type { ExtractedPatientData } from "@/types"

export async function processVoiceRegistration(formData: FormData) {
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

  let audioPath: string | null = null
  let transcript: string | null = null

  try {
    // 1. Upload to Supabase Storage (returns path, not public URL)
    audioPath = await uploadAudio(buffer, audioFile.name || "recording.webm")

    // 2. Preprocess audio for transcription (silence removal + speed up)
    const { buffer: processedBuffer } = await preprocessAudio(buffer, audioFile.name || "recording.webm")

    // 3. Transcribe the processed (smaller) audio via Whisper
    const workspaceProcedureNames = (user.workspace.procedures as any[]).map((p: any) => p.name)
    const result = await transcribeAudio(
      processedBuffer,
      "processed.mp3",
      workspaceProcedureNames
    )
    transcript = result.text

    // 4. Extract entities via Claude
    const workspaceConfig = {
      customFields: user.workspace.customFields as any[],
      procedures: user.workspace.procedures as any[],
    }
    const extractedData: ExtractedPatientData = await extractEntities(transcript, workspaceConfig)

    // 5. Create Recording + audit + consent in transaction
    const recording = await db.$transaction(async (tx) => {
      const rec = await tx.recording.create({
        data: {
          workspaceId: user.workspace!.id,
          audioUrl: audioPath!,
          transcript,
          aiExtractedData: extractedData as any,
          status: "processed",
          fileSize: audioFile.size,
        },
      })

      await logAudit({
        workspaceId: user.workspace!.id,
        userId,
        action: "recording.created",
        entityType: "Recording",
        entityId: rec.id,
      })

      await recordConsent({
        workspaceId: user.workspace!.id,
        recordingId: rec.id,
        consentType: "audio_recording",
        givenBy: userId,
      })

      return rec
    })

    return {
      transcript,
      extractedData,
      recordingId: recording.id,
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
            workspaceId: user.workspace!.id,
            fileSize: audioFile.size,
          },
        })
      } catch {
        // If even saving the error recording fails, don't lose the original error
      }
    }
    throw err
  }
}

interface ConfirmPatientData {
  recordingId: string
  name: string
  document?: string | null
  phone?: string | null
  email?: string | null
  birthDate?: string | null
  customData?: Record<string, any>
  alerts?: string[]
  procedures?: string[]
  notes?: string | null
}

export async function confirmPatientRegistration(data: ConfirmPatientData) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true },
  })
  if (!user) throw new Error("User not found")
  if (!user.workspace) throw new Error("Workspace not configured")

  const workspaceId = user.workspace.id
  const agendaId = await getDefaultAgendaIdForWorkspace(workspaceId)

  // Check for duplicate patient by document or similar name
  let duplicatePatient = null
  if (data.document) {
    duplicatePatient = await db.patient.findFirst({
      where: { workspaceId, document: data.document },
    })
  }
  if (!duplicatePatient && data.name) {
    duplicatePatient = await db.patient.findFirst({
      where: {
        workspaceId,
        name: { contains: data.name, mode: "insensitive" },
      },
    })
  }

  // Atomic: Create Patient + Appointment + link Recording
  const result = await db.$transaction(async (tx) => {
    // Lock recording row to prevent double-confirm (same pattern as confirmConsultation)
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
    if (recording.appointmentId) throw new Error("Registro ja confirmado")

    const patient = await tx.patient.create({
      data: {
        workspaceId,
        name: data.name,
        document: data.document ?? null,
        phone: data.phone ?? null,
        email: data.email ?? null,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        customData: data.customData ?? {},
        alerts: data.alerts ?? [],
      },
    })

    const appointment = await tx.appointment.create({
      data: {
        patientId: patient.id,
        workspaceId,
        agendaId,
        procedures: data.procedures ?? [],
        notes: data.notes ?? null,
      },
    })

    await tx.recording.update({
      where: { id: data.recordingId },
      data: {
        appointmentId: appointment.id,
        patientId: patient.id,
      },
    })

    return { patient, appointment }
  })

  // Log audit for patient and appointment creation
  await logAudit({
    workspaceId,
    userId,
    action: "patient.created",
    entityType: "Patient",
    entityId: result.patient.id,
  })

  await logAudit({
    workspaceId,
    userId,
    action: "appointment.created",
    entityType: "Appointment",
    entityId: result.appointment.id,
  })

  return {
    patientId: result.patient.id,
    appointmentId: result.appointment.id,
    duplicatePatient: duplicatePatient
      ? { id: duplicatePatient.id, name: duplicatePatient.name }
      : null,
  }
}

function normalizeCpf(doc: string): string {
  return doc.replace(/\D/g, "")
}

export async function checkDuplicatePatient(name: string, document?: string | null) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true },
  })
  if (!user?.workspace) return null

  const workspaceId = user.workspace.id

  if (document) {
    const normalized = normalizeCpf(document)
    // Search for both formatted and unformatted CPF
    const byDocument = await db.patient.findFirst({
      where: {
        workspaceId,
        OR: [
          { document: normalized },
          { document },
        ],
      },
      select: { id: true, name: true },
    })
    if (byDocument) return byDocument
  }

  if (name && name.length >= 3) {
    const byName = await db.patient.findFirst({
      where: {
        workspaceId,
        name: { contains: name, mode: "insensitive" },
      },
      select: { id: true, name: true },
    })
    if (byName) return byName
  }

  return null
}
