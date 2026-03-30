"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Plus, FileText, Check, X, Ban, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { getQuotesForPatient, getQuote, approveQuote, rejectQuote, cancelQuote } from "@/server/actions/quote"
import { QuoteFormDialog } from "./quote-form-dialog"

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
  approved: { label: "Aprovado", className: "bg-vox-success/10 text-vox-success" },
  rejected: { label: "Reprovado", className: "bg-vox-error/10 text-vox-error" },
  cancelled: { label: "Cancelado", className: "bg-muted text-muted-foreground line-through" },
}

const EXEC_STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-vox-warning/10 text-vox-warning" },
  executed: { label: "Executado", className: "bg-vox-success/10 text-vox-success" },
  cancelled: { label: "Cancelado", className: "bg-muted text-muted-foreground" },
}

function formatCurrency(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

type QuoteSummary = Awaited<ReturnType<typeof getQuotesForPatient>>[number]
type QuoteDetail = Awaited<ReturnType<typeof getQuote>>

export default function OrcamentosTab({ patientId }: { patientId: string }) {
  const [quotes, setQuotes] = useState<QuoteSummary[]>([])
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [prefillItems, setPrefillItems] = useState<Array<{ name: string; tooth?: string }>>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<QuoteDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    if (searchParams.get("newQuote") === "true") {
      const raw = searchParams.get("procedures")
      if (raw) {
        try { setPrefillItems(JSON.parse(decodeURIComponent(raw))) } catch {}
      }
      setShowForm(true)
    }
  }, [searchParams])

  const loadQuotes = useCallback(async () => {
    try {
      setQuotes(await getQuotesForPatient(patientId))
    } catch {
      toast.error("Erro ao carregar orçamentos")
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => { loadQuotes() }, [loadQuotes])

  async function handleExpand(quoteId: string) {
    if (expandedId === quoteId) { setExpandedId(null); setDetail(null); return }
    setExpandedId(quoteId)
    setLoadingDetail(true)
    try { setDetail(await getQuote(quoteId)) } catch { toast.error("Erro ao carregar detalhes") }
    finally { setLoadingDetail(false) }
  }

  async function handleApprove(quoteId: string) {
    const result = await approveQuote({ quoteId })
    if ("error" in result) { toast.error(result.error); return }
    toast.success("Orçamento aprovado")
    loadQuotes()
    if (expandedId === quoteId) setDetail(await getQuote(quoteId))
  }

  async function handleReject(quoteId: string) {
    const result = await rejectQuote(quoteId)
    if ("error" in result) { toast.error(result.error); return }
    toast.success("Orçamento reprovado")
    loadQuotes()
  }

  async function handleCancel(quoteId: string) {
    const result = await cancelQuote(quoteId)
    if ("error" in result) { toast.error(result.error); return }
    toast.success("Orçamento cancelado")
    loadQuotes()
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => <div key={i} className="h-20 rounded-xl bg-muted/50 animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Orçamentos ({quotes.length})</h3>
        <Button
          size="sm"
          onClick={() => setShowForm(true)}
          className="rounded-xl bg-vox-primary hover:bg-vox-primary/90 text-white gap-1.5"
        >
          <Plus className="size-3.5" />
          Novo Orçamento
        </Button>
      </div>

      {quotes.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <FileText className="size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Nenhum orçamento criado</p>
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)} className="rounded-xl gap-1.5 mt-1">
            <Plus className="size-3.5" />Criar primeiro orçamento
          </Button>
        </div>
      )}

      {quotes.map((q) => {
        const status = STATUS_CONFIG[q.status] ?? STATUS_CONFIG.draft
        const isExpanded = expandedId === q.id

        return (
          <div key={q.id} className="rounded-xl border border-border/40 overflow-hidden">
            <button
              onClick={() => handleExpand(q.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="size-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{formatCurrency(q.finalAmount)}</span>
                    <Badge className={cn("text-[10px] px-1.5 py-0", status.className)}>{status.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {q.itemCount} {q.itemCount === 1 ? "procedimento" : "procedimentos"}
                    {q.status === "approved" && ` · ${q.executedItemCount}/${q.itemCount} executados`}
                    {" · "}{new Date(q.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
              {isExpanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
            </button>

            {isExpanded && (
              <div className="border-t border-border/30 p-4 space-y-3">
                {loadingDetail ? (
                  <div className="h-20 rounded-xl bg-muted/50 animate-pulse" />
                ) : detail ? (
                  <>
                    <div className="space-y-2">
                      {detail.items.map((item) => {
                        const exec = EXEC_STATUS[item.executionStatus] ?? EXEC_STATUS.pending
                        return (
                          <div key={item.id} className="flex items-center justify-between rounded-lg border border-border/30 px-3 py-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{item.procedureName}</span>
                                {item.tooth && (
                                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">dente {item.tooth}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-muted-foreground">{formatCurrency(item.finalPrice)}</span>
                                {item.discount > 0 && <span className="text-[10px] text-vox-success">-{formatCurrency(item.discount)}</span>}
                                <Badge className={cn("text-[10px] px-1.5 py-0", exec.className)}>{exec.label}</Badge>
                              </div>
                              {item.executionNotes && (
                                <p className="text-[11px] text-muted-foreground mt-1">{item.executionNotes}</p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {detail.discountAmount > 0 && (
                      <div className="flex justify-between text-xs px-1">
                        <span className="text-muted-foreground">Desconto global</span>
                        <span className="text-vox-success font-medium">-{formatCurrency(detail.discountAmount)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm font-semibold px-1 pt-1 border-t border-border/20">
                      <span>Total</span>
                      <span>{formatCurrency(detail.finalAmount)}</span>
                    </div>

                    {detail.paymentMethod && (
                      <p className="text-xs text-muted-foreground px-1">Pagamento: {detail.paymentMethod}</p>
                    )}
                    {detail.notes && (
                      <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-2.5 py-1.5">{detail.notes}</p>
                    )}

                    {detail.status === "draft" && (
                      <div className="grid grid-cols-3 gap-2 pt-2">
                        <Button size="sm" onClick={() => handleApprove(q.id)} className="rounded-xl text-xs h-8 bg-vox-success hover:bg-vox-success/90 text-white">
                          <Check className="size-3.5" />Aprovar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleReject(q.id)} className="rounded-xl text-xs h-8 text-vox-error border-vox-error/30">
                          <Ban className="size-3.5" />Reprovar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleCancel(q.id)} className="rounded-xl text-xs h-8">
                          <X className="size-3.5" />Cancelar
                        </Button>
                      </div>
                    )}

                    {detail.status === "approved" && (
                      <Button size="sm" variant="outline" onClick={() => handleCancel(q.id)} className="w-full rounded-xl text-xs h-8 text-vox-error border-vox-error/30">
                        <X className="size-3.5" />Cancelar orçamento
                      </Button>
                    )}
                  </>
                ) : null}
              </div>
            )}
          </div>
        )
      })}

      {showForm && (
        <QuoteFormDialog
          patientId={patientId}
          prefillProcedures={prefillItems}
          onClose={() => { setShowForm(false); setPrefillItems([]) }}
          onSaved={() => { setShowForm(false); setPrefillItems([]); loadQuotes() }}
        />
      )}
    </div>
  )
}
