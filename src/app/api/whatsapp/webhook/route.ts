import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import type {
  WebhookPayload,
  IncomingMessage,
  MessageStatus,
} from "@/lib/whatsapp/types"

// ============================================
// GET /api/whatsapp/webhook
// Verificacao do webhook pela Meta
// ============================================

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  if (mode === "subscribe" && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    console.log("[WhatsApp Webhook] Verificacao bem-sucedida")
    return new NextResponse(challenge, { status: 200 })
  }

  console.warn("[WhatsApp Webhook] Verificacao falhou - token invalido")
  return NextResponse.json({ error: "Token invalido" }, { status: 403 })
}

// ============================================
// POST /api/whatsapp/webhook
// Recebe mensagens e status updates
// ============================================

export async function POST(request: NextRequest) {
  try {
    const payload: WebhookPayload = await request.json()

    // Meta espera 200 rapido — processe async
    processWebhookAsync(payload).catch((err) =>
      console.error("[WhatsApp Webhook] Erro no processamento:", err)
    )

    return NextResponse.json({ status: "ok" }, { status: 200 })
  } catch (error) {
    console.error("[WhatsApp Webhook] Erro ao parsear payload:", error)
    return NextResponse.json({ status: "ok" }, { status: 200 }) // sempre 200 pra Meta
  }
}

// ============================================
// Processamento Assincrono
// ============================================

async function processWebhookAsync(payload: WebhookPayload) {
  if (payload.object !== "whatsapp_business_account") return

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      if (change.field !== "messages") continue

      const { value } = change
      const phoneNumberId = value.metadata.phone_number_id

      // Identifica o workspace pelo phoneNumberId
      const config = await db.whatsAppConfig.findFirst({
        where: { phoneNumberId, isActive: true },
      })
      if (!config) {
        console.warn(
          `[WhatsApp Webhook] Config nao encontrada para phone_number_id: ${phoneNumberId}`
        )
        continue
      }

      // Processa mensagens recebidas
      if (value.messages) {
        for (const message of value.messages) {
          const contactName =
            value.contacts?.find((c) => c.wa_id === message.from)?.profile
              .name || "Desconhecido"

          await handleIncomingMessage(config.workspaceId, config.id, message, contactName)
        }
      }

      // Processa atualizacoes de status
      if (value.statuses) {
        for (const status of value.statuses) {
          await handleStatusUpdate(status)
        }
      }

      // Processa erros
      if (value.errors) {
        for (const error of value.errors) {
          console.error(
            `[WhatsApp Webhook] Erro [${error.code}]: ${error.title} - ${error.message}`
          )
        }
      }
    }
  }
}

// ============================================
// Handlers
// ============================================

async function handleIncomingMessage(
  workspaceId: string,
  configId: string,
  message: IncomingMessage,
  contactName: string
) {
  console.log(
    `[WhatsApp] Mensagem recebida de ${message.from}: ${message.type}`
  )

  const content = extractContent(message)

  // Cria ou atualiza conversa
  const conversation = await db.whatsAppConversation.upsert({
    where: {
      workspaceId_contactPhone_configId: {
        workspaceId,
        contactPhone: message.from,
        configId,
      },
    },
    create: {
      workspaceId,
      configId,
      contactPhone: message.from,
      contactName,
      lastMessageAt: new Date(parseInt(message.timestamp) * 1000),
      lastMessagePreview: content.substring(0, 100),
      status: "open",
      unreadCount: 1,
    },
    update: {
      contactName,
      lastMessageAt: new Date(parseInt(message.timestamp) * 1000),
      lastMessagePreview: content.substring(0, 100),
      unreadCount: { increment: 1 },
      status: "open",
    },
  })

  // Salva a mensagem
  await db.whatsAppMessage.create({
    data: {
      conversationId: conversation.id,
      workspaceId,
      waMessageId: message.id,
      direction: "inbound",
      type: message.type,
      content,
      mediaUrl: extractMediaId(message),
      status: "delivered",
    },
  })
}

async function handleStatusUpdate(status: MessageStatus) {
  console.log(
    `[WhatsApp] Status update: ${status.id} -> ${status.status}`
  )

  await db.whatsAppMessage.updateMany({
    where: { waMessageId: status.id },
    data: { status: status.status },
  })

  if (status.errors) {
    console.error(
      `[WhatsApp] Mensagem ${status.id} falhou:`,
      status.errors
    )
  }
}

// ============================================
// Helpers
// ============================================

function extractContent(message: IncomingMessage): string {
  switch (message.type) {
    case "text":
      return message.text?.body || ""
    case "image":
      return message.image?.caption || "[Imagem]"
    case "document":
      return message.document?.filename || "[Documento]"
    case "audio":
      return "[Audio]"
    case "video":
      return message.video?.caption || "[Video]"
    case "location":
      return `[Localizacao: ${message.location?.latitude}, ${message.location?.longitude}]`
    case "button":
      return message.button?.text || "[Botao]"
    case "interactive":
      return (
        message.interactive?.button_reply?.title ||
        message.interactive?.list_reply?.title ||
        "[Interativo]"
      )
    default:
      return `[${message.type}]`
  }
}

function extractMediaId(message: IncomingMessage): string | undefined {
  switch (message.type) {
    case "image":
      return message.image?.id
    case "document":
      return message.document?.id
    case "audio":
      return message.audio?.id
    case "video":
      return message.video?.id
    default:
      return undefined
  }
}
