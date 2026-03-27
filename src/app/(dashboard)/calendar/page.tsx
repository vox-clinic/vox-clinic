"use client"

import { useState, useEffect, useCallback, useTransition, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DndContext, DragOverlay, useDraggable, useDroppable, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core"
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
  Calendar as CalendarIcon,
  Sun,
  Ban,
  Repeat,
  Trash2,
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
  scheduleRecurringAppointments,
  updateAppointmentStatus,
  deleteAppointment,
  rescheduleAppointment,
} from "@/server/actions/appointment"
import { searchPatients } from "@/server/actions/patient"
import {
  getBlockedSlots,
  createBlockedSlot,
  deleteBlockedSlot,
  type BlockedSlotItem,
} from "@/server/actions/blocked-slot"
import { getAgendas } from "@/server/actions/agenda"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// ────────────────────── Types ──────────────────────

interface AgendaItem {
  id: string
  name: string
  color: string
  isDefault: boolean
  isActive: boolean
  appointmentCount: number
}

interface AppointmentItem {
  id: string
  date: string
  patient: { id: string; name: string }
  procedures: string[]
  notes: string | null
  status: string
  agendaId: string
  agenda?: { id: string; name: string; color: string }
}

interface PatientOption {
  id: string
  name: string
  phone: string | null
  document: string | null
  updatedAt: Date
}

type ViewMode = "month" | "week" | "day" | "list"

// ────────────────────── Helpers ──────────────────────

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]
const MONTH_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"]
const DAY_FULL = ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"]
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7) // 7h to 20h

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

function formatDateBR(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function isSameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()
}

function isToday(date: Date) {
  return isSameDay(date, new Date())
}

function getMonday(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function getWeekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

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

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  scheduled: { label: "Agendado", className: "bg-vox-primary/10 text-vox-primary" },
  completed: { label: "Concluido", className: "bg-vox-success/10 text-vox-success" },
  cancelled: { label: "Cancelado", className: "bg-vox-error/10 text-vox-error" },
  no_show: { label: "Faltou", className: "bg-vox-warning/10 text-vox-warning" },
}

const STATUS_DOT: Record<string, string> = {
  scheduled: "bg-vox-primary",
  completed: "bg-vox-success",
  cancelled: "bg-vox-error",
  no_show: "bg-vox-warning",
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.scheduled
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

// ────────────────────── Drag & Drop Components ──────────────────────

function DraggableAppointment({ appointment, children }: { appointment: AppointmentItem; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: appointment.id,
    data: appointment,
  })

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={isDragging ? "opacity-50" : ""}>
      {children}
    </div>
  )
}

function DroppableCell({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
  const { isOver, setNodeRef } = useDroppable({ id })

  return (
    <div ref={setNodeRef} className={`${className ?? ""} ${isOver ? "bg-vox-primary/10 ring-1 ring-vox-primary/30" : ""}`}>
      {children}
    </div>
  )
}

// ────────────────────── Main Component ──────────────────────

export default function CalendarPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [currentDate, setCurrentDate] = useState(now) // used for week/day
  const [view, setView] = useState<ViewMode>("week")
  const [appointments, setAppointments] = useState<AppointmentItem[]>([])
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(true)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlotItem[]>([])
  const [showBlockForm, setShowBlockForm] = useState(false)
  const weekGridRef = useRef<HTMLDivElement>(null)
  const [nowLineTop, setNowLineTop] = useState<number | null>(null)
  const router = useRouter()

  // Agendas
  const [agendas, setAgendas] = useState<AgendaItem[]>([])
  const [selectedAgendaIds, setSelectedAgendaIds] = useState<string[]>([]) // empty = all
  const [scheduleAgendaId, setScheduleAgendaId] = useState("")

  // Schedule form
  const [patientQuery, setPatientQuery] = useState("")
  const [patientResults, setPatientResults] = useState<PatientOption[]>([])
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null)
  const [scheduleDate, setScheduleDate] = useState("")
  const [scheduleTime, setScheduleTime] = useState("")
  const [scheduleNotes, setScheduleNotes] = useState("")
  const [searchingPatients, setSearchingPatients] = useState(false)
  const [recurringEnabled, setRecurringEnabled] = useState(false)
  const [recurrence, setRecurrence] = useState<"weekly" | "biweekly">("weekly")
  const [occurrences, setOccurrences] = useState(4)

  // Compute date range based on view
  const getDateRange = useCallback((): [Date, Date] => {
    if (view === "week") {
      const monday = getMonday(currentDate)
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      sunday.setHours(23, 59, 59, 999)
      return [monday, sunday]
    }
    if (view === "day") {
      const start = new Date(currentDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(currentDate)
      end.setHours(23, 59, 59, 999)
      return [start, end]
    }
    // month / list
    return [new Date(year, month, 1), new Date(year, month + 1, 0, 23, 59, 59, 999)]
  }, [view, currentDate, year, month])

  const loadAgendas = useCallback(async () => {
    try {
      const data = await getAgendas()
      setAgendas(data)
      // Set default agenda for schedule form
      if (data.length > 0 && !scheduleAgendaId) {
        const defaultAgenda = data.find((a) => a.isDefault) || data[0]
        setScheduleAgendaId(defaultAgenda.id)
      }
    } catch {
      setAgendas([])
    }
  }, [])

  const loadAppointments = useCallback(() => {
    setLoading(true)
    const [start, end] = getDateRange()
    const filterIds = selectedAgendaIds.length > 0 ? selectedAgendaIds : undefined
    startTransition(async () => {
      try {
        const [apptData, slotData] = await Promise.all([
          getAppointmentsByDateRange(start.toISOString(), end.toISOString(), filterIds),
          getBlockedSlots(start.toISOString(), end.toISOString(), filterIds),
        ])
        setAppointments(apptData)
        setBlockedSlots(slotData)
      } catch {
        setAppointments([])
        setBlockedSlots([])
      } finally {
        setLoading(false)
      }
    })
  }, [getDateRange, selectedAgendaIds])

  useEffect(() => {
    loadAgendas()
  }, [loadAgendas])

  useEffect(() => {
    loadAppointments()
  }, [loadAppointments])

  // Auto-scroll week view to current hour & update "now" line
  useEffect(() => {
    if (view !== "week" || loading) return
    const container = weekGridRef.current
    if (!container) return

    const ROW_HEIGHT = 64 // h-16 = 4rem = 64px
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinutes = now.getMinutes()

    // Scroll to current hour (centered roughly)
    const scrollTarget = (currentHour - 7) * ROW_HEIGHT
    container.scrollTo({ top: Math.max(0, scrollTarget - 100), behavior: "smooth" })

    // Calculate "now" line position
    const minuteOffset = (currentMinutes / 60) * ROW_HEIGHT
    const topPosition = (currentHour - 7) * ROW_HEIGHT + minuteOffset
    setNowLineTop(currentHour >= 7 && currentHour <= 20 ? topPosition : null)

    // Update every minute
    const interval = setInterval(() => {
      const n = new Date()
      const h = n.getHours()
      const m = n.getMinutes()
      const top = (h - 7) * ROW_HEIGHT + (m / 60) * ROW_HEIGHT
      setNowLineTop(h >= 7 && h <= 20 ? top : null)
    }, 60000)

    return () => clearInterval(interval)
  }, [view, loading])

  // Patient search with debounce
  useEffect(() => {
    if (!patientQuery.trim() || patientQuery.length < 2) { setPatientResults([]); return }
    const timeout = setTimeout(async () => {
      setSearchingPatients(true)
      try { setPatientResults(await searchPatients(patientQuery)) } catch { setPatientResults([]) }
      finally { setSearchingPatients(false) }
    }, 300)
    return () => clearTimeout(timeout)
  }, [patientQuery])

  // ── Navigation ──
  function navigatePrev() {
    if (view === "month" || view === "list") {
      if (month === 0) { setMonth(11); setYear((y) => y - 1) } else setMonth((m) => m - 1)
      setSelectedDay(null)
    } else if (view === "week") {
      setCurrentDate((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })
    } else {
      setCurrentDate((d) => { const n = new Date(d); n.setDate(n.getDate() - 1); return n })
    }
  }

  function navigateNext() {
    if (view === "month" || view === "list") {
      if (month === 11) { setMonth(0); setYear((y) => y + 1) } else setMonth((m) => m + 1)
      setSelectedDay(null)
    } else if (view === "week") {
      setCurrentDate((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })
    } else {
      setCurrentDate((d) => { const n = new Date(d); n.setDate(n.getDate() + 1); return n })
    }
  }

  function goToday() {
    const today = new Date()
    setYear(today.getFullYear())
    setMonth(today.getMonth())
    setCurrentDate(today)
    setSelectedDay(null)
  }

  // ── Title ──
  function getTitle() {
    if (view === "month" || view === "list") return `${MONTH_NAMES[month]} ${year}`
    if (view === "week") {
      const monday = getMonday(currentDate)
      const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6)
      if (monday.getMonth() === sunday.getMonth()) {
        return `${monday.getDate()} – ${sunday.getDate()} ${MONTH_SHORT[monday.getMonth()]} ${monday.getFullYear()}`
      }
      return `${monday.getDate()} ${MONTH_SHORT[monday.getMonth()]} – ${sunday.getDate()} ${MONTH_SHORT[sunday.getMonth()]} ${sunday.getFullYear()}`
    }
    return `${DAY_FULL[currentDate.getDay()]}, ${currentDate.getDate()} de ${MONTH_NAMES[currentDate.getMonth()]}`
  }

  function getAppointmentsForDay(day: number) {
    return appointments.filter((a) => {
      const d = new Date(a.date)
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year
    })
  }

  function getAppointmentsForDate(date: Date) {
    return appointments.filter((a) => isSameDay(new Date(a.date), date))
  }

  function getBlockedSlotsForDate(date: Date) {
    return blockedSlots.filter((s) => {
      const start = new Date(s.startDate)
      const end = new Date(s.endDate)
      if (s.allDay) {
        const dateStart = new Date(date); dateStart.setHours(0, 0, 0, 0)
        const dateEnd = new Date(date); dateEnd.setHours(23, 59, 59, 999)
        return start <= dateEnd && end >= dateStart
      }
      return isSameDay(start, date) || isSameDay(end, date) || (start < date && end > date)
    })
  }

  function getBlockedSlotsForHour(date: Date, hour: number) {
    return blockedSlots.filter((s) => {
      if (s.allDay) {
        const dateStart = new Date(date); dateStart.setHours(0, 0, 0, 0)
        const dateEnd = new Date(date); dateEnd.setHours(23, 59, 59, 999)
        const start = new Date(s.startDate)
        const end = new Date(s.endDate)
        return start <= dateEnd && end >= dateStart
      }
      const start = new Date(s.startDate)
      const end = new Date(s.endDate)
      const hourStart = new Date(date); hourStart.setHours(hour, 0, 0, 0)
      const hourEnd = new Date(date); hourEnd.setHours(hour, 59, 59, 999)
      return start <= hourEnd && end >= hourStart
    })
  }

  async function handleDeleteBlockedSlot(id: string) {
    try {
      await deleteBlockedSlot(id)
      loadAppointments()
      toast.success("Bloqueio removido")
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover bloqueio")
    }
  }

  async function handleSchedule(forceSchedule = false) {
    if (!selectedPatient || !scheduleDate || !scheduleTime || !scheduleAgendaId) return
    const dateTime = new Date(`${scheduleDate}T${scheduleTime}:00`)
    try {
      if (recurringEnabled) {
        await scheduleRecurringAppointments({
          patientId: selectedPatient.id,
          startDate: dateTime.toISOString(),
          agendaId: scheduleAgendaId,
          notes: scheduleNotes || undefined,
          recurrence,
          occurrences,
        })
        toast.success(`${occurrences} consultas agendadas`)
      } else {
        await scheduleAppointment({
          patientId: selectedPatient.id,
          date: dateTime.toISOString(),
          agendaId: scheduleAgendaId,
          notes: scheduleNotes || undefined,
          forceSchedule,
        })
      }
      setShowScheduleForm(false)
      resetScheduleForm()
      loadAppointments()
    } catch (err: any) {
      const msg = err.message || "Erro ao agendar consulta"
      if (msg.startsWith("CONFLICT:")) {
        if (confirm(msg.replace("CONFLICT:", ""))) handleSchedule(true)
      } else toast.error(msg)
    }
  }

  function resetScheduleForm() {
    setPatientQuery(""); setPatientResults([]); setSelectedPatient(null)
    setScheduleDate(""); setScheduleTime(""); setScheduleNotes("")
    setRecurringEnabled(false); setRecurrence("weekly"); setOccurrences(4)
  }

  async function handleStatusChange(appointmentId: string, status: string) {
    try { await updateAppointmentStatus(appointmentId, status); loadAppointments(); toast.success("Status atualizado") }
    catch (err: any) { toast.error(err.message || "Erro ao atualizar status") }
  }

  function handleDelete(appointmentId: string) {
    setDeleteTarget(appointmentId)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try { await deleteAppointment(deleteTarget); loadAppointments(); toast.success("Consulta excluída") }
    catch (err: any) { toast.error(err.message || "Erro ao excluir consulta") }
    finally { setDeleteTarget(null) }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(event.active.id as string)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null)
    const { active, over } = event
    if (!over) return
    const droppableId = over.id as string
    // droppableId format: "ISO_DATE-HOUR"
    const lastDash = droppableId.lastIndexOf("-")
    const dateIso = droppableId.substring(0, lastDash)
    const hour = parseInt(droppableId.substring(lastDash + 1), 10)

    const appointment = appointments.find((a) => a.id === active.id)
    if (!appointment) return

    // Check if it's the same slot
    const oldDate = new Date(appointment.date)
    const newDate = new Date(dateIso)
    newDate.setHours(hour, oldDate.getMinutes(), 0, 0)
    if (oldDate.getTime() === newDate.getTime()) return

    try {
      await rescheduleAppointment(appointment.id, newDate.toISOString())
      loadAppointments()
    } catch (err: any) {
      alert(err.message || "Erro ao reagendar consulta")
    }
  }

  const cells = getMonthGrid(year, month)
  const selectedDayAppointments = selectedDay ? getAppointmentsForDay(selectedDay) : []

  // Group by date for list view
  const groupedByDate = appointments.reduce<Record<string, AppointmentItem[]>>((acc, a) => {
    const key = a.date.slice(0, 10); if (!acc[key]) acc[key] = []; acc[key].push(a); return acc
  }, {})
  const sortedDateKeys = Object.keys(groupedByDate).sort()

  // Week data
  const weekDays = view === "week" ? getWeekDays(getMonday(currentDate)) : []

  return (
    <div className="flex flex-col gap-4 pb-24 md:pb-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button onClick={navigatePrev} className="flex size-8 items-center justify-center rounded-xl hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground">
            <ChevronLeft className="size-4" />
          </button>
          <h1 className="text-base font-semibold tracking-tight min-w-[200px] text-center">
            {getTitle()}
          </h1>
          <button onClick={navigateNext} className="flex size-8 items-center justify-center rounded-xl hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground">
            <ChevronRight className="size-4" />
          </button>
          <Button variant="outline" size="sm" onClick={goToday} className="ml-1 text-[11px] h-7 px-2.5">
            Hoje
          </Button>
          <Badge variant="secondary" className="ml-1 text-[10px] tabular-nums hidden sm:inline-flex">
            {appointments.length} consultas
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-xl bg-muted/50 p-0.5">
            {([
              { key: "day" as const, label: "Dia", icon: Sun },
              { key: "week" as const, label: "Semana", icon: CalendarIcon },
              { key: "month" as const, label: "Mes", icon: CalendarDays },
              { key: "list" as const, label: "Lista", icon: List },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => {
                  setView(key)
                  if ((key === "month" || key === "list") && (view === "week" || view === "day")) {
                    setYear(currentDate.getFullYear())
                    setMonth(currentDate.getMonth())
                  }
                  if ((key === "week" || key === "day") && (view === "month" || view === "list")) {
                    setCurrentDate(new Date(year, month, selectedDay ?? new Date().getDate()))
                  }
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium transition-all ${
                  view === key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            onClick={() => setShowBlockForm(true)}
            className="rounded-xl text-xs gap-1.5 active:scale-[0.98]"
          >
            <Ban className="size-3.5" />
            <span className="hidden sm:inline">Bloquear</span>
          </Button>

          <Button
            onClick={() => setShowScheduleForm(true)}
            className="bg-vox-primary hover:bg-vox-primary/90 text-white rounded-xl text-xs gap-1.5 shadow-sm shadow-vox-primary/15 active:scale-[0.98]"
          >
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">Agendar</span>
          </Button>
        </div>
      </div>

      {/* ─── Agenda Filter ─── */}
      {agendas.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {agendas.filter((a) => a.isActive).map((agenda) => {
            const isSelected = selectedAgendaIds.length === 0 || selectedAgendaIds.includes(agenda.id)
            return (
              <button
                key={agenda.id}
                onClick={() => {
                  setSelectedAgendaIds((prev) => {
                    if (prev.length === 0) {
                      // First click: select only this one (filter to this agenda)
                      return [agenda.id]
                    }
                    if (prev.includes(agenda.id)) {
                      const next = prev.filter((id) => id !== agenda.id)
                      return next.length === 0 ? [] : next // empty = show all
                    }
                    const next = [...prev, agenda.id]
                    // If all active agendas selected, reset to show all
                    return next.length === agendas.filter((a) => a.isActive).length ? [] : next
                  })
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                  isSelected
                    ? "border-border/60 bg-background shadow-sm"
                    : "border-transparent bg-muted/40 text-muted-foreground opacity-50"
                }`}
              >
                <span
                  className="size-2 rounded-full shrink-0"
                  style={{ backgroundColor: agenda.color }}
                />
                {agenda.name}
              </button>
            )
          })}
        </div>
      )}

      {/* ─── Schedule Form ─── */}
      {showScheduleForm && (
        <ScheduleForm
          patientQuery={patientQuery} setPatientQuery={setPatientQuery}
          patientResults={patientResults} searchingPatients={searchingPatients}
          selectedPatient={selectedPatient} setSelectedPatient={setSelectedPatient}
          setPatientResults={setPatientResults}
          scheduleDate={scheduleDate} setScheduleDate={setScheduleDate}
          scheduleTime={scheduleTime} setScheduleTime={setScheduleTime}
          scheduleNotes={scheduleNotes} setScheduleNotes={setScheduleNotes}
          recurringEnabled={recurringEnabled} setRecurringEnabled={setRecurringEnabled}
          recurrence={recurrence} setRecurrence={setRecurrence}
          occurrences={occurrences} setOccurrences={setOccurrences}
          agendas={agendas.filter((a) => a.isActive)}
          scheduleAgendaId={scheduleAgendaId} setScheduleAgendaId={setScheduleAgendaId}
          onSchedule={() => handleSchedule()} onCancel={() => { setShowScheduleForm(false); resetScheduleForm() }}
        />
      )}

      {/* ─── Block Time Form ─── */}
      {showBlockForm && (
        <BlockTimeForm
          agendas={agendas.filter((a) => a.isActive)}
          defaultAgendaId={scheduleAgendaId}
          onSave={async (data) => {
            try {
              await createBlockedSlot(data)
              setShowBlockForm(false)
              loadAppointments()
              toast.success("Horario bloqueado")
            } catch (err: any) {
              toast.error(err.message || "Erro ao bloquear horario")
            }
          }}
          onCancel={() => setShowBlockForm(false)}
        />
      )}

      {/* ─── Loading ─── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="size-5 animate-spin text-vox-primary" />
          <p className="text-xs text-muted-foreground">Carregando agenda...</p>
        </div>
      )}

      {/* ─── Week View ─── */}
      {!loading && view === "week" && (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <Card className="rounded-2xl border border-border/40 overflow-hidden">
           <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            {/* Day headers */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/40 min-w-[600px]">
              <div className="py-2" />
              {weekDays.map((d) => {
                const today = isToday(d)
                return (
                  <button
                    key={d.toISOString()}
                    onClick={() => { setCurrentDate(d); setView("day") }}
                    className={`flex flex-col items-center gap-0.5 py-2 transition-colors hover:bg-muted/40 ${today ? "bg-vox-primary/5" : ""}`}
                  >
                    <span className="text-[10px] font-medium text-muted-foreground uppercase">{DAY_NAMES[d.getDay()]}</span>
                    <span className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold ${
                      today ? "bg-vox-primary text-white" : "text-foreground"
                    }`}>
                      {d.getDate()}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Time grid */}
            <div ref={weekGridRef} className="relative grid grid-cols-[60px_repeat(7,1fr)] max-h-[calc(100vh-280px)] overflow-y-auto min-w-[600px]">
              {/* "Now" indicator line */}
              {nowLineTop !== null && (() => {
                const todayIndex = weekDays.findIndex((d) => isToday(d))
                if (todayIndex === -1) return null
                return (
                  <div
                    className="absolute left-[60px] right-0 z-10 pointer-events-none"
                    style={{ top: `${nowLineTop}px` }}
                  >
                    {/* Line across today's column only */}
                    <div
                      className="absolute h-[2px] bg-vox-error/80"
                      style={{
                        left: `calc(${(todayIndex / 7) * 100}%)`,
                        width: `calc(${(1 / 7) * 100}%)`,
                      }}
                    >
                      {/* Circle at left edge */}
                      <div className="absolute -left-1.5 -top-[4px] size-[10px] rounded-full bg-vox-error/80" />
                    </div>
                  </div>
                )
              })()}
              {HOURS.map((hour) => (
                <div key={hour} className="contents">
                  {/* Hour label */}
                  <div className="flex items-start justify-end pr-2 pt-1 text-[10px] text-muted-foreground h-16 border-b border-border/10">
                    {String(hour).padStart(2, "0")}:00
                  </div>
                  {/* Day columns */}
                  {weekDays.map((d) => {
                    const dayAppts = getAppointmentsForDate(d).filter((a) => {
                      const h = new Date(a.date).getHours()
                      return h === hour
                    })
                    const hourBlocked = getBlockedSlotsForHour(d, hour)
                    const cellId = `${d.toISOString()}-${hour}`
                    return (
                      <DroppableCell
                        key={cellId}
                        id={cellId}
                        className={`h-16 border-b border-l border-border/10 px-0.5 py-0.5 transition-colors ${isToday(d) ? "bg-vox-primary/[0.02]" : ""} ${hourBlocked.length > 0 ? "bg-muted/60" : ""}`}
                      >
                        {hourBlocked.length > 0 && dayAppts.length === 0 && (
                          <div className="block truncate rounded-md px-1.5 py-1 text-[10px] font-medium leading-tight mb-0.5 bg-muted/60 border-l-4 border-muted-foreground/30 text-muted-foreground">
                            {hourBlocked[0].title}
                          </div>
                        )}
                        {dayAppts.map((a) => (
                          <DraggableAppointment key={a.id} appointment={a}>
                            <div
                              onClick={() => router.push(`/patients/${a.patient.id}`)}
                              className={`block truncate rounded-md px-1.5 py-1 text-[10px] font-medium leading-tight mb-0.5 cursor-grab active:cursor-grabbing transition-opacity hover:opacity-80 border-l-[3px] ${
                                STATUS_CONFIG[a.status]?.className ?? "bg-muted text-muted-foreground"
                              }`}
                              style={{ borderLeftColor: a.agenda?.color || "#14B8A6" }}
                            >
                              <span className="font-semibold">{formatTime(a.date)}</span>{" "}
                              {a.patient.name.split(" ")[0]}
                            </div>
                          </DraggableAppointment>
                        ))}
                      </DroppableCell>
                    )
                  })}
                </div>
              ))}
            </div>
           </div>
          </Card>

          {/* Drag overlay */}
          <DragOverlay>
            {activeDragId ? (() => {
              const a = appointments.find((ap) => ap.id === activeDragId)
              if (!a) return null
              return (
                <div className={`truncate rounded-md px-1.5 py-1 text-[10px] font-medium leading-tight shadow-lg ${
                  STATUS_CONFIG[a.status]?.className ?? "bg-muted text-muted-foreground"
                }`}>
                  <span className="font-semibold">{formatTime(a.date)}</span>{" "}
                  {a.patient.name.split(" ")[0]}
                </div>
              )
            })() : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* ─── Day View ─── */}
      {!loading && view === "day" && (
        <Card className="rounded-2xl border border-border/40 overflow-hidden">
          <div className="max-h-[calc(100vh-240px)] overflow-y-auto">
            {HOURS.map((hour) => {
              const hourAppts = getAppointmentsForDate(currentDate).filter((a) => new Date(a.date).getHours() === hour)
              const hourBlocked = getBlockedSlotsForHour(currentDate, hour)
              return (
                <div key={hour} className={`flex border-b border-border/10 ${hourBlocked.length > 0 ? "bg-muted/40" : ""}`}>
                  {/* Hour label */}
                  <div className="flex w-16 shrink-0 items-start justify-end pr-3 pt-2 text-[11px] text-muted-foreground font-medium">
                    {String(hour).padStart(2, "0")}:00
                  </div>
                  {/* Appointments + Blocked Slots */}
                  <div className="flex-1 min-h-[64px] border-l border-border/10 px-2 py-1 space-y-1">
                    {hourBlocked.map((s, i) => (
                      <div key={`block-${s.id}-${i}`} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] bg-muted/60 border-l-4 border-muted-foreground/30 text-muted-foreground">
                        <Ban className="size-3 shrink-0" />
                        <span className="truncate font-medium">{s.title}</span>
                        {s.recurring && <Repeat className="size-3 shrink-0 opacity-60" />}
                        <button onClick={() => handleDeleteBlockedSlot(s.id)} className="ml-auto p-0.5 rounded hover:bg-muted text-muted-foreground/60 hover:text-vox-error">
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    ))}
                    {hourAppts.map((a) => (
                      <AppointmentCard
                        key={a.id}
                        appointment={a}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDelete}
                        compact
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* ─── Month View ─── */}
      {!loading && view === "month" && (
        <>
          <Card className="rounded-2xl border border-border/40 overflow-hidden">
            <div className="grid grid-cols-7 border-b border-border/40">
              {DAY_NAMES.map((d) => (
                <div key={d} className="py-2.5 text-center text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((day, i) => {
                if (day === null) return <div key={`empty-${i}`} className="min-h-[80px] sm:min-h-[100px] border-b border-r border-border/20 bg-muted/20" />
                const dayDate = new Date(year, month, day)
                const dayAppts = getAppointmentsForDay(day)
                const dayBlocked = getBlockedSlotsForDate(dayDate)
                const today = isToday(dayDate)
                const isSelected = selectedDay === day
                return (
                  <button
                    key={`day-${day}`}
                    onClick={() => setSelectedDay(selectedDay === day ? null : day)}
                    className={`min-h-[80px] sm:min-h-[100px] border-b border-r border-border/20 p-1.5 text-left transition-all hover:bg-muted/40 ${isSelected ? "bg-vox-primary/5 ring-1 ring-vox-primary/30" : ""}`}
                  >
                    <div className={`flex items-center justify-center size-7 rounded-full text-xs font-medium mb-1 ${today ? "bg-vox-primary text-white" : "text-foreground"}`}>
                      {day}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {dayBlocked.slice(0, 1).map((s, i) => (
                        <div key={`block-${s.id}-${i}`} className="hidden sm:flex items-center gap-1 truncate text-[10px] px-1.5 py-0.5 rounded-md bg-muted/60 text-muted-foreground">
                          <Ban className="size-2.5 shrink-0" />
                          {s.title}
                        </div>
                      ))}
                      {dayAppts.slice(0, dayBlocked.length > 0 ? 1 : 2).map((a) => (
                        <div key={a.id} className={`hidden sm:block truncate text-[10px] px-1.5 py-0.5 rounded-md ${STATUS_CONFIG[a.status]?.className ?? "bg-muted"}`}>
                          {formatTime(a.date)} {a.patient.name.split(" ")[0]}
                        </div>
                      ))}
                      {(dayAppts.length > 0 || dayBlocked.length > 0) && (
                        <div className="flex gap-0.5 sm:hidden mt-0.5">
                          {dayBlocked.length > 0 && <div className="size-1.5 rounded-full bg-muted-foreground/40" />}
                          {dayAppts.slice(0, 3).map((a) => (
                            <div key={a.id} className={`size-1.5 rounded-full ${STATUS_DOT[a.status] ?? "bg-muted-foreground"}`} />
                          ))}
                          {dayAppts.length > 3 && <span className="text-[9px] text-muted-foreground">+{dayAppts.length - 3}</span>}
                        </div>
                      )}
                      {(dayAppts.length + dayBlocked.length) > 2 && <span className="hidden sm:block text-[10px] text-muted-foreground px-1.5">+{dayAppts.length + dayBlocked.length - 2} mais</span>}
                    </div>
                  </button>
                )
              })}
            </div>
          </Card>

          {selectedDay !== null && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">{selectedDay} de {MONTH_NAMES[month]} de {year}</h2>
              {selectedDayAppointments.length === 0 ? (
                <Card className="rounded-2xl border border-border/40 p-6">
                  <div className="text-center text-muted-foreground">
                    <CalendarDays className="size-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Nenhuma consulta neste dia</p>
                    <Button
                      onClick={() => { setShowScheduleForm(true); setScheduleDate(`${year}-${String(month + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`) }}
                      variant="outline" className="mt-3 rounded-xl text-xs gap-1.5"
                    >
                      <Plus className="size-3.5" /> Agendar neste dia
                    </Button>
                  </div>
                </Card>
              ) : (
                selectedDayAppointments.map((a) => (
                  <AppointmentCard key={a.id} appointment={a} onStatusChange={handleStatusChange} onDelete={handleDelete} />
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* ─── List View ─── */}
      {!loading && view === "list" && (
        <div className="space-y-4">
          {sortedDateKeys.length === 0 ? (
            <Card className="rounded-2xl border border-border/40 p-8">
              <div className="text-center text-muted-foreground">
                <CalendarDays className="size-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">Nenhuma consulta agendada</p>
                <p className="text-xs mt-1">Nenhuma consulta encontrada neste mes.</p>
                <Button onClick={() => setShowScheduleForm(true)} className="mt-4 bg-vox-primary hover:bg-vox-primary/90 text-white rounded-xl text-xs gap-1.5">
                  <Plus className="size-3.5" /> Agendar Consulta
                </Button>
              </div>
            </Card>
          ) : (
            sortedDateKeys.map((dateKey) => (
              <div key={dateKey}>
                <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">{formatDateBR(dateKey + "T00:00:00")}</h3>
                <div className="space-y-2">
                  {groupedByDate[dateKey].map((a) => (
                    <AppointmentCard key={a.id} appointment={a} onStatusChange={handleStatusChange} onDelete={handleDelete} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir consulta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta consulta? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-vox-error text-white hover:bg-vox-error/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ────────────────────── Schedule Form ──────────────────────

function ScheduleForm(props: {
  patientQuery: string; setPatientQuery: (v: string) => void
  patientResults: PatientOption[]; searchingPatients: boolean
  selectedPatient: PatientOption | null; setSelectedPatient: (v: PatientOption | null) => void
  setPatientResults: (v: PatientOption[]) => void
  scheduleDate: string; setScheduleDate: (v: string) => void
  scheduleTime: string; setScheduleTime: (v: string) => void
  scheduleNotes: string; setScheduleNotes: (v: string) => void
  recurringEnabled: boolean; setRecurringEnabled: (v: boolean) => void
  recurrence: "weekly" | "biweekly"; setRecurrence: (v: "weekly" | "biweekly") => void
  occurrences: number; setOccurrences: (v: number) => void
  agendas: AgendaItem[]; scheduleAgendaId: string; setScheduleAgendaId: (v: string) => void
  onSchedule: () => void; onCancel: () => void
}) {
  return (
    <Card className="rounded-2xl border border-border/40 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold">Agendar Nova Consulta</h2>
        <button onClick={props.onCancel} className="p-1 rounded-lg hover:bg-muted/60 text-muted-foreground">
          <X className="size-4" />
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label className="text-xs">Paciente</Label>
          {props.selectedPatient ? (
            <div className="flex items-center gap-2 rounded-xl bg-vox-primary/5 border border-vox-primary/20 px-3 py-2">
              <span className="text-sm font-medium">{props.selectedPatient.name}</span>
              <button onClick={() => { props.setSelectedPatient(null); props.setPatientQuery("") }} className="ml-auto p-0.5 rounded hover:bg-muted/60">
                <X className="size-3.5 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input placeholder="Buscar paciente por nome..." aria-label="Buscar paciente por nome" value={props.patientQuery} onChange={(e) => props.setPatientQuery(e.target.value)} className="pl-9 rounded-xl text-sm" />
              {(props.patientResults.length > 0 || props.searchingPatients) && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border/60 rounded-xl shadow-lg z-10 overflow-hidden">
                  {props.searchingPatients ? (
                    <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin" />Buscando...</div>
                  ) : (
                    props.patientResults.map((p) => (
                      <button key={p.id} onClick={() => { props.setSelectedPatient(p); props.setPatientQuery(""); props.setPatientResults([]) }}
                        className="w-full text-left px-3 py-2.5 hover:bg-muted/60 transition-colors border-b border-border/30 last:border-0">
                        <div className="text-sm font-medium">{p.name}</div>
                        {p.phone && <div className="text-[11px] text-muted-foreground">{p.phone}</div>}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        {props.agendas.length > 1 && (
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-xs">Agenda</Label>
            <select
              value={props.scheduleAgendaId}
              onChange={(e) => props.setScheduleAgendaId(e.target.value)}
              className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-vox-primary/30"
            >
              {props.agendas.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="space-y-2">
          <Label className="text-xs">Data</Label>
          <Input type="date" value={props.scheduleDate} onChange={(e) => props.setScheduleDate(e.target.value)} className="rounded-xl text-sm" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Horario</Label>
          <Input type="time" value={props.scheduleTime} onChange={(e) => props.setScheduleTime(e.target.value)} className="rounded-xl text-sm" />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label className="text-xs">Observacoes (opcional)</Label>
          <Textarea value={props.scheduleNotes} onChange={(e) => props.setScheduleNotes(e.target.value)} placeholder="Notas sobre a consulta..." className="rounded-xl text-sm min-h-[80px]" />
        </div>

        {/* Recurring section */}
        <div className="space-y-3 sm:col-span-2 pt-2 border-t border-border/30">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={props.recurringEnabled}
              onChange={(e) => props.setRecurringEnabled(e.target.checked)}
              className="rounded border-border accent-vox-primary size-4"
            />
            <span className="text-xs font-medium flex items-center gap-1.5">
              <Repeat className="size-3.5 text-muted-foreground" />
              Agendar recorrente
            </span>
          </label>
          {props.recurringEnabled && (
            <div className="grid gap-3 sm:grid-cols-2 pl-6">
              <div className="space-y-1.5">
                <Label className="text-xs">Repetir</Label>
                <select
                  value={props.recurrence}
                  onChange={(e) => props.setRecurrence(e.target.value as "weekly" | "biweekly")}
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-vox-primary/30"
                >
                  <option value="weekly">Semanal</option>
                  <option value="biweekly">Quinzenal</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Quantidade (2-52)</Label>
                <Input
                  type="number"
                  min={2}
                  max={52}
                  value={props.occurrences}
                  onChange={(e) => props.setOccurrences(Math.min(52, Math.max(2, parseInt(e.target.value) || 2)))}
                  className="rounded-xl text-sm"
                />
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={props.onCancel} className="rounded-xl text-xs">Cancelar</Button>
        <Button onClick={props.onSchedule} disabled={!props.selectedPatient || !props.scheduleDate || !props.scheduleTime}
          className="bg-vox-primary hover:bg-vox-primary/90 text-white rounded-xl text-xs">
          {props.recurringEnabled ? `Agendar ${props.occurrences}x` : "Agendar"}
        </Button>
      </div>
    </Card>
  )
}

// ────────────────────── Appointment Card ──────────────────────

function AppointmentCard({
  appointment, onStatusChange, onDelete, compact,
}: {
  appointment: AppointmentItem
  onStatusChange: (id: string, status: string) => void
  onDelete: (id: string) => void
  compact?: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  if (compact) {
    return (
      <Link
        href={`/patients/${appointment.patient.id}`}
        className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] transition-all hover:shadow-sm ${STATUS_CONFIG[appointment.status]?.className ?? "bg-muted"}`}
      >
        <span className="font-semibold tabular-nums">{formatTime(appointment.date)}</span>
        <span className="truncate font-medium">{appointment.patient.name}</span>
        <div className={`size-1.5 rounded-full ml-auto shrink-0 ${STATUS_DOT[appointment.status] ?? "bg-muted-foreground"}`} />
      </Link>
    )
  }

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
              <Link href={`/patients/${appointment.patient.id}`} onClick={(e) => e.stopPropagation()}
                className="text-sm font-medium hover:text-vox-primary transition-colors truncate block">
                {appointment.patient.name}
              </Link>
            </div>
          </div>
          <StatusBadge status={appointment.status} />
        </div>
        {appointment.procedures.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {(appointment.procedures as any[]).map((proc, i) => {
              const name = typeof proc === "string" ? proc : (proc as any)?.name || String(proc)
              return <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/60 text-[11px] font-medium text-muted-foreground">{name}</span>
            })}
          </div>
        )}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-border/30 space-y-3" onClick={(e) => e.stopPropagation()}>
            {appointment.notes && <p className="text-xs text-muted-foreground">{appointment.notes}</p>}
            <div className="flex flex-wrap gap-2">
              {appointment.status === "scheduled" && (
                <>
                  <Button size="sm" onClick={() => onStatusChange(appointment.id, "completed")} className="rounded-xl text-[11px] h-7 gap-1 bg-vox-success hover:bg-vox-success/90 text-white">
                    <Check className="size-3" />Concluir
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onStatusChange(appointment.id, "cancelled")} className="rounded-xl text-[11px] h-7 gap-1 text-vox-error border-vox-error/30 hover:bg-vox-error/5">
                    <XCircle className="size-3" />Cancelar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onStatusChange(appointment.id, "no_show")} className="rounded-xl text-[11px] h-7 gap-1 text-vox-warning border-vox-warning/30 hover:bg-vox-warning/5">
                    <AlertTriangle className="size-3" />Faltou
                  </Button>
                </>
              )}
              {appointment.status !== "scheduled" && (
                <Button size="sm" variant="outline" onClick={() => onStatusChange(appointment.id, "scheduled")} className="rounded-xl text-[11px] h-7 gap-1">Reagendar</Button>
              )}
              <Button size="sm" variant="outline" onClick={() => onDelete(appointment.id)} className="rounded-xl text-[11px] h-7 gap-1 text-vox-error border-vox-error/30 hover:bg-vox-error/5 ml-auto">
                <X className="size-3" />Excluir
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

// ────────────────────── Block Time Form ──────────────────────

function BlockTimeForm({ agendas, defaultAgendaId, onSave, onCancel }: {
  agendas: AgendaItem[]
  defaultAgendaId: string
  onSave: (data: { title: string; startDate: string; endDate: string; agendaId: string; allDay?: boolean; recurring?: string | null }) => Promise<void>
  onCancel: () => void
}) {
  const [title, setTitle] = useState("")
  const [startDate, setStartDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endDate, setEndDate] = useState("")
  const [endTime, setEndTime] = useState("")
  const [allDay, setAllDay] = useState(false)
  const [recurring, setRecurring] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [agendaId, setAgendaId] = useState(defaultAgendaId)

  async function handleSave() {
    if (!title.trim() || !startDate || !agendaId) return
    setSaving(true)
    try {
      const start = allDay ? `${startDate}T00:00:00` : `${startDate}T${startTime || "00:00"}:00`
      const end = allDay ? `${endDate || startDate}T23:59:59` : `${endDate || startDate}T${endTime || startTime || "01:00"}:00`
      await onSave({
        title: title.trim(),
        startDate: new Date(start).toISOString(),
        endDate: new Date(end).toISOString(),
        agendaId,
        allDay,
        recurring: recurring || null,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="rounded-2xl border border-border/40 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Ban className="size-4 text-muted-foreground" />
          Bloquear Horario
        </h2>
        <button onClick={onCancel} className="p-1 rounded-lg hover:bg-muted/60 text-muted-foreground">
          <X className="size-4" />
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label className="text-xs">Titulo</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Almoco, Ferias, Reuniao..."
            className="rounded-xl text-sm"
          />
        </div>
        {agendas.length > 1 && (
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-xs">Agenda</Label>
            <select
              value={agendaId}
              onChange={(e) => setAgendaId(e.target.value)}
              className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-vox-primary/30"
            >
              {agendas.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="space-y-2 sm:col-span-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="rounded border-border accent-vox-primary size-4"
            />
            <span className="text-xs font-medium">Dia inteiro</span>
          </label>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Data inicio</Label>
          <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); if (!endDate) setEndDate(e.target.value) }} className="rounded-xl text-sm" />
        </div>
        {!allDay && (
          <div className="space-y-2">
            <Label className="text-xs">Horario inicio</Label>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="rounded-xl text-sm" />
          </div>
        )}
        <div className="space-y-2">
          <Label className="text-xs">Data fim</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-xl text-sm" />
        </div>
        {!allDay && (
          <div className="space-y-2">
            <Label className="text-xs">Horario fim</Label>
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="rounded-xl text-sm" />
          </div>
        )}
        <div className="space-y-2 sm:col-span-2">
          <Label className="text-xs">Repetir</Label>
          <select
            value={recurring}
            onChange={(e) => setRecurring(e.target.value)}
            className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-vox-primary/30"
          >
            <option value="">Nenhum</option>
            <option value="weekly">Semanal</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={onCancel} className="rounded-xl text-xs">Cancelar</Button>
        <Button
          onClick={handleSave}
          disabled={!title.trim() || !startDate || saving}
          className="bg-muted-foreground hover:bg-muted-foreground/90 text-white rounded-xl text-xs gap-1.5"
        >
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Ban className="size-3.5" />}
          Bloquear
        </Button>
      </div>
    </Card>
  )
}
