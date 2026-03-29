"use client"

import { Mic, CheckCircle, Sparkles } from "lucide-react"
import { BlurFade } from "@/components/ui/blur-fade"

const steps = [
  {
    number: "01",
    title: "Fale",
    description: "Grave a consulta normalmente. O VoxClinic escuta e transcreve em tempo real.",
    icon: Mic,
  },
  {
    number: "02",
    title: "Revise",
    description: "A IA extrai dados clínicos, medicamentos e CIDs. Você revisa antes de salvar.",
    icon: CheckCircle,
  },
  {
    number: "03",
    title: "Pronto",
    description: "Prontuário preenchido, prescrição gerada, próximo paciente. Simples assim.",
    icon: Sparkles,
  },
]

export function HowItWorksSection() {
  return (
    <section id="como-funciona" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <BlurFade delay={0.1} inView>
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-vox-primary tracking-wider uppercase mb-3">Como funciona</p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-white">
              3 passos para nunca mais digitar prontuário
            </h2>
          </div>
        </BlurFade>

        <div className="grid md:grid-cols-3 gap-8 md:gap-6 relative">
          {/* Connecting lines (desktop only) */}
          <div className="hidden md:block absolute top-16 left-[calc(33.33%+12px)] right-[calc(33.33%+12px)] h-px border-t-2 border-dashed border-vox-primary/20" />

          {steps.map((step, i) => (
            <BlurFade key={step.number} delay={0.2 + i * 0.15} inView>
              <div className="relative flex flex-col items-center text-center group">
                <div className="relative mb-6">
                  <div className="flex size-16 items-center justify-center rounded-2xl bg-vox-primary/10 border border-vox-primary/20 transition-all duration-300 group-hover:bg-vox-primary/20 group-hover:scale-105">
                    <step.icon className="size-7 text-vox-primary" />
                  </div>
                  <span className="absolute -top-3 -right-3 text-4xl font-black text-white/[0.04] select-none">
                    {step.number}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-white/60 leading-relaxed max-w-xs">
                  {step.description}
                </p>
              </div>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  )
}
