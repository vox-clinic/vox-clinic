import { getDashboardData } from "@/server/actions/dashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  CalendarDays,
  Mic,
  Search,
  Stethoscope,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowRight,
  CalendarCheck,
  AudioLines,
  Sparkles,
} from "lucide-react"
import Link from "next/link"
import { QuickSearch } from "./quick-search"

export default async function DashboardPage() {
  const data = await getDashboardData()

  const formatDate = (date: Date | null) => {
    if (!date) return "Sem atendimento"
    return new Date(date).toLocaleDateString("pt-BR")
  }

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDateShort = (date: Date) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    })
  }

  // Monthly trend
  const monthlyDiff = data.monthlyAppointments - data.lastMonthAppointments
  const monthlyTrend = data.lastMonthAppointments > 0
    ? Math.round((monthlyDiff / data.lastMonthAppointments) * 100)
    : data.monthlyAppointments > 0 ? 100 : 0

  const statusLabel: Record<string, string> = {
    scheduled: "Agendado",
    completed: "Concluido",
    cancelled: "Cancelado",
    no_show: "Faltou",
  }

  const statusColor: Record<string, string> = {
    scheduled: "bg-vox-primary/10 text-vox-primary",
    completed: "bg-vox-success/10 text-vox-success",
    cancelled: "bg-vox-error/10 text-vox-error",
    no_show: "bg-vox-warning/10 text-vox-warning",
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite"

  return (
    <div className="space-y-6">
      {/* ─── Hero Greeting ─── */}
      <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-vox-primary/[0.06] via-card to-vox-primary/[0.03] p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-vox-primary/[0.05] blur-3xl" />
        <div className="relative flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{greeting}</p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {data.clinicName}
            </h1>
          </div>
          <Link
            href="/appointments/new"
            className="mt-3 sm:mt-0 inline-flex items-center gap-2 rounded-xl bg-vox-primary px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-vox-primary/20 transition-all hover:bg-vox-primary/90 hover:shadow-xl hover:shadow-vox-primary/25 active:scale-[0.98]"
          >
            <Mic className="size-4" />
            Nova Consulta
          </Link>
        </div>
      </div>

      {/* ─── Stat Cards ─── */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="group relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-vox-primary/[0.04] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Pacientes</p>
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
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Este mes</p>
                <p className="text-2xl font-bold mt-0.5 tabular-nums">{data.monthlyAppointments}</p>
                {monthlyTrend !== 0 && (
                  <div className={`flex items-center gap-1 mt-0.5 text-[11px] font-medium ${monthlyTrend > 0 ? "text-vox-success" : "text-vox-error"}`}>
                    {monthlyTrend > 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                    {monthlyTrend > 0 ? "+" : ""}{monthlyTrend}%
                  </div>
                )}
              </div>
              <div className="flex size-9 items-center justify-center rounded-xl bg-vox-success/10">
                <Stethoscope className="size-4 text-vox-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-vox-warning/[0.04] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Agendados</p>
                <p className="text-2xl font-bold mt-0.5 tabular-nums">{data.scheduledAppointments}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">proximas</p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-xl bg-vox-warning/10">
                <CalendarCheck className="size-4 text-vox-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-vox-primary/[0.04] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Gravacoes</p>
                <p className="text-2xl font-bold mt-0.5 tabular-nums">{data.totalRecordings}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">audios</p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-xl bg-vox-primary/10">
                <AudioLines className="size-4 text-vox-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Main Content Grid ─── */}
      <div className="grid gap-5 lg:grid-cols-3 xl:grid-cols-4">
        {/* Left Column — 2/3 */}
        <div className="lg:col-span-2 xl:col-span-3 space-y-5">

          {/* Today's Agenda */}
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Clock className="size-4 text-vox-primary" />
                Agenda de Hoje
              </CardTitle>
              <Link
                href="/calendar"
                className="text-xs text-vox-primary hover:underline flex items-center gap-1"
              >
                Ver agenda <ArrowRight className="size-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {data.todayAppointments.length === 0 ? (
                <div className="text-center py-6">
                  <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-muted/60">
                    <CalendarDays className="size-5 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Nenhuma consulta para hoje
                  </p>
                  <Link
                    href="/appointments/new"
                    className="inline-flex items-center gap-1.5 mt-2 text-xs text-vox-primary hover:underline"
                  >
                    <Stethoscope className="size-3" />
                    Registrar consulta
                  </Link>
                </div>
              ) : (
                <div className="space-y-1">
                  {data.todayAppointments.map((apt) => (
                    <Link
                      key={apt.id}
                      href={`/patients/${apt.patient.id}`}
                      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/50 transition-all"
                    >
                      <div className="flex size-9 items-center justify-center rounded-lg bg-vox-primary/10 text-[11px] font-bold text-vox-primary tabular-nums shrink-0">
                        {formatTime(apt.date)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-vox-primary transition-colors">
                          {apt.patient.name}
                        </p>
                        {apt.procedures.length > 0 && (
                          <p className="text-[11px] text-muted-foreground truncate">
                            {apt.procedures.join(", ")}
                          </p>
                        )}
                      </div>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${statusColor[apt.status] ?? "bg-muted text-muted-foreground"}`}>
                        {statusLabel[apt.status] ?? apt.status}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <CalendarDays className="size-4 text-vox-primary" />
                Atividade Recente
              </CardTitle>
              <Link
                href="/calendar"
                className="text-xs text-vox-primary hover:underline flex items-center gap-1"
              >
                Ver tudo <ArrowRight className="size-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {data.recentAppointments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhum atendimento registrado.
                </p>
              ) : (
                <div className="space-y-0.5">
                  {data.recentAppointments.map((apt) => (
                    <Link
                      key={apt.id}
                      href={`/patients/${apt.patient.id}`}
                      className="group flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-muted/50 transition-all"
                    >
                      <span className="text-[11px] text-muted-foreground w-12 shrink-0 tabular-nums">
                        {formatDateShort(apt.date)}
                      </span>
                      <div className="flex size-7 items-center justify-center rounded-full bg-muted text-[10px] font-semibold shrink-0">
                        {apt.patient.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate block group-hover:text-vox-primary transition-colors">
                          {apt.patient.name}
                        </span>
                      </div>
                      {apt.procedures.length > 0 && (
                        <div className="hidden sm:flex gap-1 shrink-0">
                          {apt.procedures.slice(0, 2).map((proc, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px]">
                              {proc}
                            </Badge>
                          ))}
                          {apt.procedures.length > 2 && (
                            <Badge variant="secondary" className="text-[10px]">
                              +{apt.procedures.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${statusColor[apt.status] ?? "bg-muted text-muted-foreground"}`}>
                        {statusLabel[apt.status] ?? apt.status}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column — 1/3 */}
        <div className="space-y-5">

          {/* Quick Actions */}
          <Card className="border-vox-primary/15 bg-gradient-to-br from-vox-primary/[0.04] to-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Sparkles className="size-4 text-vox-primary" />
                Acoes Rapidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              <Link
                href="/appointments/new"
                className="group flex items-center gap-3 rounded-xl bg-vox-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-vox-primary/15 transition-all hover:bg-vox-primary/90 hover:shadow-md hover:shadow-vox-primary/20 active:scale-[0.98]"
              >
                <Stethoscope className="size-4" />
                Nova Consulta
                <ArrowRight className="size-3.5 ml-auto opacity-50 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/patients/new/voice"
                className="group flex items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-2.5 text-sm font-medium transition-all hover:bg-muted/50 hover:border-border active:scale-[0.98]"
              >
                <Mic className="size-4 text-vox-primary" />
                Cadastro por Voz
                <ArrowRight className="size-3.5 ml-auto opacity-0 transition-all group-hover:opacity-40 group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/patients/new"
                className="group flex items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-2.5 text-sm font-medium transition-all hover:bg-muted/50 hover:border-border active:scale-[0.98]"
              >
                <Users className="size-4 text-muted-foreground" />
                Novo Paciente
                <ArrowRight className="size-3.5 ml-auto opacity-0 transition-all group-hover:opacity-40 group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/calendar"
                className="group flex items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-2.5 text-sm font-medium transition-all hover:bg-muted/50 hover:border-border active:scale-[0.98]"
              >
                <CalendarDays className="size-4 text-muted-foreground" />
                Agendar Consulta
                <ArrowRight className="size-3.5 ml-auto opacity-0 transition-all group-hover:opacity-40 group-hover:translate-x-0.5" />
              </Link>
            </CardContent>
          </Card>

          {/* Quick Search */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Search className="size-4 text-vox-primary" />
                Busca Rapida
              </CardTitle>
            </CardHeader>
            <CardContent>
              <QuickSearch />
            </CardContent>
          </Card>

          {/* Recent Patients */}
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="size-4 text-vox-primary" />
                Pacientes Recentes
              </CardTitle>
              <Link
                href="/patients"
                className="text-xs text-vox-primary hover:underline"
              >
                Ver todos
              </Link>
            </CardHeader>
            <CardContent>
              {data.recentPatients.length === 0 ? (
                <div className="text-center py-4">
                  <Users className="size-6 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum paciente cadastrado.
                  </p>
                </div>
              ) : (
                <ul className="space-y-0.5">
                  {data.recentPatients.map((patient) => (
                    <li key={patient.id}>
                      <Link
                        href={`/patients/${patient.id}`}
                        className="group flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-muted/50 transition-all"
                      >
                        <div className="flex size-7 items-center justify-center rounded-full bg-vox-primary/10 text-[10px] font-bold text-vox-primary shrink-0">
                          {patient.name.charAt(0)}
                        </div>
                        <span className="font-medium truncate flex-1 group-hover:text-vox-primary transition-colors">
                          {patient.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {formatDate(patient.lastAppointment)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
