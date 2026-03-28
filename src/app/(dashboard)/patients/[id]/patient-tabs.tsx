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
  ClipboardList,
  PauseCircle,
  Trash2,
  RotateCcw,
  Upload,
  FileImage,
  FileIcon,
  Download,
  Eye,
  Heart,
  MapPin,
  Shield,
  Tag,
  Merge,
} from "lucide-react"
import { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { updatePatient, getAudioPlaybackUrl } from "@/server/actions/patient"
import { updateAppointmentStatus } from "@/server/actions/appointment"
import {
  getTreatmentPlans,
  createTreatmentPlan,
  addSessionToTreatment,
  updateTreatmentPlanStatus,
  deleteTreatmentPlan,
} from "@/server/actions/treatment"
import {
  getPatientDocuments,
  uploadPatientDocument,
  getDocumentSignedUrl,
  deletePatientDocument,
} from "@/server/actions/document"
import { toast } from "sonner"
import Link from "next/link"

type PatientData = {
  id: string
  name: string
  document: string | null
  rg: string | null
  phone: string | null
  email: string | null
  birthDate: Date | null
  gender: string | null
  address: Record<string, string> | null
  insurance: string | null
  guardian: string | null
  source: string | null
  tags: string[]
  medicalHistory: Record<string, unknown>
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
  { id: "tratamentos" as const, label: "Tratamentos", icon: ClipboardList },
  { id: "documentos" as const, label: "Documentos", icon: FileImage },
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

type TabId = "resumo" | "historico" | "tratamentos" | "documentos" | "gravacoes" | "anamnese"

export function PatientTabs({ patient, customFields, anamnesisTemplate }: { patient: PatientData; customFields?: CustomFieldDef[]; anamnesisTemplate?: AnamnesisQuestionDef[] }) {
  const [activeTab, setActiveTab] = useState<TabId>("resumo")

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-xl bg-muted p-1 overflow-x-auto" role="tablist" aria-label="Abas do paciente">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      <div role="tabpanel" id={`panel-${activeTab}`} aria-label={tabs.find(t => t.id === activeTab)?.label}>
        {activeTab === "resumo" && <ResumoTab patient={patient} customFields={customFields} />}
        {activeTab === "historico" && <HistoricoTab appointments={patient.appointments} patientId={patient.id} />}
        {activeTab === "tratamentos" && <TratamentosTab patientId={patient.id} />}
        {activeTab === "documentos" && <DocumentosTab patientId={patient.id} />}
        {activeTab === "gravacoes" && <GravacoesTab recordings={patient.recordings} />}
        {activeTab === "anamnese" && <AnamneseTab patient={patient} anamnesisTemplate={anamnesisTemplate ?? []} />}
      </div>
    </div>
  )
}

const genderLabels: Record<string, string> = {
  masculino: "Masculino",
  feminino: "Feminino",
  outro: "Outro",
  nao_informado: "Nao informado",
}

const sourceLabels: Record<string, string> = {
  instagram: "Instagram",
  google: "Google",
  facebook: "Facebook",
  indicacao: "Indicacao",
  convenio: "Convenio",
  site: "Site",
  outro: "Outro",
}

function ResumoTab({ patient, customFields }: { patient: PatientData; customFields?: CustomFieldDef[] }) {
  const [isEditing, setIsEditing] = useState(false)
  const [showAllFields, setShowAllFields] = useState(false)
  const [name, setName] = useState(patient.name)
  const [phone, setPhone] = useState(patient.phone ?? "")
  const [email, setEmail] = useState(patient.email ?? "")
  const [document, setDocument] = useState(patient.document ?? "")
  const [rg, setRg] = useState(patient.rg ?? "")
  const [birthDate, setBirthDate] = useState(
    patient.birthDate ? new Date(patient.birthDate).toISOString().split("T")[0] : ""
  )
  const [gender, setGender] = useState(patient.gender ?? "")
  const [insurance, setInsurance] = useState(patient.insurance ?? "")
  const [guardian, setGuardian] = useState(patient.guardian ?? "")
  const [source, setSource] = useState(patient.source ?? "")
  const [address, setAddress] = useState<Record<string, string>>(patient.address ?? {})
  const [tags, setTags] = useState<string[]>(patient.tags ?? [])
  const [newTag, setNewTag] = useState("")
  const [medicalHistory, setMedicalHistory] = useState<Record<string, unknown>>(patient.medicalHistory ?? {})
  const [newMHItem, setNewMHItem] = useState({ allergies: "", chronicDiseases: "", medications: "" })
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
        rg: rg || null,
        birthDate: birthDate ? new Date(birthDate) : null,
        gender: gender || null,
        insurance: insurance || null,
        guardian: guardian || null,
        source: source || null,
        address: Object.values(address).some(v => v) ? address : null,
        tags,
        medicalHistory,
        customData,
        alerts,
      })
      setIsEditing(false)
      toast.success("Paciente atualizado com sucesso")
    } catch {
      toast.error("Erro ao salvar alteracoes")
    } finally {
      setSaving(false)
    }
  }

  const handleAddTag = () => {
    const trimmed = newTag.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
      setNewTag("")
    }
  }

  const handleRemoveTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index))
  }

  const addMHItem = (field: "allergies" | "chronicDiseases" | "medications") => {
    const val = newMHItem[field].trim()
    if (!val) return
    const current = (medicalHistory[field] as string[]) ?? []
    if (!current.includes(val)) {
      setMedicalHistory({ ...medicalHistory, [field]: [...current, val] })
    }
    setNewMHItem({ ...newMHItem, [field]: "" })
  }

  const removeMHItem = (field: string, index: number) => {
    const current = (medicalHistory[field] as string[]) ?? []
    setMedicalHistory({ ...medicalHistory, [field]: current.filter((_, i) => i !== index) })
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
        {(() => {
          const allFields = [
            { id: "name", label: "Nome", icon: User, value: patient.name, editEl: <Input value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} /> },
            { id: "document", label: "CPF", value: patient.document, editEl: <Input value={document} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDocument(e.target.value)} placeholder="000.000.000-00" /> },
            { id: "rg", label: "RG", value: patient.rg, editEl: <Input value={rg} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRg(e.target.value)} placeholder="00.000.000-0" /> },
            { id: "gender", label: "Sexo", value: patient.gender ? genderLabels[patient.gender] || patient.gender : null, editEl: (
              <select value={gender} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setGender(e.target.value)} className="h-10 w-full rounded-xl border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                <option value="">Nao informado</option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
                <option value="outro">Outro</option>
              </select>
            ) },
            { id: "phone", label: "Telefone", icon: Phone, value: patient.phone, editEl: <Input value={phone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)} /> },
            { id: "email", label: "Email", icon: Mail, value: patient.email, editEl: <Input type="email" value={email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} /> },
            { id: "birthDate", label: "Data de Nascimento", value: patient.birthDate ? formatDate(patient.birthDate) : null, editEl: <Input type="date" value={birthDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBirthDate(e.target.value)} /> },
            { id: "insurance", label: "Convenio", icon: Shield, value: patient.insurance, editEl: <Input value={insurance} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInsurance(e.target.value)} placeholder="Ex: Unimed, Amil..." /> },
            { id: "guardian", label: "Responsavel", value: patient.guardian, editEl: <Input value={guardian} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGuardian(e.target.value)} placeholder="Nome do responsavel" /> },
            { id: "source", label: "Origem", value: patient.source ? sourceLabels[patient.source] || patient.source : null, editEl: (
              <select value={source} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSource(e.target.value)} className="h-10 w-full rounded-xl border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                <option value="">Nao informado</option>
                <option value="instagram">Instagram</option>
                <option value="google">Google</option>
                <option value="facebook">Facebook</option>
                <option value="indicacao">Indicacao</option>
                <option value="convenio">Convenio</option>
                <option value="site">Site</option>
                <option value="outro">Outro</option>
              </select>
            ) },
            { id: "createdAt", label: "Cadastrado em", value: formatDate(patient.createdAt), readOnly: true },
          ]

          const filledFields = allFields.filter(f => f.value && f.value !== "-")
          const hiddenCount = allFields.length - filledFields.length
          const fieldsToShow = isEditing || showAllFields ? allFields : filledFields

          return (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {fieldsToShow.map((field) => {
                  const IconComp = (field as any).icon
                  return (
                    <div key={field.id} className="space-y-1.5">
                      <Label className={IconComp ? "flex items-center gap-1.5" : undefined}>
                        {IconComp && <IconComp className="size-3.5" />}
                        {field.label}
                      </Label>
                      {isEditing && !field.readOnly ? (
                        field.editEl
                      ) : (
                        <p className="text-sm">{field.value || "-"}</p>
                      )}
                    </div>
                  )
                })}
              </div>
              {!isEditing && hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllFields(!showAllFields)}
                  className="text-xs text-vox-primary hover:text-vox-primary/80 transition-colors font-medium"
                >
                  {showAllFields
                    ? "Ocultar campos vazios"
                    : `Mostrar todos (${hiddenCount} campos ocultos)`}
                </button>
              )}
            </>
          )
        })()}

        {/* Address */}
        {(() => {
          const hasAddress = patient.address && Object.values(patient.address).some(v => v)
          if (!isEditing && !showAllFields && !hasAddress) return null
          return (
            <div className="space-y-2">
              <p className="text-sm font-medium flex items-center gap-1.5"><MapPin className="size-3.5" /> Endereco</p>
              {isEditing ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input value={address.street ?? ""} onChange={(e) => setAddress(a => ({ ...a, street: e.target.value }))} placeholder="Rua" className="sm:col-span-2" />
                  <Input value={address.number ?? ""} onChange={(e) => setAddress(a => ({ ...a, number: e.target.value }))} placeholder="Numero" />
                  <Input value={address.complement ?? ""} onChange={(e) => setAddress(a => ({ ...a, complement: e.target.value }))} placeholder="Complemento" />
                  <Input value={address.neighborhood ?? ""} onChange={(e) => setAddress(a => ({ ...a, neighborhood: e.target.value }))} placeholder="Bairro" />
                  <Input value={address.city ?? ""} onChange={(e) => setAddress(a => ({ ...a, city: e.target.value }))} placeholder="Cidade" />
                  <Input value={address.state ?? ""} onChange={(e) => setAddress(a => ({ ...a, state: e.target.value }))} placeholder="UF" />
                  <Input value={address.zipCode ?? ""} onChange={(e) => setAddress(a => ({ ...a, zipCode: e.target.value }))} placeholder="CEP" />
                </div>
              ) : (
                <p className="text-sm">
                  {hasAddress
                    ? [patient.address!.street, patient.address!.number, patient.address!.complement, patient.address!.neighborhood, patient.address!.city, patient.address!.state, patient.address!.zipCode].filter(Boolean).join(", ")
                    : "-"}
                </p>
              )}
            </div>
          )
        })()}

        {/* Tags */}
        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-1.5"><Tag className="size-3.5" /> Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag, i) => (
              <Badge key={i} variant="secondary" className="flex items-center gap-1">
                {tag}
                {isEditing && (
                  <button type="button" onClick={() => handleRemoveTag(i)} className="ml-0.5 hover:opacity-70">
                    <X className="size-3" />
                  </button>
                )}
              </Badge>
            ))}
            {tags.length === 0 && !isEditing && <span className="text-xs text-muted-foreground">Nenhuma tag</span>}
          </div>
          {isEditing && (
            <div className="flex gap-2">
              <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="Nova tag..." className="flex-1" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddTag() } }} />
              <Button type="button" size="sm" variant="outline" onClick={handleAddTag}><Plus className="size-3.5" /></Button>
            </div>
          )}
        </div>

        {/* Medical History */}
        <div className="rounded-lg border border-vox-primary/30 bg-vox-primary/5 p-3 space-y-3">
          <p className="text-sm font-medium text-vox-primary flex items-center gap-1.5"><Heart className="size-3.5" /> Historico Medico</p>
          {(["allergies", "chronicDiseases", "medications"] as const).map((field) => {
            const labels: Record<string, string> = { allergies: "Alergias", chronicDiseases: "Doencas Cronicas", medications: "Medicacoes em Uso" }
            const items = (medicalHistory[field] as string[]) ?? []
            return (
              <div key={field} className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{labels[field]}</p>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((item, i) => (
                    <Badge key={i} variant={field === "allergies" ? "destructive" : "secondary"} className="flex items-center gap-1">
                      {item}
                      {isEditing && (
                        <button type="button" onClick={() => removeMHItem(field, i)} className="ml-0.5 hover:opacity-70"><X className="size-3" /></button>
                      )}
                    </Badge>
                  ))}
                  {items.length === 0 && !isEditing && <span className="text-xs text-muted-foreground">-</span>}
                </div>
                {isEditing && (
                  <div className="flex gap-2">
                    <Input value={newMHItem[field]} onChange={(e) => setNewMHItem(s => ({ ...s, [field]: e.target.value }))} placeholder={`Adicionar ${labels[field].toLowerCase()}...`} className="flex-1 h-8 text-xs" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addMHItem(field) } }} />
                    <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => addMHItem(field)}><Plus className="size-3" /></Button>
                  </div>
                )}
              </div>
            )
          })}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Tipo Sanguineo</p>
            {isEditing ? (
              <select value={(medicalHistory.bloodType as string) ?? ""} onChange={(e) => setMedicalHistory({ ...medicalHistory, bloodType: e.target.value || null })} className="h-8 rounded-xl border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                <option value="">Nao informado</option>
                {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            ) : (
              <p className="text-sm">{(medicalHistory.bloodType as string) || "-"}</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Observacoes Medicas</p>
            {isEditing ? (
              <Textarea value={(medicalHistory.notes as string) ?? ""} onChange={(e) => setMedicalHistory({ ...medicalHistory, notes: e.target.value || null })} placeholder="Observacoes gerais..." className="text-xs" rows={2} />
            ) : (
              <p className="text-sm">{(medicalHistory.notes as string) || "-"}</p>
            )}
          </div>
        </div>

        {/* Alerts */}
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
      toast.success("Status da consulta atualizado")
    } catch {
      toast.error("Erro ao atualizar status da consulta")
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
    scheduled: "bg-vox-primary/10 text-vox-primary border-vox-primary/20",
    completed: "bg-vox-success/10 text-vox-success border-vox-success/20",
    cancelled: "bg-vox-error/10 text-vox-error border-vox-error/20",
    no_show: "bg-vox-warning/10 text-vox-warning border-vox-warning/20",
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
          <Button size="sm" className="bg-vox-primary text-white hover:bg-vox-primary/90 active:scale-[0.98]">
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
                          {(apt.procedures as any[]).map((proc, i) => (
                            <Badge key={i} variant="secondary">
                              {typeof proc === "string" ? proc : proc?.name || String(proc)}
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
                      {apt.aiSummary && (() => {
                        // Try parsing structured summary; fall back to raw text
                        let parsed: any = null
                        try {
                          parsed = JSON.parse(apt.aiSummary)
                        } catch (err) {
                          console.error("[PatientTabs] JSON parse of aiSummary failed", err)
                        }

                        if (parsed && typeof parsed === "object" && Array.isArray(parsed.procedures)) {
                          return (
                            <div className="space-y-2">
                              {/* Procedures (if different from header badges) */}
                              {parsed.procedures.length > 0 && (
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-muted-foreground">Procedimentos</p>
                                  <div className="flex flex-wrap gap-1">
                                    {parsed.procedures.map((p: string, idx: number) => (
                                      <Badge key={idx} variant="secondary" className="text-xs">{p}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {parsed.diagnosis && (
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-muted-foreground">Diagnostico</p>
                                  <p className="text-sm">{parsed.diagnosis}</p>
                                </div>
                              )}
                              {parsed.observations && (
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-muted-foreground">Observacoes</p>
                                  <p className="text-sm whitespace-pre-wrap">{parsed.observations}</p>
                                </div>
                              )}
                              {parsed.medications && parsed.medications.length > 0 && (
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-muted-foreground">Medicamentos</p>
                                  <div className="flex flex-wrap gap-1">
                                    {parsed.medications.map((med: any, idx: number) => (
                                      <Badge key={idx} variant="outline" className="text-xs">
                                        {med.name}{med.dosage ? ` ${med.dosage}` : ""}{med.frequency ? ` - ${med.frequency}` : ""}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {parsed.recommendations && (
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-muted-foreground">Recomendacoes</p>
                                  <p className="text-sm whitespace-pre-wrap">{parsed.recommendations}</p>
                                </div>
                              )}
                            </div>
                          )
                        }

                        // Fallback: plain text
                        return (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Resumo IA</p>
                            <p className="text-sm">{apt.aiSummary}</p>
                          </div>
                        )
                      })()}
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
                      {currentStatus === "completed" && (
                        <div className="flex gap-2 pt-2 border-t">
                          <Link
                            href={`/appointments/${apt.id}/receipt`}
                            target="_blank"
                          >
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-vox-primary border-vox-primary/30 hover:bg-vox-primary/5"
                            >
                              <FileText className="size-3.5" />
                              Recibo
                            </Button>
                          </Link>
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
    } catch (err) {
      console.error("[PatientTabs] audio load failed", err)
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
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-muted/60">
          <Mic className="size-6 text-muted-foreground/50" />
        </div>
        <div>
          <p className="text-sm font-medium">Nenhuma gravacao registrada</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Grave uma consulta para gerar transcricao e resumo automatico
          </p>
        </div>
        <Link href="/appointments/new">
          <Button size="sm" className="bg-vox-primary text-white hover:bg-vox-primary/90 gap-1.5 mt-1">
            <Mic className="size-3.5" />
            Gravar consulta
          </Button>
        </Link>
      </div>
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
      toast.success("Anamnese salva com sucesso")
    } catch {
      toast.error("Erro ao salvar anamnese")
    } finally {
      setSaving(false)
    }
  }

  if (anamnesisTemplate.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-muted/60">
          <FileText className="size-6 text-muted-foreground/50" />
        </div>
        <div>
          <p className="text-sm font-medium">Nenhum modelo de anamnese configurado</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure o modelo de anamnese nas configuracoes do workspace
          </p>
        </div>
        <Link href="/settings">
          <Button size="sm" variant="outline" className="gap-1.5 mt-1">
            Ir para Configuracoes
          </Button>
        </Link>
      </div>
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
        {Object.keys(existingAnamnesis).length === 0 && (
          <div className="rounded-xl border border-vox-primary/20 bg-vox-primary/5 p-3 text-center">
            <p className="text-sm text-vox-primary font-medium">Preencha a anamnese para este paciente</p>
            <p className="text-xs text-muted-foreground mt-0.5">Responda as perguntas abaixo e clique em Salvar</p>
          </div>
        )}
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

// ────────────────────── Tratamentos Tab ──────────────────────

type TreatmentPlanItem = {
  id: string
  name: string
  procedures: string[]
  totalSessions: number
  completedSessions: number
  status: string
  notes: string | null
  startDate: string
  estimatedEndDate: string | null
  completedAt: string | null
}

const TREATMENT_STATUS: Record<string, { label: string; className: string }> = {
  active: { label: "Ativo", className: "bg-vox-primary/10 text-vox-primary" },
  completed: { label: "Concluido", className: "bg-vox-success/10 text-vox-success" },
  cancelled: { label: "Cancelado", className: "bg-vox-error/10 text-vox-error" },
  paused: { label: "Pausado", className: "bg-vox-warning/10 text-vox-warning" },
}

function TratamentosTab({ patientId }: { patientId: string }) {
  const [plans, setPlans] = useState<TreatmentPlanItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Form state
  const [formName, setFormName] = useState("")
  const [formSessions, setFormSessions] = useState("")
  const [formNotes, setFormNotes] = useState("")
  const [formSaving, setFormSaving] = useState(false)

  const loadPlans = React.useCallback(async () => {
    try {
      const data = await getTreatmentPlans(patientId)
      setPlans(data)
    } catch {
      setPlans([])
    } finally {
      setLoading(false)
    }
  }, [patientId])

  React.useEffect(() => {
    loadPlans()
  }, [loadPlans])

  async function handleCreate() {
    if (!formName.trim() || !formSessions) return
    setFormSaving(true)
    try {
      await createTreatmentPlan({
        patientId,
        name: formName.trim(),
        procedures: [],
        totalSessions: parseInt(formSessions),
        notes: formNotes.trim() || undefined,
      })
      setFormName(""); setFormSessions(""); setFormNotes("")
      setShowForm(false)
      loadPlans()
      toast.success("Plano de tratamento criado")
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar plano")
    } finally {
      setFormSaving(false)
    }
  }

  async function handleAddSession(planId: string) {
    setActionLoading(planId)
    try {
      await addSessionToTreatment(planId)
      loadPlans()
      toast.success("Sessão registrada")
    } catch (err: any) {
      toast.error(err.message || "Erro ao registrar sessão")
    } finally {
      setActionLoading(null)
    }
  }

  async function handleStatusChange(planId: string, status: string) {
    setActionLoading(planId)
    try {
      await updateTreatmentPlanStatus(planId, status)
      loadPlans()
      toast.success("Status do plano atualizado")
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar status")
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDelete(planId: string) {
    if (!confirm("Tem certeza que deseja excluir este plano de tratamento?")) return
    setActionLoading(planId)
    try {
      await deleteTreatmentPlan(planId)
      loadPlans()
      toast.success("Plano de tratamento excluído")
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir plano")
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR")

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-muted/30 animate-pulse" />
        ))}
      </div>
    )
  }

  const activePlans = plans.filter((p) => p.status === "active")
  const otherPlans = plans.filter((p) => p.status !== "active")

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="tabular-nums text-[10px]">{plans.length} planos</Badge>
          {activePlans.length > 0 && (
            <Badge className="bg-vox-primary/10 text-vox-primary border-vox-primary/20 text-[10px]">
              {activePlans.length} ativos
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="bg-vox-primary text-white hover:bg-vox-primary/90 gap-1.5"
        >
          <Plus className="size-3.5" />
          Novo Plano
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Nome do Tratamento</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Clareamento dental, Fisioterapia lombar..."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Total de Sessoes</Label>
                <Input
                  type="number"
                  min="1"
                  value={formSessions}
                  onChange={(e) => setFormSessions(e.target.value)}
                  placeholder="Ex: 6"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Observacoes (opcional)</Label>
                <Input
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Notas sobre o plano..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={!formName.trim() || !formSessions || formSaving}
                className="bg-vox-primary text-white hover:bg-vox-primary/90"
              >
                {formSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                Criar Plano
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {plans.length === 0 && !showForm && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted/60">
            <ClipboardList className="size-6 text-muted-foreground/50" />
          </div>
          <div>
            <p className="text-sm font-medium">Nenhum plano de tratamento</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Crie um plano para acompanhar o progresso do paciente
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            className="bg-vox-primary text-white hover:bg-vox-primary/90 gap-1.5 mt-1"
          >
            <Plus className="size-3.5" />
            Criar plano de tratamento
          </Button>
        </div>
      )}

      {/* Active plans */}
      {activePlans.map((plan) => {
        const progress = plan.totalSessions > 0 ? Math.round((plan.completedSessions / plan.totalSessions) * 100) : 0
        const isActionLoading = actionLoading === plan.id
        return (
          <Card key={plan.id} className="overflow-hidden">
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold truncate">{plan.name}</h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${TREATMENT_STATUS[plan.status]?.className ?? ""}`}>
                      {TREATMENT_STATUS[plan.status]?.label ?? plan.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Inicio: {formatDate(plan.startDate)}
                    {plan.notes && <> — {plan.notes}</>}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusChange(plan.id, "paused")}
                    disabled={isActionLoading}
                    className="h-7 w-7 p-0"
                    title="Pausar"
                  >
                    <PauseCircle className="size-3.5 text-vox-warning" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(plan.id)}
                    disabled={isActionLoading}
                    className="h-7 w-7 p-0"
                    title="Excluir"
                  >
                    <Trash2 className="size-3.5 text-vox-error" />
                  </Button>
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">
                    {plan.completedSessions} de {plan.totalSessions} sessoes
                  </span>
                  <span className="font-semibold tabular-nums text-vox-primary">{progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-vox-primary to-vox-primary/70 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Add session button */}
              <Button
                size="sm"
                onClick={() => handleAddSession(plan.id)}
                disabled={isActionLoading}
                className="w-full bg-vox-primary/10 text-vox-primary hover:bg-vox-primary/20 gap-1.5"
              >
                {isActionLoading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <CheckCircle className="size-3.5" />
                )}
                Registrar Sessao ({plan.completedSessions + 1}/{plan.totalSessions})
              </Button>
            </CardContent>
          </Card>
        )
      })}

      {/* Completed / Paused / Cancelled plans */}
      {otherPlans.length > 0 && (
        <div className="space-y-2 pt-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-1">
            Encerrados / Pausados
          </p>
          {otherPlans.map((plan) => {
            const progress = plan.totalSessions > 0 ? Math.round((plan.completedSessions / plan.totalSessions) * 100) : 0
            const isActionLoading = actionLoading === plan.id
            return (
              <Card key={plan.id} className="border-border/30 opacity-80">
                <CardContent className="pt-3 pb-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className="text-sm font-medium truncate">{plan.name}</h3>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${TREATMENT_STATUS[plan.status]?.className ?? ""}`}>
                        {TREATMENT_STATUS[plan.status]?.label ?? plan.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {plan.status === "paused" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(plan.id, "active")}
                          disabled={isActionLoading}
                          className="h-7 text-[10px] gap-1 px-2"
                        >
                          <RotateCcw className="size-3" />
                          Retomar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(plan.id)}
                        disabled={isActionLoading}
                        className="h-7 w-7 p-0"
                      >
                        <Trash2 className="size-3.5 text-vox-error" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span>{plan.completedSessions}/{plan.totalSessions} sessoes ({progress}%)</span>
                    {plan.completedAt && <span>Concluido: {formatDate(plan.completedAt)}</span>}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ────────────────────── Documentos Tab ──────────────────────

type DocumentItem = {
  id: string
  name: string
  url: string
  type: string
  mimeType: string | null
  fileSize: number | null
  createdAt: string
}

function DocumentosTab({ patientId }: { patientId: string }) {
  const [docs, setDocs] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const loadDocs = React.useCallback(async () => {
    try {
      const data = await getPatientDocuments(patientId)
      setDocs(data)
    } catch { setDocs([]) }
    finally { setLoading(false) }
  }, [patientId])

  React.useEffect(() => { loadDocs() }, [loadDocs])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData()
        fd.append("file", file)
        await uploadPatientDocument(fd, patientId)
      }
      loadDocs()
      toast.success("Documento enviado com sucesso")
    } catch (err: any) {
      toast.error(err.message || "Erro ao fazer upload")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function handleView(doc: DocumentItem) {
    try {
      const url = await getDocumentSignedUrl(doc.url)
      window.open(url, "_blank")
    } catch {
      alert("Erro ao abrir documento")
    }
  }

  async function handleDelete(docId: string) {
    if (!confirm("Excluir este documento?")) return
    setDeleting(docId)
    try {
      await deletePatientDocument(docId)
      loadDocs()
      toast.success("Documento excluído")
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir documento")
    } finally {
      setDeleting(null)
    }
  }

  function formatSize(bytes: number | null) {
    if (!bytes) return "--"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-muted/30 animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={cn(
          "group flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all",
          uploading
            ? "border-vox-primary/30 bg-vox-primary/5"
            : "border-border/50 hover:border-vox-primary/40 hover:bg-vox-primary/[0.02]"
        )}
      >
        {uploading ? (
          <Loader2 className="size-6 text-vox-primary animate-spin" />
        ) : (
          <Upload className="size-6 text-muted-foreground/50 group-hover:text-vox-primary transition-colors" />
        )}
        <div>
          <p className="text-sm font-medium">{uploading ? "Enviando..." : "Enviar documento"}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Imagens, PDF ou Word — max 10MB
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx"
          onChange={handleUpload}
          className="hidden"
        />
      </div>

      {/* Document grid */}
      {docs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted/60">
            <FileImage className="size-6 text-muted-foreground/50" />
          </div>
          <div>
            <p className="text-sm font-medium">Nenhum documento anexado</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Envie imagens, PDFs ou documentos do paciente
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="bg-vox-primary text-white hover:bg-vox-primary/90 gap-1.5 mt-1"
          >
            <Upload className="size-3.5" />
            Fazer upload
          </Button>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {docs.map((doc) => (
            <Card key={doc.id} className="group overflow-hidden">
              <CardContent className="flex items-center gap-3 py-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/60">
                  {doc.type === "image" ? (
                    <FileImage className="size-4 text-vox-primary" />
                  ) : doc.type === "pdf" ? (
                    <FileText className="size-4 text-vox-error" />
                  ) : (
                    <FileIcon className="size-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{doc.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatSize(doc.fileSize)} — {new Date(doc.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleView(doc)}
                    className="flex size-7 items-center justify-center rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                    title="Visualizar"
                  >
                    <Eye className="size-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    disabled={deleting === doc.id}
                    className="flex size-7 items-center justify-center rounded-lg hover:bg-vox-error/10 text-muted-foreground hover:text-vox-error transition-colors"
                    title="Excluir"
                  >
                    {deleting === doc.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
