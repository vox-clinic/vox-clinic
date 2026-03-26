"use client"

import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Calendar,
  FileText,
  Mic,
  ChevronDown,
  ChevronUp,
  User,
  Phone,
  Mail,
  Play,
  Pause,
  Loader2,
  Plus,
  X,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { updatePatient, getAudioPlaybackUrl } from "@/server/actions/patient"
import { updateAppointmentStatus } from "@/server/actions/appointment"
import Link from "next/link"

type PatientData = {
  id: string
  name: string
  document: string | null
  phone: string | null
  email: string | null
  birthDate: Date | null
  customData: Record<string, unknown>
  alerts: string[]
  createdAt: Date
  appointments: {
    id: string
    date: Date
    procedures: string[]
    notes: string | null
    aiSummary: string | null
    status: string
    recordings: {
      id: string
      duration: number | null
      createdAt: Date
      status: string
    }[]
  }[]
  recordings: {
    id: string
    audioUrl: string
    duration: number | null
    transcript: string | null
    createdAt: Date
    status: string
  }[]
}

const tabs = [
  { id: "resumo" as const, label: "Resumo", icon: User },
  { id: "historico" as const, label: "Historico", icon: Calendar },
  { id: "gravacoes" as const, label: "Gravacoes", icon: Mic },
  { id: "anamnese" as const, label: "Anamnese", icon: FileText },
]

type CustomFieldDef = {
  id: string
  name: string
  type: string
  required: boolean
}

type AnamnesisQuestionDef = {
  id: string
  question: string
  type: string
  options?: string[]
}

export function PatientTabs({ patient, customFields, anamnesisTemplate }: { patient: PatientData; customFields?: CustomFieldDef[]; anamnesisTemplate?: AnamnesisQuestionDef[] }) {
  const [activeTab, setActiveTab] = useState<"resumo" | "historico" | "gravacoes" | "anamnese">("resumo")

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === "resumo" && <ResumoTab patient={patient} customFields={customFields} />}
      {activeTab === "historico" && <HistoricoTab appointments={patient.appointments} patientId={patient.id} />}
      {activeTab === "gravacoes" && <GravacoesTab recordings={patient.recordings} />}
      {activeTab === "anamnese" && <AnamneseTab patient={patient} anamnesisTemplate={anamnesisTemplate ?? []} />}
    </div>
  )
}

function ResumoTab({ patient, customFields }: { patient: PatientData; customFields?: CustomFieldDef[] }) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(patient.name)
  const [phone, setPhone] = useState(patient.phone ?? "")
  const [email, setEmail] = useState(patient.email ?? "")
  const [document, setDocument] = useState(patient.document ?? "")
  const [birthDate, setBirthDate] = useState(
    patient.birthDate ? new Date(patient.birthDate).toISOString().split("T")[0] : ""
  )
  const [customData, setCustomData] = useState<Record<string, unknown>>(
    patient.customData ?? {}
  )
  const [alerts, setAlerts] = useState<string[]>(patient.alerts ?? [])
  const [newAlert, setNewAlert] = useState("")
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await updatePatient(patient.id, {
        name,
        phone: phone || null,
        email: email || null,
        document: document || null,
        birthDate: birthDate ? new Date(birthDate) : null,
        customData,
        alerts,
      })
      setIsEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleAddAlert = () => {
    const trimmed = newAlert.trim()
    if (trimmed && !alerts.includes(trimmed)) {
      setAlerts([...alerts, trimmed])
      setNewAlert("")
    }
  }

  const handleRemoveAlert = (index: number) => {
    setAlerts(alerts.filter((_, i) => i !== index))
  }

  const updateCustomField = (fieldId: string, value: unknown) => {
    setCustomData((prev) => ({ ...prev, [fieldId]: value }))
  }

  const formatDate = (date: Date | null) => {
    if (!date) return "-"
    return new Date(date).toLocaleDateString("pt-BR")
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Dados Pessoais</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
          disabled={saving}
        >
          {saving ? "Salvando..." : isEditing ? "Salvar" : "Editar"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <User className="size-3.5" /> Nome
            </Label>
            {isEditing ? (
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            ) : (
              <p className="text-sm">{patient.name}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>CPF</Label>
            {isEditing ? (
              <Input value={document} onChange={(e) => setDocument(e.target.value)} placeholder="000.000.000-00" />
            ) : (
              <p className="text-sm">{patient.document || "-"}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Phone className="size-3.5" /> Telefone
            </Label>
            {isEditing ? (
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            ) : (
              <p className="text-sm">{patient.phone || "-"}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Mail className="size-3.5" /> Email
            </Label>
            {isEditing ? (
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            ) : (
              <p className="text-sm">{patient.email || "-"}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Data de Nascimento</Label>
            {isEditing ? (
              <Input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            ) : (
              <p className="text-sm">{formatDate(patient.birthDate)}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Cadastrado em</Label>
            <p className="text-sm">{formatDate(patient.createdAt)}</p>
          </div>
        </div>

        <div className="rounded-lg border border-vox-error/30 bg-vox-error/5 p-3 space-y-1.5">
          <p className="text-sm font-medium text-vox-error">Alertas</p>
          {isEditing ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {alerts.map((alert, i) => (
                  <Badge key={i} variant="destructive" className="flex items-center gap-1">
                    {alert}
                    <button
                      type="button"
                      onClick={() => handleRemoveAlert(i)}
                      className="ml-0.5 hover:opacity-70"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newAlert}
                  onChange={(e) => setNewAlert(e.target.value)}
                  placeholder="Novo alerta..."
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleAddAlert()
                    }
                  }}
                />
                <Button type="button" size="sm" variant="outline" onClick={handleAddAlert}>
                  <Plus className="size-3.5" />
                </Button>
              </div>
            </div>
          ) : alerts.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {alerts.map((alert, i) => (
                <Badge key={i} variant="destructive">
                  {alert}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Nenhum alerta</p>
          )}
        </div>

        {/* Custom fields from workspace */}
        {customFields && customFields.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Dados Complementares</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {customFields.map((field) => {
                const value = customData[field.id]
                if (!isEditing && (value === undefined || value === null || value === "")) return null
                return (
                  <div key={field.id} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{field.name}</Label>
                    {isEditing ? (
                      field.type === "boolean" ? (
                        <div className="flex items-center gap-2 pt-1">
                          <Switch
                            checked={!!value}
                            onCheckedChange={(checked) => updateCustomField(field.id, checked)}
                          />
                          <span className="text-sm">{value ? "Sim" : "Nao"}</span>
                        </div>
                      ) : field.type === "select" && Array.isArray((field as any).options) ? (
                        <div className="flex flex-wrap gap-1.5">
                          {((field as any).options as string[]).map((option) => (
                            <Button
                              key={option}
                              type="button"
                              size="sm"
                              variant={value === option ? "default" : "outline"}
                              onClick={() => updateCustomField(field.id, option)}
                              className="text-xs"
                            >
                              {option}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <Input
                          type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                          value={value !== undefined && value !== null ? String(value) : ""}
                          onChange={(e) =>
                            updateCustomField(
                              field.id,
                              field.type === "number" ? (e.target.value ? Number(e.target.value) : "") : e.target.value
                            )
                          }
                        />
                      )
                    ) : (
                      <p className="text-sm">
                        {field.type === "boolean"
                          ? value ? "Sim" : "Nao"
                          : String(value)}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function HistoricoTab({
  appointments,
  patientId,
}: {
  appointments: PatientData["appointments"]
  patientId: string
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({})

  async function handleStatusChange(appointmentId: string, newStatus: string) {
    setUpdatingId(appointmentId)
    try {
      await updateAppointmentStatus(appointmentId, newStatus)
      setLocalStatuses((prev) => ({ ...prev, [appointmentId]: newStatus }))
    } catch {
      // Failed to update status
    } finally {
      setUpdatingId(null)
    }
  }

  const statusLabels: Record<string, string> = {
    scheduled: "Agendado",
    completed: "Concluido",
    cancelled: "Cancelado",
    no_show: "Faltou",
  }

  const statusColors: Record<string, string> = {
    scheduled: "bg-teal-100 text-teal-700 border-teal-200",
    completed: "bg-green-100 text-green-700 border-green-200",
    cancelled: "bg-red-100 text-red-700 border-red-200",
    no_show: "bg-amber-100 text-amber-700 border-amber-200",
  }

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link href={`/appointments/new?patientId=${patientId}`}>
          <Button size="sm" className="bg-vox-primary text-white hover:bg-vox-primary/90">
            <Plus className="size-4" />
            Nova Consulta
          </Button>
        </Link>
      </div>

      {appointments.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Nenhum atendimento registrado.
        </p>
      ) : (
        <div className="relative space-y-0">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

          {appointments.map((apt) => {
            const isExpanded = expandedId === apt.id
            const currentStatus = localStatuses[apt.id] ?? apt.status
            const isScheduled = currentStatus === "scheduled"
            return (
              <div key={apt.id} className="relative pl-10 pb-4">
                {/* Timeline dot */}
                <div className="absolute left-[13px] top-3 size-2.5 rounded-full bg-vox-primary ring-2 ring-background" />

                <Card>
                  <button
                    className="w-full text-left"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : apt.id)
                    }
                  >
                    <CardHeader className="flex-row items-center justify-between py-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">
                            {formatDate(apt.date)}
                          </p>
                          <Badge variant="outline" className={statusColors[currentStatus] ?? ""}>
                            {statusLabels[currentStatus] ?? currentStatus}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {apt.procedures.map((proc, i) => (
                            <Badge key={i} variant="secondary">
                              {proc}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="size-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="size-4 text-muted-foreground shrink-0" />
                      )}
                    </CardHeader>
                  </button>
                  {isExpanded && (
                    <CardContent className="pt-0 space-y-3">
                      {apt.aiSummary && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">
                            Resumo IA
                          </p>
                          <p className="text-sm">{apt.aiSummary}</p>
                        </div>
                      )}
                      {apt.notes && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">
                            Notas
                          </p>
                          <p className="text-sm">{apt.notes}</p>
                        </div>
                      )}
                      {apt.recordings.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">
                            Gravacoes vinculadas
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {apt.recordings.map((rec) => (
                              <Badge key={rec.id} variant="outline">
                                <Mic className="size-3 mr-1" />
                                {rec.duration
                                  ? `${Math.floor(rec.duration / 60)}min`
                                  : "N/A"}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {isScheduled && (
                        <div className="flex gap-2 pt-2 border-t">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() => handleStatusChange(apt.id, "completed")}
                            disabled={updatingId === apt.id}
                          >
                            {updatingId === apt.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <CheckCircle className="size-3.5" />
                            )}
                            Concluir
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => handleStatusChange(apt.id, "cancelled")}
                            disabled={updatingId === apt.id}
                          >
                            {updatingId === apt.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <XCircle className="size-3.5" />
                            )}
                            Cancelar
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function GravacoesTab({
  recordings,
}: {
  recordings: PatientData["recordings"]
}) {
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const audioRef = React.useRef<HTMLAudioElement | null>(null)

  function handleSpeedChange(speed: number) {
    setPlaybackSpeed(speed)
    if (audioRef.current) {
      audioRef.current.playbackRate = speed
    }
  }

  async function handlePlay(rec: PatientData["recordings"][number]) {
    // If already playing this one, pause it
    if (playingId === rec.id && audioRef.current) {
      audioRef.current.pause()
      setPlayingId(null)
      return
    }

    // Stop any current playback
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    setLoadingId(rec.id)
    try {
      const signedUrl = await getAudioPlaybackUrl(rec.audioUrl)
      const audio = new Audio(signedUrl)
      audioRef.current = audio
      audio.onended = () => {
        setPlayingId(null)
        audioRef.current = null
      }
      audio.onerror = () => {
        setPlayingId(null)
        audioRef.current = null
      }
      audio.playbackRate = playbackSpeed
      await audio.play()
      setPlayingId(rec.id)
    } catch {
      // Failed to load audio
    } finally {
      setLoadingId(null)
    }
  }

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  if (recordings.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Nenhuma gravacao registrada.
      </p>
    )
  }

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "--:--"
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0")
    const s = (seconds % 60).toString().padStart(2, "0")
    return `${m}:${s}`
  }

  return (
    <div className="space-y-2">
      {recordings.map((rec) => (
        <Card key={rec.id}>
          <CardContent className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => handlePlay(rec)}
                disabled={loadingId === rec.id}
                className="flex size-9 items-center justify-center rounded-full bg-vox-primary/10 hover:bg-vox-primary/20 transition-colors"
                aria-label={playingId === rec.id ? "Pausar" : "Reproduzir"}
              >
                {loadingId === rec.id ? (
                  <Loader2 className="size-4 text-vox-primary animate-spin" />
                ) : playingId === rec.id ? (
                  <Pause className="size-4 text-vox-primary" fill="currentColor" />
                ) : (
                  <Play className="size-4 text-vox-primary ml-0.5" fill="currentColor" />
                )}
              </button>
              <div>
                <p className="text-sm font-medium">{formatDate(rec.createdAt)}</p>
                <p className="text-xs text-muted-foreground">
                  Duracao: {formatDuration(rec.duration)}
                </p>
              </div>
            </div>
            <Badge
              variant={rec.status === "processed" ? "secondary" : "outline"}
            >
              {rec.status === "processed"
                ? "Transcrito"
                : rec.status === "pending"
                  ? "Pendente"
                  : rec.status}
            </Badge>
          </CardContent>
          {playingId === rec.id && (
            <CardContent className="pt-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground mr-1">Velocidade:</span>
                {[1, 1.25, 1.5, 2].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => handleSpeedChange(speed)}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition-colors ${
                      playbackSpeed === speed
                        ? "bg-vox-primary text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </CardContent>
          )}
          {rec.transcript && (
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground line-clamp-3">
                {rec.transcript}
              </p>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  )
}

function AnamneseTab({
  patient,
  anamnesisTemplate,
}: {
  patient: PatientData
  anamnesisTemplate: AnamnesisQuestionDef[]
}) {
  const existingAnamnesis = (patient.customData?.anamnesis as Record<string, string>) ?? {}
  const [answers, setAnswers] = useState<Record<string, string>>(existingAnamnesis)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function setAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const updatedCustomData = { ...patient.customData, anamnesis: answers }
      await updatePatient(patient.id, { customData: updatedCustomData })
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  if (anamnesisTemplate.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Nenhum modelo de anamnese configurado no workspace.
      </p>
    )
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Anamnese</CardTitle>
        <Button
          onClick={handleSave}
          disabled={saving}
          size="sm"
        >
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Salvando...
            </>
          ) : saved ? (
            "Salvo"
          ) : (
            "Salvar"
          )}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {anamnesisTemplate.map((q, i) => (
          <div key={q.id} className="space-y-2">
            <Label className="text-sm font-medium">
              {i + 1}. {q.question}
            </Label>

            {q.type === "text" && (
              <Textarea
                value={answers[q.id] ?? ""}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                placeholder="Digite sua resposta..."
                rows={3}
              />
            )}

            {q.type === "boolean" && (
              <div className="flex gap-3">
                {["Sim", "Nao"].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setAnswer(q.id, opt)}
                    className={cn(
                      "rounded-xl border px-6 py-2.5 text-sm font-medium transition-all",
                      answers[q.id] === opt
                        ? "border-vox-primary bg-vox-primary/5 text-vox-primary"
                        : "border-border text-foreground hover:border-vox-primary/30"
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {q.type === "select" && q.options && (
              <div className="flex flex-wrap gap-2">
                {q.options.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setAnswer(q.id, opt)}
                    className={cn(
                      "rounded-xl border px-4 py-2 text-sm transition-all",
                      answers[q.id] === opt
                        ? "border-vox-primary bg-vox-primary/5 text-vox-primary font-medium"
                        : "border-border text-foreground hover:border-vox-primary/30"
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
