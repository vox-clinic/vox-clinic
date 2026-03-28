import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { generateXlsxMultiSheet } from "@/lib/export-xlsx"
import { NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/logger"

export async function GET(request: NextRequest) {
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

    const periodParam = request.nextUrl.searchParams.get("period") ?? "6m"
    const period = (["3m", "6m", "12m"].includes(periodParam) ? periodParam : "6m") as "3m" | "6m" | "12m"

    const now = new Date()
    const monthsBack = period === "3m" ? 3 : period === "6m" ? 6 : 12
    const startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1)

    const appointments = await db.appointment.findMany({
      where: {
        workspaceId,
        date: { gte: startDate },
        status: { in: ["completed", "scheduled", "no_show"] },
      },
      include: {
        patient: { select: { id: true, name: true } },
      },
      orderBy: { date: "asc" },
    })

    // Aggregate data
    const totalRevenue = appointments.reduce((sum, a) => sum + (a.price ?? 0), 0)
    const totalAppointments = appointments.length
    const ticketMedio = totalAppointments > 0 ? totalRevenue / totalAppointments : 0
    const noShowCount = appointments.filter((a) => a.status === "no_show").length
    const noShowRate = totalAppointments > 0 ? Math.round((noShowCount / totalAppointments) * 100) : 0

    const patientFrequency: Record<string, number> = {}
    for (const apt of appointments) {
      patientFrequency[apt.patient.id] = (patientFrequency[apt.patient.id] ?? 0) + 1
    }
    const returningPatients = Object.values(patientFrequency).filter((c) => c >= 2).length
    const uniquePatients = Object.keys(patientFrequency).length
    const returnRate = uniquePatients > 0 ? Math.round((returningPatients / uniquePatients) * 100) : 0

    // Summary sheet
    const resumoData = [
      {
        Metrica: "Receita Total",
        Valor: `R$ ${totalRevenue.toFixed(2)}`,
      },
      {
        Metrica: "Total Atendimentos",
        Valor: String(totalAppointments),
      },
      {
        Metrica: "Ticket Medio",
        Valor: `R$ ${ticketMedio.toFixed(2)}`,
      },
      {
        Metrica: "Taxa No-Show",
        Valor: `${noShowRate}%`,
      },
      {
        Metrica: "Taxa Retorno",
        Valor: `${returnRate}%`,
      },
    ]

    // Monthly sheet
    const monthlyMap: Record<string, { count: number; revenue: number }> = {}
    for (let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const label = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
      monthlyMap[label] = { count: 0, revenue: 0 }
    }
    for (const apt of appointments) {
      const d = new Date(apt.date)
      const label = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
      if (monthlyMap[label]) {
        monthlyMap[label].count++
        monthlyMap[label].revenue += apt.price ?? 0
      }
    }
    const mensalData = Object.entries(monthlyMap).map(([month, data]) => ({
      Mes: month,
      Atendimentos: data.count,
      Receita: `R$ ${data.revenue.toFixed(2)}`,
    }))

    // Procedures sheet
    const procedureCounts: Record<string, { count: number; revenue: number }> = {}
    for (const apt of appointments) {
      const procs = apt.procedures as string[]
      for (const proc of procs) {
        const name = typeof proc === "string" ? proc : (proc as any)?.name ?? String(proc)
        if (!procedureCounts[name]) {
          procedureCounts[name] = { count: 0, revenue: 0 }
        }
        procedureCounts[name].count++
        procedureCounts[name].revenue += (apt.price ?? 0) / (procs.length || 1)
      }
    }
    const procedimentosData = Object.entries(procedureCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .map(([name, data]) => ({
        Procedimento: name,
        Quantidade: data.count,
        Receita: `R$ ${data.revenue.toFixed(2)}`,
      }))

    const buffer = generateXlsxMultiSheet([
      { name: "Resumo", data: resumoData },
      { name: "Mensal", data: mensalData },
      { name: "Procedimentos", data: procedimentosData },
    ])

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="relatorio_${period}_${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    })
  } catch (err) {
    logger.error("Reports export failed", { action: "GET /api/export/reports" }, err)
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
}
