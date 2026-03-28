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
import { HOURS, DAY_NAMES, STATUS_CONFIG, formatTime, isToday, buildAppointmentIndex, getBlockedSlotsForHour } from "../helpers"
import { NowLine } from "./now-line"
import { AppointmentPopover } from "./appointment-popover"

const ROW_HEIGHT = 72
const SNAP_MINUTES = 15
const SLOTS_PER_HOUR = 60 / SNAP_MINUTES // 4

function snapToQuarter(minutes: number): number {
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES
}

function formatHourMinute(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

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

function DroppableCell({ id, children, className, ghostMinute }: {
  id: string
  children: React.ReactNode
  className?: string
  ghostMinute?: number | null
}) {
  const { isOver, setNodeRef } = useDroppable({ id })

  return (
    <div ref={setNodeRef} className={`relative ${className ?? ""} ${isOver ? "bg-vox-primary/10 ring-1 ring-vox-primary/30" : ""}`}>
      {children}
      {/* Ghost indicator showing exact drop time */}
      {isOver && ghostMinute !== null && ghostMinute !== undefined && (
        <div
          className="absolute left-0 right-0 h-[2px] bg-vox-primary/60 pointer-events-none z-10"
          style={{ top: `${(ghostMinute / 60) * ROW_HEIGHT}px` }}
        >
          <div className="absolute -left-0.5 -top-[3px] size-2 rounded-full bg-vox-primary/60" />
          <span className="absolute left-3 -top-3 text-[9px] font-bold text-vox-primary bg-background/80 px-1 rounded">
            {formatHourMinute(
              parseInt(id.substring(id.lastIndexOf("-") + 1), 10),
              ghostMinute
            )}
          </span>
        </div>
      )}
    </div>
  )
}

function WeekViewInner({
  weekDays,
  appointments,
  blockedSlots,
  onReschedule,
  onStatusChange,
  onDelete,
}: {
  weekDays: Date[]
  appointments: AppointmentItem[]
  blockedSlots: BlockedSlotItem[]
  onReschedule: (appointmentId: string, newDate: string, forceSchedule?: boolean) => Promise<void>
  onStatusChange: (id: string, status: string) => void
  onDelete: (id: string) => void
}) {
  const router = useRouter()
  const weekGridRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [ghostMinute, setGhostMinute] = useState<number | null>(null)
  const [overCellId, setOverCellId] = useState<string | null>(null)
  const [selectedAppointment, setSelectedAppointment] = useState<{ appointment: AppointmentItem; position: { top: number; left: number } } | null>(null)
  const dropMinuteRef = useRef<number>(0)
  const dropHourRef = useRef<number>(0)
  const dropDateRef = useRef<string>("")

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const appointmentIndex = useMemo(() => buildAppointmentIndex(appointments), [appointments])

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

  // Calculate minute precision from pointer position within the cell
  const calculateMinuteFromPointer = useCallback((event: DragMoveEvent | DragEndEvent) => {
    const { over, activatorEvent, delta } = event
    if (!over || !gridRef.current) return null

    const droppableId = over.id as string
    const lastDash = droppableId.lastIndexOf("-")
    const hour = parseInt(droppableId.substring(lastDash + 1), 10)

    // Find the droppable cell element
    const cellElement = gridRef.current.querySelector(`[data-cell-id="${droppableId}"]`)
    if (!cellElement) return { hour, minute: 0, dateIso: droppableId.substring(0, lastDash) }

    const rect = cellElement.getBoundingClientRect()
    const pointerEvent = activatorEvent as PointerEvent
    const pointerY = pointerEvent.clientY + delta.y
    const relativeY = pointerY - rect.top
    const clampedY = Math.max(0, Math.min(relativeY, ROW_HEIGHT - 1))

    const rawMinutes = (clampedY / ROW_HEIGHT) * 60
    const snappedMinutes = snapToQuarter(rawMinutes)
    const finalMinutes = Math.min(snappedMinutes, 45) // max :45

    return {
      hour,
      minute: finalMinutes,
      dateIso: droppableId.substring(0, lastDash),
    }
  }, [])

  function handleDragMove(event: DragMoveEvent) {
    const result = calculateMinuteFromPointer(event)
    if (result) {
      setGhostMinute(result.minute)
      dropMinuteRef.current = result.minute
      dropHourRef.current = result.hour
      dropDateRef.current = result.dateIso
      setOverCellId(event.over?.id as string || null)
    } else {
      setGhostMinute(null)
      setOverCellId(null)
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const dragId = activeDragId
    setActiveDragId(null)
    setGhostMinute(null)
    setOverCellId(null)

    const { active, over } = event
    if (!over || !dragId) return

    try {
      // Use the precise minute from the last drag move
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

  // Format time for drag overlay showing target time
  const dragOverlayTime = useMemo(() => {
    if (!activeDragId || ghostMinute === null) return null
    return formatHourMinute(dropHourRef.current, dropMinuteRef.current)
  }, [activeDragId, ghostMinute])

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <Card className="rounded-2xl border border-border/40 overflow-hidden shadow-[0_1px_3px_0_rgb(0_0_0/0.04)]">
        <div ref={weekGridRef} className="overflow-y-auto overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 max-h-[calc(100vh-220px)]" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(128,128,128,0.2) transparent", scrollbarGutter: "stable" }}>
          {/* Day headers */}
          <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border/30 min-w-[700px] bg-muted/20 sticky top-0 z-20 backdrop-blur-sm">
            <div className="py-3" />
            {weekDays.map((d) => {
              const today = isToday(d)
              return (
                <div
                  key={d.toISOString()}
                  className={`flex flex-col items-center gap-1 py-3 border-l border-border/10 ${today ? "bg-vox-primary/5" : ""}`}
                >
                  <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">{DAY_NAMES[d.getDay()]}</span>
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
                <div className="flex items-start justify-end pr-3 pt-2 text-[10px] font-medium text-muted-foreground/60 h-[72px] border-b border-border/[0.06] tabular-nums">
                  {String(hour).padStart(2, "0")}:00
                </div>
                {weekDays.map((d) => {
                  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}-${hour}`
                  const dayAppts = appointmentIndex.get(key) || []
                  const hourBlocked = getBlockedSlotsForHour(blockedSlots, d, hour)
                  const cellId = `${d.toISOString()}-${hour}`
                  return (
                    <DroppableCell
                      key={cellId}
                      id={cellId}
                      ghostMinute={overCellId === cellId ? ghostMinute : null}
                      className={`h-[72px] border-b border-l border-border/[0.06] px-1 py-1 transition-colors hover:bg-muted/20 ${isToday(d) ? "bg-vox-primary/[0.015]" : ""} ${hourBlocked.length > 0 ? "bg-muted/30" : ""}`}
                    >
                      {/* data attribute for pointer position calculation */}
                      <div data-cell-id={cellId} className="absolute inset-0" />
                      {hourBlocked.length > 0 && dayAppts.length === 0 && (
                        <div className="relative z-[1] flex items-center gap-1 truncate rounded-lg px-2 py-1.5 text-[10px] font-medium leading-tight bg-muted/40 border-l-[3px] border-muted-foreground/20 text-muted-foreground/70">
                          <Ban className="size-2.5 shrink-0 opacity-50" />
                          {hourBlocked[0].title}
                        </div>
                      )}
                      {dayAppts.map((a) => (
                        <DraggableAppointment key={a.id} appointment={a}>
                          <div
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedAppointment({
                                appointment: a,
                                position: { top: e.clientY, left: e.clientX },
                              })
                            }}
                            className="relative z-[1] block rounded-lg px-2 py-1.5 text-[11px] font-medium leading-tight mb-0.5 cursor-grab active:cursor-grabbing transition-all hover:shadow-md hover:scale-[1.02] border-l-[3px] bg-vox-primary/10 text-vox-primary backdrop-blur-sm"
                            style={{ borderLeftColor: a.agenda?.color || "#14B8A6" }}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold tabular-nums text-[10px] opacity-70">{formatTime(a.date)}</span>
                              <span className="truncate">{a.patient.name}</span>
                            </div>
                            {a.procedures.length > 0 && (
                              <div className="text-[9px] opacity-60 truncate mt-0.5">
                                {(a.procedures as any[]).map((p) => typeof p === "string" ? p : p?.name).join(", ")}
                              </div>
                            )}
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

      {/* Drag overlay with target time */}
      <DragOverlay>
        {activeDragId ? (() => {
          const a = appointments.find((ap) => ap.id === activeDragId)
          if (!a) return null
          return (
            <div className={`truncate rounded-md px-2 py-1.5 text-[10px] font-medium leading-tight shadow-lg border ${
              STATUS_CONFIG[a.status]?.className ?? "bg-muted text-muted-foreground"
            }`}>
              <div className="flex items-center gap-1.5">
                <span className="font-bold tabular-nums">
                  {dragOverlayTime || formatTime(a.date)}
                </span>
                <span>{a.patient.name.split(" ")[0]}</span>
              </div>
            </div>
          )
        })() : null}
      </DragOverlay>
    </DndContext>
  )
}

export const WeekView = memo(WeekViewInner)
