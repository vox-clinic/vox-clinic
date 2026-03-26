"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { sendEmail } from "@/lib/email"

async function getAuthContext() {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")
  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true },
  })
  if (!user?.workspace) throw new Error("Workspace not configured")
  return { userId, user, workspaceId: user.workspace.id }
}

type MessageChannel = "email" | "whatsapp" | "sms"

type SendReminderParams = {
  appointmentId: string
  channel: MessageChannel
}

export async function getMessagingConfig() {
  const { workspaceId } = await getAuthContext()

  const workspace = await db.workspace.findUnique({ where: { id: workspaceId } })
  if (!workspace) throw new Error("Workspace not found")

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
  if (!workspace) throw new Error("Workspace not found")

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
  if (!appointment) throw new Error("Consulta nao encontrada")

  const patientName = appointment.patient.name
  const date = appointment.date.toLocaleDateString("pt-BR")
  const time = appointment.date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  const clinicName = user.clinicName ?? "VoxClinic"

  const message = `Ola ${patientName}! Lembrete: sua consulta na ${clinicName} esta marcada para ${date} as ${time}. Caso precise reagendar, entre em contato.`

  if (channel === "email") {
    if (!appointment.patient.email) throw new Error("Paciente nao tem email cadastrado")
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
    // WhatsApp Business API integration point
    // When configured, this would send via the API
    const config = await getMessagingConfig()
    if (!config.whatsappEnabled) {
      throw new Error("WhatsApp nao configurado. Configure a API key em Configuracoes > Mensagens.")
    }
    if (!appointment.patient.phone) throw new Error("Paciente nao tem telefone cadastrado")

    // TODO: Implement actual WhatsApp API call when user provides credentials
    // For now, throw descriptive error
    throw new Error("Integracao WhatsApp em desenvolvimento. Configure sua API key do WhatsApp Business nas configuracoes.")
  }

  if (channel === "sms") {
    const config = await getMessagingConfig()
    if (!config.smsEnabled) {
      throw new Error("SMS nao configurado. Configure as credenciais Twilio em Configuracoes > Mensagens.")
    }
    if (!appointment.patient.phone) throw new Error("Paciente nao tem telefone cadastrado")

    // TODO: Implement Twilio SMS when user provides credentials
    throw new Error("Integracao SMS em desenvolvimento. Configure suas credenciais Twilio nas configuracoes.")
  }

  throw new Error("Canal de mensagem invalido")
}
