"use client"

import Link from "next/link"
import { Check } from "lucide-react"
import { BlurFade } from "@/components/ui/blur-fade"
import { ShineBorder } from "@/components/ui/shine-border"

const plans = [
  {
    name: "Gratis",
    price: "R$ 0",
    badge: null,
    features: [
      "Ate 50 consultas/mes",
      "1 profissional",
      "Transcricao por voz",
      "Prontuario basico",
      "Agenda com calendario",
    ],
    cta: "Comecar Gratis",
    ctaVariant: "outline" as const,
    highlighted: false,
  },
  {
    name: "Profissional",
    price: "R$ 97",
    badge: "Mais popular",
    features: [
      "Tudo do plano Gratis",
      "Consultas ilimitadas",
      "IA avancada (Claude)",
      "WhatsApp Business",
      "Relatorios e analytics",
      "Suporte prioritario",
    ],
    cta: "Assinar Profissional",
    ctaVariant: "filled" as const,
    highlighted: true,
  },
  {
    name: "Clinica",
    price: "R$ 197",
    badge: null,
    features: [
      "Tudo do Profissional",
      "Equipe ilimitada",
      "Multi-agenda",
      "Importacao CSV",
      "Onboarding dedicado",
      "API de integracao",
    ],
    cta: "Falar com vendas",
    ctaVariant: "outline" as const,
    highlighted: false,
  },
]

export function PricingSection() {
  return (
    <section id="pricing" className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-20 md:py-28">
      <BlurFade inView>
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Planos simples e transparentes
          </h2>
          <p className="text-lg text-muted-foreground">
            Comece gratis, escale quando precisar
          </p>
        </div>
      </BlurFade>

      <div className="grid md:grid-cols-3 gap-6 items-start">
        {plans.map((plan, i) => (
          <BlurFade key={plan.name} inView delay={0.1 * i}>
            <div
              className={`relative rounded-2xl border border-border/40 bg-card p-6 flex flex-col ${
                plan.highlighted ? "shadow-lg ring-1 ring-vox-primary/20" : ""
              }`}
            >
              {plan.highlighted && (
                <ShineBorder
                  shineColor={["#14B8A6", "#10B981"]}
                  borderWidth={1}
                  duration={10}
                />
              )}

              {plan.badge && (
                <span className="inline-flex self-start items-center rounded-full bg-vox-primary/10 text-vox-primary text-xs font-medium px-2.5 py-0.5 mb-4">
                  {plan.badge}
                </span>
              )}

              <h3 className="text-lg font-semibold mb-2">{plan.name}</h3>

              <div className="mb-6">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">/mes</span>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="size-4 text-vox-primary shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href="/sign-up"
                className={`inline-flex items-center justify-center rounded-xl h-9 px-4 text-sm font-medium transition-colors active:scale-[0.98] ${
                  plan.ctaVariant === "filled"
                    ? "bg-vox-primary text-white hover:bg-vox-primary/90"
                    : "border border-border hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          </BlurFade>
        ))}
      </div>
    </section>
  )
}
