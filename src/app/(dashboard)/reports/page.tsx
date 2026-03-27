"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  BarChart3,
  TrendingUp,
  Users,
  CalendarDays,
  DollarSign,
  Clock,
  UserCheck,
  UserX,
  Stethoscope,
  Download,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { getReportsData } from "@/server/actions/reports"

type ReportsData = Awaited<ReturnType<typeof getReportsData>>

const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)

const COLORS = {
  primary: "#14B8A6",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  muted: "#94A3B8",
}

const PIE_COLORS = [COLORS.primary, COLORS.success, COLORS.error, COLORS.warning]

const STATUS_LABELS: Record<string, string> = {
  completed: "Concluidos",
  scheduled: "Agendados",
  cancelled: "Cancelados",
  no_show: "Faltaram",
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<"3m" | "6m" | "12m">("6m")
  const [data, setData] = useState<ReportsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await getReportsData(period))
    } catch (err) {
      const msg = err instanceof Error ? err.message : ""
      setError(msg.includes("plano") || msg.includes("Limite") || msg.includes("upgrade")
        ? "upgrade"
        : msg || "Erro ao carregar relatorios")
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!data) return (
    <div className="text-center py-16 space-y-4">
      {error === "upgrade" ? (
        <>
          <BarChart3 className="size-12 text-muted-foreground/40 mx-auto" />
          <div>
            <h2 className="text-lg font-semibold">Relatorios indisponiveis no plano atual</h2>
            <p className="text-sm text-muted-foreground mt-1">Faca upgrade para o plano Pro para acessar relatorios e analytics.</p>
          </div>
          <a href="/settings/billing" className="inline-flex items-center gap-2 rounded-xl bg-vox-primary px-4 py-2 text-sm font-medium text-white hover:bg-vox-primary/90 transition-colors">
            Fazer Upgrade
          </a>
        </>
      ) : (
        <p className="text-muted-foreground">{error || "Erro ao carregar relatorios"}</p>
      )}
    </div>
  )

  const statusPieData = Object.entries(data.statusCounts)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({ name: STATUS_LABELS[key] ?? key, value }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <BarChart3 className="size-5 text-vox-primary" />
            Relatorios
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Analise de desempenho da clinica
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/export/reports?period=${period}`}
            download
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/50 bg-card px-3.5 py-1.5 text-xs font-medium transition-all hover:bg-accent hover:border-border/70 active:scale-[0.98]"
          >
            <Download className="size-3.5 text-muted-foreground" />
            Exportar Excel
          </a>
          <div className="flex rounded-xl bg-muted/50 p-0.5">
            {(["3m", "6m", "12m"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  period === p
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p === "3m" ? "3 Meses" : p === "6m" ? "6 Meses" : "1 Ano"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <Card className="group relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-vox-primary/[0.04] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Pacientes</p>
                <p className="text-2xl font-bold mt-0.5 tabular-nums">{data.totalPatients}</p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-xl bg-vox-primary/10">
                <Users className="size-4 text-vox-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-vox-success/[0.04] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Consultas</p>
                <p className="text-2xl font-bold mt-0.5 tabular-nums">{data.totalAppointments}</p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-xl bg-vox-success/10">
                <CalendarDays className="size-4 text-vox-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-vox-success/[0.04] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Receita</p>
                <p className="text-lg font-bold mt-0.5 tabular-nums text-vox-success">{formatBRL(data.totalRevenue)}</p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-xl bg-vox-success/10">
                <DollarSign className="size-4 text-vox-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-vox-primary/[0.04] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Retorno</p>
                <p className="text-2xl font-bold mt-0.5 tabular-nums">{data.returnRate}%</p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-xl bg-vox-primary/10">
                <UserCheck className="size-4 text-vox-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-vox-warning/[0.04] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">No-show</p>
                <p className="text-2xl font-bold mt-0.5 tabular-nums">{data.noShowRate}%</p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-xl bg-vox-warning/10">
                <UserX className="size-4 text-vox-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        {data.nps.total > 0 && (
          <Card className="group relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-vox-primary/[0.04] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">NPS</p>
                  <p className="text-2xl font-bold mt-0.5 tabular-nums">{data.nps.score ?? "-"}</p>
                  <p className="text-[10px] text-muted-foreground">{data.nps.total} respostas · media {data.nps.average}</p>
                </div>
                <div className="flex size-9 items-center justify-center rounded-xl bg-vox-primary/10">
                  <BarChart3 className="size-4 text-vox-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Revenue chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="size-4 text-vox-primary" />
              Receita Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyRevenue} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/30" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }}
                    formatter={(value) => [formatBRL(Number(value)), "Receita"]}
                  />
                  <Bar dataKey="revenue" fill={COLORS.primary} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* New patients per month */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="size-4 text-vox-primary" />
              Novos Pacientes / Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.monthlyPatients} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/30" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="currentColor" className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 10 }} stroke="currentColor" className="text-muted-foreground" allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }} />
                  <Line type="monotone" dataKey="newPatients" stroke={COLORS.primary} strokeWidth={2} dot={{ r: 3, fill: COLORS.primary }} name="Novos" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status distribution pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CalendarDays className="size-4 text-vox-primary" />
              Status das Consultas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52 flex items-center">
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                      {statusPieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 shrink-0">
                {statusPieData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="size-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-[11px] text-muted-foreground">{item.name}</span>
                    <span className="text-[11px] font-semibold tabular-nums ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hour distribution heatmap */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="size-4 text-vox-primary" />
              Horarios mais Procurados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.hourDistribution} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/30" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} stroke="currentColor" className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 10 }} stroke="currentColor" className="text-muted-foreground" allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }} formatter={(v) => [Number(v), "Consultas"]} />
                  <Bar dataKey="count" fill={COLORS.success} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top procedures */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Stethoscope className="size-4 text-vox-primary" />
              Procedimentos mais Realizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.topProcedures.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">Nenhum procedimento registrado</p>
              ) : (
                data.topProcedures.map((proc, i) => {
                  const max = data.topProcedures[0]?.count ?? 1
                  const width = (proc.count / max) * 100
                  return (
                    <div key={proc.name} className="flex items-center gap-3">
                      <span className="text-[11px] text-muted-foreground w-5 shrink-0 text-right tabular-nums">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-medium truncate">{proc.name}</span>
                          <span className="text-[11px] tabular-nums font-semibold shrink-0 ml-2">{proc.count}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-vox-primary/60 transition-all duration-500"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Patient Rankings */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top patients by frequency */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <UserCheck className="size-4 text-vox-primary" />
              Pacientes mais Frequentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.topPatientsByFrequency.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">Sem dados</p>
              ) : (
                data.topPatientsByFrequency.map((p, i) => {
                  const max = data.topPatientsByFrequency[0]?.visits ?? 1
                  const width = (p.visits / max) * 100
                  return (
                    <div key={`freq-${i}`} className="flex items-center gap-3">
                      <span className="text-[11px] text-muted-foreground w-5 shrink-0 text-right tabular-nums">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-medium truncate">{p.name}</span>
                          <span className="text-[11px] tabular-nums font-semibold shrink-0 ml-2">{p.visits} consultas</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                          <div className="h-full rounded-full bg-vox-primary/60 transition-all duration-500" style={{ width: `${width}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top patients by revenue */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <DollarSign className="size-4 text-vox-primary" />
              Pacientes por Receita
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.topPatientsByRevenue.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">Sem dados</p>
              ) : (
                data.topPatientsByRevenue.filter(p => p.revenue > 0).map((p, i) => {
                  const max = data.topPatientsByRevenue[0]?.revenue ?? 1
                  const width = max > 0 ? (p.revenue / max) * 100 : 0
                  return (
                    <div key={`rev-${i}`} className="flex items-center gap-3">
                      <span className="text-[11px] text-muted-foreground w-5 shrink-0 text-right tabular-nums">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-medium truncate">{p.name}</span>
                          <span className="text-[11px] tabular-nums font-semibold shrink-0 ml-2">{formatBRL(p.revenue)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-500/60 transition-all duration-500" style={{ width: `${width}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
