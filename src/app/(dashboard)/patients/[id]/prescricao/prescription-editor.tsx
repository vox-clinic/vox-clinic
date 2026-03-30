"use client"

import { useState, useTransition, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ChevronLeft,
  Plus,
  Trash2,
  Loader2,
  AlertTriangle,
  Save,
  FileSignature,
  Pill,
  GripVertical,
} from "lucide-react"
import { createPrescription, updatePrescription, signPrescription } from "@/server/actions/prescription"
import { upsertMedicationFavorite } from "@/server/actions/medication"
import { toast } from "sonner"
import { friendlyError } from "@/lib/error-messages"
import { MedicationAutocomplete, type MedicationResult, type MedicationFavoriteItem } from "@/components/medication-autocomplete"
import { PrescriptionTemplatePicker } from "@/components/prescription-template-picker"

// ---------- Types ----------

interface MedicationItem {
  name: string
  concentration: string
  pharmaceuticalForm: string
  administrationRoute: string
  quantity: string
  dosage: string
  duration: string
  notes: string
}

const emptyMedication: MedicationItem = {
  name: "",
  concentration: "",
  pharmaceuticalForm: "",
  administrationRoute: "",
  quantity: "",
  dosage: "",
  duration: "",
  notes: "",
}

const PHARMACEUTICAL_FORMS = [
  { value: "comprimido", label: "Comprimido" },
  { value: "capsula", label: "Capsula" },
  { value: "solucao_oral", label: "Solucao oral" },
  { value: "pomada", label: "Pomada" },
  { value: "creme", label: "Creme" },
  { value: "injecao", label: "Injecao" },
  { value: "gotas", label: "Gotas" },
  { value: "spray", label: "Spray" },
]

const ADMINISTRATION_ROUTES = [
  { value: "oral", label: "Oral" },
  { value: "topica", label: "Topica" },
  { value: "intramuscular", label: "Intramuscular" },
  { value: "intravenosa", label: "Intravenosa" },
  { value: "subcutanea", label: "Subcutanea" },
  { value: "retal", label: "Retal" },
  { value: "oftalmica", label: "Oftalmica" },
  { value: "nasal", label: "Nasal" },
]

const PRESCRIPTION_TYPES = [
  { value: "simple", label: "Receita simples" },
  { value: "special_control", label: "Controle especial" },
  { value: "antimicrobial", label: "Antimicrobiano" },
  { value: "manipulated", label: "Manipulado" },
]

// ---------- Props ----------

interface PrescriptionEditorProps {
  patientId: string
  patientName: string
  patientDocument: string | null
  patientAlerts: string[]
  favorites: MedicationFavoriteItem[]
}

// ---------- Component ----------

export function PrescriptionEditor({
  patientId,
  patientName,
  patientDocument,
  patientAlerts,
  favorites,
}: PrescriptionEditorProps) {
  const router = useRouter()

  // State
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null)
  const [prescriptionType, setPrescriptionType] = useState("simple")
  const [medications, setMedications] = useState<MedicationItem[]>([{ ...emptyMedication }])
  const [generalNotes, setGeneralNotes] = useState("")
  const [saving, startSave] = useTransition()
  const [signing, startSign] = useTransition()

  // Auto-save tracking
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Mark changes
  useEffect(() => {
    setHasUnsavedChanges(true)
  }, [medications, generalNotes, prescriptionType])

  // ---------- Auto-save every 30 seconds ----------

  useEffect(() => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setInterval(() => {
      if (hasUnsavedChanges) {
        saveDraft(true)
      }
    }, 30000) as unknown as ReturnType<typeof setTimeout>
    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnsavedChanges, prescriptionId, medications, generalNotes, prescriptionType])

  // ---------- Medication helpers ----------

  function updateMedication(index: number, field: keyof MedicationItem, value: string) {
    setMedications((prev) =>
      prev.map((med, i) => (i === index ? { ...med, [field]: value } : med))
    )
  }

  function addMedication() {
    setMedications((prev) => [...prev, { ...emptyMedication }])
  }

  function removeMedication(index: number) {
    if (medications.length <= 1) return
    setMedications((prev) => prev.filter((_, i) => i !== index))
  }

  function handleMedicationSelect(index: number, result: MedicationResult | null) {
    if (!result) return
    setMedications((prev) =>
      prev.map((med, i) => {
        if (i !== index) return med
        return {
          ...med,
          name: result.name,
          concentration: result.concentration ?? "",
          pharmaceuticalForm: result.pharmaceuticalForm?.toLowerCase() ?? "",
        }
      })
    )
    // Upsert favorite (fire and forget)
    upsertMedicationFavorite({
      medicationName: result.name,
      activeIngredient: result.activeIngredient ?? undefined,
    }).catch(() => {})
  }

  function handleTemplateApply(
    items: { name: string; dosage: string; frequency: string; duration: string; instructions?: string }[],
    notes: string | null
  ) {
    const newMeds: MedicationItem[] = items.map((item) => ({
      name: item.name,
      concentration: "",
      pharmaceuticalForm: "",
      administrationRoute: "",
      quantity: "",
      dosage: item.frequency ? `${item.dosage}, ${item.frequency}` : item.dosage,
      duration: item.duration,
      notes: item.instructions ?? "",
    }))
    setMedications(newMeds.length > 0 ? newMeds : [{ ...emptyMedication }])
    if (notes) setGeneralNotes(notes)
    toast.success("Template aplicado")
  }

  // ---------- Build payload for server action ----------

  function buildPayload() {
    const validMeds = medications.filter((m) => m.name.trim())
    if (validMeds.length === 0) {
      toast.error("Adicione pelo menos um medicamento")
      return null
    }

    return {
      medications: validMeds.map((m) => ({
        name: m.name.trim(),
        dosage: [m.concentration, m.pharmaceuticalForm, m.administrationRoute, m.quantity, m.dosage]
          .filter(Boolean)
          .join(" | ") || "-",
        frequency: m.dosage || "-",
        duration: m.duration || "-",
        notes: m.notes || undefined,
      })),
      notes: generalNotes.trim() || undefined,
      type: prescriptionType,
    }
  }

  // ---------- Save draft ----------

  function saveDraft(silent = false) {
    const payload = buildPayload()
    if (!payload) return

    startSave(async () => {
      try {
        if (prescriptionId) {
          const result = await updatePrescription({
            prescriptionId,
            ...payload,
          })
          if ("error" in result) {
            if (!silent) toast.error(result.error)
            return
          }
        } else {
          const result = await createPrescription({
            patientId,
            medications: payload.medications,
            notes: payload.notes,
          })
          if ("error" in result) {
            if (!silent) toast.error(result.error)
            return
          }
          setPrescriptionId(result.id)
        }
        setHasUnsavedChanges(false)
        setLastSavedAt(new Date())
        if (!silent) toast.success("Rascunho salvo")
      } catch (e) {
        if (!silent) toast.error(friendlyError(e, "Erro ao salvar rascunho"))
      }
    })
  }

  // ---------- Sign and finalize ----------

  function handleSign() {
    const payload = buildPayload()
    if (!payload) return

    startSign(async () => {
      try {
        // Create or update first
        let id = prescriptionId
        if (id) {
          const updateResult = await updatePrescription({ prescriptionId: id, ...payload })
          if ("error" in updateResult) { toast.error(updateResult.error); return }
        } else {
          const createResult = await createPrescription({
            patientId,
            medications: payload.medications,
            notes: payload.notes,
          })
          if ("error" in createResult) { toast.error(createResult.error); return }
          id = createResult.id
        }

        // Then sign
        const signResult = await signPrescription(id!)
        if ("error" in signResult) { toast.error(signResult.error); return }

        toast.success("Prescrição assinada com sucesso")
        router.push(`/prescriptions/${id}`)
      } catch (e) {
        toast.error(friendlyError(e, "Erro ao assinar prescricao"))
      }
    })
  }

  // ---------- Render ----------

  return (
    <div className="min-h-screen">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/patients/${patientId}`}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="size-3.5" />
              Voltar para {patientName}
            </Link>
            {patientAlerts.length > 0 && (
              <div className="flex gap-1">
                {patientAlerts.map((alert, i) => (
                  <Badge key={i} variant="destructive" className="text-[10px]">
                    <AlertTriangle className="size-2.5 mr-0.5" />
                    {alert}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Select value={prescriptionType} onValueChange={(v) => v && setPrescriptionType(v)}>
              <SelectTrigger className="h-9 w-[200px] rounded-xl text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESCRIPTION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="text-xs">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {lastSavedAt && (
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                Salvo {lastSavedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-xl"
              disabled={saving}
              onClick={() => saveDraft(false)}
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              Salvar rascunho
            </Button>

            <Button
              size="sm"
              className="gap-1.5 rounded-xl bg-vox-primary text-white hover:bg-vox-primary/90"
              disabled={signing}
              onClick={handleSign}
            >
              {signing ? <Loader2 className="size-3.5 animate-spin" /> : <FileSignature className="size-3.5" />}
              Assinar e finalizar
            </Button>
          </div>
        </div>
      </header>

      {/* Split view */}
      <div className="grid grid-cols-1 gap-5 p-4 lg:grid-cols-5">
        {/* Left column: Medication list (60%) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Template picker */}
          <PrescriptionTemplatePicker onApply={handleTemplateApply} />

          {/* Add medication via autocomplete */}
          <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-3">
            <Label className="text-sm font-medium">Adicionar medicamento</Label>
            <MedicationAutocomplete
              value={null}
              onChange={(result) => {
                if (!result) return
                // If the last medication is empty, fill it; otherwise add new
                const lastIdx = medications.length - 1
                const lastMed = medications[lastIdx]
                if (lastMed && !lastMed.name.trim()) {
                  handleMedicationSelect(lastIdx, result)
                } else {
                  const newMed: MedicationItem = {
                    ...emptyMedication,
                    name: result.name,
                    concentration: result.concentration ?? "",
                    pharmaceuticalForm: result.pharmaceuticalForm?.toLowerCase() ?? "",
                  }
                  setMedications((prev) => [...prev, newMed])
                  upsertMedicationFavorite({
                    medicationName: result.name,
                    activeIngredient: result.activeIngredient ?? undefined,
                  }).catch(() => {})
                }
              }}
              favorites={favorites}
              placeholder="Buscar medicamento para adicionar..."
            />
          </div>

          {/* Medication cards */}
          <div className="space-y-3">
            {medications.map((med, index) => (
              <div
                key={index}
                className="rounded-2xl border border-border/40 bg-card p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="size-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">
                      Medicamento {index + 1}
                    </span>
                  </div>
                  {medications.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeMedication(index)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>

                {/* Medication name */}
                <div className="space-y-1">
                  <Label className="text-xs">Nome do medicamento</Label>
                  <Input
                    placeholder="Ex: Amoxicilina"
                    value={med.name}
                    onChange={(e) => updateMedication(index, "name", e.target.value)}
                    className="font-medium"
                  />
                </div>

                {/* 2-column grid of fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Concentracao</Label>
                    <Input
                      placeholder="Ex: 500mg"
                      value={med.concentration}
                      onChange={(e) => updateMedication(index, "concentration", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Forma farmaceutica</Label>
                    <Select
                      value={med.pharmaceuticalForm}
                      onValueChange={(v) => v && updateMedication(index, "pharmaceuticalForm", v)}
                    >
                      <SelectTrigger className="h-10 rounded-xl text-xs">
                        <SelectValue placeholder="Selecionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {PHARMACEUTICAL_FORMS.map((f) => (
                          <SelectItem key={f.value} value={f.value} className="text-xs">
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Via de administracao</Label>
                    <Select
                      value={med.administrationRoute}
                      onValueChange={(v) => v && updateMedication(index, "administrationRoute", v)}
                    >
                      <SelectTrigger className="h-10 rounded-xl text-xs">
                        <SelectValue placeholder="Selecionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {ADMINISTRATION_ROUTES.map((r) => (
                          <SelectItem key={r.value} value={r.value} className="text-xs">
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Quantidade</Label>
                    <Input
                      placeholder="Ex: 1 caixa com 20 comprimidos"
                      value={med.quantity}
                      onChange={(e) => updateMedication(index, "quantity", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Posologia</Label>
                    <Input
                      placeholder="Ex: 1 comprimido de 8 em 8 horas"
                      value={med.dosage}
                      onChange={(e) => updateMedication(index, "dosage", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Duracao</Label>
                    <Input
                      placeholder="Ex: 7 dias"
                      value={med.duration}
                      onChange={(e) => updateMedication(index, "duration", e.target.value)}
                    />
                  </div>
                </div>

                {/* Instructions textarea */}
                <div className="space-y-1">
                  <Label className="text-xs">Instrucoes</Label>
                  <Textarea
                    placeholder="Ex: Tomar apos as refeicoes"
                    value={med.notes}
                    onChange={(e) => updateMedication(index, "notes", e.target.value)}
                    rows={2}
                    className="text-xs"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Add medication button */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 w-full rounded-xl"
            onClick={addMedication}
          >
            <Plus className="size-3.5" />
            Adicionar medicamento
          </Button>
        </div>

        {/* Right column: Live preview (40%) */}
        <div className="lg:col-span-2">
          <div className="sticky top-20 space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Pre-visualizacao</h3>
            <div className="rounded-2xl border border-border/40 bg-white dark:bg-card shadow-sm">
              {/* A4-style preview */}
              <div className="p-6 space-y-5 text-xs text-foreground" style={{ minHeight: 500 }}>
                {/* Clinic header */}
                <div className="text-center border-b border-border/40 pb-4">
                  <p className="text-sm font-semibold">Clínica</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {PRESCRIPTION_TYPES.find((t) => t.value === prescriptionType)?.label ?? "Receita simples"}
                  </p>
                </div>

                {/* Patient info */}
                <div className="space-y-1">
                  <p>
                    <span className="font-medium">Paciente:</span> {patientName}
                  </p>
                  {patientDocument && (
                    <p>
                      <span className="font-medium">CPF:</span> {patientDocument}
                    </p>
                  )}
                  <p>
                    <span className="font-medium">Data:</span>{" "}
                    {new Date().toLocaleDateString("pt-BR")}
                  </p>
                </div>

                {/* Medications list */}
                <div className="space-y-3">
                  {medications
                    .filter((m) => m.name.trim())
                    .map((med, index) => (
                      <div key={index} className="space-y-0.5">
                        <p className="font-medium">
                          {index + 1}. {med.name}
                          {med.concentration ? ` ${med.concentration}` : ""}
                          {med.pharmaceuticalForm
                            ? ` - ${PHARMACEUTICAL_FORMS.find((f) => f.value === med.pharmaceuticalForm)?.label ?? med.pharmaceuticalForm}`
                            : ""}
                        </p>
                        {med.quantity && (
                          <p className="text-muted-foreground pl-4">Quantidade: {med.quantity}</p>
                        )}
                        {med.dosage && (
                          <p className="text-muted-foreground pl-4">Posologia: {med.dosage}</p>
                        )}
                        {med.administrationRoute && (
                          <p className="text-muted-foreground pl-4">
                            Via: {ADMINISTRATION_ROUTES.find((r) => r.value === med.administrationRoute)?.label ?? med.administrationRoute}
                          </p>
                        )}
                        {med.duration && (
                          <p className="text-muted-foreground pl-4">Duracao: {med.duration}</p>
                        )}
                        {med.notes && (
                          <p className="text-muted-foreground pl-4 italic">{med.notes}</p>
                        )}
                      </div>
                    ))}
                  {medications.filter((m) => m.name.trim()).length === 0 && (
                    <p className="text-muted-foreground italic text-center py-6">
                      Adicione medicamentos para visualizar a prescricao
                    </p>
                  )}
                </div>

                {/* General notes */}
                {generalNotes.trim() && (
                  <div className="border-t border-border/40 pt-3">
                    <p className="font-medium">Observacoes:</p>
                    <p className="text-muted-foreground whitespace-pre-wrap">{generalNotes}</p>
                  </div>
                )}

                {/* Signature block */}
                <div className="border-t border-border/40 pt-8 mt-8 text-center space-y-1">
                  <div className="mx-auto w-48 border-t border-foreground" />
                  <p className="font-medium">Assinatura do profissional</p>
                </div>
              </div>
            </div>

            {/* General notes textarea */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Observacoes gerais</Label>
              <Textarea
                placeholder="Observacoes adicionais sobre a prescricao..."
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
