"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Mic, Loader2, Check, X, Search, UserPlus, CalendarDays, Receipt, DollarSign, ClipboardList } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { RecordButton } from "@/components/record-button"
import {
  processPatientVoiceUpdate,
  processVoiceCommand,
  confirmPatientVoiceUpdate,
  createPatientFromVoice,
} from "@/server/actions/voice"
import { searchPatients } from "@/server/actions/patient"
import type { PatientUpdateIntents } from "@/lib/claude"

interface VoiceAssistantButtonProps {
  patientId?: string
}

type State = "idle" | "recording" | "processing" | "confirming" | "success" | "error"

interface MatchedPatient {
  id: string
  name: string
  phone: string | null
  document: string | null
}

interface PatientFormData {
  name: string
  document: string
  phone: string
  email: string
  birthDate: string
  gender: string
  insurance: string
  guardian: string
  notes: string
}

const ACTION_LABELS: Record<string, string> = {
  ADD_NOTE: "Anotação Clínica",
  ADD_PERSONAL_NOTE: "Anotação Pessoal",
  ADD_ALLERGY: "Alergia",
  ADD_MEDICAL_HISTORY: "Histórico Médico",
  UNKNOWN: "Não identificado",
}

const INTENT_CONFIG: Record<string, { label: string; icon: typeof Mic; description: string; tab?: string }> = {
  schedule: { label: "Agendar Consulta", icon: CalendarDays, description: "Abrindo agenda do paciente..." },
  quote: { label: "Criar Orçamento", icon: Receipt, description: "Abrindo orçamentos do paciente...", tab: "orcamentos" },
  payment: { label: "Registrar Pagamento", icon: DollarSign, description: "Abrindo financeiro do paciente...", tab: "financeiro" },
  execute: { label: "Executar Procedimento", icon: ClipboardList, description: "Abrindo ficha clínica do paciente...", tab: "ficha-clinica" },
}

export function VoiceAssistantButton({ patientId }: VoiceAssistantButtonProps) {
  const router = useRouter()
  const [state, setState] = useState<State>("idle")
  const [transcript, setTranscript] = useState("")
  const [intents, setIntents] = useState<PatientUpdateIntents["actions"]>([])
  const [recordingId, setRecordingId] = useState("")
  const [resolvedPatientId, setResolvedPatientId] = useState(patientId ?? "")
  const [errorMessage, setErrorMessage] = useState("")
  const [voiceQuoteData, setVoiceQuoteData] = useState<Array<{ name: string; tooth?: string }>>([])
  const [voiceScheduleData, setVoiceScheduleData] = useState<{ date?: string; time?: string }>({})
  const [voicePaymentData, setVoicePaymentData] = useState<{ amount?: string; method?: string }>({})
  const [manualSearch, setManualSearch] = useState("")
  const [manualResults, setManualResults] = useState<MatchedPatient[]>([])
  const [searchingManual, setSearchingManual] = useState(false)

  const [matchedPatients, setMatchedPatients] = useState<MatchedPatient[]>([])
  const [patientQuery, setPatientQuery] = useState("")
  const [selectedPatientName, setSelectedPatientName] = useState("")
  const [intent, setIntent] = useState<"update" | "register" | "schedule" | "quote" | "payment" | "execute">("update")
  const [patientForm, setPatientForm] = useState<PatientFormData>({
    name: "", document: "", phone: "", email: "",
    birthDate: "", gender: "", insurance: "", guardian: "", notes: "",
  })

  const handleRecordingComplete = useCallback(async (audioBlob: Blob) => {
    setState("processing")
    setErrorMessage("")
    setManualSearch("")
    setManualResults([])

    const formData = new FormData()
    formData.append("audio", audioBlob, "recording.webm")

    if (resolvedPatientId) {
      formData.append("patientId", resolvedPatientId)
      let result: Awaited<ReturnType<typeof processPatientVoiceUpdate>>
      try {
        result = await processPatientVoiceUpdate(formData)
      } catch {
        setErrorMessage("Erro ao processar comando de voz. Tente novamente.")
        setState("error")
        setTimeout(() => setState("idle"), 4000)
        return
      }

      if ("error" in result) {
        setErrorMessage(result.error ?? "Erro ao processar áudio")
        setState("error")
        setTimeout(() => setState("idle"), 4000)
        return
      }

      setTranscript(result.transcript)
      setIntents(result.intents.actions)
      setRecordingId(result.recordingId)
      setIntent("update")
      setState("confirming")
    } else {
      let result: Awaited<ReturnType<typeof processVoiceCommand>>
      try {
        result = await processVoiceCommand(formData)
      } catch {
        setErrorMessage("Erro ao processar comando de voz. Tente novamente.")
        setState("error")
        setTimeout(() => setState("idle"), 4000)
        return
      }

      if ("error" in result) {
        setErrorMessage(result.error ?? "Erro ao processar áudio")
        setState("error")
        setTimeout(() => setState("idle"), 4000)
        return
      }

      setTranscript(result.transcript)
      setIntents(result.intents.actions)
      setRecordingId(result.recordingId)
      setPatientQuery(result.patientQuery)
      setMatchedPatients(result.matchedPatients)
      setIntent(result.intent)
      setVoiceQuoteData(result.quoteData?.procedures ?? [])
      setVoiceScheduleData(result.scheduleData ?? {})
      setVoicePaymentData(result.paymentData ?? {})

      const pd = result.patientData ?? {}
      setPatientForm({
        name: pd.name ?? result.patientQuery ?? "",
        document: pd.document ?? "",
        phone: pd.phone ?? "",
        email: pd.email ?? "",
        birthDate: pd.birthDate ?? "",
        gender: pd.gender ?? "",
        insurance: pd.insurance ?? "",
        guardian: pd.guardian ?? "",
        notes: pd.notes ?? "",
      })

      if (result.matchedPatients.length === 1) {
        setResolvedPatientId(result.matchedPatients[0].id)
        setSelectedPatientName(result.matchedPatients[0].name)
      }

      const navIntent = INTENT_CONFIG[result.intent]
      if (navIntent && result.matchedPatients.length === 1) {
        const pid = result.matchedPatients[0].id
        if (result.intent === "schedule") {
          const sd = result.scheduleData ?? {}
          const params = new URLSearchParams()
          if (sd.date) params.set("date", sd.date)
          if (sd.time) params.set("time", sd.time)
          router.push(`/calendar${params.toString() ? `?${params}` : ""}`)
        } else if (result.intent === "quote" && result.quoteData?.procedures?.length) {
          const encoded = encodeURIComponent(JSON.stringify(result.quoteData.procedures))
          router.push(`/patients/${pid}?tab=orcamentos&newQuote=true&procedures=${encoded}`)
        } else if (result.intent === "payment") {
          const pd = result.paymentData ?? {}
          const params = new URLSearchParams({ tab: "financeiro", pay: "true" })
          if (pd.amount) params.set("amount", pd.amount)
          if (pd.method) params.set("method", pd.method)
          router.push(`/patients/${pid}?${params}`)
        } else if (navIntent.tab) {
          router.push(`/patients/${pid}?tab=${navIntent.tab}`)
        }
        setState("success")
        setTimeout(() => resetState(), 1500)
        return
      }

      setState("confirming")
    }
  }, [resolvedPatientId])

  const handleSelectPatient = (p: MatchedPatient) => {
    setResolvedPatientId(p.id)
    setSelectedPatientName(p.name)

    const navIntent = INTENT_CONFIG[intent]
    if (navIntent) {
      if (intent === "schedule") {
        router.push(`/calendar`)
      } else if (intent === "quote") {
        if (voiceQuoteData.length) {
          const encoded = encodeURIComponent(JSON.stringify(voiceQuoteData))
          router.push(`/patients/${p.id}?tab=orcamentos&newQuote=true&procedures=${encoded}`)
        } else {
          router.push(`/patients/${p.id}?tab=orcamentos&newQuote=true`)
        }
      } else if (intent === "payment") {
        const params = new URLSearchParams({ tab: "financeiro", pay: "true" })
        if (voicePaymentData.amount) params.set("amount", voicePaymentData.amount)
        if (voicePaymentData.method) params.set("method", voicePaymentData.method)
        router.push(`/patients/${p.id}?${params}`)
      } else if (navIntent.tab) {
        router.push(`/patients/${p.id}?tab=${navIntent.tab}`)
      }
      setState("success")
      setTimeout(() => resetState(), 1500)
      return
    }

    setIntent("update")
  }

  const handleConfirmUpdate = async () => {
    if (!resolvedPatientId) return

    const confirmableActions = intents
      .filter((a) => a.type !== "UNKNOWN")
      .map((a) => ({ type: a.type, value: a.value }))

    if (confirmableActions.length === 0) {
      handleCancel()
      return
    }

    const result = await confirmPatientVoiceUpdate({
      recordingId,
      patientId: resolvedPatientId,
      actions: confirmableActions,
    })

    if ("error" in result) {
      setErrorMessage(result.error ?? "Erro ao confirmar atualização")
      setState("error")
      setTimeout(() => setState("idle"), 3000)
      return
    }

    setState("success")
    setTimeout(() => resetState(), 1500)
  }

  const handleConfirmCreate = async () => {
    if (!patientForm.name.trim()) return

    const result = await createPatientFromVoice({
      recordingId,
      name: patientForm.name,
      document: patientForm.document || null,
      phone: patientForm.phone || null,
      email: patientForm.email || null,
      birthDate: patientForm.birthDate || null,
      gender: patientForm.gender || null,
      insurance: patientForm.insurance || null,
      guardian: patientForm.guardian || null,
      notes: patientForm.notes || null,
    })

    if ("error" in result) {
      setErrorMessage(result.error ?? "Erro ao criar paciente")
      setState("error")
      setTimeout(() => setState("idle"), 3000)
      return
    }

    setState("success")
    setTimeout(() => resetState(), 1500)
  }

  useEffect(() => {
    if (!manualSearch.trim() || manualSearch.length < 2) { setManualResults([]); return }
    const timeout = setTimeout(async () => {
      setSearchingManual(true)
      try {
        const results = await searchPatients(manualSearch)
        setManualResults(results.map((r) => ({ id: r.id, name: r.name, phone: r.phone, document: r.document })))
      } catch { setManualResults([]) }
      finally { setSearchingManual(false) }
    }, 300)
    return () => clearTimeout(timeout)
  }, [manualSearch])

  const resetState = () => {
    setState("idle")
    setTranscript("")
    setIntents([])
    setRecordingId("")
    setErrorMessage("")
    setMatchedPatients([])
    setPatientQuery("")
    setSelectedPatientName("")
    setIntent("update")
    setPatientForm({ name: "", document: "", phone: "", email: "", birthDate: "", gender: "", insurance: "", guardian: "", notes: "" })
    setManualSearch("")
    setManualResults([])
    if (!patientId) setResolvedPatientId("")
  }

  const handleCancel = () => resetState()

  const updateForm = (field: keyof PatientFormData, value: string) => {
    setPatientForm((prev) => ({ ...prev, [field]: value }))
  }

  if (state === "recording") {
    return (
      <div className="fixed bottom-20 right-6 z-50 md:bottom-6">
        <RecordButton
          onRecordingComplete={handleRecordingComplete}
          size="md"
          requireConsent={false}
        />
      </div>
    )
  }

  const isRegisterFlow = intent === "register" || (intent === "update" && matchedPatients.length === 0 && patientQuery)
  const isNavFlow = !!INTENT_CONFIG[intent]
  const needsPatientSelection = !isRegisterFlow && !patientId && matchedPatients.length > 1 && !resolvedPatientId
  const noPatientFound = !isRegisterFlow && matchedPatients.length === 0 && patientQuery && !resolvedPatientId
  const hasConfirmableActions = intents.filter((a) => a.type !== "UNKNOWN").length > 0

  return (
    <>
      <button
        onClick={() => {
          if (state === "idle") setState("recording")
        }}
        disabled={state === "processing" || state === "success"}
        className={cn(
          "fixed bottom-20 right-6 z-50 md:bottom-6 rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-all text-white",
          state === "idle" && "bg-vox-primary hover:bg-vox-primary/90",
          state === "processing" && "bg-vox-primary/70 cursor-wait",
          state === "success" && "bg-emerald-500",
          state === "error" && "bg-destructive"
        )}
        aria-label="Assistente de voz"
      >
        {state === "idle" && <Mic size={24} />}
        {state === "processing" && <Loader2 size={24} className="animate-spin" />}
        {state === "success" && <Check size={24} />}
        {state === "error" && <X size={24} />}
      </button>

      {state === "error" && errorMessage && (
        <div className="fixed bottom-36 right-6 z-50 md:bottom-22 max-w-xs rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-2 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <Dialog open={state === "confirming"} onOpenChange={(open: boolean) => { if (!open) handleCancel() }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isRegisterFlow ? (
                <span className="flex items-center gap-2"><UserPlus size={18} />Cadastrar novo paciente</span>
              ) : isNavFlow ? (
                <span className="flex items-center gap-2">
                  {(() => { const Icon = INTENT_CONFIG[intent]?.icon ?? Mic; return <Icon size={18} /> })()}
                  {INTENT_CONFIG[intent]?.label ?? "Comando de voz"}
                </span>
              ) : (
                "Confirmar atualização do paciente"
              )}
            </DialogTitle>
            <DialogDescription>
              {isRegisterFlow
                ? "Revise os dados extraídos do áudio e confirme o cadastro."
                : isNavFlow
                  ? noPatientFound
                    ? "Paciente não encontrado. Verifique o nome."
                    : needsPatientSelection
                      ? "Selecione o paciente para continuar."
                      : INTENT_CONFIG[intent]?.description ?? ""
                  : "Revise os dados extraídos do áudio antes de confirmar."
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {transcript && (
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Transcrição</p>
                <p className="text-sm text-muted-foreground">{transcript}</p>
              </div>
            )}

            {isRegisterFlow && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="vab-name" className="text-xs">Nome *</Label>
                  <Input id="vab-name" value={patientForm.name} onChange={(e) => updateForm("name", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="vab-document" className="text-xs">CPF</Label>
                    <Input id="vab-document" value={patientForm.document} onChange={(e) => updateForm("document", e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="vab-phone" className="text-xs">Telefone</Label>
                    <Input id="vab-phone" value={patientForm.phone} onChange={(e) => updateForm("phone", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="vab-email" className="text-xs">Email</Label>
                    <Input id="vab-email" type="email" value={patientForm.email} onChange={(e) => updateForm("email", e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="vab-birthDate" className="text-xs">Data de nascimento</Label>
                    <Input id="vab-birthDate" type="date" value={patientForm.birthDate} onChange={(e) => updateForm("birthDate", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="vab-gender" className="text-xs">Sexo</Label>
                    <select
                      id="vab-gender"
                      value={patientForm.gender}
                      onChange={(e) => updateForm("gender", e.target.value)}
                      className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Não informado</option>
                      <option value="masculino">Masculino</option>
                      <option value="feminino">Feminino</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="vab-insurance" className="text-xs">Convênio</Label>
                    <Input id="vab-insurance" value={patientForm.insurance} onChange={(e) => updateForm("insurance", e.target.value)} />
                  </div>
                </div>
                {patientForm.guardian && (
                  <div>
                    <Label htmlFor="vab-guardian" className="text-xs">Responsável</Label>
                    <Input id="vab-guardian" value={patientForm.guardian} onChange={(e) => updateForm("guardian", e.target.value)} />
                  </div>
                )}
                {patientForm.notes && (
                  <div>
                    <Label htmlFor="vab-notes" className="text-xs">Observações</Label>
                    <Input id="vab-notes" value={patientForm.notes} onChange={(e) => updateForm("notes", e.target.value)} />
                  </div>
                )}
              </div>
            )}

            {needsPatientSelection && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  <Search size={12} className="inline mr-1" />
                  Vários pacientes encontrados para &quot;{patientQuery}&quot;
                </p>
                {matchedPatients.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPatient(p)}
                    className={cn(
                      "w-full text-left rounded-xl border p-3 transition-colors",
                      resolvedPatientId === p.id
                        ? "border-vox-primary bg-vox-primary/5"
                        : "border-border/40 hover:border-vox-primary/50"
                    )}
                  >
                    <p className="text-sm font-medium">{p.name}</p>
                    {(p.phone || p.document) && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {[p.document, p.phone].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}

            {!isRegisterFlow && !needsPatientSelection && selectedPatientName && !patientId && (
              <div className="rounded-xl border border-vox-primary/30 bg-vox-primary/5 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-0.5">Paciente identificado</p>
                <p className="text-sm font-medium text-vox-primary">{selectedPatientName}</p>
              </div>
            )}

            {!isRegisterFlow && intents.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Ações identificadas</p>
                {intents.map((action, i) => (
                  <div
                    key={i}
                    className={cn(
                      "rounded-xl border p-3",
                      action.type === "UNKNOWN"
                        ? "border-border/40 opacity-50"
                        : "border-border/40"
                    )}
                  >
                    <span className={cn(
                      "text-xs font-medium",
                      action.type === "UNKNOWN" ? "text-muted-foreground" : "text-vox-primary"
                    )}>
                      {ACTION_LABELS[action.type] ?? action.type}
                    </span>
                    <p className="text-sm mt-1">{action.value}</p>
                  </div>
                ))}
              </div>
            )}

            {noPatientFound && (
              <div className="space-y-3">
                <div className="rounded-xl border border-vox-warning/30 bg-vox-warning/5 p-3">
                  <p className="text-sm text-vox-warning">Nenhum paciente encontrado para &quot;{patientQuery}&quot;</p>
                  <p className="text-xs text-muted-foreground mt-1">Busque manualmente abaixo:</p>
                </div>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={manualSearch}
                    onChange={(e) => setManualSearch(e.target.value)}
                    placeholder="Buscar paciente por nome..."
                    className="pl-9 rounded-xl text-sm"
                    autoFocus
                  />
                </div>
                {searchingManual && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" />Buscando...</p>
                )}
                {manualResults.length > 0 && (
                  <div className="space-y-1.5">
                    {manualResults.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleSelectPatient(p)}
                        className="w-full text-left rounded-xl border border-border/40 hover:border-vox-primary/50 p-3 transition-colors"
                      >
                        <p className="text-sm font-medium">{p.name}</p>
                        {(p.phone || p.document) && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {[p.document, p.phone].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {manualSearch.length >= 2 && !searchingManual && manualResults.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center">Nenhum resultado</p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleCancel}>
                Cancelar
              </Button>
              {isRegisterFlow ? (
                <Button
                  className="flex-1 bg-vox-primary hover:bg-vox-primary/90"
                  onClick={handleConfirmCreate}
                  disabled={!patientForm.name.trim()}
                >
                  Cadastrar
                </Button>
              ) : isNavFlow ? (
                <Button className="flex-1 bg-vox-primary hover:bg-vox-primary/90" disabled>
                  Selecione um paciente
                </Button>
              ) : (
                <Button
                  className="flex-1 bg-vox-primary hover:bg-vox-primary/90"
                  onClick={handleConfirmUpdate}
                  disabled={!resolvedPatientId || !hasConfirmableActions}
                >
                  Confirmar
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
