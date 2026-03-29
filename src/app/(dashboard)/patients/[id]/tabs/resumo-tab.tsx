"use client"

import React, { useState, useEffect } from "react"
import { formatCep, fetchAddressByCep } from "@/lib/viacep"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  User,
  Phone,
  Mail,
  Loader2,
  Plus,
  X,
  Heart,
  MapPin,
  Shield,
  Tag,
  AlertTriangle,
  MessageSquare,
} from "lucide-react"
import { updatePatient, grantWhatsAppConsent, revokeWhatsAppConsent } from "@/server/actions/patient"
import { getPatientBalance } from "@/server/actions/receivable"
import { toast } from "sonner"
import type { PatientData, CustomFieldDef } from "./types"

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

export default function ResumoTab({ patient, customFields }: { patient: PatientData; customFields?: CustomFieldDef[] }) {
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isEditing) {
        e.preventDefault()
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isEditing])

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
  const [insuranceData, setInsuranceData] = useState<Record<string, unknown>>(
    (patient.insuranceData as Record<string, unknown>) ?? {}
  )
  const [whatsappConsent, setWhatsappConsent] = useState(patient.whatsappConsent)
  const [consentLoading, setConsentLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)
  const [balance, setBalance] = useState<{ pending: number; overdue: number; total: number } | null>(null)

  useEffect(() => {
    getPatientBalance(patient.id).then(setBalance).catch(() => {})
  }, [patient.id])

  useEffect(() => {
    const zip = address?.zipCode || ""
    const digits = zip.replace(/\D/g, "")
    if (digits.length === 8 && isEditing) {
      setCepLoading(true)
      fetchAddressByCep(digits).then((data) => {
        if (data) {
          setAddress((prev) => ({
            ...prev,
            street: data.logradouro || prev?.street || "",
            neighborhood: data.bairro || prev?.neighborhood || "",
            city: data.localidade || prev?.city || "",
            state: data.uf || prev?.state || "",
          }))
        }
        setCepLoading(false)
      })
    }
  }, [address?.zipCode, isEditing])

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
        insuranceData: Object.values(insuranceData).some(v => v) ? insuranceData : null,
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

  const handleWhatsAppConsentToggle = async (checked: boolean) => {
    setConsentLoading(true)
    try {
      const result = checked
        ? await grantWhatsAppConsent(patient.id)
        : await revokeWhatsAppConsent(patient.id)
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      setWhatsappConsent(checked)
      toast.success(checked ? "Consentimento WhatsApp concedido" : "Consentimento WhatsApp revogado")
    } catch {
      toast.error("Erro ao alterar consentimento")
    } finally {
      setConsentLoading(false)
    }
  }

  const updateCustomField = (fieldId: string, value: unknown) => {
    setCustomData((prev) => ({ ...prev, [fieldId]: value }))
  }

  const formatDate = (date: Date | null) => {
    if (!date) return "-"
    return new Date(date).toLocaleDateString("pt-BR")
  }

  // Quick stats
  const appointmentCount = patient.appointments?.length ?? 0
  const recordingCount = patient.recordings?.length ?? 0
  const lastAppointment = patient.appointments?.[0]
  const lastAppointmentDate = lastAppointment ? new Date(lastAppointment.date).toLocaleDateString("pt-BR") : null

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="flex items-center gap-2.5 rounded-xl bg-muted/30 border border-border/30 px-3 py-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-vox-primary/10 shrink-0">
            <User className="size-3.5 text-vox-primary" />
          </div>
          <div>
            <p className="text-[16px] font-bold tabular-nums leading-none">{appointmentCount}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Consultas</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-xl bg-muted/30 border border-border/30 px-3 py-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-vox-primary/10 shrink-0">
            <Heart className="size-3.5 text-vox-primary" />
          </div>
          <div>
            <p className="text-[12px] font-semibold leading-none">{lastAppointmentDate ?? "—"}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Última visita</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-xl bg-muted/30 border border-border/30 px-3 py-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-vox-primary/10 shrink-0">
            <MessageSquare className="size-3.5 text-vox-primary" />
          </div>
          <div>
            <p className="text-[16px] font-bold tabular-nums leading-none">{recordingCount}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Gravações</p>
          </div>
        </div>
        {balance && balance.total > 0 ? (
          <div className="flex items-center gap-2.5 rounded-xl bg-vox-warning/5 border border-vox-warning/20 px-3 py-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-vox-warning/10 shrink-0">
              <AlertTriangle className="size-3.5 text-vox-warning" />
            </div>
            <div>
              <p className="text-[12px] font-bold text-vox-warning leading-none">R$ {(balance.total / 100).toFixed(2).replace(".", ",")}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Saldo devedor</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-xl bg-muted/30 border border-border/30 px-3 py-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-vox-success/10 shrink-0">
              <Shield className="size-3.5 text-vox-success" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-vox-success leading-none">Em dia</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Financeiro</p>
            </div>
          </div>
        )}
      </div>

    <Card>
      <CardHeader className="flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm">Dados Pessoais</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
          disabled={saving}
          className="h-7 text-xs rounded-lg"
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
              {isEditing ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {fieldsToShow.map((field) => {
                    const IconComp = (field as any).icon
                    return (
                      <div key={field.id} className="space-y-1.5">
                        <Label className={IconComp ? "flex items-center gap-1.5" : undefined}>
                          {IconComp && <IconComp className="size-3.5" />}
                          {field.label}
                        </Label>
                        {field.readOnly ? (
                          <p className="text-sm text-muted-foreground">{field.value || "—"}</p>
                        ) : (
                          field.editEl
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  {fieldsToShow.map((field) => {
                    const IconComp = (field as any).icon
                    return (
                      <div key={field.id} className="flex items-baseline gap-2 py-1 border-b border-border/20 last:border-0">
                        <span className="text-[12px] text-muted-foreground shrink-0 flex items-center gap-1">
                          {IconComp && <IconComp className="size-3" />}
                          {field.label}
                        </span>
                        <span className="text-[13px] font-medium ml-auto text-right">{field.value || "—"}</span>
                      </div>
                    )
                  })}
                </div>
              )}
              {!isEditing && hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllFields(!showAllFields)}
                  className="text-[11px] text-vox-primary hover:text-vox-primary/80 transition-colors font-medium mt-1"
                >
                  {showAllFields
                    ? "Ocultar campos vazios"
                    : `+ ${hiddenCount} campos`}
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
                  <div className="relative">
                    <Input value={address.zipCode ?? ""} onChange={(e) => setAddress(a => ({ ...a, zipCode: formatCep(e.target.value) }))} placeholder="CEP" />
                    {cepLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />}
                  </div>
                  <Input value={address.street ?? ""} onChange={(e) => setAddress(a => ({ ...a, street: e.target.value }))} placeholder="Rua" className="sm:col-span-2" />
                  <Input value={address.number ?? ""} onChange={(e) => setAddress(a => ({ ...a, number: e.target.value }))} placeholder="Numero" />
                  <Input value={address.complement ?? ""} onChange={(e) => setAddress(a => ({ ...a, complement: e.target.value }))} placeholder="Complemento" />
                  <Input value={address.neighborhood ?? ""} onChange={(e) => setAddress(a => ({ ...a, neighborhood: e.target.value }))} placeholder="Bairro" />
                  <Input value={address.city ?? ""} onChange={(e) => setAddress(a => ({ ...a, city: e.target.value }))} placeholder="Cidade" />
                  <Input value={address.state ?? ""} onChange={(e) => setAddress(a => ({ ...a, state: e.target.value }))} placeholder="UF" />
                </div>
              ) : (
                <p className="text-sm">
                  {hasAddress
                    ? [patient.address!.zipCode, patient.address!.street, patient.address!.number, patient.address!.complement, patient.address!.neighborhood, patient.address!.city, patient.address!.state].filter(Boolean).join(", ")
                    : "-"}
                </p>
              )}
            </div>
          )
        })()}

        {/* Insurance Data (structured) */}
        {(() => {
          const hasInsData = insuranceData && Object.values(insuranceData).some(v => v)
          if (!isEditing && !showAllFields && !hasInsData) return null
          return (
            <div className="rounded-lg border border-vox-primary/30 bg-vox-primary/5 p-3 space-y-2">
              <p className="text-sm font-medium text-vox-primary flex items-center gap-1.5">
                <Shield className="size-3.5" /> Dados do Convenio
              </p>
              {isEditing ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Numero da Carteira</p>
                    <Input
                      value={(insuranceData.cardNumber as string) ?? ""}
                      onChange={(e) => setInsuranceData({ ...insuranceData, cardNumber: e.target.value })}
                      placeholder="Numero da carteirinha"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Plano</p>
                    <Input
                      value={(insuranceData.planName as string) ?? ""}
                      onChange={(e) => setInsuranceData({ ...insuranceData, planName: e.target.value })}
                      placeholder="Nome do plano"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Validade da Carteira</p>
                    <Input
                      type="date"
                      value={(insuranceData.validUntil as string) ?? ""}
                      onChange={(e) => setInsuranceData({ ...insuranceData, validUntil: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Codigo do Plano</p>
                    <Input
                      value={(insuranceData.planCode as string) ?? ""}
                      onChange={(e) => setInsuranceData({ ...insuranceData, planCode: e.target.value })}
                      placeholder="Codigo (opcional)"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 text-sm">
                  {insuranceData.cardNumber ? (
                    <div>
                      <p className="text-xs text-muted-foreground">Carteira</p>
                      <p className="font-mono">{String(insuranceData.cardNumber)}</p>
                    </div>
                  ) : null}
                  {insuranceData.planName ? (
                    <div>
                      <p className="text-xs text-muted-foreground">Plano</p>
                      <p>{String(insuranceData.planName)}</p>
                    </div>
                  ) : null}
                  {insuranceData.validUntil ? (
                    <div>
                      <p className="text-xs text-muted-foreground">Validade</p>
                      <p>{new Date(String(insuranceData.validUntil)).toLocaleDateString("pt-BR")}</p>
                    </div>
                  ) : null}
                  {insuranceData.planCode ? (
                    <div>
                      <p className="text-xs text-muted-foreground">Codigo do Plano</p>
                      <p>{String(insuranceData.planCode)}</p>
                    </div>
                  ) : null}
                  {!hasInsData && <p className="text-xs text-muted-foreground">-</p>}
                </div>
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
                  {items.length === 0 && !isEditing && <span className="text-[11px] text-muted-foreground/60 italic">Não informado</span>}
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
              <p className="text-sm">{(medicalHistory.bloodType as string) || <span className="text-muted-foreground/60 italic text-[11px]">Não informado</span>}</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Observacoes Medicas</p>
            {isEditing ? (
              <Textarea value={(medicalHistory.notes as string) ?? ""} onChange={(e) => setMedicalHistory({ ...medicalHistory, notes: e.target.value || null })} placeholder="Observacoes gerais..." className="text-xs" rows={2} />
            ) : (
              <p className="text-sm">{(medicalHistory.notes as string) || <span className="text-muted-foreground/60 italic text-[11px]">Nenhuma observação</span>}</p>
            )}
          </div>
        </div>

        {/* Alerts */}
        <div className={`rounded-lg border p-3 space-y-1.5 ${alerts.length > 0 || isEditing ? "border-vox-error/30 bg-vox-error/5" : "border-border/30 bg-muted/20"}`}>
          <p className={`text-sm font-medium flex items-center gap-1.5 ${alerts.length > 0 || isEditing ? "text-vox-error" : "text-muted-foreground"}`}>
            <AlertTriangle className="size-3.5" />
            Alertas
          </p>
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

        {/* WhatsApp Consent */}
        <div className="flex items-center justify-between rounded-lg border border-border/40 p-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-4 text-green-600" />
            <div>
              <p className="text-sm font-medium">Autoriza receber mensagens via WhatsApp</p>
              {patient.whatsappConsentAt && whatsappConsent && (
                <p className="text-xs text-muted-foreground">
                  Autorizado em {new Date(patient.whatsappConsentAt).toLocaleDateString("pt-BR")}
                </p>
              )}
            </div>
          </div>
          <Switch
            checked={whatsappConsent}
            onCheckedChange={handleWhatsAppConsentToggle}
            disabled={consentLoading}
          />
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
    </div>
  )
}
