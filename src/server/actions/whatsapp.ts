"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { encrypt, decrypt } from "@/lib/crypto"
import { checkFeatureAccess } from "@/lib/plan-enforcement"
import { createWhatsAppClient } from "@/lib/whatsapp/client"
import { logAudit } from "@/lib/audit"
import { safeAction, ActionError } from "@/lib/error-messages"

// ============================================
// Server Actions - WhatsApp
// ============================================

async function getAuthContext(): Promise<{ workspaceId: string; userId: string }> {
  const { userId } = await auth()
  if (!userId) throw new Error("Não autenticado")

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true, memberships: { select: { workspaceId: true }, take: 1 } },
  })

  const workspaceId = user?.workspace?.id ?? user?.memberships?.[0]?.workspaceId
  if (!workspaceId) throw new Error("Workspace não encontrado")

  return { workspaceId, userId: user!.id }
}

async function getWorkspaceId(): Promise<string> {
  const { workspaceId } = await getAuthContext()
  return workspaceId
}

// ---- Configuracao ----

export async function getWhatsAppConfig() {
  const workspaceId = await getWorkspaceId()
  const config = await db.whatsAppConfig.findFirst({
    where: { workspaceId, isActive: true },
  })
  if (!config) return null

  return {
    ...config,
    accessToken: decrypt(config.accessToken),
  }
}

export const saveWhatsAppConfig = safeAction(async (data: {
  phoneNumberId: string
  wabaId: string
  displayPhoneNumber: string
  businessName: string
  accessToken: string
}) => {
  const workspaceId = await getWorkspaceId()

  // Plan enforcement: check WhatsApp feature access
  const workspace = await db.workspace.findUnique({ where: { id: workspaceId }, select: { plan: true } })
  const planCheck = checkFeatureAccess(workspace?.plan ?? "free", "whatsapp")
  if (!planCheck.allowed) throw new ActionError(planCheck.reason ?? "Recurso não disponível no seu plano")

  const encryptedData = {
    ...data,
    accessToken: encrypt(data.accessToken),
  }

  await db.whatsAppConfig.upsert({
    where: {
      workspaceId_phoneNumberId: {
        workspaceId,
        phoneNumberId: data.phoneNumberId,
      },
    },
    create: {
      workspaceId,
      ...encryptedData,
      webhookSecret: crypto.randomUUID(),
      isActive: true,
    },
    update: {
      ...encryptedData,
      isActive: true,
    },
  })

  return { success: true }
})

export const disconnectWhatsApp = safeAction(async () => {
  const workspaceId = await getWorkspaceId()

  await db.whatsAppConfig.updateMany({
    where: { workspaceId },
    data: { isActive: false },
  })

  return { success: true }
})

// ---- Conversas ----

export async function fetchConversations(
  status?: string,
  page = 1,
  limit = 50
) {
  const workspaceId = await getWorkspaceId()
  const offset = (page - 1) * limit

  const [conversations, total] = await Promise.all([
    db.whatsAppConversation.findMany({
      where: { workspaceId, ...(status && { status }) },
      orderBy: { lastMessageAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.whatsAppConversation.count({
      where: { workspaceId, ...(status && { status }) },
    }),
  ])

  return { conversations, total }
}

export async function fetchMessages(
  conversationId: string,
  before?: string
) {
  const workspaceId = await getWorkspaceId()

  return db.whatsAppMessage.findMany({
    where: {
      conversationId,
      workspaceId,
      ...(before && { createdAt: { lt: new Date(before) } }),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  })
}

// ---- Envio de Mensagens ----

export const sendTextMessage = safeAction(async (
  conversationId: string,
  to: string,
  text: string
) => {
  const { workspaceId, userId } = await getAuthContext()
  const client = await createWhatsAppClient(workspaceId)

  // Audit: WhatsApp credential accessed to send message
  logAudit({
    workspaceId,
    userId,
    action: "credential.accessed",
    entityType: "WhatsAppConfig",
    entityId: workspaceId,
    details: { credentialType: "whatsapp_access_token", purpose: "sendTextMessage", to },
  }).catch(() => {})

  const result = await client.sendText(to, text)

  await db.whatsAppMessage.create({
    data: {
      conversationId,
      workspaceId,
      waMessageId: result.messages[0].id,
      direction: "outbound",
      type: "text",
      content: text,
      status: "sent",
    },
  })

  return { success: true }
})

export const sendTemplateMessage = safeAction(async (
  to: string,
  templateName: string,
  params?: Array<{ type: "text"; text: string }>
) => {
  const { workspaceId, userId } = await getAuthContext()
  const client = await createWhatsAppClient(workspaceId)

  // Audit: WhatsApp credential accessed to send template
  logAudit({
    workspaceId,
    userId,
    action: "credential.accessed",
    entityType: "WhatsAppConfig",
    entityId: workspaceId,
    details: { credentialType: "whatsapp_access_token", purpose: "sendTemplateMessage", to, templateName },
  }).catch(() => {})

  await client.sendTemplate(to, templateName, "pt_BR", params)

  return { success: true }
})

export const markConversationAsRead = safeAction(async (
  conversationId: string,
  lastMessageWaId: string
) => {
  const workspaceId = await getWorkspaceId()
  const client = await createWhatsAppClient(workspaceId)

  await client.markAsRead(lastMessageWaId)

  await db.whatsAppConversation.updateMany({
    where: { id: conversationId, workspaceId },
    data: { unreadCount: 0 },
  })

  return { success: true }
})

// ---- Templates ----

export async function fetchTemplates(): Promise<{
  templates: Array<Record<string, unknown>>
  error?: string
}> {
  try {
    const workspaceId = await getWorkspaceId()
    const config = await db.whatsAppConfig.findFirst({
      where: { workspaceId, isActive: true },
    })

    if (!config) {
      return { templates: [], error: "WhatsApp não configurado" }
    }

    const client = await createWhatsAppClient(workspaceId)
    const templates = await client.getTemplates(config.wabaId)

    return { templates: templates as unknown as Array<Record<string, unknown>> }
  } catch (error) {
    console.error("[WhatsApp Templates] Erro:", error)
    return {
      templates: [],
      error: error instanceof Error ? error.message : "Erro ao buscar templates",
    }
  }
}

// ---- Status / Health ----

export async function checkWhatsAppHealth(): Promise<{
  connected: boolean
  phoneNumber?: string
  businessName?: string
  qualityRating?: string
  error?: string
}> {
  try {
    const workspaceId = await getWorkspaceId()
    const config = await db.whatsAppConfig.findFirst({
      where: { workspaceId, isActive: true },
    })

    if (!config) {
      return { connected: false, error: "Não configurado" }
    }

    const client = await createWhatsAppClient(workspaceId)
    const info = await client.getPhoneInfo()

    return {
      connected: true,
      phoneNumber: info.display_phone_number,
      businessName: info.verified_name,
      qualityRating: info.quality_rating,
    }
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : "Erro de conexão",
    }
  }
}
