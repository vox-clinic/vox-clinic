"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { uploadAudio } from "@/lib/storage"
import { transcribeAudio } from "@/lib/openai"
import { extractEntities } from "@/lib/claude"
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

  if (audioFile.size > 50 * 1024 * 1024) {
    throw new Error("Arquivo de audio excede o limite de 50MB")
  }

  const arrayBuffer = await audioFile.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // 1. Upload to Supabase Storage (returns path, not public URL)
  const audioPath = await uploadAudio(buffer, audioFile.name || "recording.webm")

  // 2. Transcribe via Whisper
  const transcript = await transcribeAudio(buffer, audioFile.name || "recording.webm")

  // 3. Extract entities via Claude
  const workspaceConfig = {
    customFields: user.workspace.customFields as any[],
    procedures: user.workspace.procedures as any[],
  }
  const extractedData: ExtractedPatientData = await extractEntities(transcript, workspaceConfig)

  // 4. Create Recording in database
  const recording = await db.recording.create({
    data: {
      audioUrl: audioPath,
      transcript,
      aiExtractedData: extractedData as any,
      status: "processed",
    },
  })

  return {
    transcript,
    extractedData,
    recordingId: recording.id,
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

  // Create Patient
  const patient = await db.patient.create({
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

  // Create Appointment
  const appointment = await db.appointment.create({
    data: {
      patientId: patient.id,
      workspaceId,
      procedures: data.procedures ?? [],
      notes: data.notes ?? null,
    },
  })

  // Update Recording with appointment and patient link
  await db.recording.update({
    where: { id: data.recordingId },
    data: {
      appointmentId: appointment.id,
      patientId: patient.id,
    },
  })

  return {
    patientId: patient.id,
    appointmentId: appointment.id,
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
