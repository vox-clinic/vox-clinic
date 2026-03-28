import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { generateXlsx } from "@/lib/export-xlsx"
import { NextResponse } from "next/server"
import { logger } from "@/lib/logger"

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { clerkId: userId },
      include: { workspace: true },
    })
    if (!user?.workspace) {
      return NextResponse.json({ error: "Workspace not configured" }, { status: 400 })
    }

    const workspaceId = user.workspace.id

    const EXPORT_LIMIT = 10000

    const totalCount = await db.patient.count({ where: { workspaceId, isActive: true } })
    const truncated = totalCount > EXPORT_LIMIT

    const patients = await db.patient.findMany({
      where: { workspaceId, isActive: true },
      orderBy: { name: "asc" },
      take: EXPORT_LIMIT,
      include: {
        appointments: {
          orderBy: { date: "desc" },
          take: 1,
          select: { date: true },
        },
      },
    })

    const rows = patients.map((p) => ({
      Nome: p.name,
      CPF: p.document ?? "",
      RG: p.rg ?? "",
      Telefone: p.phone ?? "",
      Email: p.email ?? "",
      "Data Nascimento": p.birthDate
        ? new Date(p.birthDate).toLocaleDateString("pt-BR")
        : "",
      Sexo: p.gender ?? "",
      Convenio: p.insurance ?? "",
      Origem: p.source ?? "",
      Tags: p.tags.join(", "),
      "Cadastrado em": new Date(p.createdAt).toLocaleDateString("pt-BR"),
      "Ultimo Atendimento": p.appointments[0]?.date
        ? new Date(p.appointments[0].date).toLocaleDateString("pt-BR")
        : "",
    }))

    const buffer = await generateXlsx(rows, "Pacientes")

    const headers: Record<string, string> = {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="pacientes_${new Date().toISOString().split("T")[0]}.xlsx"`,
    }
    if (truncated) {
      headers["X-Export-Truncated"] = "true"
      headers["X-Export-Total"] = String(totalCount)
      headers["X-Export-Limit"] = String(EXPORT_LIMIT)
    }

    return new NextResponse(new Uint8Array(buffer), { status: 200, headers })
  } catch (err) {
    logger.error("Patient export failed", { action: "GET /api/export/patients" }, err)
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
}
