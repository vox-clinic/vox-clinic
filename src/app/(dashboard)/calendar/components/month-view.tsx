"use client"

import { useMemo, memo, useState, useCallback } from "react"
import { CalendarDays, Plus, Ban } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { AppointmentItem } from "../types"
import type { BlockedSlotItem } from "@/server/actions/blocked-slot"
import { DAY_NAMES, MONTH_NAMES, STATUS_CONFIG, STATUS_DOT, formatTime, isToday, getMonthGrid, getBlockedSlotsForDate, buildDayIndex } from "../helpers"
import { AppointmentCard } from "./appointment-card"
import { BlockedSlotPopover } from "./blocked-slot-popover"

function MonthViewInner({
  year,
  month,
  appointments,
  blockedSlots,
  selectedDay,
  onSelectDay,
  onStatusChange,
  onDelete,
  onDeleteBlockedSlot,
  onUpdateBlockedSlot,
  onScheduleForDay,
}: {
  year: number
  month: number
  appointments: AppointmentItem[]
  blockedSlots: BlockedSlotItem[]
  selectedDay: number | null
  onSelectDay: (day: number | null) => void
  onStatusChange: (id: string, status: string) => void
  onDelete: (id: string) => void
  onDeleteBlockedSlot: (id: string) => void
  onUpdateBlockedSlot: (id: string, data: { title?: string; startDate?: string; endDate?: string; allDay?: boolean; recurring?: string | null }) => Promise<void>
  onScheduleForDay: (day: number) => void
}) {
  const cells = useMemo(() => getMonthGrid(year, month), [year, month])
  const dayIndex = useMemo(() => buildDayIndex(appointments), [appointments])
  const [selectedBlockedSlot, setSelectedBlockedSlot] = useState<{ slot: BlockedSlotItem; position: { top: number; left: number } } | null>(null)

  function getApptsForDay(day: number) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    return dayIndex.get(key) || []
  }

  const handleBlockedSlotClick = useCallback((e: React.MouseEvent, slot: BlockedSlotItem) => {
    e.stopPropagation()
    setSelectedBlockedSlot({ slot, position: { top: e.clientY, left: e.clientX } })
  }, [])

  const selectedDayAppointments = selectedDay ? getApptsForDay(selectedDay) : []

  return (
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
            const dayAppts = getApptsForDay(day)
            const dayBlocked = getBlockedSlotsForDate(blockedSlots, dayDate)
            const today = isToday(dayDate)
            const isSelected = selectedDay === day
            return (
              <button
                key={`day-${day}`}
                onClick={() => onSelectDay(selectedDay === day ? null : day)}
                className={`min-h-[80px] sm:min-h-[100px] border-b border-r border-border/20 p-1.5 text-left transition-all hover:bg-muted/40 ${isSelected ? "bg-vox-primary/5 ring-1 ring-vox-primary/30" : ""}`}
              >
                <div className={`flex items-center justify-center size-7 rounded-full text-xs font-medium mb-1 ${today ? "bg-vox-primary text-white" : "text-foreground"}`}>
                  {day}
                </div>
                <div className="flex flex-col gap-0.5">
                  {(() => {
                    const allItems: ({ type: "blocked"; item: typeof dayBlocked[0] } | { type: "appt"; item: typeof dayAppts[0] })[] = [
                      ...dayBlocked.map((s) => ({ type: "blocked" as const, item: s })),
                      ...dayAppts.map((a) => ({ type: "appt" as const, item: a })),
                    ]
                    const visible = allItems.slice(0, 3)
                    const remaining = allItems.length - visible.length
                    return (
                      <>
                        {visible.map((entry, i) =>
                          entry.type === "blocked" ? (
                            <div
                              key={`block-${entry.item.id}-${i}`}
                              className="hidden sm:flex items-center gap-1 truncate text-[10px] px-1.5 py-0.5 rounded-md bg-muted/60 text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors"
                              onClick={(e) => handleBlockedSlotClick(e, entry.item)}
                            >
                              <Ban className="size-2.5 shrink-0" />
                              {entry.item.title}
                            </div>
                          ) : (
                            <div key={entry.item.id} className={`hidden sm:block truncate text-[10px] px-1.5 py-0.5 rounded-md ${STATUS_CONFIG[entry.item.status]?.className ?? "bg-muted"}`}>
                              {formatTime(entry.item.date)} {entry.item.patient.name.split(" ")[0]}
                            </div>
                          )
                        )}
                        {remaining > 0 && <span className="hidden sm:block text-[10px] text-muted-foreground px-1.5">+{remaining} mais</span>}
                      </>
                    )
                  })()}
                  {(dayAppts.length > 0 || dayBlocked.length > 0) && (
                    <div className="flex gap-0.5 sm:hidden mt-0.5">
                      {dayBlocked.length > 0 && <div className="size-1.5 rounded-full bg-muted-foreground/40" />}
                      {dayAppts.slice(0, 3).map((a) => (
                        <div key={a.id} className={`size-1.5 rounded-full ${STATUS_DOT[a.status] ?? "bg-muted-foreground"}`} />
                      ))}
                      {dayAppts.length > 3 && <span className="text-[9px] text-muted-foreground">+{dayAppts.length - 3}</span>}
                    </div>
                  )}
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
                  onClick={() => onScheduleForDay(selectedDay)}
                  variant="outline" className="mt-3 rounded-xl text-xs gap-1.5"
                >
                  <Plus className="size-3.5" /> Agendar neste dia
                </Button>
              </div>
            </Card>
          ) : (
            selectedDayAppointments.map((a) => (
              <AppointmentCard key={a.id} appointment={a} onStatusChange={onStatusChange} onDelete={onDelete} />
            ))
          )}
        </div>
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
    </>
  )
}

export const MonthView = memo(MonthViewInner)
