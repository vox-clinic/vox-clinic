"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { getWorkspaceProcedures } from "@/server/actions/financial"
import { createQuote } from "@/server/actions/quote"
import { Odontogram, type ToothFace } from "@/components/odontogram"
import type { Procedure } from "@/types"

interface QuoteItem {
  procedureId?: string
  procedureName: string
  tooth: string
  faces: string
  unitPrice: number
  discount: number
}

const PAYMENT_METHODS = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "credito", label: "Cartão de crédito" },
  { value: "debito", label: "Cartão de débito" },
  { value: "boleto", label: "Boleto" },
  { value: "convenio", label: "Convênio" },
  { value: "transferencia", label: "Transferência" },
]

function formatCurrency(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function centavosToDisplay(centavos: number): string {
  if (!centavos) return ""
  return (centavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })
}

function CurrencyInput({
  value,
  onChange,
  placeholder = "0,00",
  className = "",
}: {
  value: number
  onChange: (centavos: number) => void
  placeholder?: string
  className?: string
}) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "")
    onChange(parseInt(digits || "0", 10))
  }

  return (
    <div className={`relative ${className}`}>
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
      <Input
        value={centavosToDisplay(value)}
        onChange={handleChange}
        placeholder={placeholder}
        inputMode="numeric"
        className="pl-8 rounded-lg text-xs h-8"
      />
    </div>
  )
}

export function QuoteFormDialog({
  patientId,
  prefillProcedures,
  onClose,
  onSaved,
}: {
  patientId: string
  prefillProcedures?: Array<{ name: string; tooth?: string }>
  onClose: () => void
  onSaved: () => void
}) {
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [items, setItems] = useState<QuoteItem[]>([])
  const [prefilled, setPrefilled] = useState(false)
  const [search, setSearch] = useState("")
  const [showPicker, setShowPicker] = useState(false)
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null)
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([])
  const [faceSelections, setFaceSelections] = useState<Record<string, ToothFace[]>>({})
  const [globalDiscount, setGlobalDiscount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getWorkspaceProcedures().then((procs) => {
      setProcedures(procs)
      if (prefillProcedures?.length && !prefilled) {
        const newItems: QuoteItem[] = []
        for (const pf of prefillProcedures) {
          const match = procs.find((p) =>
            p.name.toLowerCase().includes(pf.name.toLowerCase()) ||
            pf.name.toLowerCase().includes(p.name.toLowerCase())
          )
          newItems.push({
            procedureId: match?.id,
            procedureName: match?.name ?? pf.name,
            tooth: pf.tooth ?? "",
            faces: "",
            unitPrice: match?.price ?? 0,
            discount: 0,
          })
        }
        setItems(newItems)
        setPrefilled(true)
      }
    }).catch(() => {})
  }, [prefillProcedures, prefilled])

  const filteredProcedures = procedures.filter(
    (p) => !search || p.name.toLowerCase().includes(search.toLowerCase())
  )

  function selectProcedure(proc: Procedure) {
    setSelectedProcedure(proc)
    setSelectedTeeth([])
    setFaceSelections({})
    setSearch("")
    setShowPicker(false)
  }

  function handleToggleTooth(tooth: number) {
    setSelectedTeeth((prev) =>
      prev.includes(tooth) ? prev.filter((t) => t !== tooth) : [...prev, tooth]
    )
  }

  function handleToggleFace(tooth: number, face: ToothFace) {
    setFaceSelections((prev) => {
      const key = String(tooth)
      const current = prev[key] ?? []
      return {
        ...prev,
        [key]: current.includes(face)
          ? current.filter((f) => f !== face)
          : [...current, face],
      }
    })
  }

  function addSelectedToQuote() {
    if (!selectedProcedure) return

    if (selectedTeeth.length === 0) {
      setItems((prev) => [
        ...prev,
        {
          procedureId: selectedProcedure.id,
          procedureName: selectedProcedure.name,
          tooth: "",
          faces: "",
          unitPrice: selectedProcedure.price ?? 0,
          discount: 0,
        },
      ])
    } else {
      const newItems = selectedTeeth.map((tooth) => ({
        procedureId: selectedProcedure.id,
        procedureName: selectedProcedure.name,
        tooth: String(tooth),
        faces: (faceSelections[String(tooth)] ?? []).join(","),
        unitPrice: selectedProcedure.price ?? 0,
        discount: 0,
      }))
      setItems((prev) => [...prev, ...newItems])
    }

    setSelectedProcedure(null)
    setSelectedTeeth([])
    setFaceSelections({})
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function toggleToothForProcedure(procName: string, tooth: number) {
    const toothStr = String(tooth)
    const existingIdx = items.findIndex((i) => i.procedureName === procName && i.tooth === toothStr)
    if (existingIdx >= 0) {
      setItems((prev) => prev.filter((_, i) => i !== existingIdx))
    } else {
      const ref = items.find((i) => i.procedureName === procName)
      setItems((prev) => [...prev, {
        procedureId: ref?.procedureId,
        procedureName: procName,
        tooth: toothStr,
        faces: "",
        unitPrice: ref?.unitPrice ?? 0,
        discount: 0,
      }])
    }
  }

  function getSelectedTeethForProcedure(procName: string): number[] {
    return items
      .filter((i) => i.procedureName === procName && i.tooth)
      .map((i) => parseInt(i.tooth, 10))
      .filter((n) => !isNaN(n))
  }

  function updateItem(index: number, field: keyof QuoteItem, value: string | number) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
  }

  const totalAmount = items.reduce((sum, i) => sum + (i.unitPrice - i.discount), 0)
  const finalAmount = Math.max(0, totalAmount - globalDiscount)

  const groupedItems = items.reduce<Record<string, { procedure: string; indices: number[] }>>((acc, item, i) => {
    const key = item.procedureName
    if (!acc[key]) acc[key] = { procedure: key, indices: [] }
    acc[key].indices.push(i)
    return acc
  }, {})

  async function handleSave() {
    if (items.length === 0) { toast.error("Adicione pelo menos um procedimento"); return }
    setSaving(true)
    try {
      const result = await createQuote({
        patientId,
        items: items.map((i) => ({
          procedureId: i.procedureId,
          procedureName: i.procedureName,
          tooth: i.tooth ? `${i.tooth}${i.faces ? ` (${i.faces})` : ""}` : undefined,
          unitPrice: i.unitPrice,
          discount: i.discount || undefined,
        })),
        discountAmount: globalDiscount || undefined,
        paymentMethod: paymentMethod || undefined,
        notes: notes || undefined,
      })
      if ("error" in result) { toast.error(result.error); return }
      toast.success("Orçamento criado")
      onSaved()
    } catch {
      toast.error("Erro ao criar orçamento")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" showCloseButton>
        <DialogHeader>
          <DialogTitle>Novo Orçamento</DialogTitle>
          <DialogDescription>Selecione procedimentos e dentes para o orçamento.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Step 1: Procedure picker */}
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">1. Selecione o procedimento</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar procedimento..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setShowPicker(true) }}
                onFocus={() => setShowPicker(true)}
                onBlur={() => setTimeout(() => setShowPicker(false), 200)}
                className="pl-9 rounded-xl text-sm"
              />
              {showPicker && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border/60 rounded-xl shadow-lg z-10 overflow-hidden max-h-[240px] overflow-y-auto">
                  {filteredProcedures.length > 0 ? (
                    filteredProcedures.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => selectProcedure(p)}
                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted/60 transition-colors flex justify-between items-center border-b border-border/10 last:border-0"
                      >
                        <div>
                          <span className="font-medium">{p.name}</span>
                          {p.category && <span className="text-[10px] text-muted-foreground ml-2">{p.category}</span>}
                        </div>
                        <span className="text-xs font-medium text-vox-primary">
                          {p.price ? formatCurrency(p.price) : "—"}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-center text-sm text-muted-foreground">
                      Nenhum procedimento encontrado.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Odontogram */}
          {selectedProcedure && (
            <div className="rounded-xl border border-vox-primary/30 bg-vox-primary/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-vox-primary">{selectedProcedure.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {selectedProcedure.price ? formatCurrency(selectedProcedure.price) : "Sem preço"}
                  </span>
                </div>
                <button
                  onClick={() => { setSelectedProcedure(null); setSelectedTeeth([]) }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancelar
                </button>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-2 block">
                  2. Selecione os dentes (opcional — clique nos dentes)
                </Label>
                <div className="overflow-x-auto pb-2">
                  <Odontogram
                    selectedTeeth={selectedTeeth}
                    onToggleTooth={handleToggleTooth}
                    showFaces
                    faceSelections={faceSelections}
                    onToggleFace={handleToggleFace}
                  />
                </div>
                {selectedTeeth.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {selectedTeeth.length} {selectedTeeth.length === 1 ? "dente selecionado" : "dentes selecionados"}: {selectedTeeth.sort((a, b) => a - b).join(", ")}
                    {" · "}Cada dente = 1 item no orçamento
                  </p>
                )}
              </div>

              <Button
                onClick={addSelectedToQuote}
                className="w-full rounded-xl bg-vox-primary hover:bg-vox-primary/90 text-white"
              >
                <Plus className="size-3.5" />
                Adicionar {selectedTeeth.length > 0
                  ? `${selectedTeeth.length} ${selectedTeeth.length === 1 ? "item" : "itens"}`
                  : "sem dente"}
              </Button>
            </div>
          )}

          {/* Items grouped by procedure */}
          {items.length > 0 && (
            <div className="space-y-3">
              <Label className="text-xs font-semibold block">Itens do orçamento</Label>
              {Object.entries(groupedItems).map(([procName, group]) => (
                <div key={procName} className="rounded-xl border border-border/40 overflow-hidden">
                  <div className="flex items-center justify-between bg-muted/30 px-3 py-2">
                    <span className="text-sm font-semibold">
                      {procName}
                      <span className="text-xs font-normal text-muted-foreground ml-1.5">
                        (x{group.indices.length})
                      </span>
                    </span>
                    <span className="text-xs font-medium text-vox-primary">
                      {formatCurrency(group.indices.reduce((s, i) => s + items[i].unitPrice - items[i].discount, 0))}
                    </span>
                  </div>
                  <div className="px-3 py-3 border-b border-border/20">
                    <p className="text-[10px] text-muted-foreground mb-2">Clique nos dentes para adicionar/remover</p>
                    <div className="overflow-x-auto">
                      <Odontogram
                        selectedTeeth={getSelectedTeethForProcedure(procName)}
                        onToggleTooth={(tooth) => toggleToothForProcedure(procName, tooth)}
                      />
                    </div>
                  </div>
                  <div className="divide-y divide-border/20">
                    {group.indices.map((idx) => {
                      const item = items[idx]
                      return (
                        <div key={idx} className="flex items-center gap-2 px-3 py-2">
                          <input
                            value={item.tooth}
                            onChange={(e) => updateItem(idx, "tooth", e.target.value)}
                            placeholder="—"
                            className="w-10 text-center text-xs bg-muted px-1 py-0.5 rounded font-mono shrink-0 border-0 outline-none focus:ring-1 focus:ring-vox-primary/50"
                            title="Dente (FDI)"
                          />
                          <div className="flex-1 flex items-center gap-2">
                            <CurrencyInput
                              value={item.unitPrice}
                              onChange={(v) => updateItem(idx, "unitPrice", v)}
                              className="flex-1"
                            />
                            <CurrencyInput
                              value={item.discount}
                              onChange={(v) => updateItem(idx, "discount", v)}
                              placeholder="Desc."
                              className="w-24"
                            />
                          </div>
                          <button onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-vox-error transition-colors p-1 shrink-0">
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          {items.length > 0 && (
            <div className="rounded-xl bg-muted/30 p-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Subtotal ({items.length} {items.length === 1 ? "item" : "itens"})</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label className="text-xs text-muted-foreground shrink-0">Desconto global</Label>
                <CurrencyInput
                  value={globalDiscount}
                  onChange={setGlobalDiscount}
                  className="w-32"
                />
              </div>
              <div className="flex justify-between text-base font-bold pt-1 border-t border-border/20">
                <span>Total</span>
                <span className="text-vox-primary">{formatCurrency(finalAmount)}</span>
              </div>
            </div>
          )}

          {/* Payment method */}
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Forma de pagamento</Label>
            <div className="flex flex-wrap gap-1.5">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setPaymentMethod(paymentMethod === m.value ? "" : m.value)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs transition-all ${
                    paymentMethod === m.value
                      ? "border-vox-primary bg-vox-primary/10 text-vox-primary font-medium"
                      : "border-border/40 text-muted-foreground hover:border-vox-primary/30"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações do orçamento..."
              className="rounded-xl text-sm min-h-[60px]"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={items.length === 0 || saving}
              className="flex-1 rounded-xl bg-vox-primary hover:bg-vox-primary/90 text-white"
            >
              {saving ? "Salvando..." : "Salvar Rascunho"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
