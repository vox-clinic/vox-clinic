"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Loader2, ChevronRight, Mic, ArrowLeft, Sparkles, Users } from "lucide-react"
import { RecordButton } from "@/components/record-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { searchPatients, getRecentPatients } from "@/server/actions/patient"
import { processConsultation } from "@/server/actions/consultation"

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
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Search with debounce
  useEffect(() => {
    if (!query.trim()) {
      setLoading(true)
      getRecentPatients()
        .then(setPatients)
        .catch(() => {})
        .finally(() => setLoading(false))
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const results = await searchPatients(query)
        setPatients(results)
      } catch {
        // ignore
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
        router.push(`/appointments/review?recordingId=${result.recordingId}&patientId=${selectedPatient.id}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao processar consulta")
        setStep("recording")
      }
    },
    [selectedPatient, router]
  )

  // Step 1: Select patient
  if (step === "select-patient") {
    return (
      <div className="space-y-5">
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
        {/* Patient badge */}
        <div className="flex items-center gap-2 rounded-full border border-border/50 bg-card px-4 py-2 shadow-sm">
          <div className="flex size-6 items-center justify-center rounded-full bg-vox-primary/10 text-[9px] font-bold text-vox-primary">
            {selectedPatient ? getInitials(selectedPatient.name) : "?"}
          </div>
          <span className="text-sm font-medium">{selectedPatient?.name}</span>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">Gravar Consulta</h1>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Fale sobre procedimentos, observacoes clinicas e recomendacoes.
            Ate 30 minutos de gravacao.
          </p>
        </div>

        <RecordButton
          onRecordingComplete={handleRecordingComplete}
          maxDuration={1800}
          size="lg"
        />

        <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
          <p>Toque para iniciar a gravacao</p>
          <p>Toque novamente para parar</p>
        </div>

        {error && (
          <div className="rounded-xl border border-vox-error/30 bg-vox-error/5 px-4 py-3 text-sm text-vox-error max-w-md text-center">
            {error}
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSelectedPatient(null)
            setStep("select-patient")
          }}
          className="mt-2 gap-1.5"
        >
          <ArrowLeft className="size-3.5" />
          Trocar Paciente
        </Button>
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
