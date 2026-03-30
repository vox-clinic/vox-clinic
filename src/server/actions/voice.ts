"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { revalidateTag } from "next/cache"
import { uploadAudio } from "@/lib/storage"
import { transcribeAudio } from "@/lib/openai"
import { preprocessAudio } from "@/lib/audio-preprocessing"
import { extractEntities, extractPatientUpdateIntents, extractVoiceCommand } from "@/lib/claude"
import { logAudit } from "@/lib/audit"
import { recordConsent } from "@/lib/consent"
import { getDefaultAgendaIdForWorkspace } from "@/server/actions/agenda"
import { readProcedures, readCustomFields, toJsonValue } from "@/lib/json-helpers"
import { logger } from "@/lib/logger"
import type { ExtractedPatientData } from "@/types"
import { ERR_UNAUTHORIZED, ERR_WORKSPACE_NOT_CONFIGURED, ERR_NO_AUDIO, ERR_AUDIO_TOO_LARGE, ERR_RECORDING_NOT_FOUND, ERR_ALREADY_CONFIRMED, ERR_PROCESSING_FAILED, ERR_PATIENT_NOT_FOUND, ActionError, safeAction } from "@/lib/error-messages"

export const processVoiceRegistration = safeAction(async (formData: FormData) => {
  const { userId } = await auth()
  if (!userId) throw new Error(ERR_UNAUTHORIZED)

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true, memberships: { select: { workspaceId: true }, take: 1 } },
  })
  const workspaceId = user?.workspace?.id ?? user?.memberships?.[0]?.workspaceId
  if (!workspaceId) throw new Error(ERR_WORKSPACE_NOT_CONFIGURED)

  // Load workspace if not available via ownership (member fallback)
  const workspace = user?.workspace ?? await db.workspace.findUnique({ where: { id: workspaceId } })
  if (!workspace) throw new Error(ERR_WORKSPACE_NOT_CONFIGURED)

  const audioFile = formData.get("audio") as File | null
  if (!audioFile) throw new ActionError(ERR_NO_AUDIO)

  if (audioFile.size > 25 * 1024 * 1024) {
    throw new ActionError(ERR_AUDIO_TOO_LARGE)
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
    const workspaceProcedureNames = readProcedures(workspace.procedures).map((p) => p.name)
    const result = await transcribeAudio(
      processedBuffer,
      "processed.mp3",
      workspaceProcedureNames
    )
    transcript = result.text

    // 4. Extract entities via Claude
    const workspaceConfig = {
      customFields: readCustomFields(workspace.customFields),
      procedures: readProcedures(workspace.procedures),
    }
    const extractedData: ExtractedPatientData = await extractEntities(transcript, workspaceConfig)

    // 5. Create Recording + audit + consent in transaction
    const recording = await db.$transaction(async (tx) => {
      const rec = await tx.recording.create({
        data: {
          workspaceId,
          audioUrl: audioPath!,
          transcript,
          aiExtractedData: toJsonValue(extractedData),
          status: "processed",
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
            errorMessage: err instanceof Error ? err.message : ERR_PROCESSING_FAILED,
            workspaceId,
            fileSize: audioFile.size,
          },
        })
      } catch (saveErr) {
        logger.error("Failed to save error recording", { action: "processVoiceRegistration", workspaceId }, saveErr)
      }
    }
    throw err
  }
})

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

export const confirmPatientRegistration = safeAction(async (data: ConfirmPatientData) => {
  const { userId } = await auth()
  if (!userId) throw new Error(ERR_UNAUTHORIZED)

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true, memberships: { select: { workspaceId: true }, take: 1 } },
  })
  const workspaceId = user?.workspace?.id ?? user?.memberships?.[0]?.workspaceId
  if (!workspaceId) throw new Error(ERR_WORKSPACE_NOT_CONFIGURED)

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
    if (!recording) throw new ActionError(ERR_RECORDING_NOT_FOUND)
    if (recording.appointmentId) throw new ActionError(ERR_ALREADY_CONFIRMED)

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

  revalidateTag("patient-search", "max")
  revalidateTag("dashboard", "max")

  return {
    patientId: result.patient.id,
    appointmentId: result.appointment.id,
    duplicatePatient: duplicatePatient
      ? { id: duplicatePatient.id, name: duplicatePatient.name }
      : null,
  }
})

function normalizeCpf(doc: string): string {
  return doc.replace(/\D/g, "")
}

export async function checkDuplicatePatient(name: string, document?: string | null) {
  const { userId } = await auth()
  if (!userId) throw new Error(ERR_UNAUTHORIZED)

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true, memberships: { select: { workspaceId: true }, take: 1 } },
  })
  const workspaceId = user?.workspace?.id ?? user?.memberships?.[0]?.workspaceId
  if (!workspaceId) return null

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

export const processPatientVoiceUpdate = safeAction(async (formData: FormData) => {
  const { userId } = await auth()
  if (!userId) throw new Error(ERR_UNAUTHORIZED)

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true, memberships: { select: { workspaceId: true }, take: 1 } },
  })
  const workspaceId = user?.workspace?.id ?? user?.memberships?.[0]?.workspaceId
  if (!workspaceId) throw new Error(ERR_WORKSPACE_NOT_CONFIGURED)

  const patientId = formData.get("patientId") as string | null
  if (!patientId) throw new ActionError("ID do paciente é obrigatório.")

  const patient = await db.patient.findFirst({
    where: { id: patientId, workspaceId },
    select: { id: true, name: true },
  })
  if (!patient) throw new ActionError(ERR_PATIENT_NOT_FOUND)

  const audioFile = formData.get("audio") as File | null
  if (!audioFile) throw new ActionError(ERR_NO_AUDIO)

  if (audioFile.size > 25 * 1024 * 1024) {
    throw new ActionError(ERR_AUDIO_TOO_LARGE)
  }

  const arrayBuffer = await audioFile.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  let audioPath: string | null = null
  let transcript: string | null = null

  try {
    audioPath = await uploadAudio(buffer, audioFile.name || "recording.webm")

    const { buffer: processedBuffer } = await preprocessAudio(buffer, audioFile.name || "recording.webm")

    const result = await transcribeAudio(processedBuffer, "processed.mp3")
    transcript = result.text

    const intents = await extractPatientUpdateIntents(transcript, patient.name)

    const recording = await db.recording.create({
      data: {
        workspaceId,
        patientId: patient.id,
        audioUrl: audioPath,
        transcript,
        aiExtractedData: toJsonValue(intents),
        status: "processed",
        fileSize: audioFile.size,
      },
    })

    await logAudit({
      workspaceId,
      userId,
      action: "recording.created",
      entityType: "Recording",
      entityId: recording.id,
    })

    return {
      recordingId: recording.id,
      transcript,
      intents,
      patientId: patient.id,
    }
  } catch (err) {
    if (audioPath) {
      try {
        await db.recording.create({
          data: {
            audioUrl: audioPath,
            transcript: transcript ?? undefined,
            aiExtractedData: undefined,
            status: "error",
            errorMessage: err instanceof Error ? err.message : ERR_PROCESSING_FAILED,
            workspaceId,
            fileSize: audioFile.size,
          },
        })
      } catch (saveErr) {
        logger.error("Failed to save error recording", { action: "processPatientVoiceUpdate", workspaceId }, saveErr)
      }
    }
    throw err
  }
})

interface ConfirmPatientVoiceUpdateData {
  recordingId: string
  patientId: string
  actions: Array<{ type: string; value: string }>
}

export const confirmPatientVoiceUpdate = safeAction(async (data: ConfirmPatientVoiceUpdateData) => {
  const { userId } = await auth()
  if (!userId) throw new Error(ERR_UNAUTHORIZED)

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true, memberships: { select: { workspaceId: true }, take: 1 } },
  })
  const workspaceId = user?.workspace?.id ?? user?.memberships?.[0]?.workspaceId
  if (!workspaceId) throw new Error(ERR_WORKSPACE_NOT_CONFIGURED)

  const patient = await db.patient.findFirst({
    where: { id: data.patientId, workspaceId },
    select: { id: true, medicalHistory: true },
  })
  if (!patient) throw new ActionError(ERR_PATIENT_NOT_FOUND)

  const history = (patient.medicalHistory as any) ?? {}
  const notes: string = history.notes ?? ""
  const allergies: string[] = Array.isArray(history.allergies) ? [...history.allergies] : []
  const chronicDiseases: string[] = Array.isArray(history.chronicDiseases) ? [...history.chronicDiseases] : []

  const datePrefix = new Date().toISOString().split("T")[0]

  const personalNotes: string = history.personalNotes ?? ""

  for (const action of data.actions) {
    switch (action.type) {
      case "ADD_NOTE":
        history.notes = notes ? `${notes}\n[${datePrefix}]: ${action.value}` : `[${datePrefix}]: ${action.value}`
        break
      case "ADD_PERSONAL_NOTE":
        history.personalNotes = personalNotes ? `${personalNotes}\n[${datePrefix}]: ${action.value}` : `[${datePrefix}]: ${action.value}`
        break
      case "ADD_ALLERGY":
        allergies.push(action.value)
        history.allergies = allergies
        break
      case "ADD_MEDICAL_HISTORY":
        chronicDiseases.push(action.value)
        history.chronicDiseases = chronicDiseases
        break
    }
  }

  await db.$transaction(async (tx) => {
    await tx.patient.update({
      where: { id: data.patientId },
      data: { medicalHistory: toJsonValue(history) },
    })

    await tx.recording.update({
      where: { id: data.recordingId },
      data: { status: "confirmed" },
    })
  })

  await logAudit({
    workspaceId,
    userId,
    action: "patient.updated",
    entityType: "Patient",
    entityId: data.patientId,
  })

  revalidateTag("patient-search", "max")
  revalidateTag("dashboard", "max")

  return { success: true as const, patientId: data.patientId }
})

export const processVoiceCommand = safeAction(async (formData: FormData) => {
  const { userId } = await auth()
  if (!userId) throw new Error(ERR_UNAUTHORIZED)

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true, memberships: { select: { workspaceId: true }, take: 1 } },
  })
  const workspaceId = user?.workspace?.id ?? user?.memberships?.[0]?.workspaceId
  if (!workspaceId) throw new Error(ERR_WORKSPACE_NOT_CONFIGURED)

  const audioFile = formData.get("audio") as File | null
  if (!audioFile) throw new ActionError(ERR_NO_AUDIO)

  if (audioFile.size > 25 * 1024 * 1024) {
    throw new ActionError(ERR_AUDIO_TOO_LARGE)
  }

  const arrayBuffer = await audioFile.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  let audioPath: string | null = null
  let transcript: string | null = null

  try {
    audioPath = await uploadAudio(buffer, audioFile.name || "recording.webm")

    const { buffer: processedBuffer } = await preprocessAudio(buffer, audioFile.name || "recording.webm")

    const result = await transcribeAudio(processedBuffer, "processed.mp3")
    transcript = result.text

    const command = await extractVoiceCommand(transcript)

    let matchedPatients: Array<{ id: string; name: string; phone: string | null; document: string | null }> = []
    if (command.patientQuery) {
      matchedPatients = await db.patient.findMany({
        where: {
          workspaceId,
          isActive: true,
          name: { contains: command.patientQuery, mode: "insensitive" },
        },
        select: { id: true, name: true, phone: true, document: true },
        orderBy: { name: "asc" },
        take: 5,
      })

      if (matchedPatients.length === 0) {
        const words = command.patientQuery.split(/\s+/).filter((w) => w.length >= 3)
        if (words.length > 0) {
          matchedPatients = await db.patient.findMany({
            where: {
              workspaceId,
              isActive: true,
              OR: words.map((word) => ({ name: { contains: word, mode: "insensitive" as const } })),
            },
            select: { id: true, name: true, phone: true, document: true },
            orderBy: { name: "asc" },
            take: 5,
          })
        }
      }
    }

    const recording = await db.recording.create({
      data: {
        workspaceId,
        audioUrl: audioPath,
        transcript,
        aiExtractedData: toJsonValue(command),
        status: "processed",
        fileSize: audioFile.size,
      },
    })

    await logAudit({
      workspaceId,
      userId,
      action: "recording.created",
      entityType: "Recording",
      entityId: recording.id,
    })

    return {
      recordingId: recording.id,
      transcript,
      intent: command.intent,
      patientQuery: command.patientQuery,
      patientData: command.patientData ?? {},
      scheduleData: command.scheduleData ?? {},
      paymentData: command.paymentData ?? {},
      quoteData: command.quoteData ?? {},
      intents: { actions: command.actions },
      matchedPatients,
    }
  } catch (err) {
    if (audioPath) {
      try {
        await db.recording.create({
          data: {
            audioUrl: audioPath,
            transcript: transcript ?? undefined,
            aiExtractedData: undefined,
            status: "error",
            errorMessage: err instanceof Error ? err.message : ERR_PROCESSING_FAILED,
            workspaceId,
            fileSize: audioFile.size,
          },
        })
      } catch (saveErr) {
        logger.error("Failed to save error recording", { action: "processVoiceCommand", workspaceId }, saveErr)
      }
    }
    throw err
  }
})

interface CreatePatientFromVoiceData {
  recordingId: string
  name: string
  document?: string | null
  phone?: string | null
  email?: string | null
  birthDate?: string | null
  gender?: string | null
  insurance?: string | null
  guardian?: string | null
  notes?: string | null
}

export const createPatientFromVoice = safeAction(async (data: CreatePatientFromVoiceData) => {
  const { userId } = await auth()
  if (!userId) throw new Error(ERR_UNAUTHORIZED)

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true, memberships: { select: { workspaceId: true }, take: 1 } },
  })
  const workspaceId = user?.workspace?.id ?? user?.memberships?.[0]?.workspaceId
  if (!workspaceId) throw new Error(ERR_WORKSPACE_NOT_CONFIGURED)

  if (!data.name?.trim()) throw new ActionError("Nome do paciente e obrigatorio.")

  const patient = await db.$transaction(async (tx) => {
    return tx.patient.create({
      data: {
        workspaceId,
        name: data.name.trim(),
        document: data.document?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        gender: data.gender || null,
        insurance: data.insurance?.trim() || null,
        guardian: data.guardian?.trim() || null,
        medicalHistory: data.notes ? { notes: data.notes } : {},
        alerts: [],
      },
    })
  })

  await db.recording.update({
    where: { id: data.recordingId },
    data: { patientId: patient.id, status: "confirmed" },
  })

  await logAudit({
    workspaceId,
    userId,
    action: "patient.created",
    entityType: "Patient",
    entityId: patient.id,
  })

  revalidateTag("patient-search", "max")
  revalidateTag("dashboard", "max")

  return { patientId: patient.id, patientName: patient.name }
})
