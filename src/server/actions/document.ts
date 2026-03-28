"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { logAudit } from "@/lib/audit"
import { createClient } from "@supabase/supabase-js"
import { env } from "@/lib/env"
import { ERR_UNAUTHORIZED, ERR_WORKSPACE_NOT_CONFIGURED, ERR_PATIENT_NOT_FOUND, ERR_NO_FILE, ERR_FILE_TOO_LARGE, ERR_FILE_TYPE_NOT_ALLOWED, ERR_DOCUMENT_NOT_FOUND, ActionError } from "@/lib/error-messages"

async function getAuthContext() {
  const { userId } = await auth()
  if (!userId) throw new Error(ERR_UNAUTHORIZED)
  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true, memberships: { select: { workspaceId: true }, take: 1 } },
  })
  const workspaceId = user?.workspace?.id ?? user?.memberships?.[0]?.workspaceId
  if (!workspaceId) throw new Error(ERR_WORKSPACE_NOT_CONFIGURED)
  return { userId, workspaceId }
}

function getSupabase() {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
}

function getDocumentType(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "image"
  if (mimeType === "application/pdf") return "pdf"
  return "other"
}

export async function getPatientDocuments(patientId: string) {
  const { workspaceId } = await getAuthContext()

  const patient = await db.patient.findFirst({
    where: { id: patientId, workspaceId },
  })
  if (!patient) throw new Error(ERR_PATIENT_NOT_FOUND)

  const docs = await db.patientDocument.findMany({
    where: { patientId, workspaceId },
    orderBy: { createdAt: "desc" },
  })

  return docs.map((d) => ({
    id: d.id,
    name: d.name,
    url: d.url,
    type: d.type,
    mimeType: d.mimeType,
    fileSize: d.fileSize,
    createdAt: d.createdAt.toISOString(),
  }))
}

export async function uploadPatientDocument(formData: FormData, patientId: string) {
  const { userId, workspaceId } = await getAuthContext()

  const patient = await db.patient.findFirst({
    where: { id: patientId, workspaceId },
  })
  if (!patient) throw new Error(ERR_PATIENT_NOT_FOUND)

  const file = formData.get("file") as File
  if (!file) throw new ActionError(ERR_NO_FILE)

  // 10MB limit for documents
  if (file.size > 10 * 1024 * 1024) {
    throw new ActionError(ERR_FILE_TOO_LARGE)
  }

  const allowedTypes = [
    "image/jpeg", "image/png", "image/webp", "image/gif",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]
  if (!allowedTypes.includes(file.type)) {
    throw new ActionError(ERR_FILE_TYPE_NOT_ALLOWED)
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = file.name.split(".").pop() || "bin"
  const storagePath = `documents/${workspaceId}/${patientId}/${Date.now()}.${ext}`

  const supabase = getSupabase()
  const { error: uploadError } = await supabase.storage
    .from("audio") // reuse existing bucket
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) throw new ActionError("Erro ao fazer upload: " + uploadError.message)

  const doc = await db.patientDocument.create({
    data: {
      patientId,
      workspaceId,
      name: file.name,
      url: storagePath,
      type: getDocumentType(file.type),
      mimeType: file.type,
      fileSize: file.size,
    },
  })

  await logAudit({
    workspaceId,
    userId,
    action: "document.uploaded",
    entityType: "PatientDocument",
    entityId: doc.id,
  })

  return { id: doc.id }
}

export async function getDocumentSignedUrl(documentUrl: string) {
  const { workspaceId } = await getAuthContext()

  // Validate the document belongs to this workspace
  const doc = await db.patientDocument.findFirst({
    where: { url: documentUrl, workspaceId },
  })
  if (!doc) throw new Error(ERR_DOCUMENT_NOT_FOUND)

  const supabase = getSupabase()
  const { data, error } = await supabase.storage
    .from("audio")
    .createSignedUrl(documentUrl, 300) // 5 min

  if (error || !data?.signedUrl) throw new ActionError("Erro ao gerar URL do documento")
  return data.signedUrl
}

export async function deletePatientDocument(documentId: string) {
  const { userId, workspaceId } = await getAuthContext()

  const doc = await db.patientDocument.findFirst({
    where: { id: documentId, workspaceId },
  })
  if (!doc) throw new Error(ERR_DOCUMENT_NOT_FOUND)

  // Delete from storage
  const supabase = getSupabase()
  await supabase.storage.from("audio").remove([doc.url])

  // Delete from database
  await db.patientDocument.delete({ where: { id: documentId } })

  await logAudit({
    workspaceId,
    userId,
    action: "document.deleted",
    entityType: "PatientDocument",
    entityId: documentId,
  })

  return { success: true }
}
