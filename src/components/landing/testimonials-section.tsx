"use client"

import { Marquee } from "@/components/ui/marquee"
import { BlurFade } from "@/components/ui/blur-fade"

const testimonials = [
  {
    quote:
      "Economizo 40 minutos por dia com a transcricao automatica. Mudou minha rotina.",
    name: "Dra. Ana Beatriz",
    profession: "Dentista",
  },
  {
    quote:
      "O onboarding criou meu workspace perfeito em 2 minutos. Impressionante.",
    name: "Dr. Carlos Mendes",
    profession: "Nutricionista",
  },
  {
    quote:
      "Finalmente um sistema que entende vocabulario medico em portugues.",
    name: "Dra. Juliana Costa",
    profession: "Medica",
  },
  {
    quote:
      "A agenda com deteccao de conflitos me salvou de varias confusoes.",
    name: "Dr. Rafael Lima",
    profession: "Esteticista",
  },
  {
    quote:
      "Meus pacientes adoram receber lembretes pelo WhatsApp.",
    name: "Dra. Fernanda Oliveira",
    profession: "Dentista",
  },
  {
    quote:
      "Os relatorios me ajudam a entender melhor o fluxo da clinica.",
    name: "Dr. Pedro Santos",
    profession: "Advogado",
  },
]

function getInitials(name: string) {
  return name
    .replace(/^(Dra?\.\s*)/, "")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
}

function TestimonialCard({
  quote,
  name,
  profession,
}: {
  quote: string
  name: string
  profession: string
}) {
  return (
    <div className="w-[300px] shrink-0 rounded-2xl border border-border/40 bg-card p-5 mx-2">
      <p className="text-sm text-muted-foreground mb-4">&ldquo;{quote}&rdquo;</p>
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-full bg-vox-primary/10 flex items-center justify-center text-vox-primary font-bold text-sm">
          {getInitials(name)}
        </div>
        <div>
          <p className="text-sm font-medium">{name}</p>
          <p className="text-xs text-muted-foreground">{profession}</p>
        </div>
      </div>
    </div>
  )
}

const firstRow = testimonials.slice(0, 3)
const secondRow = testimonials.slice(3)

export function TestimonialsSection() {
  return (
    <section className="py-20 md:py-28 overflow-hidden">
      <BlurFade inView>
        <h2 className="text-3xl md:text-4xl font-bold text-center max-w-5xl mx-auto px-4 mb-12">
          O que dizem nossos usuarios
        </h2>
      </BlurFade>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent z-10" />

        <Marquee pauseOnHover className="mb-4">
          {firstRow.map((t) => (
            <TestimonialCard key={t.name} {...t} />
          ))}
        </Marquee>

        <Marquee reverse pauseOnHover>
          {secondRow.map((t) => (
            <TestimonialCard key={t.name} {...t} />
          ))}
        </Marquee>
      </div>
    </section>
  )
}
