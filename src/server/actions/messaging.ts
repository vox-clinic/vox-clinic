"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { sendEmail } from "@/lib/email"
import { ERR_UNAUTHORIZED, ERR_USER_NOT_FOUND, ERR_WORKSPACE_NOT_CONFIGURED, ERR_WORKSPACE_NOT_FOUND, ERR_APPOINTMENT_NOT_FOUND, ERR_PATIENT_NO_EMAIL, ERR_PATIENT_NO_PHONE, ERR_WHATSAPP_NOT_CONFIGURED, ERR_INVALID_CHANNEL, ActionError } from "@/lib/error-messages"

async function getAuthContext() {
  const { userId } = await auth()
  if (!userId) throw new Error(ERR_UNAUTHORIZED)
  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true, memberships: { select: { workspaceId: true }, take: 1 } },
  })
  if (!user) throw new Error(ERR_USER_NOT_FOUND)
  const workspaceId = user.workspace?.id ?? user.memberships?.[0]?.workspaceId
  if (!workspaceId) throw new Error(ERR_WORKSPACE_NOT_CONFIGURED)
  return { userId, user, workspaceId }
}

type MessageChannel = "email" | "whatsapp" | "sms"

type SendReminderParams = {
  appointmentId: string
  channel: MessageChannel
}

export async function getMessagingConfig() {
  const { workspaceId } = await getAuthContext()

  const workspace = await db.workspace.findUnique({ where: { id: workspaceId } })
  if (!workspace) throw new Error(ERR_WORKSPACE_NOT_FOUND)

  // Messaging config stored in workspace categories JSON (reuse existing field)
  const config = (workspace.categories as any)?.messaging ?? {}

  return {
    emailEnabled: !!process.env.RESEND_API_KEY,
    whatsappEnabled: !!config.whatsappApiKey,
    smsEnabled: !!config.twilioAccountSid,
    whatsappPhone: config.whatsappPhone ?? "",
    twilioPhone: config.twilioPhone ?? "",
  }
}

export async function updateMessagingConfig(data: {
  whatsappApiKey?: string
  whatsappPhone?: string
  twilioAccountSid?: string
  twilioAuthToken?: string
  twilioPhone?: string
}) {
  const { workspaceId } = await getAuthContext()

  const workspace = await db.workspace.findUnique({ where: { id: workspaceId } })
  if (!workspace) throw new Error(ERR_WORKSPACE_NOT_FOUND)

  const existing = (workspace.categories as any) ?? {}
  const messaging = { ...(existing.messaging ?? {}), ...data }

  await db.workspace.update({
    where: { id: workspaceId },
    data: {
      categories: { ...existing, messaging } as any,
    },
  })

  return { success: true }
}

export async function sendAppointmentMessage({ appointmentId, channel }: SendReminderParams) {
  const { user, workspaceId } = await getAuthContext()

  const appointment = await db.appointment.findFirst({
    where: { id: appointmentId, workspaceId },
    include: { patient: true },
  })
  if (!appointment) throw new Error(ERR_APPOINTMENT_NOT_FOUND)

  const patientName = appointment.patient.name
  const date = appointment.date.toLocaleDateString("pt-BR")
  const time = appointment.date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  const clinicName = user.clinicName ?? "VoxClinic"

  const message = `Ola ${patientName}! Lembrete: sua consulta na ${clinicName} esta marcada para ${date} as ${time}. Caso precise reagendar, entre em contato.`

  if (channel === "email") {
    if (!appointment.patient.email) throw new ActionError(ERR_PATIENT_NO_EMAIL)
    await sendEmail({
      to: appointment.patient.email,
      subject: `Lembrete de consulta — ${clinicName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #14B8A6;">${clinicName}</h2>
          <p>${message}</p>
          <p style="color: #666; font-size: 12px;">Este e um lembrete automatico.</p>
        </div>
      `,
    })
    return { sent: true, channel: "email" }
  }

  if (channel === "whatsapp") {
    if (!appointment.patient.phone) throw new ActionError(ERR_PATIENT_NO_PHONE)

    const waConfig = await db.whatsAppConfig.findFirst({
      where: { workspaceId, isActive: true },
    })
    if (!waConfig) {
      throw new ActionError(ERR_WHATSAPP_NOT_CONFIGURED)
    }

    const { WhatsAppClient } = await import("@/lib/whatsapp/client")
    const { decrypt } = await import("@/lib/crypto")
    const waClient = new WhatsAppClient(decrypt(waConfig.accessToken), waConfig.phoneNumberId)
    const phone = appointment.patient.phone.replace(/\D/g, "")

    await waClient.sendText(phone, message)
    return { sent: true, channel: "whatsapp" }
  }

  if (channel === "sms") {
    const config = await getMessagingConfig()
    if (!config.smsEnabled) {
      throw new ActionError("SMS nao configurado. Configure as credenciais Twilio em Configuracoes > Mensagens.")
    }
    if (!appointment.patient.phone) throw new ActionError(ERR_PATIENT_NO_PHONE)

    // TODO: Implement Twilio SMS when user provides credentials
    throw new ActionError("Integracao SMS em desenvolvimento. Configure suas credenciais Twilio nas configuracoes.")
  }

  throw new ActionError(ERR_INVALID_CHANNEL)
}
