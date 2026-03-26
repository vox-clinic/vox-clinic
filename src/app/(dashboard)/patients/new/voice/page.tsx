"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Mic, AlertTriangle, UserCheck, RotateCcw, Check, Loader2 } from "lucide-react"
import { RecordButton } from "@/components/record-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import {
  processVoiceRegistration,
  confirmPatientRegistration,
  checkDuplicatePatient,
} from "@/server/actions/voice"
import type { ExtractedPatientData } from "@/types"

type PageState = "recording" | "processing" | "review"

export default function VoicePatientPage() {
  const router = useRouter()
  const [state, setState] = useState<PageState>("recording")
  const [transcript, setTranscript] = useState("")
  const [extractedData, setExtractedData] = useState<ExtractedPatientData | null>(null)
  const [recordingId, setRecordingId] = useState("")
  const [duplicate, setDuplicate] = useState<{ id: string; name: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Editable form state
  const [formData, setFormData] = useState({
    name: "",
    document: "",
    phone: "",
    email: "",
    birthDate: "",
    notes: "",
    procedures: [] as string[],
    alerts: [] as string[],
  })

  async function handleRecordingComplete(blob: Blob) {
    setState("processing")
    setError(null)
    try {
      const fd = new FormData()
      fd.append("audio", blob, "recording.webm")
      const result = await processVoiceRegistration(fd)
      setTranscript(result.transcript)
      setExtractedData(result.extractedData)
      setRecordingId(result.recordingId)

      // Populate form
      const d = result.extractedData
      setFormData({
        name: d.name ?? "",
        document: d.document ?? "",
        phone: d.phone ?? "",
        email: d.email ?? "",
        birthDate: d.birthDate ?? "",
        notes: d.notes ?? "",
        procedures: d.procedures ?? [],
        alerts: d.alerts ?? [],
      })

      // Check duplicate
      const dup = await checkDuplicatePatient(d.name ?? "", d.document)
      setDuplicate(dup)

      setState("review")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar audio")
      setState("recording")
    }
  }

  async function handleConfirm() {
    setSaving(true)
    setError(null)
    try {
      const result = await confirmPatientRegistration({
        recordingId,
        name: formData.name,
        document: formData.document || null,
        phone: formData.phone || null,
        email: formData.email || null,
        birthDate: formData.birthDate || null,
        notes: formData.notes || null,
        procedures: formData.procedures,
        alerts: formData.alerts,
      })
      router.push(`/patients/${result.patientId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar paciente")
      setSaving(false)
    }
  }

  function handleRerecord() {
    setState("recording")
    setExtractedData(null)
    setTranscript("")
    setRecordingId("")
    setDuplicate(null)
    setError(null)
  }

  function getConfidence(field: string): number {
    return extractedData?.confidence?.[field] ?? 1
  }

  function isLowConfidence(field: string): boolean {
    return getConfidence(field) < 0.8
  }

  function removeProcedure(index: number) {
    setFormData((prev) => ({
      ...prev,
      procedures: prev.procedures.filter((_, i) => i !== index),
    }))
  }

  function removeAlert(index: number) {
    setFormData((prev) => ({
      ...prev,
      alerts: prev.alerts.filter((_, i) => i !== index),
    }))
  }

  // Recording state
  if (state === "recording") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Novo Paciente por Voz</h1>
          <p className="text-muted-foreground max-w-md">
            Fale os dados do paciente: nome, telefone, CPF, procedimentos desejados e observacoes relevantes.
          </p>
        </div>

        <RecordButton onRecordingComplete={handleRecordingComplete} size="lg" />

        <div className="text-center text-sm text-muted-foreground max-w-sm space-y-1">
          <p>Toque para iniciar a gravacao</p>
          <p>Toque novamente para parar</p>
        </div>

        {error && (
          <Alert variant="destructive" className="max-w-md">
            <AlertTriangle className="size-4" />
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    )
  }

  // Processing state
  if (state === "processing") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
        <Loader2 className="size-12 animate-spin text-vox-primary" />
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">Processando audio...</h2>
          <p className="text-muted-foreground">Transcrevendo e extraindo dados do paciente</p>
        </div>
        <div className="w-full max-w-md space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    )
  }

  // Review state
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Confirmar Dados do Paciente</h1>
        <p className="text-muted-foreground">
          Revise os dados extraidos por voz. Campos com borda amarela possuem menor confianca.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {duplicate && (
        <Alert className="border-vox-warning bg-vox-warning/10">
          <UserCheck className="size-4 text-vox-warning" />
          <AlertTitle className="text-vox-warning">Possivel duplicidade</AlertTitle>
          <AlertDescription>
            Paciente similar encontrado: <strong>{duplicate.name}</strong>.{" "}
            <button
              onClick={() => router.push(`/patients/${duplicate.id}`)}
              className="underline text-vox-primary"
            >
              Ver paciente existente
            </button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Dados Pessoais</CardTitle>
          <CardDescription>Informacoes basicas do paciente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Nome */}
          <div className="space-y-1.5">
            <Label htmlFor="name">
              Nome <span className="text-vox-primary">*</span>
            </Label>
            <div className="relative">
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                className={isLowConfidence("name") ? "border-vox-warning" : ""}
                required
              />
              {isLowConfidence("name") && (
                <AlertTriangle className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-vox-warning" />
              )}
            </div>
          </div>

          {/* CPF */}
          <div className="space-y-1.5">
            <Label htmlFor="document">CPF</Label>
            <div className="relative">
              <Input
                id="document"
                value={formData.document}
                onChange={(e) => setFormData((p) => ({ ...p, document: e.target.value }))}
                className={isLowConfidence("document") ? "border-vox-warning" : ""}
              />
              {isLowConfidence("document") && (
                <AlertTriangle className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-vox-warning" />
              )}
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="phone">Telefone</Label>
            <div className="relative">
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                className={isLowConfidence("phone") ? "border-vox-warning" : ""}
              />
              {isLowConfidence("phone") && (
                <AlertTriangle className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-vox-warning" />
              )}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                className={isLowConfidence("email") ? "border-vox-warning" : ""}
              />
              {isLowConfidence("email") && (
                <AlertTriangle className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-vox-warning" />
              )}
            </div>
          </div>

          {/* Birth Date */}
          <div className="space-y-1.5">
            <Label htmlFor="birthDate">Data de Nascimento</Label>
            <div className="relative">
              <Input
                id="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData((p) => ({ ...p, birthDate: e.target.value }))}
                className={isLowConfidence("birthDate") ? "border-vox-warning" : ""}
              />
              {isLowConfidence("birthDate") && (
                <AlertTriangle className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-vox-warning" />
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Observacoes</Label>
            <Input
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Procedures */}
      {formData.procedures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Procedimentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {formData.procedures.map((proc, i) => (
                <Badge key={i} variant="secondary" className="gap-1 pr-1">
                  {proc}
                  <button
                    onClick={() => removeProcedure(i)}
                    className="ml-1 rounded-full hover:bg-foreground/10 p-0.5"
                    aria-label={`Remover ${proc}`}
                  >
                    &times;
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {formData.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Alertas</CardTitle>
            <CardDescription>Alergias e outras informacoes importantes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {formData.alerts.map((alert, i) => (
                <Badge key={i} variant="destructive" className="gap-1 pr-1">
                  {alert}
                  <button
                    onClick={() => removeAlert(i)}
                    className="ml-1 rounded-full hover:bg-foreground/10 p-0.5"
                    aria-label={`Remover ${alert}`}
                  >
                    &times;
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transcript */}
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

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          onClick={handleConfirm}
          disabled={!formData.name || saving}
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
        <Button variant="outline" onClick={handleRerecord} disabled={saving}>
          <RotateCcw className="size-4" />
          Gravar Novamente
        </Button>
      </div>
    </div>
  )
}
