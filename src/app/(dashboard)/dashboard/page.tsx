import { getDashboardData } from "@/server/actions/dashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  CalendarDays,
  Stethoscope,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowRight,
  CalendarCheck,
} from "lucide-react"
import Link from "next/link"

export default async function DashboardPage() {
  const data = await getDashboardData()

  const formatDate = (date: Date | null) => {
    if (!date) return "Sem atendimento"
    return new Date(date).toLocaleDateString("pt-BR")
  }

  const formatTime = (date: Date) =>
    new Date(date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })

  const formatDateShort = (date: Date) =>
    new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })

  const monthlyDiff = data.monthlyAppointments - data.lastMonthAppointments
  const monthlyTrend = data.lastMonthAppointments > 0
    ? Math.round((monthlyDiff / data.lastMonthAppointments) * 100)
    : data.monthlyAppointments > 0 ? 100 : 0

  const statusLabel: Record<string, string> = {
    scheduled: "Agendado",
    completed: "Concluído",
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
  const now = new Date()

  const nextAppointment = data.todayAppointments.find(
    (a) => new Date(a.date) > now && a.status === "scheduled"
  )

  return (
    <div data-testid="page-dashboard" className="space-y-4">
      {/* Hero + Stats */}
      <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-vox-primary/[0.05] via-card to-vox-primary/[0.02] p-4 sm:p-5">
        <div className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-vox-primary/[0.06] blur-3xl hidden sm:block" />

        <div className="relative mb-4">
          <p className="text-[12px] text-muted-foreground font-medium">{greeting}</p>
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">{data.clinicName}</h1>
          {nextAppointment && (
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Próxima consulta às <span className="font-semibold text-vox-primary">{formatTime(nextAppointment.date)}</span> — {nextAppointment.patient.name}
            </p>
          )}
        </div>

        <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-2">
          <Link href="/patients" className="group flex items-center gap-3 rounded-xl bg-background/60 backdrop-blur-sm px-3 py-2.5 border border-border/30 transition-all hover:border-border/50 hover:shadow-sm">
            <div className="flex size-8 items-center justify-center rounded-lg bg-vox-primary/[0.08] shrink-0">
              <Users className="size-4 text-vox-primary" />
            </div>
            <div>
              <p className="text-[18px] font-bold tabular-nums leading-none">{data.totalPatients}</p>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Pacientes</p>
            </div>
          </Link>

          <Link href="/appointments" className="group flex items-center gap-3 rounded-xl bg-background/60 backdrop-blur-sm px-3 py-2.5 border border-border/30 transition-all hover:border-border/50 hover:shadow-sm">
            <div className="flex size-8 items-center justify-center rounded-lg bg-vox-success/[0.08] shrink-0">
              <Stethoscope className="size-4 text-vox-success" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-[18px] font-bold tabular-nums leading-none">{data.monthlyAppointments}</p>
                {monthlyTrend !== 0 && (
                  <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${monthlyTrend > 0 ? "text-vox-success" : "text-vox-error"}`}>
                    {monthlyTrend > 0 ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />}
                    {monthlyTrend > 0 ? "+" : ""}{monthlyTrend}%
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Consultas/mês</p>
            </div>
          </Link>

          <Link href="/calendar" className="group flex items-center gap-3 rounded-xl bg-background/60 backdrop-blur-sm px-3 py-2.5 border border-border/30 transition-all hover:border-border/50 hover:shadow-sm">
            <div className="flex size-8 items-center justify-center rounded-lg bg-vox-warning/[0.08] shrink-0">
              <CalendarCheck className="size-4 text-vox-warning" />
            </div>
            <div>
              <p className="text-[18px] font-bold tabular-nums leading-none">{data.scheduledAppointments}</p>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Agendados</p>
            </div>
          </Link>

          <Link href="/appointments" className="group flex items-center gap-3 rounded-xl bg-background/60 backdrop-blur-sm px-3 py-2.5 border border-border/30 transition-all hover:border-border/50 hover:shadow-sm">
            <div className="flex size-8 items-center justify-center rounded-lg bg-vox-primary/[0.08] shrink-0">
              <Stethoscope className="size-4 text-vox-primary" />
            </div>
            <div>
              <p className="text-[18px] font-bold tabular-nums leading-none">{data.recentAppointments.filter((a) => a.status === "completed").length}</p>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Concluídas</p>
            </div>
          </Link>
        </div>

      </div>

      {/* Today's Agenda + Recent sections */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Today */}
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <div className="flex size-6 items-center justify-center rounded-lg bg-vox-primary/10">
                <Clock className="size-3.5 text-vox-primary" />
              </div>
              Agenda de Hoje
              {data.todayAppointments.length > 0 && (
                <Badge variant="secondary" className="text-[10px] tabular-nums">{data.todayAppointments.length}</Badge>
              )}
            </CardTitle>
            <Link href="/calendar" className="text-xs font-medium text-vox-primary hover:text-vox-primary/80 flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-vox-primary/5 transition-colors">
              Ver agenda <ArrowRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {data.todayAppointments.length === 0 ? (
              <div className="text-center py-6">
                <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-muted/50">
                  <CalendarDays className="size-5 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Nenhuma consulta para hoje</p>
                <p className="text-xs text-muted-foreground mt-0.5">Sua agenda está livre</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {data.todayAppointments.map((apt) => {
                  const isPast = new Date(apt.date) < now
                  return (
                    <Link
                      key={apt.id}
                      href={`/patients/${apt.patient.id}`}
                      className="group flex items-center gap-3 py-2.5 first:pt-0 last:pb-0 hover:bg-accent -mx-3 px-3 rounded-lg transition-colors"
                    >
                      <div className={`text-[12px] font-bold tabular-nums shrink-0 w-11 text-center ${isPast ? "text-muted-foreground" : "text-vox-primary"}`}>
                        {formatTime(apt.date)}
                      </div>
                      <div className="flex flex-col items-center shrink-0">
                        <div className={`size-2 rounded-full ${isPast ? "bg-muted-foreground/30" : "bg-vox-primary"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] font-semibold truncate ${isPast ? "text-muted-foreground" : "group-hover:text-vox-primary"}`}>
                          {apt.patient.name}
                        </p>
                        {apt.procedures.length > 0 && (
                          <p className="text-[11px] text-muted-foreground truncate">
                            {(apt.procedures as any[]).map((p) => typeof p === "string" ? p : p?.name || String(p)).join(", ")}
                          </p>
                        )}
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${statusColor[apt.status] ?? "bg-muted text-muted-foreground"}`}>
                        {statusLabel[apt.status] ?? apt.status}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Patients */}
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <div className="flex size-6 items-center justify-center rounded-lg bg-vox-primary/10">
                <Users className="size-3.5 text-vox-primary" />
              </div>
              Pacientes Recentes
            </CardTitle>
            <Link href="/patients" className="text-xs font-medium text-vox-primary hover:text-vox-primary/80 flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-vox-primary/5 transition-colors">
              Ver todos <ArrowRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentPatients.length === 0 ? (
              <div className="text-center py-6">
                <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-muted/50">
                  <Users className="size-5 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Nenhum paciente cadastrado</p>
              </div>
            ) : (
              <ul className="divide-y divide-border/30">
                {data.recentPatients.map((patient) => (
                  <li key={patient.id}>
                    <Link
                      href={`/patients/${patient.id}`}
                      className="group flex items-center gap-3 py-2 first:pt-0 last:pb-0 hover:bg-accent -mx-3 px-3 rounded-lg text-sm transition-colors"
                    >
                      <div className="flex size-7 items-center justify-center rounded-full bg-vox-primary/[0.08] text-[10px] font-bold text-vox-primary shrink-0">
                        {patient.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium truncate block group-hover:text-vox-primary transition-colors text-[13px]">
                          {patient.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{formatDate(patient.lastAppointment)}</span>
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
