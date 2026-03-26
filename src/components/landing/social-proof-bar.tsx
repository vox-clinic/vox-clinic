"use client"

import { BlurFade } from "@/components/ui/blur-fade"
import { NumberTicker } from "@/components/ui/number-ticker"

const stats = [
  { value: 500, suffix: "+", label: "profissionais ativos" },
  { value: 50000, suffix: "+", label: "consultas registradas" },
  { value: 99.8, suffix: "%", label: "uptime garantido", decimals: 1 },
]

export function SocialProofBar() {
  return (
    <section className="bg-muted/30 border-y border-border/40 py-12">
      <div className="max-w-5xl mx-auto px-4">
        <BlurFade delay={0} inView>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold tracking-tight">
                  <NumberTicker
                    value={stat.value}
                    decimalPlaces={stat.decimals ?? 0}
                    className="text-3xl md:text-4xl font-bold"
                  />
                  <span className="text-vox-primary">{stat.suffix}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </BlurFade>
      </div>
    </section>
  )
}
