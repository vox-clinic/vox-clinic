"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  CreditCard,
  Crown,
  Zap,
  Check,
  X,
  Loader2,
  ExternalLink,
  AlertTriangle,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { friendlyError } from "@/lib/error-messages"
import {
  getBillingInfo,
  getWorkspaceUsage,
  createCheckoutSession,
  createPortalSession,
} from "@/server/actions/billing"

interface BillingInfo {
  plan: string
  planStatus: string
  trialEndsAt: Date | null
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
}

interface UsageMetric {
  used: number
  limit: number
}

interface WorkspaceUsage {
  plan: string
  patients: UsageMetric
  appointments: UsageMetric
  recordings: UsageMetric
}

const PLAN_DETAILS = {
  free: {
    name: "Free",
    price: "R$ 0",
    period: "/mes",
    icon: Zap,
    color: "bg-gray-100 text-gray-700",
    borderColor: "border-gray-200",
    features: [
      { text: "50 pacientes", included: true },
      { text: "1 agenda", included: true },
      { text: "100 consultas/mes", included: true },
      { text: "30 gravacoes/mes", included: true },
      { text: "Prescricoes e atestados", included: true },
      { text: "WhatsApp Business", included: false },
      { text: "Agendamento online", included: false },
      { text: "Relatorios avancados", included: false },
      { text: "Exportacao de dados", included: false },
      { text: "Planos de tratamento", included: false },
      { text: "Pesquisa NPS", included: false },
    ],
  },
  pro: {
    name: "Pro",
    price: "R$ 149",
    period: "/mes",
    icon: Crown,
    color: "bg-vox-primary/10 text-vox-primary",
    borderColor: "border-vox-primary",
    features: [
      { text: "500 pacientes", included: true },
      { text: "5 agendas", included: true },
      { text: "1.000 consultas/mes", included: true },
      { text: "300 gravacoes/mes", included: true },
      { text: "Prescricoes e atestados", included: true },
      { text: "WhatsApp Business", included: true },
      { text: "Agendamento online", included: true },
      { text: "Relatorios avancados", included: true },
      { text: "Exportacao de dados", included: true },
      { text: "Planos de tratamento", included: true },
      { text: "Pesquisa NPS", included: true },
    ],
  },
  enterprise: {
    name: "Enterprise",
    price: "R$ 399",
    period: "/mes",
    icon: Sparkles,
    color: "bg-purple-100 text-purple-700",
    borderColor: "border-purple-400",
    features: [
      { text: "Pacientes ilimitados", included: true },
      { text: "Agendas ilimitadas", included: true },
      { text: "Consultas ilimitadas", included: true },
      { text: "Gravacoes ilimitadas", included: true },
      { text: "Prescricoes e atestados", included: true },
      { text: "WhatsApp Business", included: true },
      { text: "Agendamento online", included: true },
      { text: "Relatorios avancados", included: true },
      { text: "Exportacao de dados", included: true },
      { text: "Planos de tratamento", included: true },
      { text: "Pesquisa NPS", included: true },
    ],
  },
} as const

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "destructive" | "outline" | "secondary"; className?: string }> = {
  active: { label: "Ativo", variant: "default", className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" },
  past_due: { label: "Pagamento pendente", variant: "destructive" },
  trialing: { label: "Periodo de teste", variant: "secondary", className: "bg-amber-100 text-amber-700 hover:bg-amber-100" },
  cancelled: { label: "Cancelado", variant: "outline", className: "text-gray-500" },
}

export default function BillingPage() {
  const searchParams = useSearchParams()
  const [billing, setBilling] = useState<BillingInfo | null>(null)
  const [usage, setUsage] = useState<WorkspaceUsage | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("Assinatura realizada com sucesso!")
    }
    if (searchParams.get("cancelled") === "true") {
      toast.info("Checkout cancelado.")
    }
  }, [searchParams])

  useEffect(() => {
    loadBilling()
  }, [])

  async function loadBilling() {
    try {
      const [data, usageData] = await Promise.all([
        getBillingInfo(),
        getWorkspaceUsage(),
      ])
      setBilling({
        ...data,
        trialEndsAt: data.trialEndsAt ? new Date(data.trialEndsAt) : null,
        currentPeriodEnd: data.currentPeriodEnd ? new Date(data.currentPeriodEnd) : null,
      })
      setUsage(usageData)
    } catch {
      toast.error("Erro ao carregar informacoes de cobranca.")
    } finally {
      setLoading(false)
    }
  }

  async function handleUpgrade(planKey: "pro" | "enterprise") {
    setActionLoading(planKey)
    try {
      const { url } = await createCheckoutSession(planKey)
      if (url) {
        window.location.href = url
      } else {
        toast.error("Erro ao criar sessao de pagamento.")
      }
    } catch (err) {
      toast.error(friendlyError(err, "Erro ao criar sessao de pagamento."))
    } finally {
      setActionLoading(null)
    }
  }

  async function handleManageSubscription() {
    setActionLoading("portal")
    try {
      const { url } = await createPortalSession()
      if (url) {
        window.location.href = url
      } else {
        toast.error("Erro ao abrir portal de assinatura.")
      }
    } catch (err) {
      toast.error(friendlyError(err, "Erro ao abrir portal."))
    } finally {
      setActionLoading(null)
    }
  }

  function getTrialDaysLeft(): number | null {
    if (!billing?.trialEndsAt) return null
    const diff = new Date(billing.trialEndsAt).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  if (loading) {
    return (
      <div className="space-y-6 px-4 md:px-6 lg:px-8 py-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  if (!billing) return null

  const currentPlan = billing.plan
  const statusBadge = STATUS_BADGES[billing.planStatus] ?? STATUS_BADGES.active
  const trialDays = getTrialDaysLeft()
  const planOrder = ["free", "pro", "enterprise"]
  const currentPlanIndex = planOrder.indexOf(currentPlan)

  return (
    <div className="space-y-6 px-4 md:px-6 lg:px-8 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cobranca</h1>
        <p className="text-muted-foreground">
          Gerencie seu plano e assinatura
        </p>
      </div>

      {/* Current Plan Card */}
      <Card className="rounded-2xl border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5" />
            Plano Atual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-2xl font-bold">
              {PLAN_DETAILS[currentPlan as keyof typeof PLAN_DETAILS]?.name ?? currentPlan}
            </span>
            <Badge variant={statusBadge.variant} className={statusBadge.className}>
              {statusBadge.label}
            </Badge>
          </div>

          {billing.planStatus === "past_due" && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                Seu pagamento esta pendente. Atualize seu metodo de pagamento para manter o acesso.
              </span>
            </div>
          )}

          {trialDays !== null && billing.planStatus === "trialing" && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                Seu periodo de teste termina em <strong>{trialDays} dia{trialDays !== 1 ? "s" : ""}</strong>.
              </span>
            </div>
          )}

          {billing.cancelAtPeriodEnd && billing.currentPeriodEnd && (
            <div className="flex items-center gap-2 rounded-xl bg-gray-50 border border-gray-200 p-3 text-sm text-gray-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                Sua assinatura sera cancelada em{" "}
                <strong>
                  {new Date(billing.currentPeriodEnd).toLocaleDateString("pt-BR")}
                </strong>.
              </span>
            </div>
          )}

          {billing.currentPeriodEnd && !billing.cancelAtPeriodEnd && (
            <p className="text-sm text-muted-foreground">
              Proxima cobranca em{" "}
              {new Date(billing.currentPeriodEnd).toLocaleDateString("pt-BR")}
            </p>
          )}

          {currentPlan !== "free" && (
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={handleManageSubscription}
              disabled={actionLoading === "portal"}
            >
              {actionLoading === "portal" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="mr-2 h-4 w-4" />
              )}
              Gerenciar Assinatura
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Plan Usage */}
      {usage && (
        <Card className="rounded-2xl border-border/40">
          <CardHeader>
            <CardTitle className="text-lg">Uso do Plano</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Pacientes", used: usage.patients.used, limit: usage.patients.limit },
              { label: "Consultas (este mes)", used: usage.appointments.used, limit: usage.appointments.limit },
              { label: "Gravacoes (este mes)", used: usage.recordings.used, limit: usage.recordings.limit },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{item.label}</span>
                  <span className="text-muted-foreground">
                    {item.used} / {item.limit === -1 ? "\u221E" : item.limit}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      item.limit !== -1 && item.used / item.limit > 0.9
                        ? "bg-red-500"
                        : "bg-vox-primary"
                    }`}
                    style={{
                      width: `${
                        item.limit === -1
                          ? 10
                          : Math.min(100, (item.used / item.limit) * 100)
                      }%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Plan Comparison */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Planos Disponiveis</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(Object.entries(PLAN_DETAILS) as [string, typeof PLAN_DETAILS[keyof typeof PLAN_DETAILS]][]).map(
            ([key, plan]) => {
              const Icon = plan.icon
              const isCurrent = key === currentPlan
              const planIndex = planOrder.indexOf(key)
              const isUpgrade = planIndex > currentPlanIndex
              const isDowngrade = planIndex < currentPlanIndex

              return (
                <Card
                  key={key}
                  className={`rounded-2xl relative ${
                    isCurrent ? `border-2 ${plan.borderColor}` : "border-border/40"
                  }`}
                >
                  {isCurrent && (
                    <div className="absolute -top-3 left-4">
                      <Badge className={plan.color}>Plano Atual</Badge>
                    </div>
                  )}
                  <CardHeader className="pt-6">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-2 rounded-xl ${plan.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground text-sm">
                        {plan.period}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {plan.features.map((feature) => (
                        <li key={feature.text} className="flex items-center gap-2 text-sm">
                          {feature.included ? (
                            <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                          ) : (
                            <X className="h-4 w-4 text-gray-300 shrink-0" />
                          )}
                          <span className={feature.included ? "" : "text-muted-foreground"}>
                            {feature.text}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <div className="pt-2">
                      {isCurrent ? (
                        <Button
                          variant="outline"
                          className="w-full rounded-xl"
                          disabled
                        >
                          Plano Atual
                        </Button>
                      ) : isUpgrade ? (
                        <Button
                          className="w-full rounded-xl bg-vox-primary hover:bg-vox-primary/90"
                          onClick={() => handleUpgrade(key as "pro" | "enterprise")}
                          disabled={actionLoading === key}
                        >
                          {actionLoading === key ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Zap className="mr-2 h-4 w-4" />
                          )}
                          Fazer Upgrade
                        </Button>
                      ) : isDowngrade ? (
                        <Button
                          variant="outline"
                          className="w-full rounded-xl"
                          onClick={handleManageSubscription}
                          disabled={actionLoading === "portal"}
                        >
                          {actionLoading === "portal" ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <ExternalLink className="mr-2 h-4 w-4" />
                          )}
                          Gerenciar
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              )
            }
          )}
        </div>
      </div>
    </div>
  )
}
