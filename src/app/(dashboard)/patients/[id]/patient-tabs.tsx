"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  FileText,
  Mic,
  ChevronDown,
  ChevronUp,
  User,
  Phone,
  Mail,
} from "lucide-react"
import { updatePatient } from "@/server/actions/patient"

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
    recordings: {
      id: string
      duration: number | null
      createdAt: Date
      status: string
    }[]
  }[]
  recordings: {
    id: string
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
]

type CustomFieldDef = {
  id: string
  name: string
  type: string
  required: boolean
}

export function PatientTabs({ patient, customFields }: { patient: PatientData; customFields?: CustomFieldDef[] }) {
  const [activeTab, setActiveTab] = useState<"resumo" | "historico" | "gravacoes">("resumo")

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
      {activeTab === "historico" && <HistoricoTab appointments={patient.appointments} />}
      {activeTab === "gravacoes" && <GravacoesTab recordings={patient.recordings} />}
    </div>
  )
}

function ResumoTab({ patient, customFields }: { patient: PatientData; customFields?: CustomFieldDef[] }) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(patient.name)
  const [phone, setPhone] = useState(patient.phone ?? "")
  const [email, setEmail] = useState(patient.email ?? "")
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await updatePatient(patient.id, {
        name,
        phone: phone || null,
        email: email || null,
      })
      setIsEditing(false)
    } finally {
      setSaving(false)
    }
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
            <p className="text-sm">{patient.document || "-"}</p>
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
            <p className="text-sm">{formatDate(patient.birthDate)}</p>
          </div>
          <div className="space-y-1.5">
            <Label>Cadastrado em</Label>
            <p className="text-sm">{formatDate(patient.createdAt)}</p>
          </div>
        </div>

        {patient.alerts.length > 0 && (
          <div className="rounded-lg border border-vox-error/30 bg-vox-error/5 p-3 space-y-1.5">
            <p className="text-sm font-medium text-vox-error">Alertas</p>
            <div className="flex flex-wrap gap-1.5">
              {patient.alerts.map((alert, i) => (
                <Badge key={i} variant="destructive">
                  {alert}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Custom fields from workspace */}
        {customFields && customFields.length > 0 && Object.keys(patient.customData).length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Dados Complementares</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {customFields.map((field) => {
                const value = patient.customData[field.id]
                if (value === undefined || value === null || value === "") return null
                return (
                  <div key={field.id} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{field.name}</Label>
                    <p className="text-sm">
                      {field.type === "boolean"
                        ? value ? "Sim" : "Nao"
                        : String(value)}
                    </p>
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
}: {
  appointments: PatientData["appointments"]
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (appointments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Nenhum atendimento registrado.
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

  return (
    <div className="relative space-y-0">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

      {appointments.map((apt) => {
        const isExpanded = expandedId === apt.id
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
                    <p className="text-sm font-medium">
                      {formatDate(apt.date)}
                    </p>
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
                </CardContent>
              )}
            </Card>
          </div>
        )
      })}
    </div>
  )
}

function GravacoesTab({
  recordings,
}: {
  recordings: PatientData["recordings"]
}) {
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
              <div className="flex size-8 items-center justify-center rounded-full bg-vox-primary/10">
                <Mic className="size-4 text-vox-primary" />
              </div>
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
