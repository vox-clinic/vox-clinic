"use client"

import { BlurFade } from "@/components/ui/blur-fade"
import { Marquee } from "@/components/ui/marquee"

const testimonials = [
  {
    quote:
      "Economizo 40 minutos por dia só com a transcrição automática. Minha rotina mudou completamente desde que comecei a usar.",
    name: "Dra. Ana Beatriz Ferreira",
    profession: "Dermatologista",
    clinic: "Clínica Pele Viva",
  },
  {
    quote:
      "O agendamento online reduziu as faltas em 60%. Os lembretes por WhatsApp são um diferencial enorme para os pacientes.",
    name: "Dr. Carlos Eduardo Mendes",
    profession: "Nutricionista",
    clinic: "NutriVida Consultoria",
  },
  {
    quote:
      "Finalmente um sistema que entende vocabulário médico em português. A IA extrai CID, procedimentos e medicações sem eu digitar nada.",
    name: "Dra. Juliana Costa Ribeiro",
    profession: "Clínica Geral",
    clinic: "Saúde Integrada",
  },
  {
    quote:
      "A prescrição digital com assinatura ICP-Brasil simplificou muito meu fluxo. Antes eu perdia tempo com papel e carimbo.",
    name: "Dr. Rafael Lima Santos",
    profession: "Ortopedista",
    clinic: "OrtoCenter",
  },
  {
    quote:
      "Migrei de outro sistema em uma tarde. O import por CSV trouxe todos os meus 2.000 pacientes sem perder nenhum dado.",
    name: "Dra. Fernanda Oliveira",
    profession: "Dentista",
    clinic: "Odonto Excellence",
  },
  {
    quote:
      "O financeiro integrado me dá uma visão clara de receita, inadimplência e comissões. Não preciso mais de planilha.",
    name: "Dr. Pedro Henrique Santos",
    profession: "Fisioterapeuta",
    clinic: "FisioMove",
  },
]

function getInitials(name: string) {
  return name
    .replace(/^(Dra?\.\s*)/, "")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
}

function TestimonialCard({
  quote,
  name,
  profession,
  clinic,
}: {
  quote: string
  name: string
  profession: string
  clinic: string
}) {
  return (
    <div className="w-[320px] shrink-0 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur-sm">
      <p className="text-sm text-white/70 leading-relaxed line-clamp-3 mb-4">
        &ldquo;{quote}&rdquo;
      </p>
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-vox-primary/10 text-sm font-bold text-vox-primary">
          {getInitials(name)}
        </div>
        <div>
          <p className="text-sm font-medium text-white">{name}</p>
          <p className="text-xs text-white/50">
            {profession} &middot; {clinic}
          </p>
        </div>
      </div>
    </div>
  )
}

const firstRow = testimonials.slice(0, 3)
const secondRow = testimonials.slice(3, 6)

export function TestimonialsSection() {
  return (
    <section className="py-20 md:py-28 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 mb-12">
        <BlurFade inView>
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-3">
            Usado por profissionais que valorizam seu tempo
          </h2>
          <p className="text-center text-gray-400 text-sm">
            Veja o que dizem quem já transformou sua rotina com o VoxClinic.
          </p>
        </BlurFade>
      </div>

      <div className="space-y-4">
        <Marquee pauseOnHover className="[--duration:35s]">
          {firstRow.map((t) => (
            <TestimonialCard key={t.name} {...t} />
          ))}
        </Marquee>

        <Marquee pauseOnHover reverse className="[--duration:35s]">
          {secondRow.map((t) => (
            <TestimonialCard key={t.name} {...t} />
          ))}
        </Marquee>
      </div>
    </section>
  )
}
