"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Check, Loader2, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { confirmConsultation } from "@/server/actions/consultation"
import type { AppointmentSummary } from "@/types"

export default function AppointmentReviewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const patientId = searchParams.get("patientId") ?? ""
  const recordingId = searchParams.get("recordingId") ?? ""
  const audioPath = searchParams.get("audioPath") ?? ""
  const transcript = searchParams.get("transcript") ?? ""
  const summaryRaw = searchParams.get("summary")

  const parsed: AppointmentSummary = summaryRaw
    ? JSON.parse(summaryRaw)
    : { procedures: [], observations: "", recommendations: "", nextAppointment: null }

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [procedures, setProcedures] = useState<string[]>(parsed.procedures ?? [])
  const [observations, setObservations] = useState(parsed.observations ?? "")
  const [recommendations, setRecommendations] = useState(parsed.recommendations ?? "")
  const [nextAppointment, setNextAppointment] = useState(parsed.nextAppointment ?? "")

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
      const result = await confirmConsultation({
        recordingId,
        patientId,
        summary,
        audioPath,
        transcript,
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

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Resumo da Consulta</h1>
          <p className="text-muted-foreground">
            Revise o resumo gerado pela IA antes de confirmar
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditing(!editing)}
        >
          <Pencil className="size-4" />
          {editing ? "Visualizar" : "Editar"}
        </Button>
      </div>

      {error && (
        <div className="text-sm text-vox-error bg-vox-error/10 p-3 rounded-lg">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Procedimentos Realizados</CardTitle>
        </CardHeader>
        <CardContent>
          {procedures.length === 0 ? (
            <p className="text-muted-foreground">Nenhum procedimento identificado</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {procedures.map((proc, i) => (
                <Badge key={i} variant="secondary" className="gap-1 pr-1">
                  {proc}
                  {editing && (
                    <button
                      onClick={() => removeProcedure(i)}
                      className="ml-1 rounded-full hover:bg-foreground/10 p-0.5"
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

      <Card>
        <CardHeader>
          <CardTitle>Observacoes Clinicas</CardTitle>
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
            <p className="text-sm whitespace-pre-wrap">
              {observations || "Sem observacoes"}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recomendacoes</CardTitle>
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
            <p className="text-sm whitespace-pre-wrap">
              {recommendations || "Sem recomendacoes"}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Proxima Consulta</CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-1.5">
              <Label htmlFor="nextAppointment">Data sugerida</Label>
              <Input
                id="nextAppointment"
                value={nextAppointment}
                onChange={(e) => setNextAppointment(e.target.value)}
                placeholder="Ex: 15/04/2026 ou em 30 dias"
              />
            </div>
          ) : (
            <p className="text-sm">
              {nextAppointment || "Nao especificada"}
            </p>
          )}
        </CardContent>
      </Card>

      {transcript && (
        <Accordion>
          <AccordionItem value="transcript">
            <AccordionTrigger>Transcricao Original</AccordionTrigger>
            <AccordionContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{transcript}</p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          onClick={handleConfirm}
          disabled={saving}
          className="flex-1 bg-vox-primary hover:bg-vox-primary/90 text-white"
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
      </div>
    </div>
  )
}
