"use client"

import { Fragment, useEffect, useState, useCallback } from "react"
import { ChevronLeft, ChevronRight, FileText, Filter, User, Calendar, ChevronDown, ChevronUp, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Breadcrumb } from "@/components/breadcrumb"
import { getAuditLogs, type AuditFilters } from "@/server/actions/audit"
import { friendlyError } from "@/lib/error-messages"
import { toast } from "sonner"

// ─── Complete action labels (all 67+ actions in the system) ───

const ACTION_LABELS: Record<string, string> = {
  // Patient
  "patient.created": "Paciente criado",
  "patient.updated": "Paciente atualizado",
  "patient.deactivated": "Paciente desativado",
  "patient.merged": "Pacientes mesclados",
  "patient.data_exported": "Dados exportados",
  "patient.whatsapp_consent_granted": "Consentimento WhatsApp concedido",
  "patient.whatsapp_consent_revoked": "Consentimento WhatsApp revogado",
  // Appointment
  "appointment.created": "Consulta criada",
  "appointment.scheduled": "Consulta agendada",
  "appointment.completed": "Consulta concluida",
  "appointment.cancelled": "Consulta cancelada",
  "appointment.rescheduled": "Consulta reagendada",
  "appointment.deleted": "Consulta excluida",
  // Recording
  "recording.created": "Gravacao criada",
  "recording.accessed": "Gravacao acessada",
  "recording.processed": "Gravacao processada",
  // Consultation
  "processConsultation": "Consulta processada por IA",
  // Prescription
  "prescription.created": "Prescricao criada",
  "prescription.updated": "Prescricao atualizada",
  "prescription.deleted": "Prescricao excluida",
  "prescription.cancelled": "Prescricao cancelada",
  "prescription.signed": "Prescricao assinada",
  "prescription.type_updated": "Tipo de prescricao atualizado",
  "prescription.pdf_generated": "PDF de prescricao gerado",
  "prescription.sent_email": "Prescricao enviada por email",
  "prescription.sent_whatsapp": "Prescricao enviada por WhatsApp",
  // Prescription Template
  "prescription_template.created": "Modelo de prescricao criado",
  "prescription_template.created_from_prescription": "Modelo criado a partir de prescricao",
  "prescription_template.deleted": "Modelo de prescricao excluido",
  // Certificate
  "certificate.created": "Atestado criado",
  "certificate.deleted": "Atestado excluido",
  // Treatment Plan
  "treatmentPlan.created": "Plano de tratamento criado",
  "treatmentPlan.deleted": "Plano de tratamento excluido",
  "treatmentPlan.sessionAdded": "Sessao adicionada ao tratamento",
  "treatmentPlan.statusChanged": "Status do tratamento alterado",
  // Clinical Images
  "clinical_image.uploaded": "Imagem clinica enviada",
  "clinical_image.paired": "Imagens pareadas (antes/depois)",
  "clinical_image.unpaired": "Pareamento de imagens removido",
  "clinical_image.updated": "Imagem clinica atualizada",
  "clinical_image.deleted": "Imagem clinica excluida",
  // Documents
  "document.uploaded": "Documento enviado",
  "document.deleted": "Documento excluido",
  // Financial — Charges/Payments
  "charge.created": "Cobranca criada",
  "charge.cancelled": "Cobranca cancelada",
  "payment.recorded": "Pagamento registrado",
  "gateway.charge_created": "Cobranca gateway criada",
  "gateway.charge_cancelled": "Cobranca gateway cancelada",
  "gateway.payment_received": "Pagamento gateway recebido",
  // Expenses
  "expense.created": "Despesa criada",
  "expense.updated": "Despesa atualizada",
  "expense.deleted": "Despesa excluida",
  "expense.paid": "Despesa paga",
  // Commission
  "commission_rule.created": "Regra de comissao criada",
  "commission_rule.updated": "Regra de comissao atualizada",
  "commission_rule.deleted": "Regra de comissao excluida",
  "commission.paid": "Comissao paga",
  // Inventory
  "inventory_category.created": "Categoria de estoque criada",
  "inventory_item.created": "Item de estoque criado",
  "inventory_item.updated": "Item de estoque atualizado",
  "inventory_item.deactivated": "Item de estoque desativado",
  "inventory_movement.created": "Movimentacao de estoque registrada",
  // Team
  "team.invited": "Membro convidado",
  "team.removed": "Membro removido",
  "team.roleChanged": "Funcao do membro alterada",
  // NFS-e
  "nfse.emitted": "NFS-e emitida",
  "nfse.cancelled": "NFS-e cancelada",
  "nfse_config.saved": "Configuracao NFS-e salva",
  // TISS
  "tiss_config.save": "Configuracao TISS salva",
  "tiss_guide.create": "Guia TISS criada",
  "tiss_guide.status_update": "Status de guia TISS atualizado",
  "tiss_batch.generate": "Lote TISS gerado",
  // Operadora
  "operadora.create": "Operadora criada",
  "operadora.update": "Operadora atualizada",
  "operadora.delete": "Operadora excluida",
  // Waitlist
  "waitlist.created": "Paciente na lista de espera",
  "waitlist.updated": "Lista de espera atualizada",
  "waitlist.cancelled": "Removido da lista de espera",
  "waitlist.scheduled": "Agendado da lista de espera",
  // Forms
  "form_response.completed": "Formulario preenchido",
  // WhatsApp
  "whatsapp.message_sent": "Mensagem WhatsApp enviada",
  // Workspace
  "workspace.created": "Workspace criado",
  "workspace.updated": "Workspace atualizado",
  // Credential
  "credential.accessed": "Credencial acessada",
  // Migration
  "IMPORT_PATIENTS": "Pacientes importados",
  "MIGRATION_COMPLETED": "Migracao concluida",
}

const ENTITY_LABELS: Record<string, string> = {
  Patient: "Paciente",
  Appointment: "Consulta",
  Recording: "Gravacao",
  TreatmentPlan: "Tratamento",
  Prescription: "Prescricao",
  PrescriptionTemplate: "Modelo Prescricao",
  MedicalCertificate: "Atestado",
  PatientDocument: "Documento",
  ClinicalImage: "Imagem Clinica",
  Charge: "Cobranca",
  Payment: "Pagamento",
  Expense: "Despesa",
  CommissionRule: "Regra Comissao",
  CommissionEntry: "Comissao",
  InventoryCategory: "Categoria Estoque",
  InventoryItem: "Item Estoque",
  InventoryMovement: "Movimentacao",
  WorkspaceMember: "Membro",
  WorkspaceInvite: "Convite",
  Operadora: "Operadora",
  TissConfig: "Config TISS",
  TissGuide: "Guia TISS",
  NfseConfig: "Config NFS-e",
  Nfse: "NFS-e",
  WaitlistEntry: "Lista Espera",
  FormResponse: "Formulario",
  Workspace: "Workspace",
  GatewayCharge: "Cobranca Gateway",
  WhatsAppMessage: "Mensagem WhatsApp",
  Migration: "Migracao",
}

// ─── Action category colors ───

function getActionColor(action: string): string {
  if (action.includes("deleted") || action.includes("cancelled") || action.includes("removed") || action.includes("deactivated") || action.includes("revoked")) return "text-red-600 bg-red-50 border-red-200"
  if (action.includes("created") || action.includes("uploaded") || action.includes("invited") || action.includes("granted") || action.includes("scheduled")) return "text-emerald-600 bg-emerald-50 border-emerald-200"
  if (action.includes("updated") || action.includes("changed") || action.includes("rescheduled") || action.includes("saved")) return "text-blue-600 bg-blue-50 border-blue-200"
  if (action.includes("viewed") || action.includes("accessed") || action.includes("exported")) return "text-gray-600 bg-gray-50 border-gray-200"
  if (action.includes("signed") || action.includes("completed") || action.includes("paid") || action.includes("recorded")) return "text-purple-600 bg-purple-50 border-purple-200"
  if (action.includes("sent")) return "text-amber-600 bg-amber-50 border-amber-200"
  return "text-gray-600 bg-gray-50 border-gray-200"
}

type AuditLog = {
  id: string
  action: string
  entityType: string
  entityId: string
  createdAt: string
  userId: string
  userName: string
  details: Record<string, unknown> | null
}

type FilterOptions = {
  entityTypes: string[]
  actions: string[]
  members: { id: string; name: string }[]
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
  return ACTION_LABELS[action] || action.replace(/[._]/g, " ")
}

function formatEntity(entityType: string) {
  return ENTITY_LABELS[entityType] || entityType
}

function truncateId(id: string) {
  if (id.length <= 12) return id
  return id.slice(0, 12) + "..."
}

function formatDetails(log: AuditLog): string | null {
  const d = log.details
  if (!d) return null

  const parts: string[] = []

  // Financial info
  if (typeof d.amount === "number") {
    parts.push(`R$ ${(d.amount / 100).toFixed(2).replace(".", ",")}`)
  }
  if (typeof d.paidAmount === "number") {
    parts.push(`R$ ${(d.paidAmount / 100).toFixed(2).replace(".", ",")}`)
  }
  if (typeof d.paymentMethod === "string") {
    const methods: Record<string, string> = { pix: "PIX", credito: "Cartao credito", debito: "Cartao debito", dinheiro: "Dinheiro", boleto: "Boleto", transferencia: "Transferencia" }
    parts.push(methods[d.paymentMethod] || d.paymentMethod)
  }

  // Description
  if (typeof d.description === "string") parts.push(d.description)

  // Patient/name info
  if (typeof d.patientName === "string") parts.push(d.patientName)
  if (typeof d.patientId === "string" && !d.patientName) parts.push(`Paciente ${truncateId(d.patientId as string)}`)

  // Recurrence
  if (typeof d.recurrence === "string") {
    const rec: Record<string, string> = { monthly: "Mensal", weekly: "Semanal", yearly: "Anual" }
    parts.push(rec[d.recurrence] || d.recurrence)
  }

  // Count
  if (typeof d.count === "number") parts.push(`${d.count} itens`)

  // Template
  if (typeof d.templateId === "string") parts.push(`Template ${truncateId(d.templateId as string)}`)

  return parts.length > 0 ? parts.join(" · ") : null
}

// Group actions by category for the filter dropdown
function getActionCategory(action: string): string {
  const prefix = action.split(".")[0]
  const categories: Record<string, string> = {
    patient: "Paciente",
    appointment: "Consulta",
    recording: "Gravacao",
    prescription: "Prescricao",
    prescription_template: "Modelo Prescricao",
    certificate: "Atestado",
    treatmentPlan: "Tratamento",
    clinical_image: "Imagem Clinica",
    document: "Documento",
    charge: "Financeiro",
    payment: "Financeiro",
    gateway: "Gateway",
    expense: "Despesa",
    commission: "Comissao",
    commission_rule: "Comissao",
    inventory_category: "Estoque",
    inventory_item: "Estoque",
    inventory_movement: "Estoque",
    team: "Equipe",
    nfse: "NFS-e",
    nfse_config: "NFS-e",
    tiss_config: "TISS",
    tiss_guide: "TISS",
    tiss_batch: "TISS",
    operadora: "Operadora",
    waitlist: "Lista Espera",
    form_response: "Formulario",
    workspace: "Workspace",
    whatsapp: "WhatsApp",
    credential: "Seguranca",
  }
  return categories[prefix] || prefix
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ entityTypes: [], actions: [], members: [] })

  // Filters
  const [entityTypeFilter, setEntityTypeFilter] = useState("")
  const [actionFilter, setActionFilter] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [userFilter, setUserFilter] = useState("")

  const hasActiveFilters = entityTypeFilter || actionFilter || dateFrom || dateTo || userFilter

  const fetchLogs = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const filters: AuditFilters = {}
      if (entityTypeFilter) filters.entityType = entityTypeFilter
      if (actionFilter) filters.action = actionFilter
      if (dateFrom) filters.dateFrom = dateFrom
      if (dateTo) filters.dateTo = dateTo
      if (userFilter) filters.userId = userFilter

      const data = await getAuditLogs(p, 30, filters)
      setLogs(data.logs)
      setTotalPages(data.totalPages)
      setTotal(data.total)
      setPage(data.page)
      setFilterOptions(data.filterOptions)
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }, [entityTypeFilter, actionFilter, dateFrom, dateTo, userFilter])

  useEffect(() => {
    fetchLogs(1)
  }, [fetchLogs])

  function clearFilters() {
    setEntityTypeFilter("")
    setActionFilter("")
    setDateFrom("")
    setDateTo("")
    setUserFilter("")
  }

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
          Historico completo de todas as acoes realizadas na clinica
        </p>
      </div>

      {/* Filters */}
      <Card className="rounded-2xl border-border/40">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-sm font-medium hover:text-vox-primary transition-colors"
            >
              <Filter className="h-4 w-4" />
              Filtros
              {hasActiveFilters && (
                <Badge className="bg-vox-primary text-white text-xs px-1.5 py-0">
                  Ativo
                </Badge>
              )}
              {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7">
                <X className="h-3 w-3 mr-1" />
                Limpar filtros
              </Button>
            )}
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent className="pt-0">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo de entidade</Label>
                <Select value={entityTypeFilter} onValueChange={(v) => setEntityTypeFilter(!v || v === "all" ? "" : v)}>
                  <SelectTrigger className="h-9 rounded-xl">
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    {filterOptions.entityTypes.map((et) => (
                      <SelectItem key={et} value={et}>{formatEntity(et)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Acao</Label>
                <Select value={actionFilter} onValueChange={(v) => setActionFilter(!v || v === "all" ? "" : v)}>
                  <SelectTrigger className="h-9 rounded-xl">
                    <SelectValue placeholder="Todas as acoes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as acoes</SelectItem>
                    {filterOptions.actions.map((a) => (
                      <SelectItem key={a} value={a}>
                        {formatAction(a)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Usuario</Label>
                <Select value={userFilter} onValueChange={(v) => setUserFilter(!v || v === "all" ? "" : v)}>
                  <SelectTrigger className="h-9 rounded-xl">
                    <SelectValue placeholder="Todos os usuarios" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os usuarios</SelectItem>
                    {filterOptions.members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Data inicial</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-9 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Data final</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-9 rounded-xl"
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Logs */}
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
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-10 w-10 mx-auto mb-3 opacity-40" />
              {hasActiveFilters ? (
                <>
                  <p>Nenhum registro encontrado com esses filtros.</p>
                  <Button variant="link" onClick={clearFilters} className="mt-2 text-vox-primary">
                    Limpar filtros
                  </Button>
                </>
              ) : (
                <p>Nenhum registro de auditoria encontrado.</p>
              )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 pr-4 font-medium">Data</th>
                      <th className="text-left py-2 pr-4 font-medium">Usuario</th>
                      <th className="text-left py-2 pr-4 font-medium">Acao</th>
                      <th className="text-left py-2 pr-4 font-medium">Detalhes</th>
                      <th className="text-left py-2 pr-4 font-medium">Tipo</th>
                      <th className="text-left py-2 font-medium">ID</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <Fragment key={log.id}>
                        <tr
                          className={`border-b last:border-0 cursor-pointer hover:bg-muted/30 transition-colors ${expandedLog === log.id ? "bg-muted/20" : ""}`}
                          onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                        >
                          <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap">
                            {formatDate(log.createdAt)}
                          </td>
                          <td className="py-2.5 pr-4">
                            <div className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="truncate max-w-[140px]">{log.userName}</span>
                            </div>
                          </td>
                          <td className="py-2.5 pr-4">
                            <Badge variant="outline" className={`font-normal text-xs ${getActionColor(log.action)}`}>
                              {formatAction(log.action)}
                            </Badge>
                          </td>
                          <td className="py-2.5 pr-4 text-xs text-muted-foreground max-w-[200px] truncate">
                            {formatDetails(log) || "—"}
                          </td>
                          <td className="py-2.5 pr-4">
                            <Badge variant="outline" className="font-normal">
                              {formatEntity(log.entityType)}
                            </Badge>
                          </td>
                          <td className="py-2.5 font-mono text-xs text-muted-foreground">
                            {truncateId(log.entityId)}
                          </td>
                          <td className="py-2.5">
                            {log.details && (
                              expandedLog === log.id
                                ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                                : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </td>
                        </tr>
                        {expandedLog === log.id && log.details && (
                          <tr key={`${log.id}-details`}>
                            <td colSpan={7} className="py-3 px-4 bg-muted/10">
                              <div className="text-xs space-y-1">
                                <p className="font-medium text-muted-foreground mb-2">Detalhes</p>
                                <pre className="bg-muted/30 p-3 rounded-xl overflow-x-auto text-xs font-mono max-h-48">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-xl border border-border/40 p-3 space-y-2"
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={`font-normal text-xs ${getActionColor(log.action)}`}>
                        {formatAction(log.action)}
                      </Badge>
                      <Badge variant="outline" className="font-normal text-xs">
                        {formatEntity(log.entityType)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{log.userName}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(log.createdAt)}</span>
                      </div>
                      <span className="font-mono">{truncateId(log.entityId)}</span>
                    </div>
                    {expandedLog === log.id && log.details && (
                      <pre className="bg-muted/30 p-2 rounded-lg overflow-x-auto text-xs font-mono max-h-36 mt-2">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
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
