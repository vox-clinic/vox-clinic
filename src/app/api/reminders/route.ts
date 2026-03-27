import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { env } from "@/lib/env"
import { sendEmail } from "@/lib/email"
import { appointmentReminder } from "@/lib/email-templates"
import { WhatsAppClient } from "@/lib/whatsapp/client"
import { decrypt } from "@/lib/crypto"

// Vercel Cron invokes via GET; re-export POST handler as GET for compatibility
export { POST as GET }

export async function POST(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization")
  if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Find tomorrow's appointments
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const startOfDay = new Date(tomorrow)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(tomorrow)
    endOfDay.setHours(23, 59, 59, 999)

    const appointments = await db.appointment.findMany({
      where: {
        date: { gte: startOfDay, lte: endOfDay },
        status: "scheduled",
        reminderSentAt: null, // only appointments that haven't been reminded
      },
      include: {
        patient: true,
        workspace: { include: { user: true } },
      },
    })

    // Pre-load WhatsApp configs for all workspaces involved
    const workspaceIds = [...new Set(appointments.map(a => a.workspaceId))]
    const whatsappConfigs = await db.whatsAppConfig.findMany({
      where: { workspaceId: { in: workspaceIds }, isActive: true },
    })
    const configByWorkspace = new Map(whatsappConfigs.map(c => [c.workspaceId, c]))

    let emailSent = 0
    let whatsappSent = 0
    let skipped = 0
    const errors: string[] = []

    for (const appointment of appointments) {
      const clinicName = appointment.workspace.user.clinicName || "Clinica"
      const dateStr = appointment.date.toLocaleDateString("pt-BR")
      const timeStr = appointment.date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })

      // Try WhatsApp first (preferred), then email fallback
      const waConfig = configByWorkspace.get(appointment.workspaceId)
      const phone = appointment.patient.phone?.replace(/\D/g, "")

      if (waConfig && phone && phone.length >= 10) {
        try {
          const client = new WhatsAppClient(decrypt(waConfig.accessToken), waConfig.phoneNumberId)
          await client.sendButtons(
            phone,
            `Ola ${appointment.patient.name}! Lembrete: sua consulta na ${clinicName} esta marcada para ${dateStr} as ${timeStr}.\n\nPor favor, confirme sua presenca:`,
            [
              { id: `confirm_${appointment.id}`, title: "Confirmar" },
              { id: `cancel_${appointment.id}`, title: "Nao poderei ir" },
            ],
            clinicName,
            "Responda para confirmar ou cancelar"
          )
          await db.appointment.update({
            where: { id: appointment.id },
            data: { reminderSentAt: new Date() },
          })
          whatsappSent++
          continue // WhatsApp sent, skip email
        } catch (error) {
          errors.push(
            `WhatsApp ${appointment.id}: ${error instanceof Error ? error.message : "Erro"}`
          )
          // Fall through to email
        }
      }

      // Email fallback
      if (appointment.patient.email) {
        try {
          const html = appointmentReminder({
            patientName: appointment.patient.name,
            appointmentDate: appointment.date,
            clinicName,
          })
          await sendEmail({
            to: appointment.patient.email,
            subject: `Lembrete: Consulta agendada - ${clinicName}`,
            html,
          })
          await db.appointment.update({
            where: { id: appointment.id },
            data: { reminderSentAt: new Date() },
          })
          emailSent++
        } catch (error) {
          errors.push(
            `Email ${appointment.id}: ${error instanceof Error ? error.message : "Erro"}`
          )
        }
      } else {
        skipped++
      }
    }

    return NextResponse.json({
      success: true,
      date: tomorrow.toISOString().split("T")[0],
      total: appointments.length,
      emailSent,
      whatsappSent,
      skipped,
      errors,
    })
  } catch (error) {
    console.error("Reminder cron error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
