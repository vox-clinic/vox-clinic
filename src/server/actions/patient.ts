"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { getSignedAudioUrl } from "@/lib/storage"
import { logAudit } from "@/lib/audit"

async function getWorkspaceContext() {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true },
  })
  if (!user?.workspace) throw new Error("Workspace not configured")

  return { workspaceId: user.workspace.id, clerkId: userId }
}

async function getWorkspaceId() {
  const { workspaceId } = await getWorkspaceContext()
  return workspaceId
}

export async function searchPatients(query: string) {
  const workspaceId = await getWorkspaceId()

  if (!query.trim()) return []

  const patients = await db.patient.findMany({
    where: {
      workspaceId,
      isActive: true,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { phone: { contains: query } },
        { document: { contains: query } },
      ],
    },
    select: {
      id: true,
      name: true,
      phone: true,
      document: true,
      updatedAt: true,
    },
    orderBy: { name: "asc" },
    take: 10,
  })

  return patients
}

export async function getRecentPatients() {
  const workspaceId = await getWorkspaceId()

  const patients = await db.patient.findMany({
    where: { workspaceId, isActive: true },
    select: {
      id: true,
      name: true,
      phone: true,
      document: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 5,
  })

  return patients
}

export async function getPatients(query?: string, page: number = 1, pageSize: number = 20) {
  const workspaceId = await getWorkspaceId()

  const skip = (page - 1) * pageSize

  const [patients, total] = await Promise.all([
    db.patient.findMany({
      where: {
        workspaceId,
        isActive: true,
        ...(query?.trim()
          ? {
            OR: [
              { name: { contains: query, mode: "insensitive" as const } },
              { phone: { contains: query } },
              { document: { contains: query } },
            ],
          }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: pageSize,
      skip,
      include: {
        appointments: {
          orderBy: { date: "desc" },
          take: 1,
          select: { date: true },
        },
      },
    }),
    db.patient.count({
      where: {
        workspaceId,
        isActive: true,
        ...(query?.trim()
          ? {
            OR: [
              { name: { contains: query, mode: "insensitive" as const } },
              { phone: { contains: query } },
              { document: { contains: query } },
            ],
          }
          : {}),
      },
    }),
  ])

  return {
    patients: patients.map((p) => ({
      id: p.id,
      name: p.name,
      phone: p.phone,
      document: p.document,
      email: p.email,
      alerts: p.alerts as string[],
      lastAppointment: p.appointments[0]?.date ?? null,
    })),
    total,
    totalPages: Math.ceil(total / pageSize),
    page,
  }
}

export async function getPatient(patientId: string) {
  const workspaceId = await getWorkspaceId()

  const patient = await db.patient.findFirst({
    where: { id: patientId, workspaceId },
    include: {
      appointments: {
        orderBy: { date: "desc" },
        include: {
          recordings: {
            select: {
              id: true,
              duration: true,
              createdAt: true,
              status: true,
            },
          },
        },
      },
      recordings: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          audioUrl: true,
          duration: true,
          transcript: true,
          createdAt: true,
          status: true,
        },
      },
    },
  })

  if (!patient) throw new Error("Paciente nao encontrado")

  return {
    id: patient.id,
    name: patient.name,
    document: patient.document,
    phone: patient.phone,
    email: patient.email,
    birthDate: patient.birthDate,
    customData: patient.customData as Record<string, unknown>,
    alerts: patient.alerts as string[],
    createdAt: patient.createdAt,
    appointments: patient.appointments.map((a) => ({
      id: a.id,
      date: a.date,
      procedures: a.procedures as string[],
      notes: a.notes,
      aiSummary: a.aiSummary,
      status: a.status,
      recordings: a.recordings,
    })),
    recordings: patient.recordings,
  }
}

export async function updatePatient(
  patientId: string,
  data: {
    name?: string
    document?: string | null
    phone?: string | null
    email?: string | null
    birthDate?: Date | null
    customData?: Record<string, unknown>
    alerts?: string[]
  }
) {
  const { workspaceId, clerkId } = await getWorkspaceContext()

  const existing = await db.patient.findFirst({
    where: { id: patientId, workspaceId },
  })
  if (!existing) throw new Error("Paciente nao encontrado")

  const { customData, alerts, ...rest } = data

  const updated = await db.patient.update({
    where: { id: patientId },
    data: {
      ...rest,
      ...(customData !== undefined ? { customData: customData as Record<string, unknown> as any } : {}),
      ...(alerts !== undefined ? { alerts: alerts as any } : {}),
    },
  })

  await logAudit({
    workspaceId,
    userId: clerkId,
    action: "patient.updated",
    entityType: "Patient",
    entityId: patientId,
  })

  return updated
}

export async function createPatient(formData: FormData) {
  const { workspaceId, clerkId } = await getWorkspaceContext()

  const name = formData.get("name") as string
  const document = formData.get("document") as string | null
  const phone = formData.get("phone") as string | null
  const email = formData.get("email") as string | null
  const birthDate = formData.get("birthDate") as string | null
  const customDataRaw = formData.get("customData") as string | null

  if (!name?.trim()) throw new Error("Nome e obrigatorio")

  let customData = {}
  if (customDataRaw) {
    try {
      customData = JSON.parse(customDataRaw)
    } catch {
      customData = {}
    }
  }

  const patient = await db.patient.create({
    data: {
      workspaceId,
      name: name.trim(),
      document: document?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      birthDate: birthDate ? new Date(birthDate) : null,
      customData,
      alerts: [],
    },
  })

  await logAudit({
    workspaceId,
    userId: clerkId,
    action: "patient.created",
    entityType: "Patient",
    entityId: patient.id,
  })

  redirect(`/patients/${patient.id}`)
}

export async function deactivatePatient(patientId: string) {
  const { workspaceId, clerkId } = await getWorkspaceContext()

  const existing = await db.patient.findFirst({
    where: { id: patientId, workspaceId },
  })
  if (!existing) throw new Error("Paciente nao encontrado")

  await db.patient.update({
    where: { id: patientId },
    data: { isActive: false },
  })

  await logAudit({
    workspaceId,
    userId: clerkId,
    action: "patient.deactivated",
    entityType: "Patient",
    entityId: patientId,
  })

  return { success: true }
}

export async function getAudioPlaybackUrl(audioPath: string) {
  const { workspaceId } = await getWorkspaceContext()

  // Validate the audio belongs to a recording in the user's workspace
  const recording = await db.recording.findFirst({
    where: {
      audioUrl: audioPath,
      OR: [{ workspaceId }, { patient: { workspaceId } }],
    },
  })
  if (!recording) throw new Error("Audio nao encontrado")

  return getSignedAudioUrl(audioPath)
}
