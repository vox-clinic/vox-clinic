"use client"

import { useState, useEffect, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Search } from "lucide-react"
import { searchPatients } from "@/server/actions/patient"
import { createCharge } from "@/server/actions/receivable"
import { toast } from "sonner"

const formatBRL = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

function parseBRL(value: string): number {
  // Handle Brazilian format: "1.234,56" or "1234,56" or "1234.56"
  const cleaned = value.replace(/\./g, '').replace(',', '.')
  return parseFloat(cleaned) || 0
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  defaultPatientId?: string
  defaultPatientName?: string
}

export function CreateChargeDialog({ open, onOpenChange, onSuccess, defaultPatientId, defaultPatientName }: Props) {
  const [isPending, startTransition] = useTransition()

  // Patient search
  const [patientQuery, setPatientQuery] = useState(defaultPatientName ?? "")
  const [patientResults, setPatientResults] = useState<{ id: string; name: string }[]>([])
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; name: string } | null>(
    defaultPatientId && defaultPatientName ? { id: defaultPatientId, name: defaultPatientName } : null
  )
  const [showResults, setShowResults] = useState(false)
  const [searching, setSearching] = useState(false)

  // Form fields
  const [description, setDescription] = useState("")
  const [totalAmountStr, setTotalAmountStr] = useState("")
  const [discountStr, setDiscountStr] = useState("")
  const [installments, setInstallments] = useState("1")
  const [firstDueDate, setFirstDueDate] = useState(() => {
    const d = new Date()
    return d.toISOString().split("T")[0]
  })
  const [notes, setNotes] = useState("")

  // Debounced patient search
  useEffect(() => {
    if (!patientQuery.trim() || selectedPatient) {
      setPatientResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const results = await searchPatients(patientQuery)
        setPatientResults(results.map((r) => ({ id: r.id, name: r.name })))
        setShowResults(true)
      } catch (err) {
        console.error("[CreateCharge] patient search failed", err)
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [patientQuery, selectedPatient])

  // Reset form on close
  useEffect(() => {
    if (!open) {
      if (!defaultPatientId) {
        setPatientQuery("")
        setSelectedPatient(null)
      }
      setDescription("")
      setTotalAmountStr("")
      setDiscountStr("")
      setInstallments("1")
      setFirstDueDate(new Date().toISOString().split("T")[0])
      setNotes("")
      setPatientResults([])
      setShowResults(false)
    }
  }, [open, defaultPatientId])

  // Calculations
  const totalCentavos = Math.round(parseBRL(totalAmountStr || "0") * 100)
  const discountCentavos = Math.round(parseBRL(discountStr || "0") * 100)
  const netCentavos = Math.max(0, totalCentavos - discountCentavos)
  const installmentCount = parseInt(installments, 10) || 1
  const baseInstallment = Math.floor(netCentavos / installmentCount)
  const firstInstallment = baseInstallment + (netCentavos - baseInstallment * installmentCount)

  const canSubmit = selectedPatient && description.trim() && totalCentavos > 0 && discountCentavos <= totalCentavos

  function handleSubmit() {
    if (!canSubmit || !selectedPatient) return

    startTransition(async () => {
      try {
        await createCharge({
          patientId: selectedPatient.id,
          description: description.trim(),
          totalAmount: totalCentavos,
          discount: discountCentavos,
          installments: installmentCount,
          firstDueDate,
          notes: notes.trim() || undefined,
        })
        toast.success("Cobranca criada com sucesso")
        onOpenChange(false)
        onSuccess()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao criar cobranca")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Cobranca</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Patient Search */}
          <div className="space-y-1.5">
            <Label>Paciente</Label>
            {selectedPatient ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{selectedPatient.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => {
                    setSelectedPatient(null)
                    setPatientQuery("")
                  }}
                >
                  Alterar
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar paciente..."
                  value={patientQuery}
                  onChange={(e) => {
                    setPatientQuery(e.target.value)
                    setSelectedPatient(null)
                  }}
                  onFocus={() => patientResults.length > 0 && setShowResults(true)}
                  onBlur={() => setTimeout(() => setShowResults(false), 200)}
                  className="pl-9"
                />
                {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />}
                {showResults && patientResults.length > 0 && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 rounded-xl border bg-background shadow-md max-h-40 overflow-y-auto">
                    {patientResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted/60 transition-colors"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setSelectedPatient(p)
                          setPatientQuery(p.name)
                          setShowResults(false)
                        }}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Descricao</Label>
            <Input
              placeholder="Ex: Consulta + Limpeza"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Amount + Discount row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Valor Total (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={totalAmountStr}
                onChange={(e) => setTotalAmountStr(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Desconto (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={discountStr}
                onChange={(e) => setDiscountStr(e.target.value)}
              />
            </div>
          </div>

          {/* Installments + Due Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Parcelas</Label>
              <Select value={installments} onValueChange={(v) => v && setInstallments(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {i + 1}x
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Primeiro Vencimento</Label>
              <Input
                type="date"
                value={firstDueDate}
                onChange={(e) => setFirstDueDate(e.target.value)}
              />
            </div>
          </div>

          {/* Preview */}
          {totalCentavos > 0 && (
            <div className="rounded-xl bg-muted/40 px-3 py-2.5 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Resumo</p>
              <div className="flex justify-between text-sm">
                <span>Valor liquido</span>
                <span className="font-medium tabular-nums">{formatBRL(netCentavos)}</span>
              </div>
              {installmentCount > 1 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span>1a parcela</span>
                    <span className="tabular-nums">{formatBRL(firstInstallment)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Demais parcelas ({installmentCount - 1}x)</span>
                    <span className="tabular-nums">{formatBRL(baseInstallment)}</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Observacoes (opcional)</Label>
            <Textarea
              placeholder="Anotacoes sobre a cobranca..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || isPending}
              className="bg-vox-primary hover:bg-vox-primary/90 gap-1.5"
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Criar Cobranca
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
