"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { checkPatientLimit } from "@/lib/plan-enforcement"
import { getSignedAudioUrl } from "@/lib/storage"
import { logAudit } from "@/lib/audit"
import { unstable_cache, revalidateTag } from "next/cache"
import { getWorkspaceIdCached } from "@/lib/workspace-cache"
import { ERR_UNAUTHORIZED, ERR_WORKSPACE_NOT_CONFIGURED, ERR_PATIENT_NOT_FOUND, ActionError, safeAction } from "@/lib/error-messages"
import { requirePermission, type WorkspaceRole } from "@/lib/permissions"
import { requireWorkspaceRole } from "@/lib/auth-context"

async function getWorkspaceContext() {
  const { userId } = await auth()
  if (!userId) throw new Error(ERR_UNAUTHORIZED)

  const workspaceId = await getWorkspaceIdCached(userId)
  if (!workspaceId) throw new Error(ERR_WORKSPACE_NOT_CONFIGURED)

  return { workspaceId, clerkId: userId }
}

/** Resolve the current user's role (used for permission checks on mutations). */
async function getRole(): Promise<WorkspaceRole> {
  const ctx = await requireWorkspaceRole()
  return ctx.role
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
      source: p.source,
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
  const { workspaceId, clerkId } = await getWorkspaceContext()

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

  if (!patient) throw new Error(ERR_PATIENT_NOT_FOUND)

  // Fire-and-forget audit log — non-blocking (CFM 1.821/2007 read access tracking)
  logAudit({ workspaceId, userId: clerkId, action: "patient.viewed", entityType: "Patient", entityId: patientId }).catch(() => {})

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
    insuranceData: patient.insuranceData as Record<string, unknown> | null,
    guardian: patient.guardian,
    source: patient.source,
    tags: patient.tags,
    medicalHistory: patient.medicalHistory as Record<string, unknown>,
    customData: patient.customData as Record<string, unknown>,
    alerts: patient.alerts as string[],
    whatsappConsent: patient.whatsappConsent,
    whatsappConsentAt: patient.whatsappConsentAt,
    createdAt: patient.createdAt,
    appointments: patient.appointments.map((a) => ({
      id: a.id,
      date: a.date,
      procedures: a.procedures as string[],
      notes: a.notes,
      aiSummary: a.aiSummary,
      status: a.status,
      type: a.type,
      price: a.price,
      transcript: a.transcript,
      videoRecordingUrl: a.videoRecordingUrl,
      cidCodes: (Array.isArray(a.cidCodes) ? a.cidCodes : []) as { code: string; description: string }[],
      recordings: a.recordings,
    })),
    recordings: patient.recordings,
  }
}

export const updatePatient = safeAction(async (
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
    insuranceData?: Record<string, unknown> | null
    guardian?: string | null
    source?: string | null
    tags?: string[]
    medicalHistory?: Record<string, unknown>
    customData?: Record<string, unknown>
    alerts?: string[]
  }
) => {
  const { workspaceId, clerkId } = await getWorkspaceContext()
  requirePermission(await getRole(), "patients.edit")

  const existing = await db.patient.findFirst({
    where: { id: patientId, workspaceId },
  })
  if (!existing) throw new ActionError(ERR_PATIENT_NOT_FOUND)

  const { customData, alerts, medicalHistory, address, tags, insuranceData, ...rest } = data

  const updated = await db.patient.update({
    where: { id: patientId },
    data: {
      ...rest,
      ...(customData !== undefined ? { customData: customData as any } : {}),
      ...(alerts !== undefined ? { alerts: alerts as any } : {}),
      ...(medicalHistory !== undefined ? { medicalHistory: medicalHistory as any } : {}),
      ...(address !== undefined ? { address: address as any } : {}),
      ...(insuranceData !== undefined ? { insuranceData: insuranceData as any } : {}),
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

  revalidateTag("patient-search", "max")

  return updated
})

export const createPatient = safeAction(async (formData: FormData) => {
  const { workspaceId, clerkId } = await getWorkspaceContext()
  requirePermission(await getRole(), "patients.create")

  const name = formData.get("name") as string
  const document = formData.get("document") as string | null
  const rg = formData.get("rg") as string | null
  const phone = formData.get("phone") as string | null
  const email = formData.get("email") as string | null
  const birthDate = formData.get("birthDate") as string | null
  const gender = formData.get("gender") as string | null
  const insurance = formData.get("insurance") as string | null
  const guardian = formData.get("guardian") as string | null
  const source = formData.get("source") as string | null
  const customDataRaw = formData.get("customData") as string | null
  const addressRaw = formData.get("address") as string | null

  if (!name?.trim()) throw new ActionError("Nome é obrigatório")

  let customData = {}
  if (customDataRaw) {
    try { customData = JSON.parse(customDataRaw) } catch { customData = {} }
  }

  let address = null
  if (addressRaw) {
    try { address = JSON.parse(addressRaw) } catch { address = null }
  }

  // Validate CPF digit if document looks like a CPF (11 digits)
  if (document?.trim()) {
    const docDigits = document.replace(/\D/g, "")
    if (docDigits.length === 11) {
      // CPF digit validation
      if (/^(\d)\1{10}$/.test(docDigits)) {
        throw new ActionError("CPF inválido.")
      }
      let sum = 0
      for (let i = 0; i < 9; i++) sum += parseInt(docDigits[i]) * (10 - i)
      let remainder = (sum * 10) % 11
      if (remainder === 10) remainder = 0
      if (remainder !== parseInt(docDigits[9])) {
        throw new ActionError("CPF inválido (dígito verificador incorreto).")
      }
      sum = 0
      for (let i = 0; i < 10; i++) sum += parseInt(docDigits[i]) * (11 - i)
      remainder = (sum * 10) % 11
      if (remainder === 10) remainder = 0
      if (remainder !== parseInt(docDigits[10])) {
        throw new ActionError("CPF inválido (dígito verificador incorreto).")
      }
    }
  }

  // Transaction with plan limit check inside to prevent concurrent requests bypassing limits
  const patient = await db.$transaction(async (tx) => {
    // Plan enforcement inside transaction to serialize concurrent creates
    const workspace = await tx.workspace.findUnique({ where: { id: workspaceId }, select: { plan: true } })
    if (workspace) {
      const planCheck = await checkPatientLimit(workspaceId, workspace.plan, tx)
      if (!planCheck.allowed) throw new ActionError(planCheck.reason!)
    }

    return tx.patient.create({
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
        source: source?.trim() || null,
        customData,
        alerts: [],
      },
    })
  })

  await logAudit({
    workspaceId,
    userId: clerkId,
    action: "patient.created",
    entityType: "Patient",
    entityId: patient.id,
  })

  revalidateTag("patient-search", "max")
  revalidateTag("dashboard", "max")

  return { patientId: patient.id }
})

export const deactivatePatient = safeAction(async (patientId: string) => {
  const { workspaceId, clerkId } = await getWorkspaceContext()
  requirePermission(await getRole(), "patients.delete")

  const existing = await db.patient.findFirst({
    where: { id: patientId, workspaceId },
  })
  if (!existing) throw new ActionError(ERR_PATIENT_NOT_FOUND)

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

  revalidateTag("patient-search", "max")
  revalidateTag("dashboard", "max")

  return { success: true }
})

export async function getAudioPlaybackUrl(audioPath: string) {
  const { workspaceId, clerkId } = await getWorkspaceContext()

  // Validate the audio belongs to a recording in the user's workspace
  const recording = await db.recording.findFirst({
    where: {
      audioUrl: audioPath,
      OR: [{ workspaceId }, { patient: { workspaceId } }],
    },
  })
  if (!recording) throw new ActionError("Áudio não encontrado")

  // Fire-and-forget audit log — non-blocking (CFM 1.821/2007 read access tracking)
  logAudit({ workspaceId, userId: clerkId, action: "recording.accessed", entityType: "Recording", entityId: recording.id }).catch(() => {})

  return getSignedAudioUrl(audioPath)
}

export const mergePatients = safeAction(async (keepId: string, mergeId: string) => {
  const { workspaceId, clerkId } = await getWorkspaceContext()
  requirePermission(await getRole(), "patients.delete")

  if (keepId === mergeId) throw new ActionError("Não pode mesclar paciente consigo mesmo")

  const mergeResult = await db.$transaction(async (tx) => {
    // Lock both patients with FOR UPDATE in consistent order (by ID) to prevent deadlocks
    const [firstId, secondId] = keepId < mergeId ? [keepId, mergeId] : [mergeId, keepId]
    const firstRows = await tx.$queryRawUnsafe<any[]>(
      `SELECT * FROM "Patient" WHERE id = $1 AND "workspaceId" = $2 FOR UPDATE`,
      firstId, workspaceId
    )
    const secondRows = await tx.$queryRawUnsafe<any[]>(
      `SELECT * FROM "Patient" WHERE id = $1 AND "workspaceId" = $2 FOR UPDATE`,
      secondId, workspaceId
    )
    const keepRows = keepId < mergeId ? firstRows : secondRows
    const mergeRows = keepId < mergeId ? secondRows : firstRows
    const keep = keepRows[0]
    const mergePatient = mergeRows[0]
    if (!keep || !mergePatient) throw new ActionError("Pacientes não encontrados")
    // Move appointments from merge → keep
    await tx.appointment.updateMany({
      where: { patientId: mergeId, workspaceId },
      data: { patientId: keepId },
    })
    // Move recordings
    await tx.recording.updateMany({
      where: { patientId: mergeId, workspaceId },
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

    // Merge tags (union) — defensive: ensure arrays
    const keepTags = Array.isArray(keep.tags) ? keep.tags : []
    const mergeTags = Array.isArray(mergePatient.tags) ? mergePatient.tags : []
    const mergedTags = [...new Set([...keepTags, ...mergeTags])]

    // Merge alerts (union) — defensive: ensure arrays
    const keepAlerts = Array.isArray(keep.alerts) ? keep.alerts : []
    const mergeAlerts = Array.isArray(mergePatient.alerts) ? mergePatient.alerts : []
    const mergedAlerts = [...new Set([...keepAlerts, ...mergeAlerts])]

    // Merge medical history — defensive: ensure objects
    const keepMH = (keep.medicalHistory && typeof keep.medicalHistory === "object" && !Array.isArray(keep.medicalHistory)) ? keep.medicalHistory as Record<string, unknown> : {}
    const mergeMH = (mergePatient.medicalHistory && typeof mergePatient.medicalHistory === "object" && !Array.isArray(mergePatient.medicalHistory)) ? mergePatient.medicalHistory as Record<string, unknown> : {}
    const safeArray = (val: unknown): string[] => Array.isArray(val) ? val.filter((v): v is string => typeof v === "string") : []
    const mergedMH: Record<string, unknown> = {
      allergies: [...new Set([...safeArray(keepMH.allergies), ...safeArray(mergeMH.allergies)])],
      chronicDiseases: [...new Set([...safeArray(keepMH.chronicDiseases), ...safeArray(mergeMH.chronicDiseases)])],
      medications: [...new Set([...safeArray(keepMH.medications), ...safeArray(mergeMH.medications)])],
      bloodType: keepMH.bloodType || mergeMH.bloodType || null,
      notes: [keepMH.notes, mergeMH.notes].filter(Boolean).join("\n") || null,
    }

    // Fill in missing fields from merge patient
    await tx.patient.update({
      where: { id: keepId },
      data: {
        document: keep.document || mergePatient.document,
        rg: keep.rg || mergePatient.rg,
        phone: keep.phone || mergePatient.phone,
        email: keep.email || mergePatient.email,
        birthDate: keep.birthDate || mergePatient.birthDate,
        gender: keep.gender || mergePatient.gender,
        address: (keep.address || mergePatient.address) as any,
        insurance: keep.insurance || mergePatient.insurance,
        guardian: keep.guardian || mergePatient.guardian,
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

    return { mergedPatientName: mergePatient.name }
  })

  await logAudit({
    workspaceId,
    userId: clerkId,
    action: "patient.merged",
    entityType: "Patient",
    entityId: keepId,
    details: { mergedFrom: mergeId, mergedPatientName: mergeResult.mergedPatientName },
  })

  revalidateTag("patient-search", "max")
  revalidateTag("dashboard", "max")

  return { success: true }
})

export const grantWhatsAppConsent = safeAction(async (patientId: string) => {
  const { workspaceId, clerkId } = await getWorkspaceContext()
  requirePermission(await getRole(), "patients.edit")

  const existing = await db.patient.findFirst({
    where: { id: patientId, workspaceId },
  })
  if (!existing) throw new ActionError(ERR_PATIENT_NOT_FOUND)

  await db.$transaction(async (tx) => {
    await tx.patient.update({
      where: { id: patientId },
      data: {
        whatsappConsent: true,
        whatsappConsentAt: new Date(),
      },
    })

    await tx.consentRecord.create({
      data: {
        workspaceId,
        patientId,
        consentType: "whatsapp_messaging",
        givenBy: clerkId,
        details: "Consentimento para receber mensagens via WhatsApp concedido pelo profissional.",
      },
    })
  })

  await logAudit({
    workspaceId,
    userId: clerkId,
    action: "patient.whatsapp_consent_granted",
    entityType: "Patient",
    entityId: patientId,
  })

  return { success: true }
})

export const revokeWhatsAppConsent = safeAction(async (patientId: string) => {
  const { workspaceId, clerkId } = await getWorkspaceContext()
  requirePermission(await getRole(), "patients.edit")

  const existing = await db.patient.findFirst({
    where: { id: patientId, workspaceId },
  })
  if (!existing) throw new ActionError(ERR_PATIENT_NOT_FOUND)

  await db.$transaction(async (tx) => {
    await tx.patient.update({
      where: { id: patientId },
      data: {
        whatsappConsent: false,
        whatsappConsentAt: null,
      },
    })

    await tx.consentRecord.create({
      data: {
        workspaceId,
        patientId,
        consentType: "whatsapp_messaging_revoked",
        givenBy: clerkId,
        details: "Consentimento para receber mensagens via WhatsApp revogado pelo profissional.",
      },
    })
  })

  await logAudit({
    workspaceId,
    userId: clerkId,
    action: "patient.whatsapp_consent_revoked",
    entityType: "Patient",
    entityId: patientId,
  })

  return { success: true }
})

export async function getDistinctInsurances(): Promise<string[]> {
  const { userId } = await auth()
  if (!userId) return []
  const workspaceId = await getWorkspaceIdCached(userId)
  if (!workspaceId) return []

  const patients = await db.patient.findMany({
    where: { workspaceId, isActive: true, insurance: { not: null } },
    select: { insurance: true },
    distinct: ["insurance"],
  })
  return patients.map(p => p.insurance!).filter(Boolean).sort()
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
