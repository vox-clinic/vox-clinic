"use client"

import {
  Mic,
  Sparkles,
  ClipboardList,
  CalendarDays,
  Users,
  MessageCircle,
  BarChart3,
  Shield,
} from "lucide-react"
import { MagicCard } from "@/components/ui/magic-card"
import { BlurFade } from "@/components/ui/blur-fade"

const features = [
  {
    icon: Mic,
    title: "Transcricao por Voz",
    description:
      "Grave e a IA transcreve automaticamente com vocabulario medico em portugues",
    className: "lg:col-span-2",
  },
  {
    icon: Sparkles,
    title: "Onboarding Inteligente",
    description:
      "Workspace personalizado por profissao, gerado por IA em segundos",
  },
  {
    icon: ClipboardList,
    title: "Prontuario Estruturado",
    description:
      "Dados extraidos e organizados automaticamente no prontuario do paciente",
  },
  {
    icon: CalendarDays,
    title: "Agenda Inteligente",
    description:
      "Calendario com deteccao de conflitos, drag & drop e lembretes automaticos",
  },
  {
    icon: Users,
    title: "Multi-profissao",
    description:
      "Dentistas, medicos, nutricionistas, esteticistas e advogados",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp Business",
    description:
      "Comunicacao integrada com seus pacientes via WhatsApp Business API",
    className: "lg:col-span-2",
  },
  {
    icon: BarChart3,
    title: "Relatorios",
    description:
      "Tendencias, receita mensal, taxa de retorno e no-show em tempo real",
  },
  {
    icon: Shield,
    title: "Conformidade LGPD",
    description:
      "Consentimento gravado, auditoria completa e dados armazenados no Brasil",
  },
]

export function FeaturesBentoSection() {
  return (
    <section id="features" className="py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
        <BlurFade inView>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">
              Tudo que voce precisa em um so lugar
            </h2>
            <p className="mt-3 text-muted-foreground">
              Funcionalidades pensadas para profissionais de saude
            </p>
          </div>
        </BlurFade>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, i) => (
            <BlurFade
              key={feature.title}
              inView
              delay={0.05 * i}
              className={feature.className}
            >
              <MagicCard className="p-6 cursor-default h-full">
                <div className="flex flex-col gap-3">
                  <feature.icon className="size-8 text-vox-primary" />
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </MagicCard>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  )
}
