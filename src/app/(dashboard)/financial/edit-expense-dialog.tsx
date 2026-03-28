"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { friendlyError } from "@/lib/error-messages"
import { updateExpense } from "@/server/actions/expense"

const PAYMENT_METHODS = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "credito", label: "Credito" },
  { value: "debito", label: "Debito" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferencia" },
  { value: "outro", label: "Outro" },
]

interface EditExpenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense: {
    id: string
    description: string
    amount: number // centavos
    categoryId: string | null
    dueDate: string | Date
    paymentMethod: string | null
    notes: string | null
    category?: { id: string; name: string; icon: string | null; color: string | null } | null
  } | null
  categories: Array<{
    id: string
    name: string
    icon: string | null
    color: string | null
  }>
  onSaved: () => void
}

export default function EditExpenseDialog({
  open,
  onOpenChange,
  expense,
  categories,
  onSaved,
}: EditExpenseDialogProps) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    description: "",
    amount: "",
    categoryId: "",
    dueDate: "",
    paymentMethod: "",
    notes: "",
  })

  // Pre-fill form when expense changes
  useEffect(() => {
    if (expense) {
      const dueDateStr =
        typeof expense.dueDate === "string"
          ? expense.dueDate.split("T")[0]
          : expense.dueDate instanceof Date
            ? expense.dueDate.toISOString().split("T")[0]
            : ""

      setForm({
        description: expense.description ?? "",
        amount: (expense.amount / 100).toFixed(2).replace(".", ","),
        categoryId: expense.categoryId ?? "",
        dueDate: dueDateStr,
        paymentMethod: expense.paymentMethod ?? "",
        notes: expense.notes ?? "",
      })
    }
  }, [expense])

  const handleSubmit = async () => {
    if (!expense) return

    if (!form.description.trim()) {
      toast.error("Informe a descricao")
      return
    }

    const amountReais = parseFloat(form.amount.replace(",", "."))
    if (isNaN(amountReais) || amountReais <= 0) {
      toast.error("Informe um valor valido")
      return
    }

    if (!form.dueDate) {
      toast.error("Informe a data de vencimento")
      return
    }

    const amountCentavos = Math.round(amountReais * 100)

    setSaving(true)
    try {
      await updateExpense(expense.id, {
        description: form.description.trim(),
        amount: amountCentavos,
        categoryId: form.categoryId || null,
        dueDate: form.dueDate,
        paymentMethod: form.paymentMethod || null,
        notes: form.notes.trim() || null,
      })

      toast.success("Despesa atualizada com sucesso")
      onOpenChange(false)
      onSaved()
    } catch (err) {
      toast.error(friendlyError(err, "Erro ao atualizar despesa"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>Editar Despesa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-exp-desc" className="text-sm">
              Descricao *
            </Label>
            <Input
              id="edit-exp-desc"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Ex: Aluguel do consultorio"
              className="rounded-xl"
            />
          </div>

          {/* Amount + Category row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-exp-amount" className="text-sm">
                Valor (R$) *
              </Label>
              <Input
                id="edit-exp-amount"
                type="text"
                inputMode="decimal"
                value={form.amount}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, amount: e.target.value }))
                }
                placeholder="0,00"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Categoria</Label>
              <Select
                value={form.categoryId}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, categoryId: v ?? "" }))
                }
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-2">
                        {cat.color && (
                          <span
                            className="inline-block size-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color }}
                          />
                        )}
                        {cat.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-exp-due" className="text-sm">
              Data de Vencimento *
            </Label>
            <Input
              id="edit-exp-due"
              type="date"
              value={form.dueDate}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, dueDate: e.target.value }))
              }
              className="rounded-xl"
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <Label className="text-sm">Metodo de Pagamento</Label>
            <Select
              value={form.paymentMethod}
              onValueChange={(v) =>
                setForm((prev) => ({
                  ...prev,
                  paymentMethod: !v || v === "none" ? "" : v,
                }))
              }
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Nenhum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-exp-notes" className="text-sm">
              Observacoes
            </Label>
            <Textarea
              id="edit-exp-notes"
              value={form.notes}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Observacoes opcionais..."
              className="rounded-xl resize-none"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-xl bg-vox-primary hover:bg-vox-primary/90"
          >
            {saving ? "Salvando..." : "Salvar Alteracoes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
