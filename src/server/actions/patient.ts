"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { getSignedAudioUrl } from "@/lib/storage"
import { logAudit } from "@/lib/audit"
import { unstable_cache } from "next/cache"

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

const getCachedSearchResults = unstable_cache(
  async (workspaceId: string, query: string) => {
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
  },
  ["patient-search"],
  { revalidate: 60 }
)

export async function searchPatients(query: string) {
  const workspaceId = await getWorkspaceId()

  if (!query.trim()) return []

  return getCachedSearchResults(workspaceId, query)
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

export async function getPatients(
  query?: string,
  page: number = 1,
  pageSize: number = 20,
  filters?: { tag?: string; insurance?: string }
) {
  const workspaceId = await getWorkspaceId()

  const skip = (page - 1) * pageSize

  const where: any = {
    workspaceId,
    isActive: true,
    ...(query?.trim()
      ? {
        OR: [
          { name: { contains: query, mode: "insensitive" as const } },
          { phone: { contains: query } },
          { document: { contains: query } },
          { email: { contains: query, mode: "insensitive" as const } },
          { insurance: { contains: query, mode: "insensitive" as const } },
        ],
      }
      : {}),
    ...(filters?.tag ? { tags: { has: filters.tag } } : {}),
    ...(filters?.insurance ? { insurance: { contains: filters.insurance, mode: "insensitive" as const } } : {}),
  }

  const [patients, total] = await Promise.all([
    db.patient.findMany({
      where,
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
    db.patient.count({ where }),
  ])

  return {
    patients: patients.map((p) => ({
      id: p.id,
      name: p.name,
      phone: p.phone,
      document: p.document,
      email: p.email,
      insurance: p.insurance,
      tags: p.tags,
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
    rg: patient.rg,
    phone: patient.phone,
    email: patient.email,
    birthDate: patient.birthDate,
    gender: patient.gender,
    address: patient.address as Record<string, string> | null,
    insurance: patient.insurance,
    guardian: patient.guardian,
    tags: patient.tags,
    medicalHistory: patient.medicalHistory as Record<string, unknown>,
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
    rg?: string | null
    phone?: string | null
    email?: string | null
    birthDate?: Date | null
    gender?: string | null
    address?: Record<string, string> | null
    insurance?: string | null
    guardian?: string | null
    tags?: string[]
    medicalHistory?: Record<string, unknown>
    customData?: Record<string, unknown>
    alerts?: string[]
  }
) {
  const { workspaceId, clerkId } = await getWorkspaceContext()

  const existing = await db.patient.findFirst({
    where: { id: patientId, workspaceId },
  })
  if (!existing) throw new Error("Paciente nao encontrado")

  const { customData, alerts, medicalHistory, address, tags, ...rest } = data

  const updated = await db.patient.update({
    where: { id: patientId },
    data: {
      ...rest,
      ...(customData !== undefined ? { customData: customData as any } : {}),
      ...(alerts !== undefined ? { alerts: alerts as any } : {}),
      ...(medicalHistory !== undefined ? { medicalHistory: medicalHistory as any } : {}),
      ...(address !== undefined ? { address: address as any } : {}),
      ...(tags !== undefined ? { tags } : {}),
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
  const rg = formData.get("rg") as string | null
  const phone = formData.get("phone") as string | null
  const email = formData.get("email") as string | null
  const birthDate = formData.get("birthDate") as string | null
  const gender = formData.get("gender") as string | null
  const insurance = formData.get("insurance") as string | null
  const guardian = formData.get("guardian") as string | null
  const customDataRaw = formData.get("customData") as string | null
  const addressRaw = formData.get("address") as string | null

  if (!name?.trim()) throw new Error("Nome e obrigatorio")

  let customData = {}
  if (customDataRaw) {
    try { customData = JSON.parse(customDataRaw) } catch { customData = {} }
  }

  let address = null
  if (addressRaw) {
    try { address = JSON.parse(addressRaw) } catch { address = null }
  }

  const patient = await db.patient.create({
    data: {
      workspaceId,
      name: name.trim(),
      document: document?.trim() || null,
      rg: rg?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      birthDate: birthDate ? new Date(birthDate) : null,
      gender: gender || null,
      address,
      insurance: insurance?.trim() || null,
      guardian: guardian?.trim() || null,
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

export async function mergePatients(keepId: string, mergeId: string) {
  const { workspaceId, clerkId } = await getWorkspaceContext()

  const [keep, merge] = await Promise.all([
    db.patient.findFirst({ where: { id: keepId, workspaceId } }),
    db.patient.findFirst({ where: { id: mergeId, workspaceId } }),
  ])
  if (!keep || !merge) throw new Error("Pacientes nao encontrados")
  if (keepId === mergeId) throw new Error("Nao pode mesclar paciente consigo mesmo")

  await db.$transaction(async (tx) => {
    // Move appointments from merge → keep
    await tx.appointment.updateMany({
      where: { patientId: mergeId, workspaceId },
      data: { patientId: keepId },
    })
    // Move recordings
    await tx.recording.updateMany({
      where: { patientId: mergeId },
      data: { patientId: keepId },
    })
    // Move documents
    await tx.patientDocument.updateMany({
      where: { patientId: mergeId, workspaceId },
      data: { patientId: keepId },
    })
    // Move treatment plans
    await tx.treatmentPlan.updateMany({
      where: { patientId: mergeId, workspaceId },
      data: { patientId: keepId },
    })

    // Merge tags (union)
    const mergedTags = [...new Set([...keep.tags, ...merge.tags])]

    // Merge alerts (union)
    const keepAlerts = keep.alerts as string[]
    const mergeAlerts = merge.alerts as string[]
    const mergedAlerts = [...new Set([...keepAlerts, ...mergeAlerts])]

    // Merge medical history
    const keepMH = keep.medicalHistory as Record<string, unknown> ?? {}
    const mergeMH = merge.medicalHistory as Record<string, unknown> ?? {}
    const mergedMH: Record<string, unknown> = {
      allergies: [...new Set([...(keepMH.allergies as string[] ?? []), ...(mergeMH.allergies as string[] ?? [])])],
      chronicDiseases: [...new Set([...(keepMH.chronicDiseases as string[] ?? []), ...(mergeMH.chronicDiseases as string[] ?? [])])],
      medications: [...new Set([...(keepMH.medications as string[] ?? []), ...(mergeMH.medications as string[] ?? [])])],
      bloodType: keepMH.bloodType || mergeMH.bloodType || null,
      notes: [keepMH.notes, mergeMH.notes].filter(Boolean).join("\n") || null,
    }

    // Fill in missing fields from merge patient
    await tx.patient.update({
      where: { id: keepId },
      data: {
        document: keep.document || merge.document,
        rg: keep.rg || merge.rg,
        phone: keep.phone || merge.phone,
        email: keep.email || merge.email,
        birthDate: keep.birthDate || merge.birthDate,
        gender: keep.gender || merge.gender,
        address: (keep.address || merge.address) as any,
        insurance: keep.insurance || merge.insurance,
        guardian: keep.guardian || merge.guardian,
        tags: mergedTags,
        alerts: mergedAlerts as any,
        medicalHistory: mergedMH as any,
      },
    })

    // Soft-delete merged patient
    await tx.patient.update({
      where: { id: mergeId },
      data: { isActive: false },
    })
  })

  await logAudit({
    workspaceId,
    userId: clerkId,
    action: "patient.merged",
    entityType: "Patient",
    entityId: keepId,
    details: { mergedFrom: mergeId, mergedPatientName: merge.name },
  })

  return { success: true }
}

export async function getAllPatientTags() {
  const workspaceId = await getWorkspaceId()

  const patients = await db.patient.findMany({
    where: { workspaceId, isActive: true, tags: { isEmpty: false } },
    select: { tags: true },
  })

  const allTags = new Set<string>()
  for (const p of patients) {
    for (const tag of p.tags) allTags.add(tag)
  }
  return Array.from(allTags).sort()
}
