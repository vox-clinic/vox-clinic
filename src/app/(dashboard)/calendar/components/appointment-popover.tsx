"use client"

import { memo } from "react"
import Link from "next/link"
import { Clock, Check, XCircle, AlertTriangle, X, ClipboardList, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { AppointmentItem } from "../types"
import { formatTime, STATUS_CONFIG, agendaColorBg } from "../helpers"

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
        className="fixed z-50 w-72 rounded-2xl border border-border/60 bg-background shadow-xl animate-in fade-in-0 zoom-in-95 duration-150 border-l-[3px]"
        style={{
          top: Math.min(position.top, window.innerHeight - 320),
          left: Math.min(position.left, window.innerWidth - 300),
          borderLeftColor: appointment.agenda?.color || "transparent",
        }}
      >
        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <User className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="text-sm font-semibold truncate">{appointment.patient.name}</span>
              </div>
            </div>
            <button onClick={onClose} className="p-0.5 rounded-lg hover:bg-muted/60 text-muted-foreground shrink-0">
              <X className="size-3.5" />
            </button>
          </div>

          {/* Patient alerts */}
          {appointment.patient.alerts && appointment.patient.alerts.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {appointment.patient.alerts.map((alert, i) => (
                <span key={i} className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-vox-error/10 text-vox-error">
                  {alert}
                </span>
              ))}
            </div>
          )}

          {/* Personal notes — last 3 entries */}
          {appointment.patient.personalNotes && (() => {
            const entries = appointment.patient.personalNotes.split("\n").filter((l) => l.trim()).slice(-3)
            return entries.length > 0 ? (
              <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 px-2.5 py-2 space-y-1">
                <p className="text-[10px] text-blue-400 font-semibold">Lembrar</p>
                {entries.map((entry, i) => {
                  const cleaned = entry.replace(/^\[\d{4}-\d{2}-\d{2}\]:\s*/, "")
                  return (
                    <p key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                      <span className="text-blue-400/60 mt-0.5">•</span>
                      <span>{cleaned}</span>
                    </p>
                  )
                })}
              </div>
            ) : null
          })()}

          {/* Prontuário link */}
          <Link
            href={`/patients/${appointment.patient.id}`}
            className="flex items-center gap-2 w-full rounded-xl bg-vox-primary/10 border border-vox-primary/20 px-3 py-2.5 text-vox-primary hover:bg-vox-primary/15 transition-colors"
          >
            <ClipboardList className="size-4 shrink-0" />
            <span className="text-sm font-semibold">Prontuário Eletrônico</span>
          </Link>

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

          {/* CID codes */}
          {appointment.cidCodes && (appointment.cidCodes as any[]).length > 0 && (
            <p className="text-[11px] text-muted-foreground">
              <span className="font-medium">CID:</span>{" "}
              {(appointment.cidCodes as any[]).map((c: any) => c.code).join(", ")}
            </p>
          )}

          {/* Notes */}
          {appointment.notes && (
            <p className="text-[11px] text-muted-foreground bg-muted/30 rounded-lg px-2.5 py-1.5 line-clamp-3">
              {appointment.notes}
            </p>
          )}

          {/* Actions */}
          <div className="space-y-2 pt-2 border-t border-border/30">
            {appointment.status === "scheduled" && (
              <div className="grid grid-cols-3 gap-2">
                <Button size="sm" onClick={() => { onStatusChange(appointment.id, "completed"); onClose() }} className="rounded-xl text-xs h-8 gap-1.5 bg-vox-success hover:bg-vox-success/90 text-white">
                  <Check className="size-3.5" />Concluir
                </Button>
                <Button size="sm" variant="outline" onClick={() => { onStatusChange(appointment.id, "cancelled"); onClose() }} className="rounded-xl text-xs h-8 gap-1.5 text-vox-error border-vox-error/30 hover:bg-vox-error/5">
                  <XCircle className="size-3.5" />Cancelar
                </Button>
                <Button size="sm" variant="outline" onClick={() => { onStatusChange(appointment.id, "no_show"); onClose() }} className="rounded-xl text-xs h-8 gap-1.5 text-vox-warning border-vox-warning/30 hover:bg-vox-warning/5">
                  <AlertTriangle className="size-3.5" />Faltou
                </Button>
              </div>
            )}
            {appointment.status !== "scheduled" && (
              <Button size="sm" variant="outline" onClick={() => { onStatusChange(appointment.id, "scheduled"); onClose() }} className="w-full rounded-xl text-xs h-8 gap-1.5">
                Reagendar
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => { onDelete(appointment.id); onClose() }} className="w-full rounded-xl text-xs h-8 gap-1.5 text-vox-error border-vox-error/30 hover:bg-vox-error/5">
              <X className="size-3.5" />Excluir
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

export const AppointmentPopover = memo(AppointmentPopoverInner)
