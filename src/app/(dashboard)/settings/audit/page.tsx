"use client"

import { useEffect, useState, useCallback } from "react"
import { ChevronLeft, ChevronRight, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Breadcrumb } from "@/components/breadcrumb"
import { getAuditLogs } from "@/server/actions/audit"
import { friendlyError } from "@/lib/error-messages"
import { toast } from "sonner"

const ACTION_LABELS: Record<string, string> = {
  "patient.created": "Paciente criado",
  "patient.updated": "Paciente atualizado",
  "patient.deactivated": "Paciente desativado",
  "patient.merged": "Pacientes mesclados",
  "patient.data_exported": "Dados exportados",
  "appointment.scheduled": "Consulta agendada",
  "appointment.completed": "Consulta concluida",
  "appointment.cancelled": "Consulta cancelada",
  "appointment.rescheduled": "Consulta reagendada",
  "appointment.deleted": "Consulta excluida",
  "recording.processed": "Gravacao processada",
}

const ENTITY_LABELS: Record<string, string> = {
  Patient: "Paciente",
  Appointment: "Consulta",
  Recording: "Gravacao",
  TreatmentPlan: "Tratamento",
  Prescription: "Prescricao",
  MedicalCertificate: "Atestado",
  PatientDocument: "Documento",
}

type AuditLog = {
  id: string
  action: string
  entityType: string
  entityId: string
  createdAt: string
  userId: string
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatAction(action: string) {
  return ACTION_LABELS[action] || action
}

function formatEntity(entityType: string) {
  return ENTITY_LABELS[entityType] || entityType
}

function truncateId(id: string) {
  if (id.length <= 12) return id
  return id.slice(0, 12) + "..."
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchLogs = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const data = await getAuditLogs(p)
      setLogs(data.logs)
      setTotalPages(data.totalPages)
      setTotal(data.total)
      setPage(data.page)
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs(1)
  }, [fetchLogs])

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Configuracoes", href: "/settings" },
          { label: "Log de Auditoria" },
        ]}
      />

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Log de Auditoria</h1>
        <p className="text-muted-foreground mt-1">
          Historico de acoes realizadas no sistema
        </p>
      </div>

      <Card className="rounded-2xl border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Registros
            {!loading && (
              <Badge variant="secondary" className="ml-2 font-normal">
                {total} {total === 1 ? "registro" : "registros"}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>Nenhum registro de auditoria encontrado.</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 pr-4 font-medium">Data</th>
                      <th className="text-left py-2 pr-4 font-medium">Acao</th>
                      <th className="text-left py-2 pr-4 font-medium">Tipo</th>
                      <th className="text-left py-2 font-medium">ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b last:border-0">
                        <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap">
                          {formatDate(log.createdAt)}
                        </td>
                        <td className="py-2.5 pr-4">{formatAction(log.action)}</td>
                        <td className="py-2.5 pr-4">
                          <Badge variant="outline" className="font-normal">
                            {formatEntity(log.entityType)}
                          </Badge>
                        </td>
                        <td className="py-2.5 font-mono text-xs text-muted-foreground">
                          {truncateId(log.entityId)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-xl border border-border/40 p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {formatAction(log.action)}
                      </span>
                      <Badge variant="outline" className="font-normal text-xs">
                        {formatEntity(log.entityType)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatDate(log.createdAt)}</span>
                      <span className="font-mono">{truncateId(log.entityId)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 mt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Pagina {page} de {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      disabled={page <= 1}
                      onClick={() => fetchLogs(page - 1)}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      disabled={page >= totalPages}
                      onClick={() => fetchLogs(page + 1)}
                    >
                      Proximo
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
