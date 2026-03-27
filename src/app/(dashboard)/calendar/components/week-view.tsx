"use client"

import { useEffect, useRef, useMemo, memo } from "react"
import { useRouter } from "next/navigation"
import { DndContext, DragOverlay, useDraggable, useDroppable, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core"
import { Ban } from "lucide-react"
import { Card } from "@/components/ui/card"
import type { AppointmentItem } from "../types"
import type { BlockedSlotItem } from "@/server/actions/blocked-slot"
import { HOURS, DAY_NAMES, STATUS_CONFIG, formatTime, isToday, buildAppointmentIndex, getBlockedSlotsForHour } from "../helpers"
import { NowLine } from "./now-line"
import { useState } from "react"

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

function WeekViewInner({
  weekDays,
  appointments,
  blockedSlots,
  onReschedule,
}: {
  weekDays: Date[]
  appointments: AppointmentItem[]
  blockedSlots: BlockedSlotItem[]
  onReschedule: (appointmentId: string, newDate: string, forceSchedule?: boolean) => Promise<void>
}) {
  const router = useRouter()
  const weekGridRef = useRef<HTMLDivElement>(null)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  // O(1) appointment lookup instead of O(n) per cell
  const appointmentIndex = useMemo(() => buildAppointmentIndex(appointments), [appointments])

  // Auto-scroll to current hour on mount
  useEffect(() => {
    const container = weekGridRef.current
    if (!container) return
    const ROW_HEIGHT = 72
    const currentHour = new Date().getHours()
    const scrollTarget = (currentHour - 7) * ROW_HEIGHT
    container.scrollTo({ top: Math.max(0, scrollTarget - 100), behavior: "smooth" })
  }, [])

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(event.active.id as string)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null)
    const { active, over } = event
    if (!over) return

    try {
      const droppableId = over.id as string
      const lastDash = droppableId.lastIndexOf("-")
      const dateIso = droppableId.substring(0, lastDash)
      const hour = parseInt(droppableId.substring(lastDash + 1), 10)

      const appointment = appointments.find((a) => a.id === active.id)
      if (!appointment) return

      const oldDate = new Date(appointment.date)
      const newDate = new Date(dateIso)
      newDate.setHours(hour, oldDate.getMinutes(), 0, 0)
      if (oldDate.getTime() === newDate.getTime()) return

      await onReschedule(appointment.id, newDate.toISOString())
    } catch {
      // Error handled by parent via onReschedule
    }
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
          <div className="relative grid grid-cols-[56px_repeat(7,1fr)] min-w-[700px]">
            <NowLine weekDays={weekDays} />
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
                      className={`h-[72px] border-b border-l border-border/[0.06] px-1 py-1 transition-colors hover:bg-muted/20 ${isToday(d) ? "bg-vox-primary/[0.015]" : ""} ${hourBlocked.length > 0 ? "bg-muted/30" : ""}`}
                    >
                      {hourBlocked.length > 0 && dayAppts.length === 0 && (
                        <div className="flex items-center gap-1 truncate rounded-lg px-2 py-1.5 text-[10px] font-medium leading-tight bg-muted/40 border-l-[3px] border-muted-foreground/20 text-muted-foreground/70">
                          <Ban className="size-2.5 shrink-0 opacity-50" />
                          {hourBlocked[0].title}
                        </div>
                      )}
                      {dayAppts.map((a) => (
                        <DraggableAppointment key={a.id} appointment={a}>
                          <div
                            onClick={() => router.push(`/patients/${a.patient.id}`)}
                            className="block rounded-lg px-2 py-1.5 text-[11px] font-medium leading-tight mb-0.5 cursor-grab active:cursor-grabbing transition-all hover:shadow-md hover:scale-[1.02] border-l-[3px] bg-vox-primary/10 text-vox-primary backdrop-blur-sm"
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
  )
}

export const WeekView = memo(WeekViewInner)
