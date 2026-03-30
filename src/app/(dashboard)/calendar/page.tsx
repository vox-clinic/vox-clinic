"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  List,
  Plus,
  Sun,
  Ban,
  Loader2,
  Calendar as CalendarIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { toast } from "sonner"
import { friendlyError } from "@/lib/error-messages"
import {
  getAppointmentsByDateRange,
  scheduleAppointment,
  scheduleRecurringAppointments,
  updateAppointmentStatus,
  deleteAppointment,
  rescheduleAppointment,
} from "@/server/actions/appointment"
import {
  getBlockedSlots,
  createBlockedSlot,
  deleteBlockedSlot,
  updateBlockedSlot,
  type BlockedSlotItem,
} from "@/server/actions/blocked-slot"
import { getAgendas } from "@/server/actions/agenda"
import type { AgendaItem, AppointmentItem, ViewMode } from "./types"
import { MONTH_NAMES, MONTH_SHORT, DAY_FULL, getMonday, getWeekDays } from "./helpers"
import { WeekView } from "./components/week-view"
import { DayView } from "./components/day-view"
import { MonthView } from "./components/month-view"
import { ListView } from "./components/list-view"
import { ScheduleForm } from "./components/schedule-form"
import { BlockTimeForm } from "./components/block-time-form"
import { ConflictDialog } from "./components/conflict-dialog"

// ────────────────────── Cache ──────────────────────

type CacheEntry = {
  appointments: AppointmentItem[]
  blockedSlots: BlockedSlotItem[]
  timestamp: number
}
const CACHE_TTL = 60_000
const dataCache = new Map<string, CacheEntry>()

// ────────────────────── Main Component ──────────────────────

export default function CalendarPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [currentDate, setCurrentDate] = useState(now)
  const [view, setView] = useState<ViewMode>("week")
  const [appointments, setAppointments] = useState<AppointmentItem[]>([])
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlotItem[]>([])
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [scheduleDefaultDate, setScheduleDefaultDate] = useState("")
  const [scheduleDefaultTime, setScheduleDefaultTime] = useState("")
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [showBlockForm, setShowBlockForm] = useState(false)

  // Agendas
  const [agendas, setAgendas] = useState<AgendaItem[]>([])
  const [selectedAgendaIds, setSelectedAgendaIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const saved = localStorage.getItem("vox-calendar-agendas")
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const defaultAgendaId = agendas.find((a) => a.isDefault)?.id || agendas[0]?.id || ""

  // Conflict dialog (replaces native confirm())
  const [conflictMessage, setConflictMessage] = useState("")
  const conflictResolveRef = useRef<(() => void) | null>(null)

  // Compute date range
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
    return [new Date(year, month, 1), new Date(year, month + 1, 0, 23, 59, 59, 999)]
  }, [view, currentDate, year, month])

  // Persist agenda filter to localStorage
  useEffect(() => {
    localStorage.setItem("vox-calendar-agendas", JSON.stringify(selectedAgendaIds))
  }, [selectedAgendaIds])

  // Validate restored agenda IDs against loaded agendas
  useEffect(() => {
    if (agendas.length === 0) return
    setSelectedAgendaIds((prev) => {
      if (prev.length === 0) return prev
      const valid = prev.filter((id) => agendas.some((a) => a.id === id))
      if (valid.length === prev.length) return prev
      return valid
    })
  }, [agendas])

  const loadAgendas = useCallback(async () => {
    try {
      const data = await getAgendas()
      setAgendas(data)
    } catch {
      setAgendas([])
    }
  }, [])


  const initialLoadDone = useRef(false)

  const loadData = useCallback(async (skipCache = false) => {
    const [start, end] = getDateRange()
    const filterIds = selectedAgendaIds.length > 0 ? selectedAgendaIds : undefined
    const cacheKey = `${start.toISOString()}-${end.toISOString()}-${(filterIds || []).join(",")}`

    if (!skipCache) {
      const cached = dataCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setAppointments(cached.appointments)
        setBlockedSlots(cached.blockedSlots)
        setLoading(false)
        initialLoadDone.current = true
        return
      }
    }

    // Show loading spinner on initial load or navigation to uncached period
    // skipCache=true means background refresh (drag/status) — no spinner
    if (!skipCache) {
      setLoading(true)
    }
    try {
      const [apptData, slotData] = await Promise.all([
        getAppointmentsByDateRange(start.toISOString(), end.toISOString(), filterIds),
        getBlockedSlots(start.toISOString(), end.toISOString(), filterIds),
      ])
      setAppointments(apptData)
      setBlockedSlots(slotData)
      dataCache.set(cacheKey, { appointments: apptData, blockedSlots: slotData, timestamp: Date.now() })
    } catch {
      setAppointments([])
      setBlockedSlots([])
    } finally {
      setLoading(false)
      initialLoadDone.current = true
    }
  }, [getDateRange, selectedAgendaIds])

  useEffect(() => { loadAgendas() }, [loadAgendas])
  useEffect(() => { loadData() }, [loadData])

  /** Background refresh without loading spinner */
  function refreshInBackground() {
    dataCache.clear()
    loadData(true)
  }

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

  // ── Handlers ──
  async function handleSchedule(data: {
    patientId: string; date: string; agendaId: string; notes?: string
    type?: "presencial" | "teleconsulta"; price?: number
    recurringEnabled: boolean; recurrence: "weekly" | "biweekly"; occurrences: number
  }, forceSchedule = false) {
    try {
      if (data.recurringEnabled) {
        const result = await scheduleRecurringAppointments({
          patientId: data.patientId,
          startDate: data.date,
          agendaId: data.agendaId,
          notes: data.notes,
          recurrence: data.recurrence,
          occurrences: data.occurrences,
          forceSchedule,
        })
        if ('error' in result && result.error) {
          if (result.error.startsWith("CONFLICT:")) {
            setConflictMessage(result.error.replace("CONFLICT:", ""))
            conflictResolveRef.current = () => handleSchedule(data, true)
          } else { toast.error(result.error) }
          return
        }
        toast.success(`${data.occurrences} consultas agendadas`)
      } else {
        const result = await scheduleAppointment({
          patientId: data.patientId,
          date: data.date,
          agendaId: data.agendaId,
          notes: data.notes,
          type: data.type,
          price: data.price,
          forceSchedule,
        })
        if ('error' in result && result.error) {
          if (result.error.startsWith("CONFLICT:")) {
            setConflictMessage(result.error.replace("CONFLICT:", ""))
            conflictResolveRef.current = () => handleSchedule(data, true)
          } else { toast.error(result.error) }
          return
        }
        toast.success(data.type === "teleconsulta" ? "Teleconsulta agendada" : "Consulta agendada")
      }
      setShowScheduleForm(false)
      // Background refresh — no loading spinner
      refreshInBackground()
    } catch (err) {
      toast.error(friendlyError(err, "Erro ao agendar consulta"))
    }
  }

  async function handleReschedule(appointmentId: string, newDate: string, forceSchedule = false) {
    // Optimistic update: move the appointment in local state immediately
    const previousAppointments = appointments
    setAppointments((prev) =>
      prev.map((a) => a.id === appointmentId ? { ...a, date: newDate } : a)
    )

    try {
      const result = await rescheduleAppointment(appointmentId, newDate, forceSchedule)
      if ('error' in result && result.error) {
        // Revert optimistic update on error
        setAppointments(previousAppointments)
        if (result.error.startsWith("CONFLICT:")) {
          setConflictMessage(result.error.replace("CONFLICT:", ""))
          conflictResolveRef.current = () => handleReschedule(appointmentId, newDate, true)
        } else { toast.error(result.error) }
        return
      }
      // Background refresh to sync with server (no loading spinner)
      refreshInBackground()
      toast.success("Consulta reagendada")
    } catch (err) {
      // Revert optimistic update on failure
      setAppointments(previousAppointments)
      toast.error(friendlyError(err, "Erro ao reagendar consulta"))
    }
  }

  async function handleStatusChange(appointmentId: string, status: string) {
    // Optimistic update
    const previousAppointments = appointments
    setAppointments((prev) =>
      prev.map((a) => a.id === appointmentId ? { ...a, status } : a)
    )

    try {
      const result = await updateAppointmentStatus(appointmentId, status)
      if ('error' in result) {
        setAppointments(previousAppointments)
        toast.error(result.error)
        return
      }
      refreshInBackground()
      toast.success("Status atualizado")
    } catch (err) {
      setAppointments(previousAppointments)
      toast.error(friendlyError(err, "Erro ao atualizar status"))
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    // Optimistic: remove from local state immediately
    const previousAppointments = appointments
    const targetId = deleteTarget
    setAppointments((prev) => prev.filter((a) => a.id !== targetId))
    setDeleteTarget(null)

    try {
      const result = await deleteAppointment(targetId)
      if ('error' in result) {
        setAppointments(previousAppointments)
        toast.error(result.error)
        return
      }
      refreshInBackground()
      toast.success("Consulta excluída")
    } catch (err) {
      setAppointments(previousAppointments)
      toast.error(friendlyError(err, "Erro ao excluir consulta"))
    }
  }

  async function handleDeleteBlockedSlot(id: string) {
    // Optimistic: remove from local state
    const previousSlots = blockedSlots
    setBlockedSlots((prev) => prev.filter((s) => s.id !== id))

    try {
      const result = await deleteBlockedSlot(id)
      if ('error' in result) {
        setBlockedSlots(previousSlots)
        toast.error(result.error)
        return
      }
      refreshInBackground()
      toast.success("Bloqueio removido")
    } catch (err) {
      setBlockedSlots(previousSlots)
      toast.error(friendlyError(err, "Erro ao remover bloqueio"))
    }
  }

  async function handleUpdateBlockedSlot(id: string, data: { title?: string; startDate?: string; endDate?: string; allDay?: boolean; recurring?: string | null }) {
    // Optimistic: update in local state
    const previousSlots = blockedSlots
    setBlockedSlots((prev) =>
      prev.map((s) => s.id === id ? { ...s, ...data } : s)
    )

    try {
      const result = await updateBlockedSlot(id, data)
      if ('error' in result) {
        setBlockedSlots(previousSlots)
        toast.error(result.error)
        return
      }
      refreshInBackground()
      toast.success("Bloqueio atualizado")
    } catch (err) {
      setBlockedSlots(previousSlots)
      toast.error(friendlyError(err, "Erro ao atualizar bloqueio"))
    }
  }

  const weekDays = view === "week" ? getWeekDays(getMonday(currentDate)) : []

  return (
    <div data-testid="page-calendar" className="flex flex-col gap-4 pb-24 md:pb-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button onClick={navigatePrev} aria-label="Período anterior" className="flex size-11 items-center justify-center rounded-xl hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-vox-primary/50">
            <ChevronLeft className="size-4" />
          </button>
          <h1 className="text-base font-semibold tracking-tight min-w-[200px] text-center">
            {getTitle()}
          </h1>
          <button onClick={navigateNext} aria-label="Próximo período" className="flex size-11 items-center justify-center rounded-xl hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-vox-primary/50">
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
          <div className="flex rounded-xl bg-muted/50 p-0.5" role="group" aria-label="Modo de visualização">
            {([
              { key: "day" as const, label: "Dia", icon: Sun },
              { key: "week" as const, label: "Semana", icon: CalendarIcon },
              { key: "month" as const, label: "Mês", icon: CalendarDays },
              { key: "list" as const, label: "Lista", icon: List },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                aria-pressed={view === key}
                aria-label={`Visualização por ${label}`}
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
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-vox-primary/50 ${
                  view === key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-3.5" />
                <span className="hidden sm:inline">{label}</span><span className="sm:hidden text-[9px]">{label.slice(0, 3)}</span>
              </button>
            ))}
          </div>

          <Button variant="outline" onClick={() => setShowBlockForm(true)} className="rounded-xl text-xs gap-1.5 active:scale-[0.98]">
            <Ban className="size-3.5" />
            <span className="hidden sm:inline">Bloquear</span>
          </Button>

          <Button
            onClick={() => { setScheduleDefaultDate(""); setScheduleDefaultTime(""); setShowScheduleForm(true) }}
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
                    if (prev.length === 0) return [agenda.id]
                    if (prev.includes(agenda.id)) {
                      const next = prev.filter((id) => id !== agenda.id)
                      return next.length === 0 ? [] : next
                    }
                    const next = [...prev, agenda.id]
                    return next.length === agendas.filter((a) => a.isActive).length ? [] : next
                  })
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                  isSelected
                    ? "border-border/60 bg-background shadow-sm"
                    : "border-transparent bg-muted/40 text-muted-foreground opacity-50"
                }`}
              >
                <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: agenda.color }} />
                {agenda.name}
              </button>
            )
          })}
        </div>
      )}

      {/* ─── Schedule Form ─── */}
      {showScheduleForm && (
        <ScheduleForm
          agendas={agendas.filter((a) => a.isActive)}
          defaultAgendaId={defaultAgendaId}
          defaultDate={scheduleDefaultDate}
          defaultTime={scheduleDefaultTime}
          onSchedule={(data) => handleSchedule(data)}
          onCancel={() => setShowScheduleForm(false)}
        />
      )}

      {/* ─── Block Time Form ─── */}
      {showBlockForm && (
        <BlockTimeForm
          agendas={agendas.filter((a) => a.isActive)}
          defaultAgendaId={defaultAgendaId}
          onSave={async (data) => {
            try {
              const result = await createBlockedSlot(data)
              if ('error' in result) { toast.error(result.error); return }
              setShowBlockForm(false)
              dataCache.clear()
              loadData(true)
              toast.success("Horário bloqueado")
            } catch (err) {
              toast.error(friendlyError(err, "Erro ao bloquear horario"))
            }
          }}
          onCancel={() => setShowBlockForm(false)}
        />
      )}

      {/* ─── Loading ─── */}
      {loading && !initialLoadDone.current && (
        <div data-testid="loading-calendar" className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="size-5 animate-spin text-vox-primary" />
          <p className="text-xs text-muted-foreground">Carregando agenda...</p>
        </div>
      )}

      {/* ─── Views ─── */}
      {/* Views stay mounted during navigation reloads — only hidden on initial load */}
      <div className={`relative ${loading && !initialLoadDone.current ? "hidden" : ""}`}>
        {/* Subtle inline loading indicator for navigation between periods */}
        {loading && initialLoadDone.current && (
          <div className="absolute inset-x-0 top-0 z-30 flex justify-center py-2 pointer-events-none">
            <div className="flex items-center gap-2 rounded-full bg-background/90 backdrop-blur-sm border border-border/50 px-3 py-1.5 shadow-sm">
              <Loader2 className="size-3 animate-spin text-vox-primary" />
              <span className="text-[11px] text-muted-foreground font-medium">Atualizando...</span>
            </div>
          </div>
        )}

        {view === "week" && (
          <WeekView
            weekDays={weekDays}
            appointments={appointments}
            blockedSlots={blockedSlots}
            onReschedule={handleReschedule}
            onStatusChange={handleStatusChange}
            onDelete={(id) => setDeleteTarget(id)}
            onDeleteBlockedSlot={handleDeleteBlockedSlot}
            onUpdateBlockedSlot={handleUpdateBlockedSlot}
            onSlotClick={(date, time) => {
              setScheduleDefaultDate(date)
              setScheduleDefaultTime(time)
              setShowScheduleForm(true)
            }}
          />
        )}

        {view === "day" && (
          <DayView
            currentDate={currentDate}
            appointments={appointments}
            blockedSlots={blockedSlots}
            onStatusChange={handleStatusChange}
            onDelete={(id) => setDeleteTarget(id)}
            onDeleteBlockedSlot={handleDeleteBlockedSlot}
            onUpdateBlockedSlot={handleUpdateBlockedSlot}
            onSlotClick={(date, time) => {
              setScheduleDefaultDate(date)
              setScheduleDefaultTime(time)
              setShowScheduleForm(true)
            }}
          />
        )}

        {view === "month" && (
          <MonthView
            year={year}
            month={month}
            appointments={appointments}
            blockedSlots={blockedSlots}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            onStatusChange={handleStatusChange}
            onDelete={(id) => setDeleteTarget(id)}
            onDeleteBlockedSlot={handleDeleteBlockedSlot}
            onUpdateBlockedSlot={handleUpdateBlockedSlot}
            onScheduleForDay={(day) => {
              setScheduleDefaultDate(`${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`)
              setScheduleDefaultTime("")
              setShowScheduleForm(true)
            }}
          />
        )}

        {view === "list" && (
          <ListView
            appointments={appointments}
            onStatusChange={handleStatusChange}
            onDelete={(id) => setDeleteTarget(id)}
            onShowSchedule={() => { setScheduleDefaultTime(""); setShowScheduleForm(true) }}
          />
        )}
      </div>

      {!loading && appointments.length === 0 && blockedSlots.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <div className="mx-auto mb-1 flex size-14 items-center justify-center rounded-2xl bg-muted/50">
            <CalendarDays className="size-6 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Sem consultas neste período</p>
          <p className="text-xs text-muted-foreground/70">Agende uma consulta para começar</p>
          <button
            onClick={() => { setScheduleDefaultDate(""); setScheduleDefaultTime(""); setShowScheduleForm(true) }}
            className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-vox-primary hover:text-vox-primary/80 rounded-lg px-3 py-1.5 hover:bg-vox-primary/5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-vox-primary/50 focus-visible:ring-offset-2"
          >
            <Plus className="size-3" />
            Agendar consulta
          </button>
        </div>
      )}

      {/* ─── Delete Dialog ─── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent data-testid="modal-confirm-delete">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir consulta</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir esta consulta? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-vox-error text-white hover:bg-vox-error/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Conflict Dialog ─── */}
      <ConflictDialog
        open={!!conflictMessage}
        message={conflictMessage}
        onConfirm={() => {
          const resolve = conflictResolveRef.current
          setConflictMessage("")
          conflictResolveRef.current = null
          resolve?.()
        }}
        onCancel={() => {
          setConflictMessage("")
          conflictResolveRef.current = null
        }}
      />

    </div>
  )
}
