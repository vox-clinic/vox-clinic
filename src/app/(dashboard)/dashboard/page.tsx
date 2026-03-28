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
  UserPlus,
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
    <div data-testid="page-dashboard" className="space-y-6">
      {/* ─── Hero Greeting ─── */}
      <div data-tour="hero-card" className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-vox-primary/[0.05] via-card to-vox-primary/[0.02] p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-vox-primary/[0.06] blur-3xl" />
        <div className="pointer-events-none absolute -left-10 -bottom-10 size-32 rounded-full bg-vox-primary/[0.03] blur-2xl" />
        <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[13px] text-muted-foreground font-medium">{greeting}</p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl mt-0.5">
              {data.clinicName}
            </h1>
          </div>
          <Link
            href="/appointments/new"
            aria-label="Nova Consulta"
            data-tour="cta-nova-consulta"
            className="mt-3 sm:mt-0 inline-flex items-center gap-2 rounded-xl bg-vox-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-vox-primary/25 transition-all hover:bg-vox-primary/90 hover:shadow-xl hover:shadow-vox-primary/30 hover:-translate-y-px active:translate-y-0 active:shadow-md focus-visible:ring-2 focus-visible:ring-vox-primary/50 focus-visible:ring-offset-2 outline-none"
          >
            <Mic className="size-4" />
            Nova Consulta
          </Link>
        </div>
      </div>

      {/* ─── Stat Cards ─── */}
      <div data-tour="stats-grid" data-testid="section-stats" className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="group relative overflow-hidden transition-shadow hover:shadow-md">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-vox-primary/[0.04] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">Pacientes</p>
                <p className="text-[28px] font-bold mt-1 tabular-nums leading-none tracking-tight">{data.totalPatients}</p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-xl bg-vox-primary/[0.08] transition-colors group-hover:bg-vox-primary/[0.12]">
                <Users className="size-[18px] text-vox-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden transition-shadow hover:shadow-md">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-vox-success/[0.04] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">Este mes</p>
                <p className="text-[28px] font-bold mt-1 tabular-nums leading-none tracking-tight">{data.monthlyAppointments}</p>
                {monthlyTrend !== 0 && (
                  <div className={`inline-flex items-center gap-1 mt-1.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${monthlyTrend > 0 ? "text-vox-success bg-vox-success/10" : "text-vox-error bg-vox-error/10"}`}>
                    {monthlyTrend > 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                    {monthlyTrend > 0 ? "+" : ""}{monthlyTrend}%
                  </div>
                )}
              </div>
              <div className="flex size-10 items-center justify-center rounded-xl bg-vox-success/[0.08] transition-colors group-hover:bg-vox-success/[0.12]">
                <Stethoscope className="size-[18px] text-vox-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden transition-shadow hover:shadow-md">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-vox-warning/[0.04] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">Agendados</p>
                <p className="text-[28px] font-bold mt-1 tabular-nums leading-none tracking-tight">{data.scheduledAppointments}</p>
                <p className="text-[11px] text-muted-foreground/60 mt-1">proximas consultas</p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-xl bg-vox-warning/[0.08] transition-colors group-hover:bg-vox-warning/[0.12]">
                <CalendarCheck className="size-[18px] text-vox-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden transition-shadow hover:shadow-md">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-vox-primary/[0.04] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">Gravacoes</p>
                <p className="text-[28px] font-bold mt-1 tabular-nums leading-none tracking-tight">{data.totalRecordings}</p>
                <p className="text-[11px] text-muted-foreground/60 mt-1">audios salvos</p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-xl bg-vox-primary/[0.08] transition-colors group-hover:bg-vox-primary/[0.12]">
                <AudioLines className="size-[18px] text-vox-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Quick Actions Row ─── */}
      <div data-tour="quick-actions" data-testid="section-quick-actions" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { href: "/appointments/new", label: "Nova Consulta", icon: Stethoscope, accent: true },
          { href: "/patients/new/voice", label: "Cadastro por Voz", icon: Mic },
          { href: "/patients/new", label: "Novo Paciente", icon: UserPlus },
          { href: "/calendar", label: "Agendar Consulta", icon: CalendarDays },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            aria-label={action.label}
            className={`group flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-[12px] font-medium transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-vox-primary/50 focus-visible:ring-offset-2 outline-none ${
              action.accent
                ? "border-vox-primary/20 bg-vox-primary/[0.05] text-vox-primary hover:bg-vox-primary/[0.10]"
                : "border-border/50 bg-card hover:bg-accent hover:border-border/70"
            }`}
          >
            <div className={`flex size-7 items-center justify-center rounded-lg shrink-0 ${
              action.accent ? "bg-vox-primary/[0.12]" : "bg-muted"
            }`}>
              <action.icon className={`size-3.5 ${action.accent ? "text-vox-primary" : "text-muted-foreground"}`} />
            </div>
            <span className="truncate">{action.label}</span>
          </Link>
        ))}
      </div>

      {/* ─── Main Content Grid ─── */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Today's Agenda */}
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <div className="flex size-6 items-center justify-center rounded-lg bg-vox-primary/10">
                <Clock className="size-3.5 text-vox-primary" />
              </div>
              Agenda de Hoje
            </CardTitle>
            <Link
              href="/calendar"
              aria-label="Ver agenda completa"
              className="text-xs font-medium text-vox-primary hover:text-vox-primary/80 flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-vox-primary/5 transition-colors focus-visible:ring-2 focus-visible:ring-vox-primary/50 focus-visible:ring-offset-2 outline-none"
            >
              Ver agenda <ArrowRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {data.todayAppointments.length === 0 ? (
              <div data-testid="empty-today-appointments" className="text-center py-8">
                <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-muted/50">
                  <CalendarDays className="size-6 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  Nenhuma consulta para hoje
                </p>
                <Link
                  href="/appointments/new"
                  aria-label="Registrar consulta"
                  className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-vox-primary hover:text-vox-primary/80 rounded-lg px-3 py-1.5 hover:bg-vox-primary/5 transition-colors focus-visible:ring-2 focus-visible:ring-vox-primary/50 focus-visible:ring-offset-2 outline-none"
                >
                  <Stethoscope className="size-3" />
                  Registrar consulta
                </Link>
              </div>
            ) : (
              <div data-testid="section-upcoming-appointments" className="space-y-0.5">
                {data.todayAppointments.map((apt) => (
                  <Link
                    key={apt.id}
                    href={`/patients/${apt.patient.id}`}
                    aria-label={`Consulta de ${apt.patient.name} as ${formatTime(apt.date)}`}
                    className="group flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-accent transition-colors focus-visible:ring-2 focus-visible:ring-vox-primary/50 focus-visible:ring-offset-2 outline-none"
                  >
                    <div className="flex size-10 items-center justify-center rounded-xl bg-vox-primary/[0.08] text-[11px] font-bold text-vox-primary tabular-nums shrink-0">
                      {formatTime(apt.date)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate group-hover:text-vox-primary transition-colors">
                        {apt.patient.name}
                      </p>
                      {apt.procedures.length > 0 && (
                        <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
                          {(apt.procedures as any[]).map((p) => typeof p === "string" ? p : p?.name || String(p)).join(", ")}
                        </p>
                      )}
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${statusColor[apt.status] ?? "bg-muted text-muted-foreground"}`}>
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
              <div className="flex size-6 items-center justify-center rounded-lg bg-vox-primary/10">
                <CalendarDays className="size-3.5 text-vox-primary" />
              </div>
              Atividade Recente
            </CardTitle>
            <Link
              href="/calendar"
              aria-label="Ver toda atividade recente"
              className="text-xs font-medium text-vox-primary hover:text-vox-primary/80 flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-vox-primary/5 transition-colors focus-visible:ring-2 focus-visible:ring-vox-primary/50 focus-visible:ring-offset-2 outline-none"
            >
              Ver tudo <ArrowRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum atendimento registrado.
              </p>
            ) : (
              <div className="space-y-0.5">
                {data.recentAppointments.map((apt) => (
                  <Link
                    key={apt.id}
                    href={`/patients/${apt.patient.id}`}
                    aria-label={`Atendimento de ${apt.patient.name} em ${formatDateShort(apt.date)}`}
                    className="group flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-accent transition-colors focus-visible:ring-2 focus-visible:ring-vox-primary/50 focus-visible:ring-offset-2 outline-none"
                  >
                    <span className="text-[11px] text-muted-foreground/70 w-12 shrink-0 tabular-nums font-medium">
                      {formatDateShort(apt.date)}
                    </span>
                    <div className="flex size-8 items-center justify-center rounded-full bg-vox-primary/[0.08] text-[11px] font-bold text-vox-primary shrink-0">
                      {apt.patient.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] font-medium truncate block group-hover:text-vox-primary transition-colors">
                        {apt.patient.name}
                      </span>
                    </div>
                    {apt.procedures.length > 0 && (
                      <div className="hidden sm:flex gap-1 shrink-0">
                        {apt.procedures.slice(0, 2).map((proc, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">
                            {typeof proc === "string" ? proc : (proc as any)?.name || String(proc)}
                          </Badge>
                        ))}
                        {apt.procedures.length > 2 && (
                          <Badge variant="secondary" className="text-[10px]">
                            +{apt.procedures.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${statusColor[apt.status] ?? "bg-muted text-muted-foreground"}`}>
                      {statusLabel[apt.status] ?? apt.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Bottom Row: Search + Recent Patients ─── */}
      <div className="grid gap-5 lg:grid-cols-2">
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
              <div className="flex size-6 items-center justify-center rounded-lg bg-vox-primary/10">
                <Users className="size-3.5 text-vox-primary" />
              </div>
              Pacientes Recentes
            </CardTitle>
            <Link
              href="/patients"
              aria-label="Ver todos os pacientes"
              className="text-xs font-medium text-vox-primary hover:text-vox-primary/80 rounded-lg px-2 py-1 hover:bg-vox-primary/5 transition-colors focus-visible:ring-2 focus-visible:ring-vox-primary/50 focus-visible:ring-offset-2 outline-none"
            >
              Ver todos
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentPatients.length === 0 ? (
              <div className="text-center py-6">
                <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-muted/50">
                  <Users className="size-5 text-muted-foreground/40" />
                </div>
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
                      aria-label={`Ver paciente ${patient.name}`}
                      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-accent transition-colors focus-visible:ring-2 focus-visible:ring-vox-primary/50 focus-visible:ring-offset-2 outline-none"
                    >
                      <div className="flex size-8 items-center justify-center rounded-full bg-vox-primary/[0.08] text-[11px] font-bold text-vox-primary shrink-0">
                        {patient.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium truncate block group-hover:text-vox-primary transition-colors text-[13px]">
                          {patient.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground/60">
                          {formatDate(patient.lastAppointment)}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
