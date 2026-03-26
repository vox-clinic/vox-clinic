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
import type { AppointmentSummary } from "@/types"

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
        }
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : "Erro ao carregar dados da gravacao")
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
      }
      const parsedPrice = parseFloat(price)
      const result = await confirmConsultation({
        recordingId,
        patientId,
        summary,
        audioPath,
        transcript,
        price: !isNaN(parsedPrice) && parsedPrice > 0 ? parsedPrice : undefined,
      })
      router.push(`/patients/${result.patientId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar consulta")
      setSaving(false)
    }
  }

  function removeProcedure(index: number) {
    setProcedures((prev) => prev.filter((_, i) => i !== index))
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

  return (
    <div className="space-y-5">
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

          {/* Observations */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="size-4 text-vox-primary" />
                Observacoes Clinicas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <Textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  rows={4}
                  placeholder="Observacoes da consulta..."
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {observations || <span className="text-muted-foreground">Sem observacoes</span>}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <MessageSquare className="size-4 text-vox-primary" />
                Recomendacoes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <Textarea
                  value={recommendations}
                  onChange={(e) => setRecommendations(e.target.value)}
                  rows={3}
                  placeholder="Recomendacoes ao paciente..."
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {recommendations || <span className="text-muted-foreground">Sem recomendacoes</span>}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Transcript */}
          {transcript && (
            <Accordion>
              <AccordionItem value="transcript">
                <AccordionTrigger className="text-sm">Transcricao Original</AccordionTrigger>
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
                  {nextAppointment || <span className="text-muted-foreground">Nao especificada</span>}
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
