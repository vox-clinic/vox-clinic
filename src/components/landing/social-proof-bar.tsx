"use client"

import { BlurFade } from "@/components/ui/blur-fade"
import { NumberTicker } from "@/components/ui/number-ticker"
import { DotPattern } from "@/components/ui/dot-pattern"
import { Shield, Database, FileCheck } from "lucide-react"

const stats = [
  { value: 500, suffix: "+", label: "profissionais" },
  { value: 100, suffix: "k+", label: "consultas" },
  { value: 50, suffix: "k+", label: "pacientes" },
  { value: 4.9, suffix: "★", label: "avaliação", decimals: 1 },
]

const badges = [
  { icon: Shield, label: "LGPD" },
  { icon: Database, label: "Dados no Brasil" },
  { icon: FileCheck, label: "CFM 1.821" },
]

export function SocialProofBar() {
  return (
    <section className="relative border-y border-white/[0.08] py-16 md:py-20 overflow-hidden">
      <DotPattern className="absolute inset-0 size-full opacity-[0.15] [mask-image:radial-gradient(ellipse_at_center,white_30%,transparent_70%)]" />
      <div className="relative max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
        {/* Title */}
        <BlurFade delay={0} inView>
          <p className="text-center text-sm text-gray-400 mb-10">
            Usado por profissionais de saúde em todo o Brasil
          </p>
        </BlurFade>

        {/* Stats row with staggered reveal */}
        <div className="flex flex-wrap items-center justify-center gap-0">
          {stats.map((stat, i) => (
            <BlurFade key={stat.label} delay={0.1 * i} inView>
              <div className="flex items-center">
                <div className="text-center min-w-[100px] px-4 sm:px-6 md:px-8">
                  <div className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                    <NumberTicker
                      value={stat.value}
                      decimalPlaces={stat.decimals ?? 0}
                      className="text-2xl md:text-3xl font-bold text-white"
                    />
                    <span className="text-vox-primary">{stat.suffix}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
                </div>
                {i < stats.length - 1 && (
                  <div className="hidden sm:block h-8 w-px bg-white/[0.08]" />
                )}
              </div>
            </BlurFade>
          ))}
        </div>

        {/* Credibility badges with pulse */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-10 pt-8 border-t border-white/[0.08]">
          {badges.map((badge, i) => (
            <BlurFade key={badge.label} delay={0.4 + 0.1 * i} inView>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs text-gray-400 animate-pulse [animation-duration:3s]">
                <badge.icon className="size-3.5 text-vox-primary" />
                {badge.label}
              </div>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  )
}
