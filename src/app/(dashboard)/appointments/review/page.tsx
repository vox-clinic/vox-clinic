"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Check,
  Loader2,
  Pencil,
  Eye,
  ArrowLeft,
  RotateCcw,
  Stethoscope,
  FileText,
  MessageSquare,
  CalendarClock,
  DollarSign,
  Sparkles,
  Pill,
  ClipboardList,
  Info,
  UserCog,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { getRecordingForReview, confirmConsultation } from "@/server/actions/consultation"
import { friendlyError } from "@/lib/error-messages"
import { Breadcrumb } from "@/components/breadcrumb"
import { CidAutocomplete } from "@/components/cid-autocomplete"
import type { AppointmentSummary, CidCode, ConsultationMedication, PatientInfoUpdates } from "@/types"

export default function AppointmentReviewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const patientId = searchParams.get("patientId") ?? ""
  const recordingId = searchParams.get("recordingId") ?? ""

  const [loadingData, setLoadingData] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [transcript, setTranscript] = useState("")
  const [audioPath, setAudioPath] = useState("")

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [procedures, setProcedures] = useState<string[]>([])
  const [observations, setObservations] = useState("")
  const [recommendations, setRecommendations] = useState("")
  const [nextAppointment, setNextAppointment] = useState("")
  const [price, setPrice] = useState("")
  const [diagnosis, setDiagnosis] = useState("")
  const [medications, setMedications] = useState<ConsultationMedication[]>([])
  const [cidCodes, setCidCodes] = useState<CidCode[]>([])
  const [patientInfoUpdates, setPatientInfoUpdates] = useState<PatientInfoUpdates>({})
  const [applyPatientUpdates, setApplyPatientUpdates] = useState(true)

  const hasPatientUpdates = patientInfoUpdates && Object.entries(patientInfoUpdates).some(
    ([, v]) => v !== null && v !== undefined && (Array.isArray(v) ? v.length > 0 : true)
  )

  useEffect(() => {
    if (!recordingId) {
      setLoadError("ID da gravacao nao encontrado")
      setLoadingData(false)
      return
    }

    getRecordingForReview(recordingId)
      .then((data) => {
        setTranscript(data.transcript)
        setAudioPath(data.audioUrl ?? "")

        const summary = data.summary
        if (summary) {
          setProcedures(summary.procedures ?? [])
          setObservations(summary.observations ?? "")
          setRecommendations(summary.recommendations ?? "")
          setNextAppointment(summary.nextAppointment ?? "")
          setDiagnosis(summary.diagnosis ?? "")
          setMedications(summary.medications ?? [])
          setCidCodes(summary.cidCodes ?? [])
          setPatientInfoUpdates(summary.patientInfoUpdates ?? {})
        }
      })
      .catch((err) => {
        setLoadError(friendlyError(err, "Erro ao carregar dados da gravacao"))
      })
      .finally(() => setLoadingData(false))
  }, [recordingId])

  async function handleConfirm() {
    setSaving(true)
    setError(null)
    try {
      const summary: AppointmentSummary = {
        procedures,
        observations,
        recommendations,
        nextAppointment: nextAppointment || null,
        diagnosis: diagnosis || null,
        medications,
        cidCodes,
        patientInfoUpdates: applyPatientUpdates ? patientInfoUpdates : {},
      }
      const parsedPrice = parseFloat(price.replace(",", "."))
      const priceCentavos = !isNaN(parsedPrice) && parsedPrice > 0 ? Math.round(parsedPrice * 100) : undefined
      const result = await confirmConsultation({
        recordingId,
        patientId,
        summary,
        audioPath,
        transcript,
        price: priceCentavos,
        cidCodes: cidCodes.length > 0 ? cidCodes : undefined,
      })
      if ('error' in result) { setError(result.error!); setSaving(false); return }
      router.push(`/patients/${result.patientId}`)
    } catch (err) {
      setError(friendlyError(err, "Erro ao salvar consulta"))
      setSaving(false)
    }
  }

  function removeProcedure(index: number) {
    setProcedures((prev) => prev.filter((_, i) => i !== index))
  }

  function removeMedication(index: number) {
    setMedications((prev) => prev.filter((_, i) => i !== index))
  }

  function handleDiscard() {
    router.push("/appointments/new")
  }

  function handleReRecord() {
    router.back()
  }

  // Loading state
  if (loadingData) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-7 w-48" />
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  // Error loading data
  if (loadError) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-vox-error/10">
          <FileText className="size-6 text-vox-error" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Erro ao carregar resumo</h1>
          <p className="text-sm text-muted-foreground mt-1">{loadError}</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/appointments/new")} className="gap-1.5">
          <ArrowLeft className="size-3.5" />
          Voltar para Nova Consulta
        </Button>
      </div>
    )
  }

  const patientUpdateLabels: Record<string, string> = {
    address: "Endereço",
    phone: "Telefone",
    insurance: "Convênio",
    allergies: "Alergias",
    medications: "Medicações de uso contínuo",
    chronicDiseases: "Doenças crônicas",
  }

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: "Agenda", href: "/calendar" }, { label: "Revisao" }]} />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex size-6 items-center justify-center rounded-lg bg-vox-primary/10">
              <Sparkles className="size-3.5 text-vox-primary" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Resumo da Consulta</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Revise o resumo gerado pela IA antes de confirmar
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditing(!editing)}
          className="gap-1.5 shrink-0"
        >
          {editing ? (
            <>
              <Eye className="size-3.5" />
              Visualizar
            </>
          ) : (
            <>
              <Pencil className="size-3.5" />
              Editar
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-vox-error/30 bg-vox-error/5 px-4 py-3 text-sm text-vox-error">
          {error}
        </div>
      )}

      {/* Two-column system layout */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left: Main content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Procedures */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Stethoscope className="size-4 text-vox-primary" />
                Procedimentos Realizados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {procedures.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum procedimento identificado</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {procedures.map((proc, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 text-xs">
                      {proc}
                      {editing && (
                        <button
                          onClick={() => removeProcedure(i)}
                          className="ml-0.5 rounded-full hover:bg-foreground/10 p-0.5"
                          aria-label={`Remover ${proc}`}
                        >
                          &times;
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Diagnosis */}
          {(diagnosis || editing) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <ClipboardList className="size-4 text-vox-primary" />
                  Diagnóstico
                </CardTitle>
              </CardHeader>
              <CardContent>
                {editing ? (
                  <Input
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder="Diagnóstico ou hipótese diagnóstica..."
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {diagnosis}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* CID-10 */}
          {(cidCodes.length > 0 || editing) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <ClipboardList className="size-4 text-vox-primary" />
                  CID-10
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {cidCodes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {cidCodes.map((cid, i) => (
                      <Badge key={i} variant="secondary" className="gap-1 text-xs">
                        <span className="font-semibold">{cid.code}</span>
                        <span className="text-muted-foreground">- {cid.description}</span>
                        {editing && (
                          <button
                            onClick={() => setCidCodes((prev) => prev.filter((_, j) => j !== i))}
                            className="ml-0.5 rounded-full hover:bg-foreground/10 p-0.5"
                            aria-label={`Remover ${cid.code}`}
                          >
                            &times;
                          </button>
                        )}
                      </Badge>
                    ))}
                  </div>
                )}
                {editing && (
                  <CidAutocomplete
                    mode="multi"
                    value={cidCodes}
                    onChange={setCidCodes}
                  />
                )}
                {cidCodes.length === 0 && !editing && (
                  <p className="text-sm text-muted-foreground">Nenhum código CID identificado</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Observations */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="size-4 text-vox-primary" />
                Observações Clínicas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <Textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  rows={4}
                  placeholder="Observações da consulta..."
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {observations || <span className="text-muted-foreground">Sem observações</span>}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Medications */}
          {(medications.length > 0 || editing) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Pill className="size-4 text-vox-primary" />
                  Medicamentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {medications.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum medicamento identificado</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="pb-2 pr-4 font-medium text-muted-foreground">Medicamento</th>
                          <th className="pb-2 pr-4 font-medium text-muted-foreground">Dosagem</th>
                          <th className="pb-2 pr-4 font-medium text-muted-foreground">Frequência</th>
                          <th className="pb-2 font-medium text-muted-foreground">Obs.</th>
                          {editing && <th className="pb-2 w-8" />}
                        </tr>
                      </thead>
                      <tbody>
                        {medications.map((med, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="py-2 pr-4">{med.name}</td>
                            <td className="py-2 pr-4 text-muted-foreground">{med.dosage || "-"}</td>
                            <td className="py-2 pr-4 text-muted-foreground">{med.frequency || "-"}</td>
                            <td className="py-2 text-muted-foreground">{med.notes || "-"}</td>
                            {editing && (
                              <td className="py-2">
                                <button
                                  onClick={() => removeMedication(i)}
                                  className="text-vox-error hover:text-vox-error/80 text-xs"
                                  aria-label={`Remover ${med.name}`}
                                >
                                  &times;
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <MessageSquare className="size-4 text-vox-primary" />
                Recomendações
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <Textarea
                  value={recommendations}
                  onChange={(e) => setRecommendations(e.target.value)}
                  rows={3}
                  placeholder="Recomendações ao paciente..."
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {recommendations || <span className="text-muted-foreground">Sem recomendações</span>}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Patient Info Updates */}
          {hasPatientUpdates && (
            <Card className="border-vox-primary/30 bg-vox-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <UserCog className="size-4 text-vox-primary" />
                  Atualizacoes do Paciente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2 rounded-lg bg-vox-primary/10 px-3 py-2">
                  <Info className="size-4 text-vox-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-vox-primary">
                    A IA identificou dados pessoais mencionados na consulta. Deseja atualizar o cadastro?
                  </p>
                </div>

                <div className="space-y-2">
                  {Object.entries(patientInfoUpdates).map(([key, value]) => {
                    if (value === null || value === undefined) return null
                    if (Array.isArray(value) && value.length === 0) return null
                    return (
                      <div key={key} className="flex items-start justify-between gap-2 text-sm">
                        <span className="font-medium text-muted-foreground">
                          {patientUpdateLabels[key] || key}:
                        </span>
                        <span className="text-right">
                          {Array.isArray(value) ? value.join(", ") : String(value)}
                        </span>
                      </div>
                    )
                  })}
                </div>

                <Button
                  variant={applyPatientUpdates ? "default" : "outline"}
                  size="sm"
                  className={applyPatientUpdates ? "bg-vox-primary hover:bg-vox-primary/90 text-white" : ""}
                  onClick={() => setApplyPatientUpdates(!applyPatientUpdates)}
                >
                  {applyPatientUpdates ? "Atualizar Cadastro" : "Não Atualizar"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Transcript */}
          {transcript && (
            <Accordion>
              <AccordionItem value="transcript">
                <AccordionTrigger className="text-sm">Transcrição Original</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {transcript}
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>

        {/* Right: Sidebar with metadata + actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <CalendarClock className="size-4 text-vox-primary" />
                Proxima Consulta
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <Input
                  value={nextAppointment}
                  onChange={(e) => setNextAppointment(e.target.value)}
                  placeholder="Ex: 15/04/2026 ou em 30 dias"
                />
              ) : (
                <p className="text-sm">
                  {nextAppointment || <span className="text-muted-foreground">Não especificada</span>}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <DollarSign className="size-4 text-vox-primary" />
                Valor da Consulta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">R$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Opcional
              </p>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <Button
              onClick={handleConfirm}
              disabled={saving}
              className="w-full bg-vox-primary hover:bg-vox-primary/90 text-white shadow-lg shadow-vox-primary/20 gap-1.5"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="size-4" />
                  Confirmar e Salvar
                </>
              )}
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={handleReRecord}
                disabled={saving}
                className="gap-1.5"
              >
                <RotateCcw className="size-3.5" />
                Regravar
              </Button>
              <Button
                variant="outline"
                onClick={handleDiscard}
                disabled={saving}
              >
                Descartar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
