"use client"

import { useEffect, useRef, useMemo, memo, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragMoveEvent,
} from "@dnd-kit/core"
import { Ban } from "lucide-react"
import { Card } from "@/components/ui/card"
import type { AppointmentItem } from "../types"
import type { BlockedSlotItem } from "@/server/actions/blocked-slot"
import { HOURS, DAY_NAMES, formatTime, isToday, getBlockedSlotsForHour, agendaColorBg } from "../helpers"
import { NowLine } from "./now-line"
import { AppointmentPopover } from "./appointment-popover"
import { BlockedSlotPopover } from "./blocked-slot-popover"

const ROW_HEIGHT = 88
const SNAP_MINUTES = 15
const DEFAULT_DURATION_MIN = 30
const MIN_CARD_HEIGHT = 22

function snapToQuarter(minutes: number): number {
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES
}

function formatHourMinute(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

// ─── Overlap calculation for a full day column ───

interface PositionedAppointment {
  appointment: AppointmentItem
  startMin: number  // minutes from midnight
  endMin: number
  column: number
  totalColumns: number
}

function layoutDayAppointments(appointments: AppointmentItem[]): PositionedAppointment[] {
  if (appointments.length === 0) return []

  const items = appointments.map((a) => {
    const d = new Date(a.date)
    const startMin = d.getHours() * 60 + d.getMinutes()
    return {
      appointment: a,
      startMin,
      endMin: startMin + DEFAULT_DURATION_MIN,
      column: 0,
      totalColumns: 1,
    }
  }).sort((a, b) => a.startMin - b.startMin || a.appointment.id.localeCompare(b.appointment.id))

  // Greedy column assignment
  const columns: number[][] = [] // each column tracks end times

  for (const item of items) {
    let placed = false
    for (let c = 0; c < columns.length; c++) {
      const lastEnd = columns[c][columns[c].length - 1]
      if (item.startMin >= lastEnd) {
        columns[c].push(item.endMin)
        item.column = c
        placed = true
        break
      }
    }
    if (!placed) {
      item.column = columns.length
      columns.push([item.endMin])
    }
  }

  // Expand totalColumns for overlapping groups
  for (let i = 0; i < items.length; i++) {
    let maxCol = items[i].column
    for (let j = 0; j < items.length; j++) {
      if (i === j) continue
      // Check overlap
      if (items[i].startMin < items[j].endMin && items[i].endMin > items[j].startMin) {
        maxCol = Math.max(maxCol, items[j].column)
      }
    }
    items[i].totalColumns = Math.max(items[i].totalColumns, maxCol + 1)
  }

  // Normalize totalColumns within each overlap group
  for (let i = 0; i < items.length; i++) {
    const overlapping = items.filter(
      (j) => j.startMin < items[i].endMin && j.endMin > items[i].startMin
    )
    const groupMax = Math.max(...overlapping.map((x) => x.totalColumns))
    for (const o of overlapping) o.totalColumns = groupMax
  }

  return items
}

// ─── Build per-day index ───

function buildDayColumnIndex(appointments: AppointmentItem[]): Map<string, PositionedAppointment[]> {
  const byDay = new Map<string, AppointmentItem[]>()
  for (const a of appointments) {
    const d = new Date(a.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    const existing = byDay.get(key)
    if (existing) existing.push(a)
    else byDay.set(key, [a])
  }

  const result = new Map<string, PositionedAppointment[]>()
  for (const [key, appts] of byDay) {
    result.set(key, layoutDayAppointments(appts))
  }
  return result
}

// ─── Components ───

function DraggableAppointment({ appointment, children }: { appointment: AppointmentItem; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: appointment.id,
    data: appointment,
  })

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={isDragging ? "opacity-30 pointer-events-none" : ""}>
      {children}
    </div>
  )
}

function DroppableCell({ id, children, className, ghostMinute, onClick }: {
  id: string
  children: React.ReactNode
  className?: string
  ghostMinute?: number | null
  onClick?: () => void
}) {
  const { isOver, setNodeRef } = useDroppable({ id })

  return (
    <div ref={setNodeRef} onClick={onClick} className={`relative ${className ?? ""} ${isOver ? "bg-vox-primary/10 ring-1 ring-vox-primary/30" : ""}`}>
      {children}
      {isOver && ghostMinute !== null && ghostMinute !== undefined && (() => {
        const hour = parseInt(id.substring(id.lastIndexOf("-") + 1), 10)
        return (
          <div
            className="absolute left-0 right-0 h-[2px] bg-vox-primary pointer-events-none z-30"
            style={{ top: `${(ghostMinute / 60) * ROW_HEIGHT}px` }}
          >
            <div className="absolute -left-0.5 -top-[4px] size-[10px] rounded-full bg-vox-primary shadow-sm shadow-vox-primary/40" />
            <span className="absolute -left-14 -top-[10px] text-[11px] font-bold text-white bg-vox-primary px-1.5 py-0.5 rounded-md shadow-sm tabular-nums">
              {formatHourMinute(hour, ghostMinute)}
            </span>
          </div>
        )
      })()}
    </div>
  )
}

// Status styling
const STATUS_OPACITY: Record<string, string> = {
  completed: "opacity-60",
  cancelled: "opacity-40 line-through",
  no_show: "opacity-50",
}

function WeekViewInner({
  weekDays,
  appointments,
  blockedSlots,
  onReschedule,
  onStatusChange,
  onDelete,
  onDeleteBlockedSlot,
  onUpdateBlockedSlot,
  onSlotClick,
}: {
  weekDays: Date[]
  appointments: AppointmentItem[]
  blockedSlots: BlockedSlotItem[]
  onReschedule: (appointmentId: string, newDate: string, forceSchedule?: boolean) => Promise<void>
  onStatusChange: (id: string, status: string) => void
  onDelete: (id: string) => void
  onDeleteBlockedSlot: (id: string) => void
  onUpdateBlockedSlot: (id: string, data: { title?: string; startDate?: string; endDate?: string; allDay?: boolean; recurring?: string | null }) => Promise<void>
  onSlotClick?: (date: string, time: string) => void
}) {
  const router = useRouter()
  const weekGridRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [ghostMinute, setGhostMinute] = useState<number | null>(null)
  const [overCellId, setOverCellId] = useState<string | null>(null)
  const [selectedAppointment, setSelectedAppointment] = useState<{ appointment: AppointmentItem; position: { top: number; left: number } } | null>(null)
  const [selectedBlockedSlot, setSelectedBlockedSlot] = useState<{ slot: BlockedSlotItem; position: { top: number; left: number } } | null>(null)
  const dropMinuteRef = useRef<number>(0)
  const dropHourRef = useRef<number>(0)
  const dropDateRef = useRef<string>("")

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  // Build positioned appointments per day
  const dayColumnIndex = useMemo(() => buildDayColumnIndex(appointments), [appointments])

  useEffect(() => {
    const container = weekGridRef.current
    if (!container) return
    const currentHour = new Date().getHours()
    const scrollTarget = (currentHour - 7) * ROW_HEIGHT
    container.scrollTo({ top: Math.max(0, scrollTarget - 100), behavior: "smooth" })
  }, [])

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(event.active.id as string)
  }

  const calculateMinuteFromPointer = useCallback((event: DragMoveEvent | DragEndEvent) => {
    const { over, activatorEvent, delta } = event
    if (!over || !gridRef.current || !weekGridRef.current) return null

    const droppableId = over.id as string
    const lastDash = droppableId.lastIndexOf("-")
    const dateIso = droppableId.substring(0, lastDash)

    // Calculate minute from pointer Y relative to the entire grid,
    // avoiding fragile querySelector that fails for some cell IDs.
    // Note: getBoundingClientRect() already accounts for scroll position,
    // so we must NOT add scrollTop (that would double-count the offset).
    const pointerEvent = activatorEvent as PointerEvent
    const pointerY = pointerEvent.clientY + delta.y

    const gridRect = gridRef.current.getBoundingClientRect()
    const relativeToGrid = pointerY - gridRect.top

    // Each row is ROW_HEIGHT. Compute exact position in minutes from FIRST_HOUR.
    const totalMinutesFromStart = Math.max(0, (relativeToGrid / ROW_HEIGHT) * 60)
    const LAST_HOUR = HOURS[HOURS.length - 1]
    const hour = Math.min(Math.max(FIRST_HOUR, FIRST_HOUR + Math.floor(totalMinutesFromStart / 60)), LAST_HOUR)
    const rawMinuteInHour = totalMinutesFromStart % 60
    const minute = Math.min(snapToQuarter(Math.max(0, rawMinuteInHour)), 45)

    return { hour, minute, dateIso }
  }, [])

  function handleDragMove(event: DragMoveEvent) {
    const result = calculateMinuteFromPointer(event)
    if (result) {
      setGhostMinute(result.minute)
      setDragOverlayTime(formatHourMinute(result.hour, result.minute))
      dropMinuteRef.current = result.minute
      dropHourRef.current = result.hour
      dropDateRef.current = result.dateIso
      // Use the hour from our calculation (not from over.id) to match the ghost to the correct cell
      const overId = event.over?.id as string || null
      if (overId) {
        // Reconstruct cell ID with the computed hour for consistent ghost positioning
        const lastDash = overId.lastIndexOf("-")
        const datePartFromOver = overId.substring(0, lastDash)
        setOverCellId(`${datePartFromOver}-${result.hour}`)
      } else {
        setOverCellId(null)
      }
    } else {
      setGhostMinute(null)
      setDragOverlayTime(null)
      setOverCellId(null)
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const dragId = activeDragId
    setActiveDragId(null)
    setGhostMinute(null)
    setDragOverlayTime(null)
    setOverCellId(null)

    const { active, over } = event
    if (!over || !dragId) return

    try {
      const result = calculateMinuteFromPointer(event)
      const hour = result?.hour ?? dropHourRef.current
      const minute = result?.minute ?? dropMinuteRef.current
      const dateIso = result?.dateIso ?? dropDateRef.current

      const appointment = appointments.find((a) => a.id === active.id)
      if (!appointment) return

      const oldDate = new Date(appointment.date)
      const newDate = new Date(dateIso)
      newDate.setHours(hour, minute, 0, 0)
      if (oldDate.getTime() === newDate.getTime()) return

      await onReschedule(appointment.id, newDate.toISOString())
    } catch (err) {
      console.error("[WeekView] drag reschedule failed", err)
    }
  }

  const [dragOverlayTime, setDragOverlayTime] = useState<string | null>(null)

  const FIRST_HOUR = HOURS[0] // 7

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <Card className="rounded-2xl border border-border/40 overflow-hidden shadow-[0_1px_3px_0_rgb(0_0_0/0.04)]">
        <div ref={weekGridRef} className="overflow-y-auto overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 max-h-[calc(100vh-220px)]" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(128,128,128,0.2) transparent" }}>
          {/* Day headers */}
          <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border/30 min-w-[700px] bg-muted/20 sticky top-0 z-20 backdrop-blur-sm bg-background/95">
            <div className="py-3" />
            {weekDays.map((d) => {
              const today = isToday(d)
              return (
                <div
                  key={d.toISOString()}
                  className={`flex flex-col items-center gap-1 py-3 border-l border-border/10 ${today ? "bg-vox-primary/5" : ""}`}
                >
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{DAY_NAMES[d.getDay()]}</span>
                  <span className={`flex size-8 items-center justify-center rounded-full text-sm font-bold transition-all ${
                    today ? "bg-vox-primary text-white shadow-sm shadow-vox-primary/30" : "text-foreground"
                  }`}>
                    {d.getDate()}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Time grid */}
          <div ref={gridRef} className="relative grid grid-cols-[56px_repeat(7,1fr)] min-w-[700px]">
            <NowLine weekDays={weekDays} />
            {appointments.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <p className="text-sm text-muted-foreground">Nenhuma consulta nesta semana</p>
              </div>
            )}
            {HOURS.map((hour) => (
              <div key={hour} className="contents">
                {/* Time label */}
                <div className="flex items-start justify-end pr-3 pt-2 text-[10px] font-medium text-muted-foreground h-[88px] border-b border-border/[0.06] tabular-nums">
                  {String(hour).padStart(2, "0")}:00
                </div>

                {/* Day cells */}
                {weekDays.map((d) => {
                  const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
                  const hourBlocked = getBlockedSlotsForHour(blockedSlots, d, hour)
                  const cellId = `${d.toISOString()}-${hour}`

                  // Get positioned appointments that start in this hour
                  const dayAppts = dayColumnIndex.get(dayKey) || []
                  const hourAppts = dayAppts.filter((pa) => {
                    const startHour = Math.floor(pa.startMin / 60)
                    return startHour === hour
                  })

                  return (
                    <DroppableCell
                      key={cellId}
                      id={cellId}
                      ghostMinute={overCellId === cellId ? ghostMinute : null}
                      className={`h-[88px] border-b border-l border-border/[0.06] transition-colors hover:bg-muted/20 min-w-0 ${isToday(d) ? "bg-vox-primary/[0.015]" : ""} ${hourBlocked.length > 0 ? "bg-muted/30" : ""} ${onSlotClick ? "cursor-pointer" : ""}`}
                      onClick={() => {
                        if (onSlotClick && hourAppts.length === 0 && hourBlocked.length === 0) {
                          onSlotClick(dayKey, `${String(hour).padStart(2, "0")}:00`)
                        }
                      }}
                    >
                      {/* Cell ID for ghost indicator matching */}

                      {/* Blocked slots */}
                      {hourBlocked.length > 0 && hourAppts.length === 0 && (
                        <div
                          className="absolute inset-x-1 top-1 z-[1] flex items-center gap-1 truncate rounded-lg px-2 py-1.5 text-[10px] font-medium leading-tight bg-muted/50 border border-border/30 border-l-[3px] border-l-muted-foreground/30 text-muted-foreground cursor-pointer hover:bg-muted/70 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedBlockedSlot({ slot: hourBlocked[0], position: { top: e.clientY, left: e.clientX } })
                          }}
                        >
                          <Ban className="size-2.5 shrink-0 opacity-60" />
                          {hourBlocked[0].title}
                        </div>
                      )}

                      {/* Appointment cards — absolutely positioned by minute */}
                      {hourAppts.map((pa) => {
                        const a = pa.appointment
                        const agendaColor = a.agenda?.color || "#14B8A6"
                        const minuteInHour = pa.startMin % 60
                        const topPx = (minuteInHour / 60) * ROW_HEIGHT
                        const durationMin = pa.endMin - pa.startMin
                        const heightPx = Math.max(MIN_CARD_HEIGHT, (durationMin / 60) * ROW_HEIGHT - 2)
                        const widthPct = 100 / pa.totalColumns
                        const leftPct = pa.column * widthPct
                        const statusClass = STATUS_OPACITY[a.status] ?? ""

                        return (
                          <DraggableAppointment key={a.id} appointment={a}>
                            <div
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedAppointment({
                                  appointment: a,
                                  position: { top: e.clientY, left: e.clientX },
                                })
                              }}
                              className={`absolute z-[2] rounded-md px-1.5 py-1 text-[11px] font-medium leading-tight cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md border-l-[3px] overflow-hidden ${statusClass}`}
                              style={{
                                top: `${topPx}px`,
                                height: `${heightPx}px`,
                                left: `calc(${leftPct}% + 2px)`,
                                width: `calc(${widthPct}% - 4px)`,
                                borderLeftColor: agendaColor,
                                backgroundColor: agendaColorBg(a.agenda?.color, 0.20),
                                color: agendaColor,
                              }}
                            >
                              <div className="flex items-center gap-1 min-w-0">
                                <span className="font-bold tabular-nums text-[10px] opacity-80 shrink-0">{formatTime(a.date)}</span>
                                <span className="truncate">{a.patient.name}</span>
                              </div>
                              {heightPx >= 34 && a.procedures.length > 0 && (
                                <div className="text-[9px] opacity-60 truncate mt-px">
                                  {(a.procedures as any[]).map((p) => typeof p === "string" ? p : p?.name).join(", ")}
                                </div>
                              )}
                            </div>
                          </DraggableAppointment>
                        )
                      })}
                    </DroppableCell>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Appointment detail popover */}
      {selectedAppointment && !activeDragId && (
        <AppointmentPopover
          appointment={selectedAppointment.appointment}
          position={selectedAppointment.position}
          onClose={() => setSelectedAppointment(null)}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
        />
      )}

      {/* Blocked slot popover */}
      {selectedBlockedSlot && (
        <BlockedSlotPopover
          slot={selectedBlockedSlot.slot}
          position={selectedBlockedSlot.position}
          onUpdate={onUpdateBlockedSlot}
          onDelete={(id) => { onDeleteBlockedSlot(id); setSelectedBlockedSlot(null) }}
          onClose={() => setSelectedBlockedSlot(null)}
        />
      )}

      {/* Drag overlay */}
      <DragOverlay>
        {activeDragId ? (() => {
          const a = appointments.find((ap) => ap.id === activeDragId)
          if (!a) return null
          return (
            <div className="rounded-xl px-3 py-2 text-[11px] font-medium leading-tight shadow-xl border border-vox-primary/30 bg-background/95 backdrop-blur-sm min-w-[120px]">
              <div className="flex items-center gap-2">
                <span className="font-bold tabular-nums text-vox-primary text-sm">
                  {dragOverlayTime || formatTime(a.date)}
                </span>
                <span className="truncate text-foreground">{a.patient.name.split(" ")[0]}</span>
              </div>
            </div>
          )
        })() : null}
      </DragOverlay>
    </DndContext>
  )
}

export const WeekView = memo(WeekViewInner)
