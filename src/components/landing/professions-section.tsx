"use client"

import {
  Stethoscope,
  Cross,
  Brain,
  Activity,
  Apple,
  Sparkles,
  Scissors,
  Ear,
  Scale,
  Heart,
} from "lucide-react"
import { BlurFade } from "@/components/ui/blur-fade"
import { Ripple } from "@/components/ui/ripple"
import type { LucideIcon } from "lucide-react"

interface Profession {
  icon: LucideIcon
  name: string
  tagline: string
}

const professions: Profession[] = [
  { icon: Stethoscope, name: "Medicina", tagline: "Prontuário clínico completo com CID-10" },
  { icon: Cross, name: "Odontologia", tagline: "Odontograma e procedimentos por dente" },
  { icon: Brain, name: "Psicologia", tagline: "Sessões com anotações e evolução" },
  { icon: Activity, name: "Fisioterapia", tagline: "Exercícios, séries e evolução funcional" },
  { icon: Apple, name: "Nutrição", tagline: "Bioimpedância e plano alimentar" },
  { icon: Sparkles, name: "Dermatologia", tagline: "Imagens clínicas com comparativo" },
  { icon: Scissors, name: "Estética", tagline: "Protocolos, fotos antes/depois" },
  { icon: Ear, name: "Fonoaudiologia", tagline: "Gravações e análise de evolução" },
  { icon: Scale, name: "Advocacia", tagline: "Consultas, pareceres e audiências" },
  { icon: Heart, name: "Veterinária", tagline: "Fichas por animal com tutor vinculado" },
]

export function ProfessionsSection() {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      <div className="relative max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
        <BlurFade inView>
          <div className="relative text-center mb-14">
            <Ripple className="absolute inset-0 opacity-[0.07]" />
            <p className="text-sm font-semibold text-vox-primary tracking-wider uppercase mb-3">Especialidades</p>
            <h2 className="relative text-3xl md:text-4xl font-bold tracking-tight text-white">
              Feito para quem cuida de pessoas
            </h2>
          </div>
        </BlurFade>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {professions.map((profession, i) => (
            <BlurFade key={profession.name} inView delay={0.08 * i}>
              <div className="flex flex-col items-center text-center rounded-2xl border border-white/10 bg-white/5 p-5 h-full hover:border-vox-primary/30 hover:bg-white/10 hover:scale-[1.03] transition-all duration-200">
                <div className="size-12 rounded-xl bg-vox-primary/10 flex items-center justify-center mb-3">
                  <profession.icon className="size-6 text-vox-primary" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">{profession.name}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{profession.tagline}</p>
              </div>
            </BlurFade>
          ))}
        </div>

        <BlurFade inView delay={0.4}>
          <p className="text-center mt-10 text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Templates, campos e fluxos personalizados para sua área. A IA adapta o workspace automaticamente.
          </p>
        </BlurFade>
      </div>
    </section>
  )
}
