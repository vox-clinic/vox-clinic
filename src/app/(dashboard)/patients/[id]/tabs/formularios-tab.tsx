"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Dialog as FormDialog,
  DialogContent as FormDialogContent,
  DialogHeader as FormDialogHeader,
  DialogTitle as FormDialogTitle,
} from "@/components/ui/dialog"
import {
  FileText,
  Plus,
  Loader2,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  Trash2,
  Eye,
  Pencil,
  AlertTriangle,
  ClipboardList,
  Calendar,
} from "lucide-react"
import {
  getFormTemplates,
  getPatientFormResponses,
  createFormResponse,
  saveDraftFormResponse,
  completeFormResponse,
  submitFormResponse,
  deleteFormResponse,
} from "@/server/actions/form-response"
import { FormRenderer } from "@/components/form-renderer"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { toast } from "sonner"
import { friendlyError } from "@/lib/error-messages"
import { cn } from "@/lib/utils"
import type { FormField } from "@/types/forms"
import type { PatientData, AnamnesisQuestionDef } from "./types"

// ─── Types for data coming from server actions ───

interface TemplateItem {
  id: string
  name: string
  description: string | null
  category: string | null
  icon: string | null
  fields: unknown[]
  sections: unknown[] | null
  isDefault: boolean
  allowMultiple: boolean
  version: number
  responseCount: number
}

interface ResponseItem {
  id: string
  templateId: string
  templateName: string
  templateCategory: string | null
  templateIcon: string | null
  templateFields: unknown[]
  templateSections: unknown[] | null
  templateVersion: number
  patientId: string
  appointmentId: string | null
  appointment: {
    id: string
    date: string
    procedures: string[]
    status: string
  } | null
  answers: Record<string, unknown>
  status: "draft" | "completed"
  completedAt: string | null
  completedBy: string | null
  createdAt: string
  updatedAt: string
}

// ─── Category helpers ───

const CATEGORY_LABELS: Record<string, string> = {
  anamnese: "Anamnese",
  avaliacao: "Avaliacao",
  consentimento: "Consentimento",
  retorno: "Retorno",
  custom: "Personalizado",
}

const CATEGORY_COLORS: Record<string, string> = {
  anamnese: "bg-blue-50 text-blue-700 border-blue-200",
  avaliacao: "bg-purple-50 text-purple-700 border-purple-200",
  consentimento: "bg-amber-50 text-amber-700 border-amber-200",
  retorno: "bg-emerald-50 text-emerald-700 border-emerald-200",
  custom: "bg-gray-50 text-gray-700 border-gray-200",
}

const STATUS_CONFIG = {
  draft: {
    label: "Rascunho",
    className: "bg-vox-warning/10 text-vox-warning border-vox-warning/20",
    icon: Clock,
  },
  completed: {
    label: "Preenchido",
    className: "bg-vox-success/10 text-vox-success border-vox-success/20",
    icon: CheckCircle,
  },
}

// ─── Main tab component ───

export default function FormulariosTab({
  patient,
  anamnesisTemplate,
}: {
  patient: PatientData
  anamnesisTemplate?: AnamnesisQuestionDef[]
}) {
  const [templates, setTemplates] = useState<TemplateItem[]>([])
  const [responses, setResponses] = useState<ResponseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Dialog states
  const [selectTemplateOpen, setSelectTemplateOpen] = useState(false)
  const [fillSheetOpen, setFillSheetOpen] = useState(false)
  const [activeTemplate, setActiveTemplate] = useState<TemplateItem | null>(null)
  const [activeResponseId, setActiveResponseId] = useState<string | null>(null)
  const [formValues, setFormValues] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    description: string
    onConfirm: () => void
  }>({ open: false, title: "", description: "", onConfirm: () => {} })

  // ─── Load data ───

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [tpls, resps] = await Promise.all([
        getFormTemplates(),
        getPatientFormResponses(patient.id),
      ])
      setTemplates(tpls)
      setResponses(resps)
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }, [patient.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ─── Check if workspace has FormTemplates (for legacy detection) ───

  const hasTemplates = templates.length > 0
  const hasLegacyAnamnesis =
    anamnesisTemplate &&
    anamnesisTemplate.length > 0 &&
    Object.keys((patient.customData?.anamnesis as Record<string, string>) ?? {}).length > 0

  // ─── Group responses by template name ───

  const groupedResponses = React.useMemo(() => {
    const groups: Record<string, ResponseItem[]> = {}
    for (const r of responses) {
      const key = r.templateName
      if (!groups[key]) groups[key] = []
      groups[key].push(r)
    }
    return groups
  }, [responses])

  const completedCount = responses.filter((r) => r.status === "completed").length

  // ─── Handlers ───

  function handleSelectTemplate(template: TemplateItem) {
    // Check if there is an existing draft for this template
    const existingDraft = responses.find(
      (r) => r.templateId === template.id && r.status === "draft"
    )

    setActiveTemplate(template)
    setSelectTemplateOpen(false)

    if (existingDraft) {
      // Resume draft
      setActiveResponseId(existingDraft.id)
      setFormValues(existingDraft.answers)
    } else {
      setActiveResponseId(null)
      setFormValues({})
    }

    setFillSheetOpen(true)
  }

  function handleViewResponse(response: ResponseItem) {
    setActiveTemplate({
      id: response.templateId,
      name: response.templateName,
      description: null,
      category: response.templateCategory,
      icon: response.templateIcon,
      fields: response.templateFields,
      sections: response.templateSections,
      isDefault: false,
      allowMultiple: true,
      version: response.templateVersion,
      responseCount: 0,
    })
    setActiveResponseId(response.id)
    setFormValues(response.answers)
    setFillSheetOpen(true)
  }

  function handleContinueDraft(response: ResponseItem) {
    setActiveTemplate({
      id: response.templateId,
      name: response.templateName,
      description: null,
      category: response.templateCategory,
      icon: response.templateIcon,
      fields: response.templateFields,
      sections: response.templateSections,
      isDefault: false,
      allowMultiple: true,
      version: response.templateVersion,
      responseCount: 0,
    })
    setActiveResponseId(response.id)
    setFormValues(response.answers)
    setFillSheetOpen(true)
  }

  async function handleSaveDraft() {
    if (!activeTemplate) return
    setSaving(true)
    try {
      if (activeResponseId) {
        // Update existing draft
        const result = await saveDraftFormResponse({
          responseId: activeResponseId,
          answers: formValues,
        })
        if ("error" in result) {
          toast.error(result.error)
          return
        }
      } else {
        // Create new draft
        const result = await createFormResponse({
          templateId: activeTemplate.id,
          patientId: patient.id,
          answers: formValues,
        })
        if ("error" in result) {
          toast.error(result.error)
          return
        }
        setActiveResponseId(result.id)
      }
      toast.success("Rascunho salvo")
      await loadData()
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleComplete() {
    if (!activeTemplate) return
    setSaving(true)
    try {
      if (activeResponseId) {
        // Complete existing response
        const result = await completeFormResponse({
          responseId: activeResponseId,
          answers: formValues,
        })
        if ("error" in result) {
          toast.error(result.error)
          return
        }
      } else {
        // Submit new (create + complete)
        const result = await submitFormResponse({
          templateId: activeTemplate.id,
          patientId: patient.id,
          answers: formValues,
        })
        if ("error" in result) {
          toast.error(result.error)
          return
        }
      }
      toast.success("Formulario preenchido com sucesso")
      setFillSheetOpen(false)
      setActiveTemplate(null)
      setActiveResponseId(null)
      setFormValues({})
      await loadData()
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteDraft(responseId: string) {
    try {
      const result = await deleteFormResponse(responseId)
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      toast.success("Rascunho descartado")
      await loadData()
    } catch (err) {
      toast.error(friendlyError(err))
    }
  }

  // ─── Determine if the active response is read-only ───

  const activeResponse = responses.find((r) => r.id === activeResponseId)
  const isReadOnly = activeResponse?.status === "completed"

  // ─── Loading state ───

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // ─── No templates yet — show legacy anamnesis or empty state ───

  if (!hasTemplates) {
    if (hasLegacyAnamnesis) {
      return <LegacyAnamneseView patient={patient} anamnesisTemplate={anamnesisTemplate!} />
    }

    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-muted/60">
          <ClipboardList className="size-6 text-muted-foreground/50" />
        </div>
        <div>
          <p className="text-sm font-medium">Nenhum modelo de formulario configurado</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Crie modelos de formulario nas configuracoes para comecar a preencher
          </p>
        </div>
      </div>
    )
  }

  // ─── Main UI ───

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold">Formularios</h3>
            {completedCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {completedCount} preenchido{completedCount !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          <Button
            size="sm"
            className="bg-vox-primary text-white hover:bg-vox-primary/90 active:scale-[0.98]"
            onClick={() => setSelectTemplateOpen(true)}
          >
            <Plus className="size-4" />
            Preencher Formulario
          </Button>
        </div>

        {/* Legacy anamnesis banner (when templates exist but old data also exists) */}
        {hasLegacyAnamnesis && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
            <AlertTriangle className="size-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                Anamnese legada encontrada
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Este paciente possui dados de anamnese no formato antigo. Migre para o novo
                sistema de formularios para aproveitar todos os recursos.
              </p>
              <button
                type="button"
                onClick={() => setExpandedId(expandedId === "legacy" ? null : "legacy")}
                className="text-xs text-amber-700 font-medium mt-1 hover:underline"
              >
                {expandedId === "legacy" ? "Ocultar" : "Ver anamnese legada"}
              </button>
              {expandedId === "legacy" && (
                <div className="mt-3 bg-white rounded-lg border border-amber-200 p-3 space-y-3">
                  <LegacyAnamneseContent
                    patient={patient}
                    anamnesisTemplate={anamnesisTemplate!}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Responses list grouped by template name */}
        {responses.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted/60">
              <FileText className="size-5 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground">
              Nenhum formulario preenchido para este paciente
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedResponses).map(([templateName, group]) => (
              <div key={templateName} className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <FileText className="size-3.5" />
                  {templateName}
                  <Badge variant="secondary" className="text-[10px]">
                    {group.length}
                  </Badge>
                </h4>

                {group.map((response) => (
                  <ResponseCard
                    key={response.id}
                    response={response}
                    isExpanded={expandedId === response.id}
                    onToggle={() =>
                      setExpandedId(expandedId === response.id ? null : response.id)
                    }
                    onView={() => handleViewResponse(response)}
                    onContinue={() => handleContinueDraft(response)}
                    onDiscard={() =>
                      setConfirmDialog({
                        open: true,
                        title: "Descartar rascunho?",
                        description:
                          "O rascunho sera excluido permanentemente. Esta acao nao pode ser desfeita.",
                        onConfirm: () => handleDeleteDraft(response.id),
                      })
                    }
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Select template dialog ─── */}
      <Dialog open={selectTemplateOpen} onOpenChange={setSelectTemplateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Preencher Formulario</DialogTitle>
            <DialogDescription>
              Selecione o modelo de formulario para preencher
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {templates.map((tpl) => {
              // Check for existing draft
              const hasDraft = responses.some(
                (r) => r.templateId === tpl.id && r.status === "draft"
              )
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleSelectTemplate(tpl)}
                  className="w-full text-left rounded-xl border p-3 transition-colors hover:bg-muted/50 hover:border-vox-primary/30"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{tpl.name}</p>
                      {tpl.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {tpl.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {tpl.category && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            CATEGORY_COLORS[tpl.category] ?? CATEGORY_COLORS.custom
                          )}
                        >
                          {CATEGORY_LABELS[tpl.category] ?? tpl.category}
                        </Badge>
                      )}
                      {hasDraft && (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-vox-warning/10 text-vox-warning border-vox-warning/20"
                        >
                          Rascunho
                        </Badge>
                      )}
                      {tpl.isDefault && (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-vox-primary/10 text-vox-primary border-vox-primary/20"
                        >
                          Padrao
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Fill form dialog (full-screen mobile, wide desktop) ─── */}
      <FormDialog open={fillSheetOpen} onOpenChange={setFillSheetOpen}>
        <FormDialogContent className="max-w-3xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto p-0 gap-0">
          <FormDialogHeader className="sticky top-0 z-10 bg-card border-b px-6 py-4">
            <FormDialogTitle className="flex items-center gap-2">
              {activeTemplate?.name}
              {isReadOnly && (
                <Badge variant="outline" className="text-xs bg-vox-success/10 text-vox-success">
                  Preenchido
                </Badge>
              )}
            </FormDialogTitle>
          </FormDialogHeader>

          <div className="px-6 py-4 space-y-4">
            {/* Linked appointment info */}
            {activeResponse?.appointment && (
              <div className="rounded-xl border bg-muted/30 p-3 flex items-center gap-2">
                <Calendar className="size-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Vinculado a consulta de{" "}
                  {new Date(activeResponse.appointment.date).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}

            {activeTemplate && (
              <FormRenderer
                fields={activeTemplate.fields as FormField[]}
                values={formValues}
                onChange={setFormValues}
                readOnly={isReadOnly}
                showValidation={false}
              />
            )}
          </div>

          {/* Sticky action buttons */}
          {!isReadOnly && (
            <div className="sticky bottom-0 bg-card border-t px-6 py-4 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveDraft}
                disabled={saving}
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Clock className="size-4" />}
                Salvar rascunho
              </Button>
              <Button
                size="sm"
                className="bg-vox-primary text-white hover:bg-vox-primary/90 active:scale-[0.98]"
                onClick={handleComplete}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle className="size-4" />
                )}
                Concluir
              </Button>
            </div>
          )}
        </FormDialogContent>
      </FormDialog>

      {/* ─── Confirm dialog ─── */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog((prev) => ({ ...prev, open }))
        }
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
      />
    </>
  )
}

// ─── Response card ───

function ResponseCard({
  response,
  isExpanded,
  onToggle,
  onView,
  onContinue,
  onDiscard,
}: {
  response: ResponseItem
  isExpanded: boolean
  onToggle: () => void
  onView: () => void
  onContinue: () => void
  onDiscard: () => void
}) {
  const statusCfg = STATUS_CONFIG[response.status]
  const StatusIcon = statusCfg.icon

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        className="w-full text-left"
        onClick={onToggle}
      >
        <CardHeader className="flex-row items-center justify-between py-3 px-4">
          <div className="space-y-0.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm text-muted-foreground">
                {formatDate(response.createdAt)}
              </p>
              <Badge variant="outline" className={cn("text-[10px]", statusCfg.className)}>
                <StatusIcon className="size-3 mr-0.5" />
                {statusCfg.label}
              </Badge>
              {response.templateCategory && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px]",
                    CATEGORY_COLORS[response.templateCategory] ?? CATEGORY_COLORS.custom
                  )}
                >
                  {CATEGORY_LABELS[response.templateCategory] ?? response.templateCategory}
                </Badge>
              )}
              {response.appointment && (
                <Badge variant="outline" className="text-[10px]">
                  <Calendar className="size-3 mr-0.5" />
                  Consulta
                </Badge>
              )}
            </div>
            {response.completedAt && (
              <p className="text-xs text-muted-foreground">
                Preenchido em {formatDate(response.completedAt)}
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
        <CardContent className="pt-0 px-4 pb-4 space-y-3">
          {/* Read-only inline preview of answers */}
          <div className="bg-muted/30 rounded-xl p-3">
            <FormRenderer
              fields={response.templateFields as FormField[]}
              values={response.answers}
              onChange={() => {}}
              readOnly
              showValidation={false}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            {response.status === "draft" ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-vox-primary border-vox-primary/30 hover:bg-vox-primary/5"
                  onClick={(e) => {
                    e.stopPropagation()
                    onContinue()
                  }}
                >
                  <Pencil className="size-3.5" />
                  Continuar Preenchimento
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-vox-error border-vox-error/30 hover:bg-vox-error/5"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDiscard()
                  }}
                >
                  <Trash2 className="size-3.5" />
                  Descartar
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="text-vox-primary border-vox-primary/30 hover:bg-vox-primary/5"
                onClick={(e) => {
                  e.stopPropagation()
                  onView()
                }}
              >
                <Eye className="size-3.5" />
                Ver Detalhes
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// ─── Legacy anamnesis view (backward compatibility) ───

function LegacyAnamneseView({
  patient,
  anamnesisTemplate,
}: {
  patient: PatientData
  anamnesisTemplate: AnamnesisQuestionDef[]
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
        <AlertTriangle className="size-4 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-800">
            Formato de anamnese legado
          </p>
          <p className="text-xs text-amber-600 mt-0.5">
            Estes dados estao no formato antigo. Migre para o novo sistema de
            formularios nas configuracoes do workspace para aproveitar recursos
            como campos condicionais, categorias e historico.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Anamnese</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <LegacyAnamneseContent
            patient={patient}
            anamnesisTemplate={anamnesisTemplate}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function LegacyAnamneseContent({
  patient,
  anamnesisTemplate,
}: {
  patient: PatientData
  anamnesisTemplate: AnamnesisQuestionDef[]
}) {
  const existingAnamnesis =
    (patient.customData?.anamnesis as Record<string, string>) ?? {}

  if (Object.keys(existingAnamnesis).length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Nenhuma anamnese preenchida
      </p>
    )
  }

  return (
    <>
      {anamnesisTemplate.map((q, i) => {
        const answer = existingAnamnesis[q.id]
        if (!answer) return null
        return (
          <div key={q.id} className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              {i + 1}. {q.question}
            </p>
            <p className="text-sm">{answer}</p>
          </div>
        )
      })}
    </>
  )
}
