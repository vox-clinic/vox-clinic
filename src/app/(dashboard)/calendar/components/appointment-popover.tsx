"use client"

import { memo } from "react"
import Link from "next/link"
import { Clock, Check, XCircle, AlertTriangle, X, ExternalLink, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { AppointmentItem } from "../types"
import { formatTime, STATUS_CONFIG } from "../helpers"

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.scheduled
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

function AppointmentPopoverInner({
  appointment,
  position,
  onClose,
  onStatusChange,
  onDelete,
}: {
  appointment: AppointmentItem
  position: { top: number; left: number }
  onClose: () => void
  onStatusChange: (id: string, status: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      {/* Popover */}
      <div
        className="fixed z-50 w-72 rounded-2xl border border-border/60 bg-background shadow-xl animate-in fade-in-0 zoom-in-95 duration-150"
        style={{
          top: Math.min(position.top, window.innerHeight - 320),
          left: Math.min(position.left, window.innerWidth - 300),
        }}
      >
        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/patients/${appointment.patient.id}`}
                className="text-sm font-semibold hover:text-vox-primary transition-colors flex items-center gap-1.5"
              >
                <User className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{appointment.patient.name}</span>
                <ExternalLink className="size-3 shrink-0 opacity-40" />
              </Link>
            </div>
            <button onClick={onClose} className="p-0.5 rounded-lg hover:bg-muted/60 text-muted-foreground shrink-0">
              <X className="size-3.5" />
            </button>
          </div>

          {/* Time & Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="size-3.5" />
              <span className="text-xs font-medium">{formatTime(appointment.date)}</span>
              <span className="text-[10px] opacity-60">
                {new Date(appointment.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
              </span>
            </div>
            <StatusBadge status={appointment.status} />
          </div>

          {/* Agenda */}
          {appointment.agenda && (
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: appointment.agenda.color }} />
              <span className="text-[11px] text-muted-foreground">{appointment.agenda.name}</span>
            </div>
          )}

          {/* Procedures */}
          {appointment.procedures.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {(appointment.procedures as any[]).map((proc, i) => {
                const name = typeof proc === "string" ? proc : (proc as any)?.name || String(proc)
                return (
                  <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/60 text-[10px] font-medium text-muted-foreground">
                    {name}
                  </span>
                )
              })}
            </div>
          )}

          {/* Notes */}
          {appointment.notes && (
            <p className="text-[11px] text-muted-foreground bg-muted/30 rounded-lg px-2.5 py-1.5 line-clamp-3">
              {appointment.notes}
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/30">
            {appointment.status === "scheduled" && (
              <>
                <Button size="sm" onClick={() => { onStatusChange(appointment.id, "completed"); onClose() }} className="rounded-xl text-[10px] h-7 gap-1 bg-vox-success hover:bg-vox-success/90 text-white">
                  <Check className="size-3" />Concluir
                </Button>
                <Button size="sm" variant="outline" onClick={() => { onStatusChange(appointment.id, "cancelled"); onClose() }} className="rounded-xl text-[10px] h-7 gap-1 text-vox-error border-vox-error/30 hover:bg-vox-error/5">
                  <XCircle className="size-3" />Cancelar
                </Button>
                <Button size="sm" variant="outline" onClick={() => { onStatusChange(appointment.id, "no_show"); onClose() }} className="rounded-xl text-[10px] h-7 gap-1 text-vox-warning border-vox-warning/30 hover:bg-vox-warning/5">
                  <AlertTriangle className="size-3" />Faltou
                </Button>
              </>
            )}
            {appointment.status !== "scheduled" && (
              <Button size="sm" variant="outline" onClick={() => { onStatusChange(appointment.id, "scheduled"); onClose() }} className="rounded-xl text-[10px] h-7 gap-1">
                Reagendar
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => { onDelete(appointment.id); onClose() }} className="rounded-xl text-[10px] h-7 gap-1 text-vox-error border-vox-error/30 hover:bg-vox-error/5 ml-auto">
              <X className="size-3" />Excluir
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

export const AppointmentPopover = memo(AppointmentPopoverInner)
