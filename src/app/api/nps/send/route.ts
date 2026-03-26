import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { env } from "@/lib/env"
import { sendEmail } from "@/lib/email"
import { WhatsAppClient } from "@/lib/whatsapp/client"
import { decrypt } from "@/lib/crypto"
import { apiLimiter } from "@/lib/rate-limit"

// Cron job: send NPS surveys for appointments completed today
export async function POST(req: Request) {
  const token = req.headers.get("authorization") || req.headers.get("x-forwarded-for") || "anonymous"
  const { success } = apiLimiter.check(10, `nps-send:${token}`)
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }

  const authHeader = req.headers.get("authorization")
  if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const now = new Date()
    const startOfDay = new Date(now)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(now)
    endOfDay.setHours(23, 59, 59, 999)

    // Find today's completed appointments that don't have an NPS survey yet
    const appointments = await db.appointment.findMany({
      where: {
        status: "completed",
        date: { gte: startOfDay, lte: endOfDay },
        // Exclude appointments that already have a survey
        NOT: {
          id: {
            in: (await db.npsSurvey.findMany({
              where: { appointmentId: { not: null } },
              select: { appointmentId: true },
            })).map(s => s.appointmentId!),
          },
        },
      },
      include: {
        patient: true,
        workspace: { include: { user: true } },
      },
    })

    const workspaceIds = [...new Set(appointments.map(a => a.workspaceId))]
    const waConfigs = await db.whatsAppConfig.findMany({
      where: { workspaceId: { in: workspaceIds }, isActive: true },
    })
    const configByWorkspace = new Map(waConfigs.map(c => [c.workspaceId, c]))

    let sent = 0
    let skipped = 0
    const errors: string[] = []

    for (const apt of appointments) {
      // Create survey record
      const survey = await db.npsSurvey.create({
        data: {
          workspaceId: apt.workspaceId,
          patientId: apt.patientId,
          appointmentId: apt.id,
        },
      })

      const clinicName = apt.workspace.user.clinicName || "Clinica"
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.voxclinic.com"
      const surveyUrl = `${baseUrl}/nps/${survey.token}`
      const message = `Ola ${apt.patient.name}! Como foi seu atendimento na ${clinicName} hoje? Avalie em 30 segundos: ${surveyUrl}`

      const waConfig = configByWorkspace.get(apt.workspaceId)
      const phone = apt.patient.phone?.replace(/\D/g, "")

      if (waConfig && phone && phone.length >= 10) {
        try {
          const client = new WhatsAppClient(decrypt(waConfig.accessToken), waConfig.phoneNumberId)
          await client.sendText(phone, message)
          sent++
          continue
        } catch (error) {
          errors.push(`WhatsApp ${apt.id}: ${error instanceof Error ? error.message : "Erro"}`)
        }
      }

      if (apt.patient.email) {
        try {
          await sendEmail({
            to: apt.patient.email,
            subject: `Como foi seu atendimento? - ${clinicName}`,
            html: `
              <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;text-align:center;">
                <h2 style="color:#14B8A6;font-size:20px;">Como foi seu atendimento?</h2>
                <p style="color:#3f3f46;font-size:15px;line-height:1.6;">
                  Ola <strong>${apt.patient.name}</strong>,<br><br>
                  Gostaríamos de saber como foi sua experiencia na <strong>${clinicName}</strong> hoje.
                </p>
                <a href="${surveyUrl}" style="display:inline-block;margin:24px 0;padding:12px 32px;background-color:#14B8A6;color:white;text-decoration:none;border-radius:12px;font-weight:600;font-size:14px;">
                  Avaliar Atendimento
                </a>
                <p style="color:#71717a;font-size:12px;">Leva menos de 30 segundos</p>
              </div>
            `,
          })
          sent++
        } catch (error) {
          errors.push(`Email ${apt.id}: ${error instanceof Error ? error.message : "Erro"}`)
        }
      } else {
        skipped++
      }
    }

    return NextResponse.json({
      success: true,
      total: appointments.length,
      sent,
      skipped,
      errors,
    })
  } catch (error) {
    console.error("NPS cron error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
