"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  Loader2,
  ChevronRight,
  Mic,
  ArrowLeft,
  Sparkles,
  Users,
  Stethoscope,
  ClipboardList,
  FileText,
  AlertTriangle,
  Lightbulb,
  Pill,
} from "lucide-react"
import { RecordButton } from "@/components/record-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { searchPatients, getRecentPatients } from "@/server/actions/patient"
import { processConsultation } from "@/server/actions/consultation"
import { friendlyError } from "@/lib/error-messages"
import { Breadcrumb } from "@/components/breadcrumb"

type Patient = {
  id: string
  name: string
  phone: string | null
  document: string | null
  updatedAt: Date
}

type Step = "select-patient" | "recording" | "processing"

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

export default function NewAppointmentPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("select-patient")
  const [query, setQuery] = useState("")
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load recent patients on mount
  useEffect(() => {
    getRecentPatients()
      .then(setPatients)
      .catch((err: unknown) => { console.error("[NewAppointment] recent patients load failed", err) })
      .finally(() => setLoading(false))
  }, [])

  // Search with debounce
  useEffect(() => {
    if (!query.trim()) {
      setLoading(true)
      getRecentPatients()
        .then(setPatients)
        .catch((err: unknown) => { console.error("[NewAppointment] patient search failed", err) })
        .finally(() => setLoading(false))
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const results = await searchPatients(query)
        setPatients(results)
      } catch (err) {
        console.error("[NewAppointment] search failed", err)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  function handleSelectPatient(patient: Patient) {
    setSelectedPatient(patient)
    setStep("recording")
  }

  const handleRecordingComplete = useCallback(
    async (blob: Blob) => {
      if (!selectedPatient) return
      setStep("processing")
      setError(null)

      try {
        const fd = new FormData()
        fd.append("audio", blob, "consultation.webm")
        const result = await processConsultation(fd, selectedPatient.id)
        if ('error' in result) { setError(result.error!); setStep("recording"); return }

        // Inngest async path: redirect to processing page
        if ('status' in result && result.status === "processing") {
          router.push(`/appointments/processing/${result.recordingId}?type=consultation&patientId=${selectedPatient.id}`)
          return
        }

        // Inline path: redirect directly to review
        router.push(`/appointments/review?recordingId=${result.recordingId}&patientId=${selectedPatient.id}`)
      } catch (err) {
        setError(friendlyError(err, "Erro ao processar consulta"))
        setStep("recording")
      }
    },
    [selectedPatient, router]
  )

  // Step 1: Select patient
  if (step === "select-patient") {
    return (
      <div className="space-y-5">
        <Breadcrumb items={[{ label: "Agenda", href: "/calendar" }, { label: "Nova Consulta" }]} />
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Nova Consulta</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Selecione o paciente para iniciar a gravacao
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar paciente por nome..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 h-10"
          />
        </div>

        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2 px-1">
            {query ? "Resultados" : "Pacientes Recentes"}
          </p>

          {loading ? (
            <div className="space-y-1.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse" />
              ))}
            </div>
          ) : patients.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted/60">
                <Users className="size-5 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground">
                {query ? "Nenhum paciente encontrado" : "Nenhum paciente cadastrado"}
              </p>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {patients.map((patient) => (
                <button
                  key={patient.id}
                  onClick={() => handleSelectPatient(patient)}
                  className="group w-full flex items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-3 text-left transition-all hover:border-border hover:shadow-[0_2px_8px_0_rgb(0_0_0/0.04)] active:scale-[0.99]"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-vox-primary/10 text-xs font-bold text-vox-primary transition-colors group-hover:bg-vox-primary group-hover:text-white">
                    {getInitials(patient.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-vox-primary transition-colors">
                      {patient.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {patient.phone ?? patient.document ?? "Sem contato"}
                    </p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-vox-primary" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Step 2: Recording
  if (step === "recording") {
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header with patient + back */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => { setSelectedPatient(null); setStep("select-patient") }}
            className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Trocar paciente
          </button>
          <div className="flex items-center gap-2 rounded-full border border-vox-primary/20 bg-vox-primary/5 px-3 py-1.5">
            <div className="flex size-6 items-center justify-center rounded-full bg-vox-primary/10 text-[9px] font-bold text-vox-primary">
              {selectedPatient ? getInitials(selectedPatient.name) : "?"}
            </div>
            <span className="text-[13px] font-medium">{selectedPatient?.name}</span>
          </div>
        </div>

        {/* Recording card */}
        <Card className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-vox-primary/[0.06] blur-3xl hidden sm:block" />
          <CardContent className="flex flex-col items-center py-8 relative">
            <h1 className="text-lg font-semibold tracking-tight mb-1">Gravar Consulta</h1>
            <p className="text-[13px] text-muted-foreground mb-5">
              Toque para gravar, toque novamente para parar
            </p>
            <RecordButton
              onRecordingComplete={handleRecordingComplete}
              maxDuration={1800}
              size="lg"
            />
            <p className="text-[11px] text-muted-foreground mt-4">Até 30 minutos de gravação</p>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-xl border border-vox-error/30 bg-vox-error/5 px-4 py-3 text-sm text-vox-error text-center">
            {error}
          </div>
        )}

        {/* What to say — structured hints */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Lightbulb className="size-4 text-vox-primary" />
              O que falar durante a consulta?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { icon: Stethoscope, label: "Procedimentos realizados", example: "Fiz limpeza e aplicação de flúor" },
                { icon: ClipboardList, label: "Observações clínicas", example: "Paciente apresenta gengivite leve" },
                { icon: Pill, label: "Prescrições / Medicações", example: "Receitei amoxicilina 500mg" },
                { icon: FileText, label: "Recomendações ao paciente", example: "Orientei escovação 3x ao dia" },
                { icon: AlertTriangle, label: "Alertas / Alergias", example: "Alergia a dipirona confirmada" },
                { icon: Mic, label: "Próximos passos", example: "Retorno em 30 dias para avaliação" },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-2.5 rounded-xl bg-muted/30 px-3 py-2.5">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-vox-primary/[0.08] shrink-0 mt-0.5">
                    <item.icon className="size-3.5 text-vox-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground italic truncate">
                      &ldquo;{item.example}&rdquo;
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Step 3: Processing
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-vox-primary/20 animate-ping" />
        <div className="relative flex size-16 items-center justify-center rounded-full bg-vox-primary/10">
          <Sparkles className="size-6 text-vox-primary animate-pulse" />
        </div>
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-lg font-semibold">Processando consulta...</h2>
        <p className="text-sm text-muted-foreground">
          Transcrevendo audio e gerando resumo com IA
        </p>
        <Badge variant="secondary" className="mt-1">
          {selectedPatient?.name}
        </Badge>
      </div>

      <div className="w-full max-w-xs space-y-2">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-vox-primary animate-shimmer-slide w-1/2" />
        </div>
        <p className="text-[11px] text-muted-foreground text-center">
          Isso pode levar alguns segundos
        </p>
      </div>
    </div>
  )
}
