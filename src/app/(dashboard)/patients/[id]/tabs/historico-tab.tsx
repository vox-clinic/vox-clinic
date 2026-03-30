"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ChevronDown,
  ChevronUp,
  Mic,
  Plus,
  Loader2,
  CheckCircle,
  XCircle,
  FileText,
  Video,
} from "lucide-react"
import { updateAppointmentStatus } from "@/server/actions/appointment"
import { toast } from "sonner"
import Link from "next/link"
import type { PatientData } from "./types"

export default function HistoricoTab({
  appointments,
  patientId,
}: {
  appointments: PatientData["appointments"]
  patientId: string
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({})

  async function handleStatusChange(appointmentId: string, newStatus: string) {
    setUpdatingId(appointmentId)
    try {
      await updateAppointmentStatus(appointmentId, newStatus)
      setLocalStatuses((prev) => ({ ...prev, [appointmentId]: newStatus }))
      toast.success("Status da consulta atualizado")
    } catch {
      toast.error("Erro ao atualizar status da consulta")
    } finally {
      setUpdatingId(null)
    }
  }

  const statusLabels: Record<string, string> = {
    scheduled: "Agendado",
    completed: "Concluido",
    cancelled: "Cancelado",
    no_show: "Faltou",
  }

  const statusColors: Record<string, string> = {
    scheduled: "bg-vox-primary/10 text-vox-primary border-vox-primary/20",
    completed: "bg-vox-success/10 text-vox-success border-vox-success/20",
    cancelled: "bg-vox-error/10 text-vox-error border-vox-error/20",
    no_show: "bg-vox-warning/10 text-vox-warning border-vox-warning/20",
  }

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link href={`/appointments/new?patientId=${patientId}`}>
          <Button size="sm" className="bg-vox-primary text-white hover:bg-vox-primary/90 active:scale-[0.98]">
            <Plus className="size-4" />
            Nova Consulta
          </Button>
        </Link>
      </div>

      {appointments.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Nenhum atendimento registrado.
        </p>
      ) : (
        <div className="relative space-y-0">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

          {appointments.map((apt) => {
            const isExpanded = expandedId === apt.id
            const currentStatus = localStatuses[apt.id] ?? apt.status
            const isScheduled = currentStatus === "scheduled"
            return (
              <div key={apt.id} className="relative pl-10 pb-4">
                {/* Timeline dot */}
                <div className="absolute left-[13px] top-3 size-2.5 rounded-full bg-vox-primary ring-2 ring-background" />

                <Card>
                  <button
                    className="w-full text-left"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : apt.id)
                    }
                  >
                    <CardHeader className="flex-row items-center justify-between py-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium">
                            {formatDate(apt.date)}
                          </p>
                          <Badge variant="outline" className={statusColors[currentStatus] ?? ""}>
                            {statusLabels[currentStatus] ?? currentStatus}
                          </Badge>
                          {apt.type === "teleconsulta" && (
                            <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200">
                              <Video className="size-3 mr-1" />
                              Teleconsulta
                            </Badge>
                          )}
                          {apt.price != null && apt.price > 0 && (
                            <span className="text-sm font-medium text-vox-primary">
                              R$ {(apt.price / 100).toFixed(2).replace(".", ",")}
                            </span>
                          )}
                        </div>
                        {(apt.procedures as any[]).length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {(apt.procedures as any[]).map((proc, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {typeof proc === "string" ? proc : proc?.name || String(proc)}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {!isExpanded && (apt.notes || apt.aiSummary) && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {apt.notes || apt.aiSummary}
                          </p>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="size-4 text-muted-foreground shrink-0 ml-2" />
                      ) : (
                        <ChevronDown className="size-4 text-muted-foreground shrink-0 ml-2" />
                      )}
                    </CardHeader>
                  </button>
                  {isExpanded && (
                    <CardContent className="pt-0 space-y-3">
                      {apt.aiSummary && (() => {
                        // Try parsing structured summary; fall back to raw text
                        let parsed: any = null
                        try {
                          parsed = JSON.parse(apt.aiSummary)
                        } catch (err) {
                          console.error("[PatientTabs] JSON parse of aiSummary failed", err)
                        }

                        if (parsed && typeof parsed === "object" && Array.isArray(parsed.procedures)) {
                          return (
                            <div className="space-y-2">
                              {/* Procedures (if different from header badges) */}
                              {parsed.procedures.length > 0 && (
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-muted-foreground">Procedimentos</p>
                                  <div className="flex flex-wrap gap-1">
                                    {parsed.procedures.map((p: string, idx: number) => (
                                      <Badge key={idx} variant="secondary" className="text-xs">{p}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {parsed.diagnosis && (
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-muted-foreground">Diagnostico</p>
                                  <p className="text-sm">{parsed.diagnosis}</p>
                                </div>
                              )}
                              {parsed.observations && (
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-muted-foreground">Observacoes</p>
                                  <p className="text-sm whitespace-pre-wrap">{parsed.observations}</p>
                                </div>
                              )}
                              {parsed.medications && parsed.medications.length > 0 && (
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-muted-foreground">Medicamentos</p>
                                  <div className="flex flex-wrap gap-1">
                                    {parsed.medications.map((med: any, idx: number) => (
                                      <Badge key={idx} variant="outline" className="text-xs">
                                        {med.name}{med.dosage ? ` ${med.dosage}` : ""}{med.frequency ? ` - ${med.frequency}` : ""}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {parsed.recommendations && (
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-muted-foreground">Recomendacoes</p>
                                  <p className="text-sm whitespace-pre-wrap">{parsed.recommendations}</p>
                                </div>
                              )}
                            </div>
                          )
                        }

                        // Fallback: plain text
                        return (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Resumo IA</p>
                            <p className="text-sm">{apt.aiSummary}</p>
                          </div>
                        )
                      })()}
                      {apt.cidCodes && (apt.cidCodes as any[]).length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">CID-10</p>
                          <div className="flex flex-wrap gap-1">
                            {(apt.cidCodes as any[]).map((cid: any, idx: number) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-0.5 rounded-md bg-vox-primary/10 text-[11px] font-medium text-vox-primary"
                                title={cid.description}
                              >
                                {cid.code}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {apt.notes && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">
                            Notas
                          </p>
                          <p className="text-sm whitespace-pre-wrap">{apt.notes}</p>
                        </div>
                      )}
                      {apt.price != null && apt.price > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Valor</p>
                          <p className="text-sm font-medium text-vox-primary">
                            R$ {(apt.price / 100).toFixed(2).replace(".", ",")}
                          </p>
                        </div>
                      )}
                      {apt.transcript && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Transcrição</p>
                          <p className="text-sm whitespace-pre-wrap text-muted-foreground bg-muted/50 rounded-lg p-3 max-h-40 overflow-y-auto">
                            {apt.transcript}
                          </p>
                        </div>
                      )}
                      {apt.recordings.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">
                            Gravacoes vinculadas
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {apt.recordings.map((rec) => (
                              <Badge key={rec.id} variant="outline">
                                <Mic className="size-3 mr-1" />
                                {rec.duration
                                  ? `${Math.floor(rec.duration / 60)}min`
                                  : "N/A"}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {currentStatus === "completed" && (
                        <div className="flex gap-2 pt-2 border-t">
                          <Link
                            href={`/appointments/${apt.id}/receipt`}
                            target="_blank"
                          >
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-vox-primary border-vox-primary/30 hover:bg-vox-primary/5"
                            >
                              <FileText className="size-3.5" />
                              Recibo
                            </Button>
                          </Link>
                          {apt.videoRecordingUrl && (
                            <a
                              href={apt.videoRecordingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-purple-600 hover:bg-purple-50 transition-colors"
                            >
                              <Video className="size-3" />
                              Gravacao
                            </a>
                          )}
                        </div>
                      )}
                      {currentStatus !== "completed" && apt.videoRecordingUrl && (
                        <div className="flex gap-2 pt-2 border-t">
                          <a
                            href={apt.videoRecordingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-purple-600 hover:bg-purple-50 transition-colors"
                          >
                            <Video className="size-3" />
                            Gravacao
                          </a>
                        </div>
                      )}
                      {isScheduled && (
                        <div className="flex gap-2 pt-2 border-t">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() => handleStatusChange(apt.id, "completed")}
                            disabled={updatingId === apt.id}
                          >
                            {updatingId === apt.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <CheckCircle className="size-3.5" />
                            )}
                            Concluir
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => handleStatusChange(apt.id, "cancelled")}
                            disabled={updatingId === apt.id}
                          >
                            {updatingId === apt.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <XCircle className="size-3.5" />
                            )}
                            Cancelar
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
