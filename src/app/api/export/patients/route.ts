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

    const patients = await db.patient.findMany({
      where: { workspaceId, isActive: true },
      orderBy: { name: "asc" },
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

    const buffer = generateXlsx(rows, "Pacientes")

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="pacientes_${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    })
  } catch (err) {
    logger.error("Patient export failed", { action: "GET /api/export/patients" }, err)
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
}
