"use client"

import { Mic, Sparkles, ClipboardCheck } from "lucide-react"
import { BlurFade } from "@/components/ui/blur-fade"

const steps = [
  {
    icon: Mic,
    number: "1",
    title: "Fale",
    description:
      "Grave ou dite suas observacoes durante ou apos a consulta.",
  },
  {
    icon: Sparkles,
    number: "2",
    title: "A IA processa",
    description:
      "Transcricao automatica com vocabulario medico e extracao inteligente de dados.",
  },
  {
    icon: ClipboardCheck,
    number: "3",
    title: "Prontuario pronto",
    description:
      "Revise o resumo gerado, ajuste se necessario e confirme com um clique.",
  },
]

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 md:py-28">
      <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8">
        <BlurFade delay={0} inView>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Como funciona
            </h2>
            <p className="mt-3 text-lg text-muted-foreground">
              Da sua voz ao prontuario completo em 3 passos
            </p>
          </div>
        </BlurFade>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connecting line (desktop only) */}
          <div className="hidden md:block absolute top-[4.5rem] left-[20%] right-[20%] h-px border-t-2 border-dashed border-border/60" />

          {steps.map((step, i) => (
            <BlurFade key={step.number} delay={0.1 + i * 0.15} inView>
              <div className="relative rounded-2xl border border-border/40 bg-card p-6 text-center">
                <div className="size-8 rounded-full bg-vox-primary/10 text-vox-primary font-bold flex items-center justify-center mx-auto mb-4 text-sm">
                  {step.number}
                </div>
                <step.icon className="size-10 text-vox-primary mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
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
