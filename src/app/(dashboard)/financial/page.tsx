"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DollarSign,
  CalendarDays,
  TrendingUp,
  Receipt,
  Tag,
  ArrowRight,
} from "lucide-react"
import Link from "next/link"
import {
  getFinancialData,
  getWorkspaceProcedures,
  updateProcedurePrice,
} from "@/server/actions/financial"
import { toast } from "sonner"
import type { Procedure } from "@/types"
import { ReceivablesTab } from "./receivables-tab"
import ExpensesTab from "./expenses-tab"
import CashflowTab from "./cashflow-tab"
import { NfseTab } from "./nfse-tab"

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)

const monthNames = [
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

type Tab = "resumo" | "receivables" | "expenses" | "cashflow" | "nfse" | "pricing"

export default function FinancialPage() {
  const [activeTab, setActiveTab] = useState<Tab>("resumo")
  const [period, setPeriod] = useState<"month" | "year">("month")
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<Awaited<ReturnType<typeof getFinancialData>> | null>(null)
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [procedurePrices, setProcedurePrices] = useState<Record<string, string>>({})
  const [savingProcedure, setSavingProcedure] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const now = new Date().toISOString()
      const [financialData, workspaceProcedures] = await Promise.all([
        getFinancialData(period, now),
        getWorkspaceProcedures(),
      ])
      setData(financialData)
      setProcedures(workspaceProcedures)
      const prices: Record<string, string> = {}
      for (const p of workspaceProcedures) {
        prices[p.id] = p.price != null ? String(p.price) : ""
      }
      setProcedurePrices(prices)
    } catch (err) {
      console.error("[FinancialPage] loadData failed", err)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handlePriceSave(procedureId: string) {
    const priceStr = procedurePrices[procedureId]
    const price = parseFloat(priceStr)
    if (isNaN(price) || price < 0) return

    setSavingProcedure(procedureId)
    try {
      await updateProcedurePrice(procedureId, price)
      toast.success("Preço atualizado")
    } catch {
      toast.error("Erro ao atualizar preço")
    } finally {
      setSavingProcedure(null)
    }
  }

  const formatDateBR = (date: Date) =>
    new Date(date).toLocaleDateString("pt-BR")

  const tabs: { key: Tab; label: string }[] = [
    { key: "resumo", label: "Resumo" },
    { key: "receivables", label: "Contas a Receber" },
    { key: "expenses", label: "Despesas" },
    { key: "cashflow", label: "Fluxo de Caixa" },
    { key: "nfse", label: "NFS-e" },
    { key: "pricing", label: "Tabela de Precos" },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Financeiro</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Receitas e procedimentos
          </p>
        </div>
        {activeTab === "resumo" && (
          <div className="flex rounded-xl bg-muted/50 p-0.5">
            <button
              onClick={() => setPeriod("month")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                period === "month"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Este Mes
            </button>
            <button
              onClick={() => setPeriod("year")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                period === "year"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Este Ano
            </button>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex rounded-xl bg-muted/50 p-0.5 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === tab.key
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "resumo" && (
        <>
          {loading ? (
            <div className="space-y-4">
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
              </div>
              <Skeleton className="h-64" />
            </div>
          ) : (
            <>
              {/* Stat Cards */}
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                <Card className="group relative overflow-hidden">
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-vox-success/[0.04] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                          Receita Total
                        </p>
                        <p className="text-2xl font-bold mt-0.5 text-vox-success tabular-nums">
                          {formatBRL(data?.totalRevenue ?? 0)}
                        </p>
                      </div>
                      <div className="flex size-9 items-center justify-center rounded-xl bg-vox-success/10">
                        <DollarSign className="size-4 text-vox-success" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="group relative overflow-hidden">
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-vox-primary/[0.04] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                          Atendimentos
                        </p>
                        <p className="text-2xl font-bold mt-0.5 tabular-nums">
                          {data?.appointmentCount ?? 0}
                        </p>
                      </div>
                      <div className="flex size-9 items-center justify-center rounded-xl bg-vox-primary/10">
                        <CalendarDays className="size-4 text-vox-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="group relative overflow-hidden">
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-vox-primary/[0.04] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                          Ticket Medio
                        </p>
                        <p className="text-2xl font-bold mt-0.5 tabular-nums">
                          {formatBRL(data?.averageTicket ?? 0)}
                        </p>
                      </div>
                      <div className="flex size-9 items-center justify-center rounded-xl bg-vox-primary/10">
                        <TrendingUp className="size-4 text-vox-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Main Content Grid */}
              <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
                {/* Revenue Breakdown */}
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Receipt className="size-4 text-vox-primary" />
                      Receita por Procedimento
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!data?.procedureBreakdown.length ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        Nenhum procedimento registrado no periodo.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {data.procedureBreakdown.map((proc, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-muted/40 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{proc.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {proc.count} {proc.count === 1 ? "atendimento" : "atendimentos"}
                              </p>
                            </div>
                            <span className="text-sm font-semibold text-vox-success shrink-0 ml-3">
                              {formatBRL(proc.total)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Transactions */}
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarDays className="size-4 text-vox-primary" />
                      Ultimas Transacoes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!data?.recentTransactions.length ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        Nenhuma transacao no periodo.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {data.recentTransactions.map((tx) => (
                          <Link
                            key={tx.id}
                            href={`/patients/${tx.patientId}`}
                            className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/60 transition-colors group"
                          >
                            <span className="text-xs text-muted-foreground w-16 shrink-0 tabular-nums">
                              {formatDateBR(tx.date)}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate group-hover:text-vox-primary transition-colors">
                                {tx.patientName}
                              </p>
                              {tx.procedures.length > 0 && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {tx.procedures.join(", ")}
                                </p>
                              )}
                            </div>
                            <span className="text-sm font-semibold shrink-0 ml-2">
                              {tx.price != null ? formatBRL(tx.price) : (
                                <span className="text-muted-foreground text-xs">--</span>
                              )}
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Breakdown (year view only) */}
              {period === "year" && data?.monthlyBreakdown && (
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="size-4 text-vox-primary" />
                      Receita Mensal
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {data.monthlyBreakdown.map((m) => {
                        const maxRevenue = Math.max(...data.monthlyBreakdown.map((mb) => mb.revenue), 1)
                        const barWidth = (m.revenue / maxRevenue) * 100
                        return (
                          <div key={m.month} className="group flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-muted/30 transition-colors">
                            <span className="text-[11px] text-muted-foreground w-16 shrink-0">
                              {monthNames[m.month]}
                            </span>
                            <div className="flex-1 h-5 rounded-md bg-muted/30 overflow-hidden">
                              <div
                                className="h-full rounded-md bg-gradient-to-r from-vox-success/60 to-vox-success/80 transition-all duration-500"
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-medium w-20 text-right tabular-nums shrink-0">
                              {formatBRL(m.revenue)}
                            </span>
                            <span className="text-[10px] text-muted-foreground w-6 text-right shrink-0 tabular-nums">
                              {m.count}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}

      {activeTab === "receivables" && <ReceivablesTab />}
      {activeTab === "expenses" && <ExpensesTab />}
      {activeTab === "cashflow" && <CashflowTab />}
      {activeTab === "nfse" && <NfseTab />}

      {activeTab === "pricing" && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="size-4 text-vox-primary" />
              Tabela de Precos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {procedures.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhum procedimento configurado no workspace.
              </p>
            ) : (
              <div className="space-y-3">
                {procedures.map((proc) => (
                  <div
                    key={proc.id}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{proc.name}</p>
                      {proc.category && (
                        <p className="text-xs text-muted-foreground">{proc.category}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm text-muted-foreground">R$</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        className="w-28 text-right"
                        value={procedurePrices[proc.id] ?? ""}
                        onChange={(e) =>
                          setProcedurePrices((prev) => ({
                            ...prev,
                            [proc.id]: e.target.value,
                          }))
                        }
                        onBlur={() => handlePriceSave(proc.id)}
                        disabled={savingProcedure === proc.id}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
