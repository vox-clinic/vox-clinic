"use client"

import { useMemo, memo } from "react"
import { Ban, Repeat, Trash2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import type { AppointmentItem } from "../types"
import type { BlockedSlotItem } from "@/server/actions/blocked-slot"
import { HOURS, buildAppointmentIndex, getBlockedSlotsForHour } from "../helpers"
import { AppointmentCard } from "./appointment-card"
import { NowLineDay } from "./now-line-day"

function DayViewInner({
  currentDate,
  appointments,
  blockedSlots,
  onStatusChange,
  onDelete,
  onDeleteBlockedSlot,
}: {
  currentDate: Date
  appointments: AppointmentItem[]
  blockedSlots: BlockedSlotItem[]
  onStatusChange: (id: string, status: string) => void
  onDelete: (id: string) => void
  onDeleteBlockedSlot: (id: string) => void
}) {
  const appointmentIndex = useMemo(() => buildAppointmentIndex(appointments), [appointments])

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
                  <div key={`block-${s.id}-${i}`} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] bg-muted/60 border-l-4 border-muted-foreground/30 text-muted-foreground">
                    <Ban className="size-3 shrink-0" />
                    <span className="truncate font-medium">{s.title}</span>
                    {s.recurring && <Repeat className="size-3 shrink-0 opacity-60" />}
                    <button onClick={() => onDeleteBlockedSlot(s.id)} className="ml-auto p-0.5 rounded hover:bg-muted text-muted-foreground/60 hover:text-vox-error">
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                ))}
                {hourAppts.map((a) => (
                  <AppointmentCard
                    key={a.id}
                    appointment={a}
                    onStatusChange={onStatusChange}
                    onDelete={onDelete}
                    compact
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export const DayView = memo(DayViewInner)
