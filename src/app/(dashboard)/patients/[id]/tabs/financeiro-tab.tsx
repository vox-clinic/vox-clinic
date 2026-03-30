"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { DollarSign, ChevronDown, ChevronUp, Loader2, AlertCircle, CheckCircle2, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { getPatientFinancials, registerPayment } from "@/server/actions/quote"

type ChargeData = Awaited<ReturnType<typeof getPatientFinancials>>[number]

function formatCurrency(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function centavosToDisplay(centavos: number): string {
  if (!centavos) return ""
  return (centavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })
}

const CHARGE_STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-vox-warning/10 text-vox-warning" },
  partial: { label: "Parcial", className: "bg-vox-primary/10 text-vox-primary" },
  paid: { label: "Pago", className: "bg-vox-success/10 text-vox-success" },
  overdue: { label: "Atrasado", className: "bg-vox-error/10 text-vox-error" },
}

const PAYMENT_METHODS = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "credito", label: "Crédito" },
  { value: "debito", label: "Débito" },
  { value: "boleto", label: "Boleto" },
  { value: "convenio", label: "Convênio" },
  { value: "transferencia", label: "Transferência" },
]

function PaymentDialog({
  charge,
  allPendingCharges,
  prefillAmount,
  prefillMethod,
  onClose,
  onPaid,
}: {
  charge?: ChargeData
  allPendingCharges?: ChargeData[]
  prefillAmount?: number
  prefillMethod?: string
  onClose: () => void
  onPaid: () => void
}) {
  const totalRemaining = charge
    ? charge.remaining
    : (allPendingCharges ?? []).reduce((s, c) => s + c.remaining, 0)

  const [amount, setAmount] = useState(prefillAmount ?? 0)
  const [method, setMethod] = useState(prefillMethod ?? "")
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!amount || !method) { toast.error("Preencha valor e forma de pagamento"); return }
    setSaving(true)

    if (charge) {
      const result = await registerPayment({ chargeId: charge.id, amount, paymentMethod: method })
      if ("error" in result) { toast.error(result.error); setSaving(false); return }
    } else if (allPendingCharges?.length) {
      let remaining = amount
      for (const c of allPendingCharges) {
        if (remaining <= 0) break
        const toPay = Math.min(remaining, c.remaining)
        const result = await registerPayment({ chargeId: c.id, amount: toPay, paymentMethod: method })
        if ("error" in result) { toast.error(result.error); setSaving(false); return }
        remaining -= toPay
      }
    }

    toast.success("Pagamento registrado")
    onPaid()
  }

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-sm" showCloseButton>
        <DialogHeader>
          <DialogTitle>Registrar Pagamento</DialogTitle>
          <DialogDescription>
            {charge
              ? `Cobrança: ${formatCurrency(charge.netAmount)} · Saldo: ${formatCurrency(charge.remaining)}`
              : `Saldo total em aberto: ${formatCurrency(totalRemaining)}`
            }
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Valor</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
              <Input
                value={centavosToDisplay(amount)}
                onChange={(e) => setAmount(parseInt(e.target.value.replace(/\D/g, "") || "0", 10))}
                inputMode="numeric"
                placeholder="0,00"
                className="pl-9 rounded-xl"
                autoFocus
              />
            </div>
            <button
              onClick={() => setAmount(totalRemaining)}
              className="text-[10px] text-vox-primary mt-1 hover:underline"
            >
              Preencher total em aberto ({formatCurrency(totalRemaining)})
            </button>
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Forma de pagamento</Label>
            <div className="flex flex-wrap gap-1.5">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMethod(method === m.value ? "" : m.value)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1.5 text-xs transition-all",
                    method === m.value
                      ? "border-vox-primary bg-vox-primary/10 text-vox-primary font-medium"
                      : "border-border/40 text-muted-foreground hover:border-vox-primary/30"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          {!charge && allPendingCharges && allPendingCharges.length > 1 && (
            <p className="text-[10px] text-muted-foreground">
              O valor será distribuído automaticamente entre as {allPendingCharges.length} cobranças em aberto.
            </p>
          )}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={!amount || !method || saving}
              className="flex-1 rounded-xl bg-vox-primary hover:bg-vox-primary/90 text-white"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : "Confirmar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function FinanceiroTab({ patientId }: { patientId: string }) {
  const searchParams = useSearchParams()
  const [charges, setCharges] = useState<ChargeData[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [payCharge, setPayCharge] = useState<ChargeData | null>(null)
  const [showGeneralPay, setShowGeneralPay] = useState(false)
  const [prefillAmount, setPrefillAmount] = useState<number | undefined>()
  const [prefillMethod, setPrefillMethod] = useState<string | undefined>()

  const load = useCallback(async () => {
    try {
      setCharges(await getPatientFinancials(patientId))
    } catch {}
    finally { setLoading(false) }
  }, [patientId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (searchParams.get("pay") === "true" && !loading && charges.length > 0) {
      const amt = searchParams.get("amount")
      const mth = searchParams.get("method")
      if (amt) setPrefillAmount(parseInt(amt, 10))
      if (mth) setPrefillMethod(mth)
      setShowGeneralPay(true)
    }
  }, [searchParams, loading, charges.length])

  const totalPending = charges.filter((c) => c.status !== "paid").reduce((s, c) => s + c.remaining, 0)
  const totalPaid = charges.reduce((s, c) => s + c.totalPaid, 0)
  const totalGeneral = charges.reduce((s, c) => s + c.netAmount, 0)

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-muted/50 animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-vox-error/5 border border-vox-error/20 p-3 text-center">
          <div className="text-lg font-bold text-vox-error">{formatCurrency(totalPending)}</div>
          <div className="text-[10px] text-muted-foreground">Em aberto</div>
        </div>
        <div className="rounded-xl bg-vox-success/5 border border-vox-success/20 p-3 text-center">
          <div className="text-lg font-bold text-vox-success">{formatCurrency(totalPaid)}</div>
          <div className="text-[10px] text-muted-foreground">Pago</div>
        </div>
        <div className="rounded-xl bg-muted/30 border border-border/30 p-3 text-center">
          <div className="text-lg font-bold">{formatCurrency(totalGeneral)}</div>
          <div className="text-[10px] text-muted-foreground">Total geral</div>
        </div>
      </div>

      {totalPending > 0 && (
        <Button
          onClick={() => setShowGeneralPay(true)}
          className="w-full rounded-xl bg-vox-primary hover:bg-vox-primary/90 text-white gap-2"
        >
          <DollarSign className="size-4" />
          Registrar Pagamento
        </Button>
      )}

      {/* Charges */}
      {charges.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <DollarSign className="size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Nenhuma cobrança registrada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {charges.map((charge) => {
            const status = CHARGE_STATUS[charge.status] ?? CHARGE_STATUS.pending
            const pct = charge.netAmount > 0 ? Math.min(100, Math.round((charge.totalPaid / charge.netAmount) * 100)) : 0
            const isExpanded = expandedId === charge.id
            const isPaid = charge.remaining <= 0

            return (
              <div key={charge.id} className="rounded-xl border border-border/40 overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : charge.id)}
                  className="w-full text-left p-3 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className={cn("flex size-7 items-center justify-center rounded-lg shrink-0", status.className)}>
                        {isPaid ? <CheckCircle2 className="size-3.5" /> : <Clock className="size-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{charge.description}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(charge.createdAt).toLocaleDateString("pt-BR")}
                          {charge.quoteId && ` · Orçamento`}
                          {charge.appointmentId && ` · Consulta`}
                          {charge.quoteItemCount !== null && ` · ${charge.quoteExecutedCount}/${charge.quoteItemCount} exec.`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(charge.netAmount)}</p>
                        <Badge className={cn("text-[9px] px-1 py-0", status.className)}>{status.label}</Badge>
                      </div>
                      {isExpanded ? <ChevronUp className="size-3.5 text-muted-foreground" /> : <ChevronDown className="size-3.5 text-muted-foreground" />}
                    </div>
                  </div>

                  {/* Progress bar */}
                  {!isPaid && (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-vox-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground tabular-nums">{pct}%</span>
                    </div>
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-border/20 p-3 space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Total</span>
                        <p className="font-medium">{formatCurrency(charge.netAmount)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Pago</span>
                        <p className="font-medium text-vox-success">{formatCurrency(charge.totalPaid)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Restante</span>
                        <p className="font-medium text-vox-error">{formatCurrency(charge.remaining)}</p>
                      </div>
                    </div>

                    {charge.discount > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        Desconto aplicado: {formatCurrency(charge.discount)}
                      </p>
                    )}

                    {/* Payment history */}
                    {charge.payments.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Pagamentos</p>
                        {charge.payments.map((p) => (
                          <div key={p.id} className="flex items-center justify-between rounded-lg bg-muted/20 px-2.5 py-1.5">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="size-3 text-vox-success" />
                              <span className="text-xs">
                                {p.paidAt ? new Date(p.paidAt).toLocaleDateString("pt-BR") : "—"}
                              </span>
                              <span className="text-[10px] text-muted-foreground">{p.paymentMethod ?? "—"}</span>
                            </div>
                            <span className="text-xs font-medium">{formatCurrency(p.paidAmount ?? p.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {!isPaid && (
                      <Button
                        size="sm"
                        onClick={() => setPayCharge(charge)}
                        className="w-full rounded-xl text-xs h-8 gap-1.5 bg-vox-primary hover:bg-vox-primary/90 text-white"
                      >
                        <DollarSign className="size-3.5" />
                        Registrar Pagamento
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {payCharge && (
        <PaymentDialog
          charge={payCharge}
          onClose={() => setPayCharge(null)}
          onPaid={() => { setPayCharge(null); load() }}
        />
      )}

      {showGeneralPay && (
        <PaymentDialog
          allPendingCharges={charges.filter((c) => c.status !== "paid" && c.remaining > 0)}
          prefillAmount={prefillAmount}
          prefillMethod={prefillMethod}
          onClose={() => { setShowGeneralPay(false); setPrefillAmount(undefined); setPrefillMethod(undefined) }}
          onPaid={() => { setShowGeneralPay(false); setPrefillAmount(undefined); setPrefillMethod(undefined); load() }}
        />
      )}
    </div>
  )
}
