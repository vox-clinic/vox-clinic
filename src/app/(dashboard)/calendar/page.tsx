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
  Clock,
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
  type BlockedSlotItem,
} from "@/server/actions/blocked-slot"
import { getAgendas } from "@/server/actions/agenda"
import { getWaitlistCount } from "@/server/actions/waitlist"
import { getWorkspace } from "@/server/actions/workspace"
import type { AgendaItem, AppointmentItem, ViewMode } from "./types"
import { MONTH_NAMES, MONTH_SHORT, DAY_FULL, getMonday, getWeekDays } from "./helpers"
import { WeekView } from "./components/week-view"
import { DayView } from "./components/day-view"
import { MonthView } from "./components/month-view"
import { ListView } from "./components/list-view"
import { ScheduleForm } from "./components/schedule-form"
import { BlockTimeForm } from "./components/block-time-form"
import { ConflictDialog } from "./components/conflict-dialog"
import { WaitlistPanel } from "./components/waitlist-panel"
import { AddWaitlistDialog } from "./components/add-waitlist-dialog"

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
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [showBlockForm, setShowBlockForm] = useState(false)

  // Agendas
  const [agendas, setAgendas] = useState<AgendaItem[]>([])
  const [selectedAgendaIds, setSelectedAgendaIds] = useState<string[]>([])
  const defaultAgendaId = agendas.find((a) => a.isDefault)?.id || agendas[0]?.id || ""

  // Waitlist
  const [showWaitlistPanel, setShowWaitlistPanel] = useState(false)
  const [showAddWaitlist, setShowAddWaitlist] = useState(false)
  const [waitlistCount, setWaitlistCount] = useState(0)
  const [workspaceProcedures, setWorkspaceProcedures] = useState<{ id: string; name: string }[]>([])

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

  const loadAgendas = useCallback(async () => {
    try {
      const data = await getAgendas()
      setAgendas(data)
    } catch {
      setAgendas([])
    }
  }, [])

  const loadWaitlistCount = useCallback(async () => {
    try {
      setWaitlistCount(await getWaitlistCount())
    } catch {
      setWaitlistCount(0)
    }
  }, [])

  const loadWorkspaceProcedures = useCallback(async () => {
    try {
      const ws = await getWorkspace()
      setWorkspaceProcedures(ws.procedures.map((p) => ({ id: p.id, name: p.name })))
    } catch {
      setWorkspaceProcedures([])
    }
  }, [])

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
        return
      }
    }

    setLoading(true)
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
    }
  }, [getDateRange, selectedAgendaIds])

  useEffect(() => { loadAgendas(); loadWaitlistCount(); loadWorkspaceProcedures() }, [loadAgendas, loadWaitlistCount, loadWorkspaceProcedures])
  useEffect(() => { loadData() }, [loadData])

  function reloadData() {
    dataCache.clear()
    loadAgendas()
    loadData(true)
    loadWaitlistCount()
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
      reloadData()
    } catch (err) {
      toast.error(friendlyError(err, "Erro ao agendar consulta"))
    }
  }

  async function handleReschedule(appointmentId: string, newDate: string, forceSchedule = false) {
    try {
      const result = await rescheduleAppointment(appointmentId, newDate, forceSchedule)
      if ('error' in result && result.error) {
        if (result.error.startsWith("CONFLICT:")) {
          setConflictMessage(result.error.replace("CONFLICT:", ""))
          conflictResolveRef.current = () => handleReschedule(appointmentId, newDate, true)
        } else { toast.error(result.error) }
        return
      }
      reloadData()
      toast.success("Consulta reagendada")
    } catch (err) {
      toast.error(friendlyError(err, "Erro ao reagendar consulta"))
    }
  }

  async function handleStatusChange(appointmentId: string, status: string) {
    try {
      const result = await updateAppointmentStatus(appointmentId, status)
      if ('error' in result) { toast.error(result.error); return }
      reloadData()
      toast.success("Status atualizado")
    } catch (err) {
      toast.error(friendlyError(err, "Erro ao atualizar status"))
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      const result = await deleteAppointment(deleteTarget)
      if ('error' in result) { toast.error(result.error); return }
      reloadData()
      toast.success("Consulta excluída")
    } catch (err) {
      toast.error(friendlyError(err, "Erro ao excluir consulta"))
    } finally {
      setDeleteTarget(null)
    }
  }

  async function handleDeleteBlockedSlot(id: string) {
    try {
      const result = await deleteBlockedSlot(id)
      if ('error' in result) { toast.error(result.error); return }
      reloadData()
      toast.success("Bloqueio removido")
    } catch (err) {
      toast.error(friendlyError(err, "Erro ao remover bloqueio"))
    }
  }

  const weekDays = view === "week" ? getWeekDays(getMonday(currentDate)) : []

  return (
    <div data-testid="page-calendar" className="flex flex-col gap-4 pb-24 md:pb-6">
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
            onClick={() => setShowWaitlistPanel(true)}
            className="rounded-xl text-xs gap-1.5 active:scale-[0.98] relative"
          >
            <Clock className="size-3.5" />
            <span className="hidden sm:inline">Espera</span>
            {waitlistCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-vox-primary text-white text-[9px] font-bold px-1">
                {waitlistCount}
              </span>
            )}
          </Button>

          <Button variant="outline" onClick={() => setShowBlockForm(true)} className="rounded-xl text-xs gap-1.5 active:scale-[0.98]">
            <Ban className="size-3.5" />
            <span className="hidden sm:inline">Bloquear</span>
          </Button>

          <Button
            onClick={() => { setScheduleDefaultDate(""); setShowScheduleForm(true) }}
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
              reloadData()
              toast.success("Horário bloqueado")
            } catch (err) {
              toast.error(friendlyError(err, "Erro ao bloquear horario"))
            }
          }}
          onCancel={() => setShowBlockForm(false)}
        />
      )}

      {/* ─── Loading ─── */}
      {loading && (
        <div data-testid="loading-calendar" className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="size-5 animate-spin text-vox-primary" />
          <p className="text-xs text-muted-foreground">Carregando agenda...</p>
        </div>
      )}

      {/* ─── Views ─── */}
      {!loading && view === "week" && (
        <WeekView
          weekDays={weekDays}
          appointments={appointments}
          blockedSlots={blockedSlots}
          onReschedule={handleReschedule}
          onStatusChange={handleStatusChange}
          onDelete={(id) => setDeleteTarget(id)}
        />
      )}

      {!loading && view === "day" && (
        <DayView
          currentDate={currentDate}
          appointments={appointments}
          blockedSlots={blockedSlots}
          onStatusChange={handleStatusChange}
          onDelete={(id) => setDeleteTarget(id)}
          onDeleteBlockedSlot={handleDeleteBlockedSlot}
        />
      )}

      {!loading && view === "month" && (
        <MonthView
          year={year}
          month={month}
          appointments={appointments}
          blockedSlots={blockedSlots}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          onStatusChange={handleStatusChange}
          onDelete={(id) => setDeleteTarget(id)}
          onScheduleForDay={(day) => {
            setScheduleDefaultDate(`${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`)
            setShowScheduleForm(true)
          }}
        />
      )}

      {!loading && view === "list" && (
        <ListView
          appointments={appointments}
          onStatusChange={handleStatusChange}
          onDelete={(id) => setDeleteTarget(id)}
          onShowSchedule={() => setShowScheduleForm(true)}
        />
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

      {/* ─── Waitlist Panel ─── */}
      <WaitlistPanel
        open={showWaitlistPanel}
        onClose={() => setShowWaitlistPanel(false)}
        onSchedulePatient={(_patientId, _patientName) => {
          setShowWaitlistPanel(false)
          setScheduleDefaultDate("")
          setShowScheduleForm(true)
        }}
        onAddToWaitlist={() => {
          setShowWaitlistPanel(false)
          setShowAddWaitlist(true)
        }}
      />

      {/* ─── Add to Waitlist Dialog ─── */}
      <AddWaitlistDialog
        open={showAddWaitlist}
        onClose={() => setShowAddWaitlist(false)}
        onAdded={() => {
          loadWaitlistCount()
        }}
        agendas={agendas.filter((a) => a.isActive)}
        procedures={workspaceProcedures}
      />
    </div>
  )
}
