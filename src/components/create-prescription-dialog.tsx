"use client"

import { useState, useTransition, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { Pill, Plus, Trash2, Loader2, AlertTriangle, AlertCircle, Info } from "lucide-react"
import { createPrescription } from "@/server/actions/prescription"
import { checkDrugInteractions, type DrugInteractionResult } from "@/server/actions/drug-interaction"
import { toast } from "sonner"
import { friendlyError } from "@/lib/error-messages"
import { useRouter } from "next/navigation"

interface Medication {
  name: string
  dosage: string
  frequency: string
  duration: string
  notes: string
}

const emptyMedication: Medication = {
  name: "",
  dosage: "",
  frequency: "",
  duration: "",
  notes: "",
}

export function CreatePrescriptionButton({
  patientId,
  patientName,
}: {
  patientId: string
  patientName: string
  patientCpf?: string | null
  patientPhone?: string | null
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="outline" size="sm" className="gap-1.5" />}
      >
        <Pill className="size-3.5" />
        Prescrição
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Prescrição</DialogTitle>
          <DialogDescription>
            Paciente: <strong>{patientName}</strong>
          </DialogDescription>
        </DialogHeader>
        <CreatePrescriptionForm
          patientId={patientId}
          patientName={patientName}
          onClose={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function CreatePrescriptionForm({
  patientId,
  patientName,
  onClose,
}: {
  patientId: string
  patientName: string
  onClose: () => void
}) {
  const [medications, setMedications] = useState<Medication[]>([{ ...emptyMedication }])
  const [notes, setNotes] = useState("")
  const [saving, startSave] = useTransition()
  const [interactions, setInteractions] = useState<DrugInteractionResult[]>([])
  const [checkingInteractions, setCheckingInteractions] = useState(false)
  const [acknowledgedInteractions, setAcknowledgedInteractions] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  const hasGraveInteraction = interactions.some((i) => i.severity === "grave")

  // Check drug interactions when medications change (debounced)
  const checkInteractions = useCallback(async (meds: Medication[]) => {
    const names = meds.map((m) => m.name.trim()).filter(Boolean)
    if (names.length < 2) {
      setInteractions([])
      return
    }

    setCheckingInteractions(true)
    try {
      const result = await checkDrugInteractions(names)
      if ("error" in result) {
        // Silently fail — don't block the prescription flow
        setInteractions([])
        return
      }
      setInteractions(result.interactions)
      // Reset acknowledgment when interactions change
      if (result.interactions.some((i) => i.severity === "grave")) {
        setAcknowledgedInteractions(false)
      }
    } catch {
      setInteractions([])
    } finally {
      setCheckingInteractions(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      checkInteractions(medications)
    }, 800)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [medications, checkInteractions])

  const updateMedication = (index: number, field: keyof Medication, value: string) => {
    setMedications((prev) =>
      prev.map((med, i) => (i === index ? { ...med, [field]: value } : med))
    )
  }

  const addMedication = () => {
    setMedications((prev) => [...prev, { ...emptyMedication }])
  }

  const removeMedication = (index: number) => {
    if (medications.length <= 1) return
    setMedications((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = () => {
    const validMeds = medications.filter((m) => m.name.trim())
    if (validMeds.length === 0) {
      toast.error("Adicione pelo menos um medicamento")
      return
    }

    startSave(async () => {
      try {
        const result = await createPrescription({
          patientId,
          medications: validMeds,
          notes: notes.trim() || undefined,
        })
        if ('error' in result) { toast.error(result.error); return }
        toast.success("Prescrição criada com sucesso")
        onClose()
        window.open(`/prescriptions/${result.id}`, "_blank")
        router.refresh()
      } catch (e) {
        toast.error(friendlyError(e, "Erro ao criar prescricao"))
      }
    })
  }

  return (
    <div className="space-y-4">
        {/* Medications */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Medicamentos</Label>
          {medications.map((med, index) => (
            <div key={index} className="rounded-xl border border-border/60 p-3 space-y-2.5 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Medicamento {index + 1}
                </span>
                {medications.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeMedication(index)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Remover medicamento"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Nome do medicamento</Label>
                  <Input
                    placeholder="Ex: Amoxicilina 500mg"
                    value={med.name}
                    onChange={(e) => updateMedication(index, "name", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Posologia</Label>
                  <Input
                    placeholder="Ex: 1 comprimido"
                    value={med.dosage}
                    onChange={(e) => updateMedication(index, "dosage", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Frequência</Label>
                  <Input
                    placeholder="Ex: 8 em 8 horas"
                    value={med.frequency}
                    onChange={(e) => updateMedication(index, "frequency", e.target.value)}
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
              <div className="space-y-1">
                <Label className="text-xs">Observacoes</Label>
                <Input
                  placeholder="Ex: Tomar apos as refeicoes"
                  value={med.notes}
                  onChange={(e) => updateMedication(index, "notes", e.target.value)}
                />
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 w-full"
            onClick={addMedication}
          >
            <Plus className="size-3.5" />
            Adicionar medicamento
          </Button>
        </div>

        {/* General notes */}
        <div className="space-y-1.5">
          <Label className="text-sm">Observacoes gerais</Label>
          <Textarea
            placeholder="Observacoes adicionais sobre a prescricao..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        {/* Drug interaction alerts */}
        {(interactions.length > 0 || checkingInteractions) && (
          <div className="space-y-2">
            {checkingInteractions && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                <Loader2 className="size-3 animate-spin" />
                Verificando interacoes medicamentosas...
              </div>
            )}
            {interactions.map((ix, idx) => {
              const isGrave = ix.severity === "grave"
              const isModerada = ix.severity === "moderada"
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-2 rounded-xl border p-3 text-xs ${
                    isGrave
                      ? "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"
                      : isModerada
                        ? "border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-300"
                        : "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300"
                  }`}
                >
                  {isGrave ? (
                    <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  ) : isModerada ? (
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  ) : (
                    <Info className="size-4 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-semibold">
                      {isGrave ? "Interacao grave" : isModerada ? "Interacao moderada" : "Interacao leve"}:
                    </span>{" "}
                    {ix.drug1} + {ix.drug2} — {ix.description}
                  </div>
                </div>
              )
            })}
            {hasGraveInteraction && (
              <label className="flex items-center gap-2 cursor-pointer rounded-xl border border-red-300 bg-red-50/50 p-3 dark:border-red-800 dark:bg-red-950/20">
                <input
                  type="checkbox"
                  checked={acknowledgedInteractions}
                  onChange={(e) => setAcknowledgedInteractions(e.target.checked)}
                  className="size-4 rounded accent-red-600"
                />
                <span className="text-xs font-medium text-red-800 dark:text-red-300">
                  Ciente das interacoes graves detectadas
                </span>
              </label>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={saving}
            onClick={handleSubmit}
            className="bg-vox-primary text-white hover:bg-vox-primary/90 gap-1.5"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Pill className="size-3.5" />}
            Criar e imprimir
          </Button>
        </div>
    </div>
  )
}
