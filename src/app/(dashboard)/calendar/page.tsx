"use client"

import { useState, useEffect, useCallback, useTransition } from "react"
import Link from "next/link"
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  List,
  Plus,
  Clock,
  X,
  Check,
  XCircle,
  AlertTriangle,
  Search,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  getAppointmentsByDateRange,
  scheduleAppointment,
  updateAppointmentStatus,
  deleteAppointment,
} from "@/server/actions/appointment"
import { searchPatients } from "@/server/actions/patient"

// ────────────────────── Types ──────────────────────

interface AppointmentItem {
  id: string
  date: string
  patient: { id: string; name: string }
  procedures: string[]
  notes: string | null
  status: string
}

interface PatientOption {
  id: string
  name: string
  phone: string | null
  document: string | null
  updatedAt: Date
}

// ────────────────────── Helpers ──────────────────────

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"]

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

function formatDateBR(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function isSameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
}

function isToday(date: Date) {
  return isSameDay(date, new Date())
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  scheduled: { label: "Agendado", className: "bg-vox-primary/10 text-vox-primary" },
  completed: { label: "Concluido", className: "bg-vox-success/10 text-vox-success" },
  cancelled: { label: "Cancelado", className: "bg-vox-error/10 text-vox-error" },
  no_show: { label: "Faltou", className: "bg-vox-warning/10 text-vox-warning" },
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.scheduled
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

// ────────────────────── Calendar Helpers ──────────────────────

function getMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDayOfWeek = firstDay.getDay()
  const daysInMonth = lastDay.getDate()

  const cells: (number | null)[] = []
  for (let i = 0; i < startDayOfWeek; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  return cells
}

// ────────────────────── Main Component ──────────────────────

export default function CalendarPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [view, setView] = useState<"month" | "list">("month")
  const [appointments, setAppointments] = useState<AppointmentItem[]>([])
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(true)

  // Schedule form state
  const [patientQuery, setPatientQuery] = useState("")
  const [patientResults, setPatientResults] = useState<PatientOption[]>([])
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null)
  const [scheduleDate, setScheduleDate] = useState("")
  const [scheduleTime, setScheduleTime] = useState("")
  const [scheduleNotes, setScheduleNotes] = useState("")
  const [searchingPatients, setSearchingPatients] = useState(false)

  const loadAppointments = useCallback(() => {
    setLoading(true)
    const start = new Date(year, month, 1)
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999)
    startTransition(async () => {
      try {
        const data = await getAppointmentsByDateRange(start.toISOString(), end.toISOString())
        setAppointments(data)
      } catch {
        setAppointments([])
      } finally {
        setLoading(false)
      }
    })
  }, [year, month])

  useEffect(() => {
    loadAppointments()
  }, [loadAppointments])

  // Patient search with debounce
  useEffect(() => {
    if (!patientQuery.trim() || patientQuery.length < 2) {
      setPatientResults([])
      return
    }
    const timeout = setTimeout(async () => {
      setSearchingPatients(true)
      try {
        const results = await searchPatients(patientQuery)
        setPatientResults(results)
      } catch {
        setPatientResults([])
      } finally {
        setSearchingPatients(false)
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [patientQuery])

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
    setSelectedDay(null)
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
    setSelectedDay(null)
  }

  function getAppointmentsForDay(day: number) {
    return appointments.filter((a) => {
      const d = new Date(a.date)
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year
    })
  }

  async function handleSchedule() {
    if (!selectedPatient || !scheduleDate || !scheduleTime) return
    const dateTime = new Date(`${scheduleDate}T${scheduleTime}:00`)
    try {
      await scheduleAppointment({
        patientId: selectedPatient.id,
        date: dateTime.toISOString(),
        notes: scheduleNotes || undefined,
      })
      setShowScheduleForm(false)
      resetScheduleForm()
      loadAppointments()
    } catch (err: any) {
      alert(err.message || "Erro ao agendar consulta")
    }
  }

  function resetScheduleForm() {
    setPatientQuery("")
    setPatientResults([])
    setSelectedPatient(null)
    setScheduleDate("")
    setScheduleTime("")
    setScheduleNotes("")
  }

  async function handleStatusChange(appointmentId: string, status: string) {
    try {
      await updateAppointmentStatus(appointmentId, status)
      loadAppointments()
    } catch (err: any) {
      alert(err.message || "Erro ao atualizar status")
    }
  }

  async function handleDelete(appointmentId: string) {
    if (!confirm("Tem certeza que deseja excluir esta consulta?")) return
    try {
      await deleteAppointment(appointmentId)
      loadAppointments()
    } catch (err: any) {
      alert(err.message || "Erro ao excluir consulta")
    }
  }

  const cells = getMonthGrid(year, month)
  const selectedDayAppointments = selectedDay ? getAppointmentsForDay(selectedDay) : []

  // Group appointments by date for list view
  const groupedByDate = appointments.reduce<Record<string, AppointmentItem[]>>((acc, a) => {
    const key = a.date.slice(0, 10)
    if (!acc[key]) acc[key] = []
    acc[key].push(a)
    return acc
  }, {})
  const sortedDateKeys = Object.keys(groupedByDate).sort()

  return (
    <div className="flex flex-col gap-5 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="flex size-8 items-center justify-center rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
          </button>
          <h1 className="text-lg font-semibold tracking-tight min-w-[160px] text-center">
            {MONTH_NAMES[month]} {year}
          </h1>
          <button
            onClick={nextMonth}
            className="flex size-8 items-center justify-center rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="size-4" />
          </button>
          <Badge variant="secondary" className="ml-1 text-[10px] tabular-nums">
            {appointments.length} consultas
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-xl bg-muted/50 p-0.5">
            <button
              onClick={() => setView("month")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                view === "month"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CalendarDays className="size-3.5" />
              Mes
            </button>
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                view === "list"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="size-3.5" />
              Lista
            </button>
          </div>

          <Button
            onClick={() => setShowScheduleForm(true)}
            className="bg-vox-primary hover:bg-vox-primary/90 text-white rounded-xl text-xs gap-1.5 shadow-sm shadow-vox-primary/15 active:scale-[0.98]"
          >
            <Plus className="size-3.5" />
            Agendar
          </Button>
        </div>
      </div>

      {/* Schedule Modal */}
      {showScheduleForm && (
        <Card className="rounded-2xl border border-border/40 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Agendar Nova Consulta</h2>
            <button
              onClick={() => { setShowScheduleForm(false); resetScheduleForm() }}
              className="p-1 rounded-lg hover:bg-muted/60 text-muted-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Patient search */}
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs">Paciente</Label>
              {selectedPatient ? (
                <div className="flex items-center gap-2 rounded-xl bg-vox-primary/5 border border-vox-primary/20 px-3 py-2">
                  <span className="text-sm font-medium">{selectedPatient.name}</span>
                  <button
                    onClick={() => { setSelectedPatient(null); setPatientQuery("") }}
                    className="ml-auto p-0.5 rounded hover:bg-muted/60"
                  >
                    <X className="size-3.5 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar paciente por nome..."
                    value={patientQuery}
                    onChange={(e) => setPatientQuery(e.target.value)}
                    className="pl-9 rounded-xl text-sm"
                  />
                  {(patientResults.length > 0 || searchingPatients) && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border/60 rounded-xl shadow-lg z-10 overflow-hidden">
                      {searchingPatients ? (
                        <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground">
                          <Loader2 className="size-3.5 animate-spin" />
                          Buscando...
                        </div>
                      ) : (
                        patientResults.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setSelectedPatient(p)
                              setPatientQuery("")
                              setPatientResults([])
                            }}
                            className="w-full text-left px-3 py-2.5 hover:bg-muted/60 transition-colors border-b border-border/30 last:border-0"
                          >
                            <div className="text-sm font-medium">{p.name}</div>
                            {p.phone && (
                              <div className="text-[11px] text-muted-foreground">{p.phone}</div>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label className="text-xs">Data</Label>
              <Input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="rounded-xl text-sm"
              />
            </div>

            {/* Time */}
            <div className="space-y-2">
              <Label className="text-xs">Horario</Label>
              <Input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="rounded-xl text-sm"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs">Observacoes (opcional)</Label>
              <Textarea
                value={scheduleNotes}
                onChange={(e) => setScheduleNotes(e.target.value)}
                placeholder="Notas sobre a consulta..."
                className="rounded-xl text-sm min-h-[80px]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => { setShowScheduleForm(false); resetScheduleForm() }}
              className="rounded-xl text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSchedule}
              disabled={!selectedPatient || !scheduleDate || !scheduleTime}
              className="bg-vox-primary hover:bg-vox-primary/90 text-white rounded-xl text-xs"
            >
              Agendar
            </Button>
          </div>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="size-5 animate-spin text-vox-primary" />
          <p className="text-xs text-muted-foreground">Carregando agenda...</p>
        </div>
      )}

      {/* Month View */}
      {!loading && view === "month" && (
        <>
          <Card className="rounded-2xl border border-border/40 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-border/40">
              {DAY_NAMES.map((d) => (
                <div key={d} className="py-2.5 text-center text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {cells.map((day, i) => {
                if (day === null) {
                  return <div key={`empty-${i}`} className="min-h-[80px] sm:min-h-[100px] border-b border-r border-border/20 bg-muted/20" />
                }

                const dayDate = new Date(year, month, day)
                const dayAppts = getAppointmentsForDay(day)
                const today = isToday(dayDate)
                const isSelected = selectedDay === day

                return (
                  <button
                    key={`day-${day}`}
                    onClick={() => setSelectedDay(selectedDay === day ? null : day)}
                    className={`min-h-[80px] sm:min-h-[100px] border-b border-r border-border/20 p-1.5 text-left transition-all hover:bg-muted/40 ${
                      isSelected ? "bg-vox-primary/5 ring-1 ring-vox-primary/30" : ""
                    }`}
                  >
                    <div className={`flex items-center justify-center size-7 rounded-full text-xs font-medium mb-1 ${
                      today
                        ? "bg-vox-primary text-white"
                        : "text-foreground"
                    }`}>
                      {day}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {dayAppts.slice(0, 2).map((a) => (
                        <div
                          key={a.id}
                          className={`hidden sm:block truncate text-[10px] px-1.5 py-0.5 rounded-md ${
                            a.status === "scheduled"
                              ? "bg-vox-primary/10 text-vox-primary"
                              : a.status === "completed"
                              ? "bg-vox-success/10 text-vox-success"
                              : a.status === "cancelled"
                              ? "bg-vox-error/10 text-vox-error"
                              : "bg-vox-warning/10 text-vox-warning"
                          }`}
                        >
                          {formatTime(a.date)} {a.patient.name.split(" ")[0]}
                        </div>
                      ))}
                      {/* Mobile: show dots only */}
                      {dayAppts.length > 0 && (
                        <div className="flex gap-0.5 sm:hidden mt-0.5">
                          {dayAppts.slice(0, 3).map((a) => (
                            <div
                              key={a.id}
                              className={`size-1.5 rounded-full ${
                                a.status === "scheduled"
                                  ? "bg-vox-primary"
                                  : a.status === "completed"
                                  ? "bg-vox-success"
                                  : a.status === "cancelled"
                                  ? "bg-vox-error"
                                  : "bg-vox-warning"
                              }`}
                            />
                          ))}
                          {dayAppts.length > 3 && (
                            <span className="text-[9px] text-muted-foreground">+{dayAppts.length - 3}</span>
                          )}
                        </div>
                      )}
                      {dayAppts.length > 2 && (
                        <span className="hidden sm:block text-[10px] text-muted-foreground px-1.5">
                          +{dayAppts.length - 2} mais
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </Card>

          {/* Day Detail Panel */}
          {selectedDay !== null && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">
                {selectedDay} de {MONTH_NAMES[month]} de {year}
              </h2>
              {selectedDayAppointments.length === 0 ? (
                <Card className="rounded-2xl border border-border/40 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-6">
                  <div className="text-center text-muted-foreground">
                    <CalendarDays className="size-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Nenhuma consulta neste dia</p>
                    <Button
                      onClick={() => {
                        setShowScheduleForm(true)
                        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`
                        setScheduleDate(dateStr)
                      }}
                      variant="outline"
                      className="mt-3 rounded-xl text-xs gap-1.5"
                    >
                      <Plus className="size-3.5" />
                      Agendar neste dia
                    </Button>
                  </div>
                </Card>
              ) : (
                selectedDayAppointments.map((a) => (
                  <AppointmentCard
                    key={a.id}
                    appointment={a}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* List View */}
      {!loading && view === "list" && (
        <div className="space-y-4">
          {sortedDateKeys.length === 0 ? (
            <Card className="rounded-2xl border border-border/40 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-8">
              <div className="text-center text-muted-foreground">
                <CalendarDays className="size-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">Nenhuma consulta agendada</p>
                <p className="text-xs mt-1">Nenhuma consulta encontrada neste mes.</p>
                <Button
                  onClick={() => setShowScheduleForm(true)}
                  className="mt-4 bg-vox-primary hover:bg-vox-primary/90 text-white rounded-xl text-xs gap-1.5"
                >
                  <Plus className="size-3.5" />
                  Agendar Consulta
                </Button>
              </div>
            </Card>
          ) : (
            sortedDateKeys.map((dateKey) => (
              <div key={dateKey}>
                <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                  {formatDateBR(dateKey + "T00:00:00")}
                </h3>
                <div className="space-y-2">
                  {groupedByDate[dateKey].map((a) => (
                    <AppointmentCard
                      key={a.id}
                      appointment={a}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ────────────────────── Appointment Card ──────────────────────

function AppointmentCard({
  appointment,
  onStatusChange,
  onDelete,
}: {
  appointment: AppointmentItem
  onStatusChange: (id: string, status: string) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card
      className="group rounded-2xl border border-border/40 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] overflow-hidden cursor-pointer transition-all hover:border-border hover:shadow-[0_4px_12px_0_rgb(0_0_0/0.06)]"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
              <Clock className="size-3.5" />
              <span className="text-xs font-medium">{formatTime(appointment.date)}</span>
            </div>
            <div className="min-w-0">
              <Link
                href={`/patients/${appointment.patient.id}`}
                onClick={(e) => e.stopPropagation()}
                className="text-sm font-medium hover:text-vox-primary transition-colors truncate block"
              >
                {appointment.patient.name}
              </Link>
            </div>
          </div>
          <StatusBadge status={appointment.status} />
        </div>

        {/* Procedure badges */}
        {appointment.procedures.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {(appointment.procedures as any[]).map((proc, i) => {
              const name = typeof proc === "string" ? proc : (proc as any)?.name || String(proc)
              return (
                <span
                  key={i}
                  className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/60 text-[11px] font-medium text-muted-foreground"
                >
                  {name}
                </span>
              )
            })}
          </div>
        )}

        {/* Expanded details */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-border/30 space-y-3" onClick={(e) => e.stopPropagation()}>
            {appointment.notes && (
              <p className="text-xs text-muted-foreground">{appointment.notes}</p>
            )}

            <div className="flex flex-wrap gap-2">
              {appointment.status === "scheduled" && (
                <>
                  <Button
                    size="sm"
                    onClick={() => onStatusChange(appointment.id, "completed")}
                    className="rounded-xl text-[11px] h-7 gap-1 bg-vox-success hover:bg-vox-success/90 text-white"
                  >
                    <Check className="size-3" />
                    Concluir
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onStatusChange(appointment.id, "cancelled")}
                    className="rounded-xl text-[11px] h-7 gap-1 text-vox-error border-vox-error/30 hover:bg-vox-error/5"
                  >
                    <XCircle className="size-3" />
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onStatusChange(appointment.id, "no_show")}
                    className="rounded-xl text-[11px] h-7 gap-1 text-vox-warning border-vox-warning/30 hover:bg-vox-warning/5"
                  >
                    <AlertTriangle className="size-3" />
                    Faltou
                  </Button>
                </>
              )}
              {appointment.status !== "scheduled" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onStatusChange(appointment.id, "scheduled")}
                  className="rounded-xl text-[11px] h-7 gap-1"
                >
                  Reagendar
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDelete(appointment.id)}
                className="rounded-xl text-[11px] h-7 gap-1 text-vox-error border-vox-error/30 hover:bg-vox-error/5 ml-auto"
              >
                <X className="size-3" />
                Excluir
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
