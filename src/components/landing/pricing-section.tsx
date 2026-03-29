"use client"

import { useState } from "react"
import Link from "next/link"
import { Check } from "lucide-react"
import { BlurFade } from "@/components/ui/blur-fade"
import { ShineBorder } from "@/components/ui/shine-border"

const plans = [
  {
    name: "Grátis",
    monthlyPrice: 0,
    annualPrice: 0,
    features: [
      "Até 30 pacientes",
      "1 agenda",
      "Gravação e transcrição IA",
      "Prontuário completo",
      "1 usuário",
    ],
    cta: "Começar grátis",
    ctaHref: "/sign-up",
    ctaVariant: "outline" as const,
    highlighted: false,
  },
  {
    name: "Profissional",
    monthlyPrice: 97,
    annualPrice: 77,
    features: [
      "Pacientes ilimitados",
      "Agendas ilimitadas",
      "Tudo do Grátis +",
      "Prescrição com assinatura digital",
      "Agendamento online",
      "WhatsApp Business",
      "NFS-e e TISS",
      "Financeiro completo",
      "Até 5 usuários",
    ],
    cta: "Começar teste grátis",
    ctaHref: "/sign-up",
    ctaVariant: "filled" as const,
    highlighted: true,
  },
  {
    name: "Clínica",
    monthlyPrice: 197,
    annualPrice: 157,
    features: [
      "Tudo do Profissional +",
      "Usuários ilimitados",
      "Teleconsulta",
      "Estoque",
      "Comissões",
      "Suporte prioritário",
    ],
    cta: "Falar com vendas",
    ctaHref: "/contato",
    ctaVariant: "outline" as const,
    highlighted: false,
  },
]

function formatPrice(value: number) {
  if (value === 0) return "R$ 0"
  return `R$ ${value}`
}

export function PricingSection() {
  const [annual, setAnnual] = useState(false)

  return (
    <section
      id="pricing"
      className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-20 md:py-28"
    >
      <BlurFade inView>
        <div className="text-center mb-10">
          <p className="text-sm font-semibold text-vox-primary tracking-wider uppercase mb-3">Planos</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Comece grátis, escale quando quiser
          </h2>
          <p className="text-lg text-gray-400">
            Comece grátis. Evolua quando precisar.
          </p>
        </div>
      </BlurFade>

      {/* Billing toggle */}
      <BlurFade inView delay={0.05}>
        <div className="flex items-center justify-center gap-3 mb-10">
          <span
            className={`text-sm font-medium ${!annual ? "text-white" : "text-gray-500"}`}
          >
            Mensal
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={annual}
            onClick={() => setAnnual(!annual)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              annual ? "bg-vox-primary" : "bg-white/20"
            }`}
          >
            <span
              className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow-sm transition-transform ${
                annual ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <span
            className={`text-sm font-medium ${annual ? "text-white" : "text-gray-500"}`}
          >
            Anual
          </span>
          {annual && (
            <span className="inline-flex items-center rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium px-2 py-0.5">
              -20%
            </span>
          )}
        </div>
      </BlurFade>

      <div className="grid md:grid-cols-3 gap-6 items-start">
        {plans.map((plan, i) => {
          const price = annual ? plan.annualPrice : plan.monthlyPrice
          return (
            <BlurFade key={plan.name} inView delay={0.2 * i}>
              <div
                className={`relative rounded-2xl p-6 flex flex-col ${
                  plan.highlighted
                    ? "border border-vox-primary/30 bg-white/[0.06] shadow-lg ring-1 ring-vox-primary/20"
                    : "border border-white/[0.08] bg-white/[0.03]"
                }`}
              >
                {plan.highlighted && (
                  <ShineBorder
                    shineColor={["#14B8A6", "#10B981"]}
                    borderWidth={1}
                    duration={10}
                  />
                )}

                {plan.highlighted && (
                  <span className="inline-flex self-start items-center rounded-full bg-vox-primary/10 text-vox-primary text-xs font-medium px-2.5 py-0.5 mb-4">
                    Mais popular
                  </span>
                )}

                <h3 className="text-lg font-semibold text-white mb-2">{plan.name}</h3>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">
                    {formatPrice(price)}
                  </span>
                  <span className="text-gray-500">/mês</span>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm text-gray-400"
                    >
                      <Check className="size-4 text-emerald-500 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.ctaHref}
                  className={`inline-flex items-center justify-center rounded-xl h-9 px-4 text-sm font-medium transition-colors active:scale-[0.98] ${
                    plan.ctaVariant === "filled"
                      ? "bg-vox-primary text-white hover:bg-vox-primary/90"
                      : "border border-white/15 text-gray-300 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            </BlurFade>
          )
        })}
      </div>
    </section>
  )
}
