"use server"

import { randomUUID } from "crypto"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { logAudit } from "@/lib/audit"
import { ERR_UNAUTHORIZED, ERR_USER_NOT_FOUND, ERR_WORKSPACE_NOT_CONFIGURED, ERR_PATIENT_NOT_FOUND, ERR_PRESCRIPTION_NOT_FOUND, ERR_PATIENT_NO_PHONE, ERR_PATIENT_NO_WHATSAPP_CONSENT, ERR_PATIENT_NO_EMAIL, ActionError, safeAction } from "@/lib/error-messages"
import { requirePermission, normalizeRole, type WorkspaceRole } from "@/lib/permissions"
import { generatePrescriptionPdf as buildPdf } from "@/lib/pdf/prescription-pdf"
import { createClient } from "@supabase/supabase-js"
import { env } from "@/lib/env"
import { createWhatsAppClient } from "@/lib/whatsapp/client"
import { sendEmail } from "@/lib/email"
import { prescriptionEmail } from "@/lib/email-templates"

async function getAuthContext() {
  const { userId } = await auth()
  if (!userId) throw new Error(ERR_UNAUTHORIZED)

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true, memberships: { select: { workspaceId: true, role: true }, take: 1 } },
  })
  if (!user) throw new Error(ERR_USER_NOT_FOUND)
  const workspaceId = user.workspace?.id ?? user.memberships?.[0]?.workspaceId
  if (!workspaceId) throw new Error(ERR_WORKSPACE_NOT_CONFIGURED)

  const role: WorkspaceRole = user.workspace ? "owner" : normalizeRole(user.memberships?.[0]?.role ?? "doctor")

  return { userId, user, workspaceId, role }
}

export const createPrescription = safeAction(async (data: {
  patientId: string
  appointmentId?: string
  medications: { name: string; dosage: string; frequency: string; duration: string; notes?: string }[]
  notes?: string
}) => {
  const { userId, workspaceId, role } = await getAuthContext()
  requirePermission(role, "clinical.prescriptions")

  const patient = await db.patient.findFirst({
    where: { id: data.patientId, workspaceId },
  })
  if (!patient) throw new ActionError(ERR_PATIENT_NOT_FOUND)

  if (!data.medications.length) throw new ActionError("Adicione pelo menos um medicamento")

  for (const med of data.medications) {
    if (!med.name?.trim()) throw new ActionError("Nome do medicamento é obrigatório.")
    if (!med.dosage?.trim()) throw new ActionError("Dosagem é obrigatória para cada medicamento.")
    if (!med.frequency?.trim()) throw new ActionError("Frequência é obrigatória para cada medicamento.")
    if (!med.duration?.trim()) throw new ActionError("Duração é obrigatória para cada medicamento.")
  }

  // Validate appointmentId belongs to this workspace if provided
  if (data.appointmentId) {
    const appointment = await db.appointment.findFirst({
      where: { id: data.appointmentId, workspaceId },
    })
    if (!appointment) throw new ActionError("Consulta nao encontrada neste workspace.")
  }

  const prescription = await db.$transaction(async (tx) => {
    const created = await tx.prescription.create({
      data: {
        patientId: data.patientId,
        workspaceId,
        appointmentId: data.appointmentId || null,
        medications: data.medications,
        notes: data.notes || null,
        source: "manual",
      },
    })

    await logAudit({
      workspaceId,
      userId,
      action: "prescription.created",
      entityType: "Prescription",
      entityId: created.id,
    })

    return created
  })

  return { id: prescription.id, source: "manual" as const }
})

// ---- Update prescription (draft only) ----

export const updatePrescription = safeAction(async (data: {
  prescriptionId: string
  medications: { name: string; dosage: string; frequency: string; duration: string; notes?: string }[]
  notes?: string
  type?: string
}) => {
  const { userId, workspaceId, role } = await getAuthContext()
  requirePermission(role, "clinical.prescriptions")

  const prescription = await db.prescription.findFirst({
    where: { id: data.prescriptionId, workspaceId },
  })
  if (!prescription) throw new ActionError(ERR_PRESCRIPTION_NOT_FOUND)

  if (prescription.status !== "draft") {
    throw new ActionError("Apenas prescrições em rascunho podem ser editadas.")
  }

  if (!data.medications.length) throw new ActionError("Adicione pelo menos um medicamento")

  for (const med of data.medications) {
    if (!med.name?.trim()) throw new ActionError("Nome do medicamento é obrigatório.")
  }

  const VALID_TYPES = ["simple", "special_control", "antimicrobial", "manipulated"]

  await db.$transaction(async (tx) => {
    await tx.prescription.update({
      where: { id: data.prescriptionId },
      data: {
        medications: data.medications,
        notes: data.notes || null,
        ...(data.type && VALID_TYPES.includes(data.type) ? { type: data.type } : {}),
      },
    })

    await logAudit({
      workspaceId,
      userId,
      action: "prescription.updated",
      entityType: "Prescription",
      entityId: data.prescriptionId,
    })
  })

  return { id: data.prescriptionId }
})

// ---- Expiry check helper ----

async function checkPrescriptionExpiry(prescriptionId: string, status: string, validUntil: Date | null): Promise<string> {
  if (status === "signed" && validUntil && validUntil < new Date()) {
    await db.prescription.update({
      where: { id: prescriptionId },
      data: { status: "expired" },
    })
    return "expired"
  }
  return status
}

export async function getPrescription(id: string) {
  const { userId, user, workspaceId } = await getAuthContext()

  const prescription = await db.prescription.findFirst({
    where: { id, workspaceId },
    include: {
      patient: {
        select: { name: true, document: true, phone: true, email: true, whatsappConsent: true },
      },
    },
  })
  if (!prescription) throw new Error(ERR_PRESCRIPTION_NOT_FOUND)

  const currentStatus = await checkPrescriptionExpiry(prescription.id, prescription.status, prescription.validUntil)

  return {
    id: prescription.id,
    patientName: prescription.patient.name,
    patientDocument: prescription.patient.document,
    patientPhone: prescription.patient.phone,
    patientEmail: prescription.patient.email,
    patientWhatsappConsent: prescription.patient.whatsappConsent,
    medications: prescription.medications as { name: string; dosage: string; frequency: string; duration: string; notes?: string }[],
    notes: prescription.notes,
    createdAt: prescription.createdAt.toISOString(),
    clinicName: user.clinicName ?? "Clínica",
    profession: user.profession ?? "Profissional de Saúde",
    doctorName: user.name,
    source: prescription.source,
    signedPdfUrl: prescription.signedPdfUrl,
    sentVia: prescription.sentVia,
    status: currentStatus,
    type: prescription.type,
    validUntil: prescription.validUntil?.toISOString() ?? null,
    signedAt: prescription.signedAt?.toISOString() ?? null,
    cancelledAt: prescription.cancelledAt?.toISOString() ?? null,
    cancelReason: prescription.cancelReason,
  }
}

export async function getPatientPrescriptions(patientId: string) {
  const { workspaceId } = await getAuthContext()

  const patient = await db.patient.findFirst({
    where: { id: patientId, workspaceId },
  })
  if (!patient) throw new Error(ERR_PATIENT_NOT_FOUND)

  const prescriptions = await db.prescription.findMany({
    where: { patientId, workspaceId },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  // Check expiry for each prescription
  const results = await Promise.all(
    prescriptions.map(async (p) => {
      const currentStatus = await checkPrescriptionExpiry(p.id, p.status, p.validUntil)
      return {
        id: p.id,
        medications: p.medications as { name: string; dosage: string; frequency: string; duration: string; notes?: string }[],
        notes: p.notes,
        createdAt: p.createdAt.toISOString(),
        source: p.source,
        signedPdfUrl: p.signedPdfUrl,
        sentVia: p.sentVia,
        status: currentStatus,
        type: p.type,
      }
    })
  )

  return results
}

// ---- Sign prescription ----

export const signPrescription = safeAction(async (prescriptionId: string) => {
  const { userId, workspaceId, role } = await getAuthContext()
  requirePermission(role, "clinical.prescriptions")

  const prescription = await db.prescription.findFirst({
    where: { id: prescriptionId, workspaceId },
  })
  if (!prescription) throw new ActionError(ERR_PRESCRIPTION_NOT_FOUND)

  if (prescription.status !== "draft") {
    throw new ActionError("Apenas prescricoes em rascunho podem ser assinadas.")
  }

  const now = new Date()
  let validUntil: Date

  if (prescription.type === "special_control" || prescription.type === "antimicrobial") {
    validUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  } else {
    // simple and manipulated: 6 months
    validUntil = new Date(now)
    validUntil.setMonth(validUntil.getMonth() + 6)
  }

  const updated = await db.$transaction(async (tx) => {
    const result = await tx.prescription.update({
      where: { id: prescriptionId },
      data: {
        status: "signed",
        signedAt: now,
        signedByUserId: userId,
        verificationToken: randomUUID(),
        validUntil,
      },
    })

    await logAudit({
      workspaceId,
      userId,
      action: "prescription.signed",
      entityType: "Prescription",
      entityId: prescriptionId,
    })

    return result
  })

  return { id: updated.id, status: updated.status }
})

// ---- Cancel prescription ----

export const cancelPrescription = safeAction(async (data: { prescriptionId: string; reason: string }) => {
  const { userId, workspaceId, role } = await getAuthContext()
  requirePermission(role, "clinical.prescriptions")

  if (!data.reason?.trim()) {
    throw new ActionError("Motivo do cancelamento e obrigatorio.")
  }

  const prescription = await db.prescription.findFirst({
    where: { id: data.prescriptionId, workspaceId },
  })
  if (!prescription) throw new ActionError(ERR_PRESCRIPTION_NOT_FOUND)

  if (prescription.status !== "draft" && prescription.status !== "signed") {
    throw new ActionError("Esta prescricao nao pode ser cancelada.")
  }

  await db.$transaction(async (tx) => {
    await tx.prescription.update({
      where: { id: data.prescriptionId },
      data: {
        status: "cancelled",
        cancelledAt: new Date(),
        cancelReason: data.reason.trim(),
      },
    })

    await logAudit({
      workspaceId,
      userId,
      action: "prescription.cancelled",
      entityType: "Prescription",
      entityId: data.prescriptionId,
      details: { reason: data.reason.trim() },
    })
  })

  return { success: true }
})

// ---- Update prescription type ----

const VALID_PRESCRIPTION_TYPES = ["simple", "special_control", "antimicrobial", "manipulated"] as const

export const updatePrescriptionType = safeAction(async (data: { prescriptionId: string; type: string }) => {
  const { userId, workspaceId, role } = await getAuthContext()
  requirePermission(role, "clinical.prescriptions")

  if (!VALID_PRESCRIPTION_TYPES.includes(data.type as any)) {
    throw new ActionError("Tipo de prescricao invalido.")
  }

  const prescription = await db.prescription.findFirst({
    where: { id: data.prescriptionId, workspaceId },
  })
  if (!prescription) throw new ActionError(ERR_PRESCRIPTION_NOT_FOUND)

  if (prescription.status !== "draft") {
    throw new ActionError("Apenas prescricoes em rascunho podem ter o tipo alterado.")
  }

  await db.$transaction(async (tx) => {
    await tx.prescription.update({
      where: { id: data.prescriptionId },
      data: { type: data.type },
    })

    await logAudit({
      workspaceId,
      userId,
      action: "prescription.type_updated",
      entityType: "Prescription",
      entityId: data.prescriptionId,
      details: { from: prescription.type, to: data.type },
    })
  })

  return { success: true }
})

export const deletePrescription = safeAction(async (id: string) => {
  const { userId, workspaceId, role } = await getAuthContext()
  requirePermission(role, "clinical.prescriptions")

  const prescription = await db.prescription.findFirst({
    where: { id, workspaceId },
  })
  if (!prescription) throw new ActionError(ERR_PRESCRIPTION_NOT_FOUND)

  await db.prescription.delete({ where: { id } })

  await logAudit({
    workspaceId,
    userId,
    action: "prescription.deleted",
    entityType: "Prescription",
    entityId: id,
  })

  return { success: true }
})

export const generatePrescriptionPdfAction = safeAction(async (prescriptionId: string) => {
  const { userId, user, workspaceId, role } = await getAuthContext()
  requirePermission(role, "clinical.prescriptions")

  const prescription = await db.prescription.findFirst({
    where: { id: prescriptionId, workspaceId },
    include: {
      patient: {
        select: { name: true, document: true },
      },
    },
  })
  if (!prescription) throw new ActionError(ERR_PRESCRIPTION_NOT_FOUND)

  const medications = prescription.medications as {
    name: string
    dosage?: string
    frequency?: string
    duration?: string
    notes?: string
  }[]

  const pdfBytes = await buildPdf({
    clinicName: user.clinicName ?? "Clinica",
    profession: user.profession ?? "Profissional de Saude",
    patientName: prescription.patient.name,
    patientCpf: prescription.patient.document ?? undefined,
    date: prescription.createdAt,
    medications: medications.map((m) => ({
      name: m.name,
      dosage: m.dosage,
      frequency: m.frequency,
      duration: m.duration,
      instructions: m.notes,
    })),
    notes: prescription.notes ?? undefined,
    doctorName: user.name,
    doctorProfession: user.profession ?? undefined,
    type: (prescription.type as "simple" | "special_control" | "antimicrobial" | "manipulated") ?? "simple",
  })

  // Upload to Supabase Storage
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  const storagePath = `prescriptions/${workspaceId}/${prescriptionId}.pdf`

  const { error: uploadError } = await supabase.storage
    .from("audio") // reuse existing bucket
    .upload(storagePath, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    })
  if (uploadError) throw new ActionError("Erro ao salvar PDF. Tente novamente.")

  // Get signed URL (1 hour expiry)
  const { data: signedData, error: signedError } = await supabase.storage
    .from("audio")
    .createSignedUrl(storagePath, 3600)
  if (signedError || !signedData?.signedUrl) {
    throw new ActionError("Erro ao gerar link do PDF. Tente novamente.")
  }

  // Update prescription with the storage path
  await db.prescription.update({
    where: { id: prescriptionId },
    data: { signedPdfUrl: storagePath },
  })

  await logAudit({
    workspaceId,
    userId,
    action: "prescription.pdf_generated",
    entityType: "Prescription",
    entityId: prescriptionId,
  })

  return { url: signedData.signedUrl }
})

// ---- Helper: ensure PDF exists and return a signed URL ----

async function ensurePdfSignedUrl(
  prescriptionId: string,
  workspaceId: string,
  userId: string,
  user: { name: string; clinicName: string | null; profession: string | null }
): Promise<string> {
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  const storagePath = `prescriptions/${workspaceId}/${prescriptionId}.pdf`

  const prescription = await db.prescription.findFirst({
    where: { id: prescriptionId, workspaceId },
    include: { patient: { select: { name: true, document: true } } },
  })
  if (!prescription) throw new ActionError(ERR_PRESCRIPTION_NOT_FOUND)

  // If PDF was already generated, just create a new signed URL
  if (prescription.signedPdfUrl) {
    const { data: signedData, error: signedError } = await supabase.storage
      .from("audio")
      .createSignedUrl(prescription.signedPdfUrl, 86400) // 24h for sending
    if (signedError || !signedData?.signedUrl) {
      throw new ActionError("Erro ao gerar link do PDF. Tente novamente.")
    }
    return signedData.signedUrl
  }

  // Generate PDF
  const medications = prescription.medications as {
    name: string; dosage?: string; frequency?: string; duration?: string; notes?: string
  }[]

  const pdfBytes = await buildPdf({
    clinicName: user.clinicName ?? "Clinica",
    profession: user.profession ?? "Profissional de Saude",
    patientName: prescription.patient.name,
    patientCpf: prescription.patient.document ?? undefined,
    date: prescription.createdAt,
    medications: medications.map((m) => ({
      name: m.name,
      dosage: m.dosage,
      frequency: m.frequency,
      duration: m.duration,
      instructions: m.notes,
    })),
    notes: prescription.notes ?? undefined,
    doctorName: user.name,
    doctorProfession: user.profession ?? undefined,
    type: (prescription.type as "simple" | "special_control" | "antimicrobial" | "manipulated") ?? "simple",
  })

  const { error: uploadError } = await supabase.storage
    .from("audio")
    .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: true })
  if (uploadError) throw new ActionError("Erro ao salvar PDF. Tente novamente.")

  await db.prescription.update({
    where: { id: prescriptionId },
    data: { signedPdfUrl: storagePath },
  })

  const { data: signedData, error: signedError } = await supabase.storage
    .from("audio")
    .createSignedUrl(storagePath, 86400)
  if (signedError || !signedData?.signedUrl) {
    throw new ActionError("Erro ao gerar link do PDF. Tente novamente.")
  }

  await logAudit({
    workspaceId,
    userId,
    action: "prescription.pdf_generated",
    entityType: "Prescription",
    entityId: prescriptionId,
  })

  return signedData.signedUrl
}

// ---- Send via WhatsApp ----

export const sendPrescriptionWhatsApp = safeAction(async (prescriptionId: string) => {
  const { userId, user, workspaceId, role } = await getAuthContext()
  requirePermission(role, "clinical.prescriptions")

  const prescription = await db.prescription.findFirst({
    where: { id: prescriptionId, workspaceId },
    include: { patient: { select: { name: true, phone: true, whatsappConsent: true } } },
  })
  if (!prescription) throw new ActionError(ERR_PRESCRIPTION_NOT_FOUND)
  if (!prescription.patient.phone) throw new ActionError(ERR_PATIENT_NO_PHONE)
  if (!prescription.patient.whatsappConsent) throw new ActionError(ERR_PATIENT_NO_WHATSAPP_CONSENT)

  // Ensure PDF exists and get signed URL
  const pdfUrl = await ensurePdfSignedUrl(prescriptionId, workspaceId, userId, user)

  // Send WhatsApp message
  let client
  try {
    client = await createWhatsAppClient(workspaceId)
  } catch {
    throw new ActionError("WhatsApp não configurado para este workspace.")
  }

  const message = `Olá ${prescription.patient.name}, segue sua prescrição médica. Acesse o documento: ${pdfUrl}`
  await client.sendText(prescription.patient.phone, message)

  // Update prescription sentVia, sentAt, and status
  const currentSentVia = prescription.sentVia ?? []
  const updatedSentVia = currentSentVia.includes("whatsapp") ? currentSentVia : [...currentSentVia, "whatsapp"]

  await db.prescription.update({
    where: { id: prescriptionId },
    data: {
      sentVia: updatedSentVia,
      ...(!prescription.sentAt && { sentAt: new Date() }),
      ...(prescription.status === "signed" && { status: "sent" }),
    },
  })

  await logAudit({
    workspaceId,
    userId,
    action: "prescription.sent_whatsapp",
    entityType: "Prescription",
    entityId: prescriptionId,
    details: { to: prescription.patient.phone },
  })

  return { success: true as const }
})

// ---- Send via Email ----

export const sendPrescriptionEmail = safeAction(async (prescriptionId: string) => {
  const { userId, user, workspaceId, role } = await getAuthContext()
  requirePermission(role, "clinical.prescriptions")

  const prescription = await db.prescription.findFirst({
    where: { id: prescriptionId, workspaceId },
    include: { patient: { select: { name: true, email: true } } },
  })
  if (!prescription) throw new ActionError(ERR_PRESCRIPTION_NOT_FOUND)
  if (!prescription.patient.email) throw new ActionError(ERR_PATIENT_NO_EMAIL)

  // Ensure PDF exists and get signed URL
  const pdfUrl = await ensurePdfSignedUrl(prescriptionId, workspaceId, userId, user)

  // Build medications summary
  const medications = prescription.medications as { name: string; dosage?: string }[]
  const medicationsSummary = medications.map((m) => `${m.name}${m.dosage ? ` — ${m.dosage}` : ""}`).join("<br>")

  const clinicName = user.clinicName ?? "Clínica"
  const dateStr = prescription.createdAt.toLocaleDateString("pt-BR")

  // Send email
  const html = prescriptionEmail({
    patientName: prescription.patient.name,
    clinicName,
    doctorName: user.name,
    medicationsSummary,
    pdfUrl,
    date: dateStr,
  })

  await sendEmail({
    to: prescription.patient.email,
    subject: `Sua prescrição médica — ${clinicName}`,
    html,
  })

  // Update prescription sentVia, sentAt, and status
  const currentSentVia = prescription.sentVia ?? []
  const updatedSentVia = currentSentVia.includes("email") ? currentSentVia : [...currentSentVia, "email"]

  await db.prescription.update({
    where: { id: prescriptionId },
    data: {
      sentVia: updatedSentVia,
      ...(!prescription.sentAt && { sentAt: new Date() }),
      ...(prescription.status === "signed" && { status: "sent" }),
    },
  })

  await logAudit({
    workspaceId,
    userId,
    action: "prescription.sent_email",
    entityType: "Prescription",
    entityId: prescriptionId,
    details: { to: prescription.patient.email },
  })

  return { success: true as const }
})
