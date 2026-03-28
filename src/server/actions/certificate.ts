"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { logAudit } from "@/lib/audit"
import { ERR_UNAUTHORIZED, ERR_USER_NOT_FOUND, ERR_WORKSPACE_NOT_CONFIGURED, ERR_PATIENT_NOT_FOUND, ERR_CERTIFICATE_NOT_FOUND, ActionError, safeAction } from "@/lib/error-messages"
import { requirePermission, normalizeRole, type WorkspaceRole } from "@/lib/permissions"

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

function generateCertificateContent(
  type: string,
  patientName: string,
  patientDocument: string | null,
  options: { days?: number; startTime?: string; endTime?: string; content?: string }
): string {
  const today = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
  const cpfText = patientDocument ? `, portador(a) do CPF ${patientDocument},` : ""

  switch (type) {
    case "atestado":
      return `Atesto para os devidos fins que o(a) paciente ${patientName}${cpfText} esteve sob meus cuidados profissionais no dia ${today}, necessitando de afastamento de suas atividades por ${options.days ?? 1} dia(s).`
    case "declaracao_comparecimento":
      return `Declaro para os devidos fins que o(a) paciente ${patientName}${cpfText} compareceu a esta clínica no dia ${today} para atendimento, no periodo das ${options.startTime ?? "___"} as ${options.endTime ?? "___"}.`
    case "encaminhamento":
      return options.content ?? ""
    case "laudo":
      return options.content ?? ""
    default:
      return options.content ?? ""
  }
}

export const createCertificate = safeAction(async (data: {
  patientId: string
  type: string
  days?: number
  cid?: string
  cidDescription?: string
  startTime?: string
  endTime?: string
  content?: string
}) => {
  const { userId, workspaceId, role } = await getAuthContext()
  requirePermission(role, "clinical.certificates")

  const validTypes = ["atestado", "declaracao_comparecimento", "encaminhamento", "laudo"]
  if (!validTypes.includes(data.type)) throw new ActionError("Tipo de documento inválido")

  if (data.days !== undefined && data.days !== null) {
    if (data.days < 1) throw new ActionError("Número de dias deve ser maior que zero.")
    if (data.days > 365) throw new ActionError("Máximo de 365 dias permitido.")
  }

  const patient = await db.patient.findFirst({
    where: { id: data.patientId, workspaceId },
  })
  if (!patient) throw new ActionError(ERR_PATIENT_NOT_FOUND)

  const content = generateCertificateContent(data.type, patient.name, patient.document, {
    days: data.days,
    startTime: data.startTime,
    endTime: data.endTime,
    content: data.content,
  })

  if (!content.trim()) throw new ActionError("O conteúdo do documento não pode ser vazio")

  const certificate = await db.medicalCertificate.create({
    data: {
      patientId: data.patientId,
      workspaceId,
      type: data.type,
      content,
      days: data.days ?? null,
      cid: data.cid || null,
      cidDescription: data.cidDescription || null,
    },
  })

  await logAudit({
    workspaceId,
    userId,
    action: "certificate.created",
    entityType: "MedicalCertificate",
    entityId: certificate.id,
  })

  return { id: certificate.id }
})

export async function getCertificate(id: string) {
  const { userId, user, workspaceId } = await getAuthContext()

  const certificate = await db.medicalCertificate.findFirst({
    where: { id, workspaceId },
    include: {
      patient: {
        select: { name: true, document: true },
      },
    },
  })
  if (!certificate) throw new Error(ERR_CERTIFICATE_NOT_FOUND)

  return {
    id: certificate.id,
    type: certificate.type,
    content: certificate.content,
    days: certificate.days,
    cid: certificate.cid,
    cidDescription: certificate.cidDescription,
    patientName: certificate.patient.name,
    patientDocument: certificate.patient.document,
    createdAt: certificate.createdAt.toISOString(),
    clinicName: user.clinicName ?? "Clínica",
    profession: user.profession ?? "Profissional de Saúde",
    doctorName: user.name,
  }
}

export async function getPatientCertificates(patientId: string) {
  const { workspaceId } = await getAuthContext()

  const patient = await db.patient.findFirst({
    where: { id: patientId, workspaceId },
  })
  if (!patient) throw new Error(ERR_PATIENT_NOT_FOUND)

  const certificates = await db.medicalCertificate.findMany({
    where: { patientId, workspaceId },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return certificates.map((c) => ({
    id: c.id,
    type: c.type,
    content: c.content,
    days: c.days,
    cid: c.cid,
    cidDescription: c.cidDescription,
    createdAt: c.createdAt.toISOString(),
  }))
}

export const deleteCertificate = safeAction(async (id: string) => {
  const { userId, workspaceId, role } = await getAuthContext()
  requirePermission(role, "clinical.certificates")

  const certificate = await db.medicalCertificate.findFirst({
    where: { id, workspaceId },
  })
  if (!certificate) throw new ActionError(ERR_CERTIFICATE_NOT_FOUND)

  await db.medicalCertificate.delete({ where: { id } })

  await logAudit({
    workspaceId,
    userId,
    action: "certificate.deleted",
    entityType: "MedicalCertificate",
    entityId: id,
  })

  return { success: true }
})
