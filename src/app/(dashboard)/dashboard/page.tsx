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

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Painel</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visao geral da {data.clinicName}
        </p>
      </div>

      {/* Stat Cards Row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pacientes</p>
                <p className="text-3xl font-bold mt-1">{data.totalPatients}</p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-xl bg-vox-primary/10">
                <Users className="size-5 text-vox-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Este mes</p>
                <p className="text-3xl font-bold mt-1">{data.monthlyAppointments}</p>
                {monthlyTrend !== 0 && (
                  <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${monthlyTrend > 0 ? "text-vox-success" : "text-vox-error"}`}>
                    {monthlyTrend > 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                    {monthlyTrend > 0 ? "+" : ""}{monthlyTrend}% vs mes anterior
                  </div>
                )}
              </div>
              <div className="flex size-10 items-center justify-center rounded-xl bg-vox-success/10">
                <Stethoscope className="size-5 text-vox-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Agendados</p>
                <p className="text-3xl font-bold mt-1">{data.scheduledAppointments}</p>
                <p className="text-xs text-muted-foreground mt-1">proximas consultas</p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-xl bg-vox-warning/10">
                <CalendarCheck className="size-5 text-vox-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Gravacoes</p>
                <p className="text-3xl font-bold mt-1">{data.totalRecordings}</p>
                <p className="text-xs text-muted-foreground mt-1">audios registrados</p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/10">
                <AudioLines className="size-5 text-indigo-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column — 2/3 */}
        <div className="lg:col-span-2 space-y-6">

          {/* Today's Agenda */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="size-4 text-vox-primary" />
                Agenda de Hoje
              </CardTitle>
              <Link
                href="/calendar"
                className="text-xs text-vox-primary hover:underline flex items-center gap-1"
              >
                Ver agenda completa <ArrowRight className="size-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {data.todayAppointments.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarDays className="size-8 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Nenhuma consulta agendada para hoje.
                  </p>
                  <Link
                    href="/appointments/new"
                    className="inline-flex items-center gap-1.5 mt-3 text-sm text-vox-primary hover:underline"
                  >
                    <Stethoscope className="size-3.5" />
                    Registrar consulta
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.todayAppointments.map((apt) => (
                    <Link
                      key={apt.id}
                      href={`/patients/${apt.patient.id}`}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/60 transition-colors group"
                    >
                      <div className="flex size-9 items-center justify-center rounded-lg bg-vox-primary/10 text-vox-primary text-xs font-bold shrink-0">
                        {formatTime(apt.date)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-vox-primary transition-colors">
                          {apt.patient.name}
                        </p>
                        {apt.procedures.length > 0 && (
                          <p className="text-xs text-muted-foreground truncate">
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
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
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
                <div className="space-y-1">
                  {data.recentAppointments.map((apt) => (
                    <Link
                      key={apt.id}
                      href={`/patients/${apt.patient.id}`}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-muted/60 transition-colors"
                    >
                      <span className="text-xs text-muted-foreground w-14 shrink-0 tabular-nums">
                        {formatDateShort(apt.date)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate block">
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
        <div className="space-y-6">

          {/* Quick Actions */}
          <Card className="border-vox-primary/20 bg-gradient-to-br from-vox-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="size-4 text-vox-primary" />
                Acoes Rapidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link
                href="/appointments/new"
                className="flex items-center gap-3 rounded-xl bg-vox-primary px-4 py-3 text-sm font-medium text-white hover:bg-vox-primary/90 transition-colors"
              >
                <Stethoscope className="size-4" />
                Nova Consulta
              </Link>
              <Link
                href="/patients/new/voice"
                className="flex items-center gap-3 rounded-xl border border-border/60 px-4 py-3 text-sm font-medium hover:bg-muted/60 transition-colors"
              >
                <Mic className="size-4 text-vox-primary" />
                Cadastro por Voz
              </Link>
              <Link
                href="/patients/new"
                className="flex items-center gap-3 rounded-xl border border-border/60 px-4 py-3 text-sm font-medium hover:bg-muted/60 transition-colors"
              >
                <Users className="size-4 text-muted-foreground" />
                Novo Paciente
              </Link>
              <Link
                href="/calendar"
                className="flex items-center gap-3 rounded-xl border border-border/60 px-4 py-3 text-sm font-medium hover:bg-muted/60 transition-colors"
              >
                <CalendarDays className="size-4 text-muted-foreground" />
                Agendar Consulta
              </Link>
            </CardContent>
          </Card>

          {/* Quick Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
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
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
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
                <div className="text-center py-6">
                  <Users className="size-6 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum paciente cadastrado.
                  </p>
                </div>
              ) : (
                <ul className="space-y-1">
                  {data.recentPatients.map((patient) => (
                    <li key={patient.id}>
                      <Link
                        href={`/patients/${patient.id}`}
                        className="flex items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-muted/60 transition-colors"
                      >
                        <span className="font-medium truncate">{patient.name}</span>
                        <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
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
