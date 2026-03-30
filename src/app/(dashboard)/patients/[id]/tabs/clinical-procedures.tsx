"use client"

import { useState, useEffect, useCallback } from "react"
import { Check, X, Clock, ClipboardList, ChevronDown, ChevronUp, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { getPendingProcedures, executeQuoteItem, cancelQuoteItem } from "@/server/actions/quote"

type PendingItem = Awaited<ReturnType<typeof getPendingProcedures>>[number]

function formatCurrency(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function ExecuteDialog({
  item,
  onClose,
  onExecuted,
}: {
  item: PendingItem
  onClose: () => void
  onExecuted: () => void
}) {
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleExecute() {
    setSaving(true)
    const result = await executeQuoteItem({ quoteItemId: item.id, executionNotes: notes || undefined })
    if ("error" in result) {
      toast.error(result.error)
      setSaving(false)
      return
    }
    toast.success("Procedimento executado")
    onExecuted()
  }

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Executar Procedimento</DialogTitle>
          <DialogDescription>Confirme a execução e adicione observações.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl bg-muted/30 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{item.procedureName}</span>
              <span className="text-sm font-medium text-vox-primary">{formatCurrency(item.finalPrice)}</span>
            </div>
            {item.tooth && (
              <div className="flex items-center gap-2">
                <span className="text-xs bg-muted px-2 py-0.5 rounded font-mono">{item.tooth}</span>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Orçamento de {new Date(item.quoteDate).toLocaleDateString("pt-BR")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Data</Label>
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
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">
              Cancelar
            </Button>
            <Button
              onClick={handleExecute}
              disabled={saving}
              className="flex-1 rounded-xl bg-vox-success hover:bg-vox-success/90 text-white"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Executar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function ClinicalProcedures({ patientId }: { patientId: string }) {
  const [items, setItems] = useState<PendingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [executeItem, setExecuteItem] = useState<PendingItem | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await getPendingProcedures(patientId)
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

  if (loading) {
    return (
      <Card className="rounded-2xl border-border/40">
        <CardContent className="p-4">
          <div className="h-16 rounded-xl bg-muted/50 animate-pulse" />
        </CardContent>
      </Card>
    )
  }

  if (items.length === 0) return null

  return (
    <>
      <Card className="rounded-2xl border-vox-primary/20 bg-vox-primary/[0.02]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="size-4 text-vox-primary" />
            Ficha Clínica
            <Badge className="bg-vox-warning/10 text-vox-warning text-[10px] px-1.5 py-0">
              {items.length} {items.length === 1 ? "pendente" : "pendentes"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-xl border border-border/40 bg-background px-3 py-2.5"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{item.procedureName}</span>
                  {item.tooth && (
                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">
                      {item.tooth}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {formatCurrency(item.finalPrice)} · Orçamento de {new Date(item.quoteDate).toLocaleDateString("pt-BR")}
                </p>
              </div>
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
            </div>
          ))}
        </CardContent>
      </Card>

      {executeItem && (
        <ExecuteDialog
          item={executeItem}
          onClose={() => setExecuteItem(null)}
          onExecuted={() => { setExecuteItem(null); load() }}
        />
      )}
    </>
  )
}
