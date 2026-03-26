import { db } from "@/lib/db"
import type {
  OutgoingMessage,
  MetaApiResponse,
  MetaApiError,
  PhoneNumberInfo,
  MessageTemplate,
} from "./types"

// ============================================
// WhatsApp Cloud API Client
// ============================================

const META_API_BASE = "https://graph.facebook.com/v21.0"

export class WhatsAppClient {
  private accessToken: string
  private phoneNumberId: string

  constructor(accessToken: string, phoneNumberId: string) {
    this.accessToken = accessToken
    this.phoneNumberId = phoneNumberId
  }

  // ---- Helpers ----

  private async request<T>(
    path: string,
    options?: RequestInit & { params?: Record<string, string> }
  ): Promise<T> {
    const { params, ...fetchOptions } = options || {}
    let url = `${META_API_BASE}${path}`
    if (params) {
      const searchParams = new URLSearchParams(params)
      url += `?${searchParams.toString()}`
    }

    const res = await fetch(url, {
      ...fetchOptions,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...fetchOptions?.headers,
      },
    })

    if (!res.ok) {
      const errorBody = (await res.json().catch(() => null)) as MetaApiError | null
      if (errorBody?.error) {
        throw new Error(
          `WhatsApp API Error [${errorBody.error.code}]: ${errorBody.error.message}`
        )
      }
      throw new Error(`WhatsApp API Error: ${res.status} ${res.statusText}`)
    }

    return res.json() as Promise<T>
  }

  private async send(message: OutgoingMessage): Promise<MetaApiResponse> {
    return this.request<MetaApiResponse>(
      `/${this.phoneNumberId}/messages`,
      {
        method: "POST",
        body: JSON.stringify(message),
      }
    )
  }

  // ---- Enviar Mensagens ----

  /** Envia mensagem de texto simples */
  async sendText(to: string, body: string): Promise<MetaApiResponse> {
    return this.send({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body, preview_url: true },
    })
  }

  /** Envia mensagem usando template aprovado */
  async sendTemplate(
    to: string,
    templateName: string,
    languageCode: string = "pt_BR",
    parameters?: Array<{ type: "text"; text: string }>
  ): Promise<MetaApiResponse> {
    const components = parameters
      ? [{ type: "body" as const, parameters }]
      : undefined

    return this.send({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        components,
      },
    })
  }

  /** Envia mensagem interativa com botoes */
  async sendButtons(
    to: string,
    body: string,
    buttons: Array<{ id: string; title: string }>,
    header?: string,
    footer?: string
  ): Promise<MetaApiResponse> {
    return this.send({
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        ...(header && { header: { type: "text" as const, text: header } }),
        body: { text: body },
        ...(footer && { footer: { text: footer } }),
        action: {
          buttons: buttons.map((b) => ({
            type: "reply" as const,
            reply: { id: b.id, title: b.title },
          })),
        },
      },
    })
  }

  /** Envia mensagem interativa com lista */
  async sendList(
    to: string,
    body: string,
    buttonText: string,
    sections: Array<{
      title: string
      rows: Array<{ id: string; title: string; description?: string }>
    }>,
    header?: string,
    footer?: string
  ): Promise<MetaApiResponse> {
    return this.send({
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "list",
        ...(header && { header: { type: "text" as const, text: header } }),
        body: { text: body },
        ...(footer && { footer: { text: footer } }),
        action: {
          button: buttonText,
          sections,
        },
      },
    })
  }

  /** Marca mensagem como lida */
  async markAsRead(messageId: string): Promise<void> {
    await this.request(`/${this.phoneNumberId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      }),
    })
  }

  // ---- Gerenciamento ----

  /** Busca informacoes do numero de telefone */
  async getPhoneInfo(): Promise<PhoneNumberInfo> {
    return this.request<PhoneNumberInfo>(`/${this.phoneNumberId}`, {
      params: {
        fields:
          "id,display_phone_number,verified_name,quality_rating,code_verification_status",
      },
    })
  }

  /** Lista templates de mensagem */
  async getTemplates(wabaId: string): Promise<MessageTemplate[]> {
    const data = await this.request<{ data: MessageTemplate[] }>(
      `/${wabaId}/message_templates`,
      {
        params: { fields: "name,category,language,status,components" },
      }
    )
    return data.data
  }

  /** Cria um template de mensagem */
  async createTemplate(
    wabaId: string,
    template: {
      name: string
      category: "MARKETING" | "UTILITY" | "AUTHENTICATION"
      language: string
      components: Array<Record<string, unknown>>
    }
  ): Promise<{ id: string; status: string }> {
    return this.request(`/${wabaId}/message_templates`, {
      method: "POST",
      body: JSON.stringify(template),
    })
  }

  /** Faz download de midia recebida */
  async downloadMedia(mediaId: string): Promise<Buffer> {
    const mediaInfo = await this.request<{ url: string }>(`/${mediaId}`)
    const res = await fetch(mediaInfo.url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    })
    if (!res.ok) {
      throw new Error(`Failed to download media: ${res.status}`)
    }
    const arrayBuffer = await res.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }
}

// ---- Factory ----

/**
 * Cria uma instancia do client para um workspace especifico.
 * Busca credenciais do banco de dados via Prisma.
 */
export async function createWhatsAppClient(
  workspaceId: string
): Promise<WhatsAppClient> {
  const config = await db.whatsAppConfig.findFirst({
    where: { workspaceId, isActive: true },
  })

  if (!config) {
    throw new Error("WhatsApp nao configurado para este workspace")
  }

  return new WhatsAppClient(config.accessToken, config.phoneNumberId)
}
