"use client"

import { useState, memo } from "react"
import Link from "next/link"
import { Clock, Check, XCircle, AlertTriangle, X, Video, Globe, MessageCircle, Bell, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"
import type { AppointmentItem } from "../types"
import { formatTime, STATUS_CONFIG, STATUS_DOT, agendaColorBg } from "../helpers"
import { sendAppointmentReminder } from "@/server/actions/reminder"
import { friendlyError } from "@/lib/error-messages"

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.scheduled
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

function AppointmentCardInner({
  appointment, onStatusChange, onDelete, compact, agendaColor,
}: {
  appointment: AppointmentItem
  onStatusChange: (id: string, status: string) => void
  onDelete: (id: string) => void
  compact?: boolean
  agendaColor?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const [sendingReminder, setSendingReminder] = useState(false)

  const resolvedAgendaColor = appointment.agenda?.color || agendaColor

  if (compact) {
    return (
      <Link
        href={`/patients/${appointment.patient.id}`}
        className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] transition-all hover:shadow-sm border-l-[3px] ${STATUS_CONFIG[appointment.status]?.className ?? "bg-muted"}`}
        style={{
          borderLeftColor: resolvedAgendaColor || "transparent",
          backgroundColor: resolvedAgendaColor ? agendaColorBg(resolvedAgendaColor, 0.06) : undefined,
        }}
      >
        <span className="font-semibold tabular-nums">{formatTime(appointment.date)}</span>
        <span className="truncate font-medium">{appointment.patient.name}</span>
        {appointment.source === "online" && <Globe className="size-3 text-blue-500 shrink-0" />}
        {appointment.source === "whatsapp" && <MessageCircle className="size-3 text-green-500 shrink-0" />}
        {appointment.type === "teleconsulta" && <Video className="size-3 text-purple-500 shrink-0" />}
        <div className={`size-1.5 rounded-full ml-auto shrink-0 ${STATUS_DOT[appointment.status] ?? "bg-muted-foreground"}`} />
      </Link>
    )
  }

  return (
    <Card
      className="group rounded-2xl border border-border/40 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] overflow-hidden cursor-pointer transition-all hover:border-border hover:shadow-[0_4px_12px_0_rgb(0_0_0/0.06)] border-l-[3px]"
      style={{
        borderLeftColor: resolvedAgendaColor || "transparent",
        backgroundColor: resolvedAgendaColor ? agendaColorBg(resolvedAgendaColor, 0.04) : undefined,
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {resolvedAgendaColor && (
              <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: resolvedAgendaColor }} />
            )}
            <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
              <Clock className="size-3.5" />
              <span className="text-xs font-medium">{formatTime(appointment.date)}</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link href={`/patients/${appointment.patient.id}`} onClick={(e) => e.stopPropagation()}
                  className="text-sm font-medium hover:text-vox-primary transition-colors truncate">
                  {appointment.patient.name}
                </Link>
                {appointment.source === "online" && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 shrink-0">
                    <Globe className="size-3" />
                    Online
                  </span>
                )}
                {appointment.source === "whatsapp" && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-600 shrink-0">
                    <MessageCircle className="size-3" />
                    WhatsApp
                  </span>
                )}
                {appointment.type === "teleconsulta" && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-600 shrink-0">
                    <Video className="size-3" />
                    Teleconsulta
                  </span>
                )}
              </div>
            </div>
          </div>
          <StatusBadge status={appointment.status} />
        </div>
        {appointment.procedures.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {(appointment.procedures as any[]).map((proc, i) => {
              const name = typeof proc === "string" ? proc : (proc as any)?.name || String(proc)
              return <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/60 text-[11px] font-medium text-muted-foreground">{name}</span>
            })}
          </div>
        )}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-border/30 space-y-3" onClick={(e) => e.stopPropagation()}>
            {appointment.notes && <p className="text-xs text-muted-foreground">{appointment.notes}</p>}
            <div className="flex flex-wrap gap-2">
              {appointment.status === "scheduled" && (
                <>
                  <Button size="sm" onClick={() => onStatusChange(appointment.id, "completed")} className="rounded-xl text-[11px] h-7 gap-1 bg-vox-success hover:bg-vox-success/90 text-white">
                    <Check className="size-3" />Concluir
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onStatusChange(appointment.id, "cancelled")} className="rounded-xl text-[11px] h-7 gap-1 text-vox-error border-vox-error/30 hover:bg-vox-error/5">
                    <XCircle className="size-3" />Cancelar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onStatusChange(appointment.id, "no_show")} className="rounded-xl text-[11px] h-7 gap-1 text-vox-warning border-vox-warning/30 hover:bg-vox-warning/5">
                    <AlertTriangle className="size-3" />Faltou
                  </Button>
                  <Button size="sm" variant="outline" disabled={sendingReminder} onClick={async () => {
                    setSendingReminder(true)
                    try {
                      const result = await sendAppointmentReminder(appointment.id)
                      if (result.success) {
                        toast.success("Lembrete enviado!")
                      } else {
                        toast.error(result.message || "Erro ao enviar lembrete")
                      }
                    } catch (err) {
                      toast.error(friendlyError(err, "Erro ao enviar lembrete"))
                    } finally {
                      setSendingReminder(false)
                    }
                  }} className="rounded-xl text-[11px] h-7 gap-1 text-blue-600 border-blue-300 hover:bg-blue-50">
                    {sendingReminder ? <Loader2 className="size-3 animate-spin" /> : <Bell className="size-3" />}Lembrete
                  </Button>
                </>
              )}
              {appointment.status !== "scheduled" && (
                <Button size="sm" variant="outline" onClick={() => onStatusChange(appointment.id, "scheduled")} className="rounded-xl text-[11px] h-7 gap-1">Reagendar</Button>
              )}
              <Button size="sm" variant="outline" onClick={() => onDelete(appointment.id)} className="rounded-xl text-[11px] h-7 gap-1 text-vox-error border-vox-error/30 hover:bg-vox-error/5 ml-auto">
                <X className="size-3" />Excluir
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

export const AppointmentCard = memo(AppointmentCardInner)
