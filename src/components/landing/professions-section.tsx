"use client"

import { BlurFade } from "@/components/ui/blur-fade"
import { WordRotate } from "@/components/ui/word-rotate"

const professions = [
  {
    name: "Dentista",
    procedures: ["Limpeza", "Clareamento", "Implante", "Ortodontia"],
  },
  {
    name: "Nutricionista",
    procedures: ["Bioimpedancia", "Plano alimentar", "Recordatorio 24h"],
  },
  {
    name: "Advogado",
    procedures: ["Consulta inicial", "Parecer juridico", "Audiencia"],
  },
]

export function ProfessionsSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8">
        <BlurFade inView>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">
              Feito sob medida para sua profissao
            </h2>
            <div className="flex justify-center mt-6">
              <WordRotate
                words={[
                  "Dentistas",
                  "Medicos",
                  "Nutricionistas",
                  "Esteticistas",
                  "Advogados",
                ]}
                className="text-4xl md:text-5xl font-bold text-vox-primary"
              />
            </div>
          </div>
        </BlurFade>

        <div className="grid md:grid-cols-3 gap-6">
          {professions.map((profession, i) => (
            <BlurFade key={profession.name} inView delay={0.1 * i}>
              <div className="rounded-2xl border border-border/40 p-6 bg-card h-full">
                <h3 className="text-lg font-semibold mb-4">
                  {profession.name}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profession.procedures.map((procedure) => (
                    <span
                      key={procedure}
                      className="inline-flex items-center rounded-full bg-vox-primary/10 text-vox-primary text-xs px-2.5 py-0.5"
                    >
                      {procedure}
                    </span>
                  ))}
                </div>
              </div>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  )
}
