"use client"

import { useState, useEffect, useCallback } from "react"
import { Check, X, Clock, ClipboardList, Loader2, CheckCircle2, Ban } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { getClinicalProcedures, executeQuoteItem, cancelQuoteItem } from "@/server/actions/quote"

type ClinicalItem = Awaited<ReturnType<typeof getClinicalProcedures>>[number]

function formatCurrency(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

const EXEC_LABELS: Record<string, { label: string; icon: typeof Check; className: string }> = {
  pending: { label: "Pendente", icon: Clock, className: "bg-vox-warning/10 text-vox-warning" },
  executed: { label: "Executado", icon: CheckCircle2, className: "bg-vox-success/10 text-vox-success" },
  cancelled: { label: "Cancelado", icon: Ban, className: "bg-muted text-muted-foreground" },
}

function ExecuteDialog({
  item,
  onClose,
  onExecuted,
}: {
  item: ClinicalItem
  onClose: () => void
  onExecuted: () => void
}) {
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleExecute() {
    setSaving(true)
    const result = await executeQuoteItem({ quoteItemId: item.id, executionNotes: notes || undefined })
    if ("error" in result) { toast.error(result.error); setSaving(false); return }
    toast.success("Procedimento executado")
    onExecuted()
  }

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Executar Procedimento</DialogTitle>
          <DialogDescription>Confirme a execução e registre observações.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl bg-vox-primary/5 border border-vox-primary/20 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{item.procedureName}</span>
              <span className="text-sm font-medium text-vox-primary">{formatCurrency(item.finalPrice)}</span>
            </div>
            {item.tooth && (
              <span className="text-xs bg-muted px-2 py-0.5 rounded font-mono inline-block">{item.tooth}</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Data de execução</Label>
              <p className="text-sm font-medium">{new Date().toLocaleDateString("pt-BR")}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Horário</Label>
              <p className="text-sm font-medium">{new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Observações do profissional</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anotações sobre o procedimento executado..."
              className="rounded-xl text-sm min-h-[80px]"
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Voltar</Button>
            <Button
              onClick={handleExecute}
              disabled={saving}
              className="flex-1 rounded-xl bg-vox-success hover:bg-vox-success/90 text-white"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Confirmar Execução
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function FichaClinicaTab({ patientId }: { patientId: string }) {
  const [items, setItems] = useState<ClinicalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [executeItem, setExecuteItem] = useState<ClinicalItem | null>(null)
  const [filter, setFilter] = useState<"all" | "pending" | "executed">("all")

  const load = useCallback(async () => {
    try {
      const data = await getClinicalProcedures(patientId)
      setItems(data)
    } catch {}
    finally { setLoading(false) }
  }, [patientId])

  useEffect(() => { load() }, [load])

  async function handleCancel(itemId: string) {
    const result = await cancelQuoteItem(itemId)
    if ("error" in result) { toast.error(result.error); return }
    toast.success("Procedimento cancelado")
    load()
  }

  const pending = items.filter((i) => i.executionStatus === "pending")
  const executed = items.filter((i) => i.executionStatus === "executed")
  const cancelled = items.filter((i) => i.executionStatus === "cancelled")

  const filtered = filter === "all" ? items
    : filter === "pending" ? pending
    : executed

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-muted/50 animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-vox-warning/5 border border-vox-warning/20 p-3 text-center">
          <div className="text-lg font-bold text-vox-warning">{pending.length}</div>
          <div className="text-[10px] text-muted-foreground">Pendentes</div>
        </div>
        <div className="rounded-xl bg-vox-success/5 border border-vox-success/20 p-3 text-center">
          <div className="text-lg font-bold text-vox-success">{executed.length}</div>
          <div className="text-[10px] text-muted-foreground">Executados</div>
        </div>
        <div className="rounded-xl bg-muted/30 border border-border/30 p-3 text-center">
          <div className="text-lg font-bold text-muted-foreground">{items.length}</div>
          <div className="text-[10px] text-muted-foreground">Total</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1 rounded-lg bg-muted p-0.5">
        {([
          { id: "all", label: "Todos" },
          { id: "pending", label: "Pendentes" },
          { id: "executed", label: "Executados" },
        ] as const).map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              filter === f.id ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Items */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <ClipboardList className="size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {items.length === 0
              ? "Nenhum procedimento aprovado. Crie um orçamento primeiro."
              : "Nenhum procedimento nesta categoria."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const status = EXEC_LABELS[item.executionStatus] ?? EXEC_LABELS.pending
            const StatusIcon = status.icon
            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-3 py-3",
                  item.executionStatus === "pending"
                    ? "border-vox-warning/20 bg-vox-warning/[0.02]"
                    : item.executionStatus === "executed"
                      ? "border-border/30"
                      : "border-border/20 opacity-50"
                )}
              >
                <div className={cn("flex size-8 items-center justify-center rounded-lg shrink-0", status.className)}>
                  <StatusIcon className="size-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{item.procedureName}</span>
                    {item.tooth && (
                      <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">{item.tooth}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{formatCurrency(item.finalPrice)}</span>
                    {item.executedAt && (
                      <span className="text-[10px] text-muted-foreground">
                        Executado em {new Date(item.executedAt).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>
                  {item.executionNotes && (
                    <p className="text-[11px] text-muted-foreground mt-1 bg-muted/30 rounded-lg px-2 py-1">
                      {item.executionNotes}
                    </p>
                  )}
                </div>

                {item.executionStatus === "pending" && (
                  <div className="flex gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => setExecuteItem(item)}
                      className="rounded-xl text-xs h-8 gap-1.5 bg-vox-success hover:bg-vox-success/90 text-white"
                    >
                      <Check className="size-3.5" />
                      Executar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCancel(item.id)}
                      className="rounded-xl text-xs h-8 text-muted-foreground"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {executeItem && (
        <ExecuteDialog
          item={executeItem}
          onClose={() => setExecuteItem(null)}
          onExecuted={() => { setExecuteItem(null); load() }}
        />
      )}
    </div>
  )
}
