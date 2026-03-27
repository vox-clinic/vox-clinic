import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { env } from "@/lib/env"
import { sendEmail } from "@/lib/email"
import { WhatsAppClient } from "@/lib/whatsapp/client"
import { decrypt } from "@/lib/crypto"
import { apiLimiter } from "@/lib/rate-limit"

// Vercel Cron invokes via GET; re-export POST handler as GET for compatibility
export { POST as GET }

export async function POST(req: Request) {
  const token = req.headers.get("authorization") || req.headers.get("x-forwarded-for") || "anonymous"
  const { success } = apiLimiter.check(10, `birthdays:${token}`)
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }

  const authHeader = req.headers.get("authorization")
  if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const now = new Date()
    const todayMonth = now.getMonth() + 1 // 1-12
    const todayDay = now.getDate()

    // Find all patients born today (any year)
    // Prisma doesn't support EXTRACT(month/day), so we fetch patients with birthDate set
    // and filter in JS — acceptable since birthday check runs once/day
    const patients = await db.patient.findMany({
      where: {
        isActive: true,
        birthDate: { not: null },
      },
      include: {
        workspace: { include: { user: true } },
      },
    })

    const birthdayPatients = patients.filter((p) => {
      if (!p.birthDate) return false
      const bd = new Date(p.birthDate)
      return bd.getMonth() + 1 === todayMonth && bd.getDate() === todayDay
    })

    // Pre-load WhatsApp configs
    const workspaceIds = [...new Set(birthdayPatients.map(p => p.workspaceId))]
    const waConfigs = await db.whatsAppConfig.findMany({
      where: { workspaceId: { in: workspaceIds }, isActive: true },
    })
    const configByWorkspace = new Map(waConfigs.map(c => [c.workspaceId, c]))

    let whatsappSent = 0
    let emailSent = 0
    let skipped = 0
    const errors: string[] = []

    for (const patient of birthdayPatients) {
      const clinicName = patient.workspace.user.clinicName || "Clinica"
      const message = `Feliz aniversario, ${patient.name}! A equipe da ${clinicName} deseja a voce um dia maravilhoso! 🎂`

      const waConfig = configByWorkspace.get(patient.workspaceId)
      const phone = patient.phone?.replace(/\D/g, "")

      // Try WhatsApp first
      if (waConfig && phone && phone.length >= 10) {
        try {
          const client = new WhatsAppClient(decrypt(waConfig.accessToken), waConfig.phoneNumberId)
          await client.sendText(phone, message)
          whatsappSent++
          continue
        } catch (error) {
          errors.push(`WhatsApp ${patient.id}: ${error instanceof Error ? error.message : "Erro"}`)
        }
      }

      // Email fallback
      if (patient.email) {
        try {
          await sendEmail({
            to: patient.email,
            subject: `Feliz Aniversario! - ${clinicName}`,
            html: `
              <div style="font-family:sans-serif;max-width:480px;margin:0 auto;text-align:center;padding:32px;">
                <h2 style="color:#14B8A6;font-size:24px;">🎂 Feliz Aniversario!</h2>
                <p style="color:#3f3f46;font-size:16px;line-height:1.6;">
                  Ola <strong>${patient.name}</strong>,<br><br>
                  A equipe da <strong>${clinicName}</strong> deseja a voce um dia maravilhoso!
                </p>
                <p style="color:#71717a;font-size:13px;margin-top:24px;">
                  Com carinho, ${clinicName}
                </p>
              </div>
            `,
          })
          emailSent++
        } catch (error) {
          errors.push(`Email ${patient.id}: ${error instanceof Error ? error.message : "Erro"}`)
        }
      } else {
        skipped++
      }
    }

    return NextResponse.json({
      success: true,
      date: now.toISOString().split("T")[0],
      totalBirthdays: birthdayPatients.length,
      whatsappSent,
      emailSent,
      skipped,
      errors,
    })
  } catch (error) {
    console.error("Birthday cron error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
