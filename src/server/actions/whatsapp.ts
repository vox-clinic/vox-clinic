"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { createWhatsAppClient } from "@/lib/whatsapp/client"

// ============================================
// Server Actions - WhatsApp
// ============================================

async function getWorkspaceId(): Promise<string> {
  const { userId } = await auth()
  if (!userId) throw new Error("Nao autenticado")

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true },
  })
  if (!user?.workspace) throw new Error("Workspace nao encontrado")

  return user.workspace.id
}

// ---- Configuracao ----

export async function getWhatsAppConfig() {
  const workspaceId = await getWorkspaceId()
  return db.whatsAppConfig.findFirst({
    where: { workspaceId, isActive: true },
  })
}

export async function saveWhatsAppConfig(data: {
  phoneNumberId: string
  wabaId: string
  displayPhoneNumber: string
  businessName: string
  accessToken: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const workspaceId = await getWorkspaceId()

    await db.whatsAppConfig.upsert({
      where: {
        workspaceId_phoneNumberId: {
          workspaceId,
          phoneNumberId: data.phoneNumberId,
        },
      },
      create: {
        workspaceId,
        ...data,
        webhookSecret: crypto.randomUUID(),
        isActive: true,
      },
      update: {
        ...data,
        isActive: true,
      },
    })

    return { success: true }
  } catch (error) {
    console.error("[WhatsApp Config] Erro:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao salvar",
    }
  }
}

export async function disconnectWhatsApp(): Promise<{ success: boolean }> {
  try {
    const workspaceId = await getWorkspaceId()

    await db.whatsAppConfig.updateMany({
      where: { workspaceId },
      data: { isActive: false },
    })

    return { success: true }
  } catch (error) {
    console.error("[WhatsApp Disconnect] Erro:", error)
    return { success: false }
  }
}

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

export async function sendTextMessage(
  conversationId: string,
  to: string,
  text: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const workspaceId = await getWorkspaceId()
    const client = await createWhatsAppClient(workspaceId)

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
  } catch (error) {
    console.error("[WhatsApp Send] Erro:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao enviar",
    }
  }
}

export async function sendTemplateMessage(
  to: string,
  templateName: string,
  params?: Array<{ type: "text"; text: string }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const workspaceId = await getWorkspaceId()
    const client = await createWhatsAppClient(workspaceId)

    await client.sendTemplate(to, templateName, "pt_BR", params)

    return { success: true }
  } catch (error) {
    console.error("[WhatsApp Template Send] Erro:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao enviar template",
    }
  }
}

export async function markConversationAsRead(
  conversationId: string,
  lastMessageWaId: string
): Promise<void> {
  try {
    const workspaceId = await getWorkspaceId()
    const client = await createWhatsAppClient(workspaceId)

    await client.markAsRead(lastMessageWaId)

    await db.whatsAppConversation.update({
      where: { id: conversationId },
      data: { unreadCount: 0 },
    })
  } catch (error) {
    console.error("[WhatsApp markAsRead] Erro:", error)
  }
}

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
      return { templates: [], error: "WhatsApp nao configurado" }
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
      return { connected: false, error: "Nao configurado" }
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
      error: error instanceof Error ? error.message : "Erro de conexao",
    }
  }
}
