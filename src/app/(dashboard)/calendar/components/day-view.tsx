"use client"

import { useMemo, memo, useState, useCallback } from "react"
import { Ban, Repeat } from "lucide-react"
import { Card } from "@/components/ui/card"
import type { AppointmentItem } from "../types"
import type { BlockedSlotItem } from "@/server/actions/blocked-slot"
import { HOURS, buildAppointmentIndex, getBlockedSlotsForHour, calculateOverlapLayout } from "../helpers"
import { AppointmentCard } from "./appointment-card"
import { NowLineDay } from "./now-line-day"
import { BlockedSlotPopover } from "./blocked-slot-popover"

function DayViewInner({
  currentDate,
  appointments,
  blockedSlots,
  onStatusChange,
  onDelete,
  onDeleteBlockedSlot,
  onUpdateBlockedSlot,
}: {
  currentDate: Date
  appointments: AppointmentItem[]
  blockedSlots: BlockedSlotItem[]
  onStatusChange: (id: string, status: string) => void
  onDelete: (id: string) => void
  onDeleteBlockedSlot: (id: string) => void
  onUpdateBlockedSlot: (id: string, data: { title?: string; startDate?: string; endDate?: string; allDay?: boolean; recurring?: string | null }) => Promise<void>
}) {
  const appointmentIndex = useMemo(() => buildAppointmentIndex(appointments), [appointments])
  const [selectedSlot, setSelectedSlot] = useState<{ slot: BlockedSlotItem; position: { top: number; left: number } } | null>(null)

  const handleSlotClick = useCallback((e: React.MouseEvent, slot: BlockedSlotItem) => {
    e.stopPropagation()
    setSelectedSlot({ slot, position: { top: e.clientY, left: e.clientX } })
  }, [])

  return (
    <Card className="rounded-2xl border border-border/40 overflow-hidden">
      <div className="relative max-h-[calc(100vh-240px)] overflow-y-auto">
        <NowLineDay />
        {appointments.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <p className="text-sm text-muted-foreground">Nenhuma consulta hoje</p>
          </div>
        )}
        {HOURS.map((hour) => {
          const key = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}-${hour}`
          const hourAppts = appointmentIndex.get(key) || []
          const hourBlocked = getBlockedSlotsForHour(blockedSlots, currentDate, hour)
          return (
            <div key={hour} className={`flex border-b border-border/10 ${hourBlocked.length > 0 ? "bg-muted/40" : ""}`}>
              <div className="flex w-16 shrink-0 items-start justify-end pr-3 pt-2 text-[11px] text-muted-foreground font-medium">
                {String(hour).padStart(2, "0")}:00
              </div>
              <div className="flex-1 min-h-[64px] border-l border-border/10 px-2 py-1 space-y-1">
                {hourBlocked.map((s, i) => (
                  <div
                    key={`block-${s.id}-${i}`}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] bg-muted/60 border-l-4 border-muted-foreground/30 text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={(e) => handleSlotClick(e, s)}
                  >
                    <Ban className="size-3 shrink-0" />
                    <span className="truncate font-medium">{s.title}</span>
                    {s.recurring && <Repeat className="size-3 shrink-0 opacity-60" />}
                  </div>
                ))}
                {(() => {
                  const overlapLayout = calculateOverlapLayout(hourAppts)
                  return (
                    <div className="relative" style={{ minHeight: hourAppts.length > 1 ? "3rem" : undefined }}>
                      {hourAppts.map((a) => {
                        const pos = overlapLayout.get(a.id) || { column: 0, totalColumns: 1 }
                        return (
                          <div
                            key={a.id}
                            className={pos.totalColumns > 1 ? "absolute top-0" : ""}
                            style={pos.totalColumns > 1 ? {
                              left: `${(pos.column / pos.totalColumns) * 100}%`,
                              width: `${(1 / pos.totalColumns) * 100}%`,
                              paddingRight: "2px",
                            } : undefined}
                          >
                            <AppointmentCard
                              appointment={a}
                              onStatusChange={onStatusChange}
                              onDelete={onDelete}
                              compact
                              agendaColor={a.agenda?.color}
                            />
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            </div>
          )
        })}
      </div>

      {selectedSlot && (
        <BlockedSlotPopover
          slot={selectedSlot.slot}
          position={selectedSlot.position}
          onUpdate={onUpdateBlockedSlot}
          onDelete={(id) => { onDeleteBlockedSlot(id); setSelectedSlot(null) }}
          onClose={() => setSelectedSlot(null)}
        />
      )}
    </Card>
  )
}

export const DayView = memo(DayViewInner)
