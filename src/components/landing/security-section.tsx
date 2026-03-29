"use client"

import { Shield, Globe, FileCheck, Building2, PenTool, Cloud } from "lucide-react"
import { BlurFade } from "@/components/ui/blur-fade"
import { DotPattern } from "@/components/ui/dot-pattern"

const securityCards = [
  {
    icon: Shield,
    title: "Criptografia AES-256",
    description: "Dados sensíveis criptografados em repouso e em trânsito",
  },
  {
    icon: Globe,
    title: "Dados no Brasil",
    description:
      "Servidores em São Paulo (sa-east-1). Seus dados nunca saem do país",
  },
  {
    icon: FileCheck,
    title: "LGPD Compliant",
    description:
      "Consentimento, auditoria, DPO, direito de exclusão. Tudo implementado",
  },
  {
    icon: Building2,
    title: "CFM 1.821/2007",
    description:
      "Prontuário eletrônico conforme resolução do Conselho Federal de Medicina",
  },
  {
    icon: PenTool,
    title: "Assinatura Digital",
    description: "Prescrições e atestados com assinatura ICP-Brasil",
  },
  {
    icon: Cloud,
    title: "Backup Automático",
    description: "Backup diário. Retenção de 20 anos conforme CFM",
  },
]

export function SecuritySection() {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      <DotPattern className="absolute inset-0 size-full opacity-[0.1] [mask-image:radial-gradient(ellipse_at_center,white_20%,transparent_70%)]" />
      <div className="relative max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
        <BlurFade inView delay={0.1}>
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-vox-primary tracking-wider uppercase mb-3">Segurança & Compliance</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Seus dados protegidos por padrões internacionais
            </h2>
          </div>
        </BlurFade>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {securityCards.map((card, i) => (
            <BlurFade key={card.title} inView delay={0.1 * (i + 1)}>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 h-full">
                <div className="flex size-10 items-center justify-center rounded-xl bg-vox-primary/10 mb-4">
                  <card.icon className="size-5 text-vox-primary" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">{card.title}</h3>
                <p className="text-sm text-gray-400">
                  {card.description}
                </p>
              </div>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  )
}
