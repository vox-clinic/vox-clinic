"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Loader2, ChevronRight, Mic } from "lucide-react"
import { RecordButton } from "@/components/record-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
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
        const params = new URLSearchParams({
          patientId: selectedPatient.id,
          recordingId: result.recordingId,
          audioPath: result.audioPath,
          transcript: result.transcript,
          summary: JSON.stringify(result.summary),
        })
        router.push(`/appointments/review?${params.toString()}`)
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
      <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Nova Consulta</h1>
          <p className="text-muted-foreground">Selecione o paciente para iniciar a gravacao</p>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar paciente por nome..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{query ? "Resultados" : "Pacientes Recentes"}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : patients.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">
                {query ? "Nenhum paciente encontrado" : "Nenhum paciente cadastrado"}
              </p>
            ) : (
              <ul className="divide-y">
                {patients.map((patient) => (
                  <li key={patient.id}>
                    <button
                      onClick={() => handleSelectPatient(patient)}
                      className="w-full flex items-center justify-between py-3 px-2 rounded-lg hover:bg-muted transition-colors text-left"
                    >
                      <div>
                        <p className="font-medium">{patient.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {patient.phone ?? patient.document ?? "Sem contato"}
                        </p>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Step 2: Recording
  if (step === "recording") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Gravar Consulta</h1>
          <p className="text-muted-foreground">
            Paciente: <strong>{selectedPatient?.name}</strong>
          </p>
          <p className="text-sm text-muted-foreground max-w-md">
            Fale sobre os procedimentos realizados, observacoes clinicas e recomendacoes.
            Gravacao de ate 30 minutos.
          </p>
        </div>

        <RecordButton
          onRecordingComplete={handleRecordingComplete}
          maxDuration={1800}
          size="lg"
        />

        <div className="text-center text-sm text-muted-foreground space-y-1">
          <p>Toque para iniciar a gravacao</p>
          <p>Toque novamente para parar</p>
        </div>

        {error && (
          <div className="text-sm text-vox-error text-center max-w-md">{error}</div>
        )}

        <Button
          variant="outline"
          onClick={() => {
            setSelectedPatient(null)
            setStep("select-patient")
          }}
          className="mt-4"
        >
          Trocar Paciente
        </Button>
      </div>
    )
  }

  // Step 3: Processing
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
      <Loader2 className="size-12 animate-spin text-vox-primary" />
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold">Processando consulta...</h2>
        <p className="text-muted-foreground">
          Transcrevendo audio e gerando resumo com IA
        </p>
        <p className="text-sm text-muted-foreground">
          Paciente: {selectedPatient?.name}
        </p>
      </div>
      <div className="w-full max-w-md space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  )
}
