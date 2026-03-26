"use client"

import { AudioWaveform, FileText, Database, ArrowRight, ArrowDown } from "lucide-react"
import { BlurFade } from "@/components/ui/blur-fade"
import { ShineBorder } from "@/components/ui/shine-border"

const structuredData = [
  { label: "Nome", value: "Maria Silva" },
  { label: "Idade", value: "34 anos" },
  { label: "Procedimento", value: "Limpeza periodontal" },
  { label: "Status", value: "Retorno" },
]

export function AIShowcaseSection() {
  return (
    <section className="bg-muted/30 py-20 md:py-28">
      <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8">
        <BlurFade inView>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">
              Inteligencia Artificial que entende saude
            </h2>
            <p className="mt-3 text-muted-foreground">
              Do audio bruto ao prontuario estruturado — automaticamente
            </p>
          </div>
        </BlurFade>

        <BlurFade inView delay={0.15}>
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
            {/* Stage 1: Audio */}
            <div className="flex-1 w-full rounded-2xl border border-border/40 p-5 bg-card">
              <div className="flex flex-col gap-3">
                <AudioWaveform className="size-8 text-vox-primary" />
                <h3 className="text-lg font-semibold">Audio</h3>
                <p className="text-sm text-muted-foreground">
                  {"\uD83C\uDFA4"} 2min 34s de gravacao
                </p>
              </div>
            </div>

            {/* Arrow 1 */}
            <ArrowRight className="hidden md:block size-6 text-muted-foreground shrink-0" />
            <ArrowDown className="md:hidden size-6 text-muted-foreground shrink-0" />

            {/* Stage 2: Transcricao */}
            <div className="flex-1 w-full rounded-2xl border border-border/40 p-5 bg-card">
              <div className="flex flex-col gap-3">
                <FileText className="size-8 text-vox-primary" />
                <h3 className="text-lg font-semibold">Transcricao</h3>
                <p className="text-sm text-muted-foreground">
                  Paciente Maria Silva, 34 anos, retorno de limpeza...
                </p>
              </div>
            </div>

            {/* Arrow 2 */}
            <ArrowRight className="hidden md:block size-6 text-muted-foreground shrink-0" />
            <ArrowDown className="md:hidden size-6 text-muted-foreground shrink-0" />

            {/* Stage 3: Dados Estruturados */}
            <div className="relative flex-1 w-full rounded-2xl border border-border/40 p-5 bg-card overflow-hidden">
              <ShineBorder
                shineColor={["#14B8A6", "#10B981"]}
                borderWidth={1.5}
                duration={10}
              />
              <div className="flex flex-col gap-3">
                <Database className="size-8 text-vox-primary" />
                <h3 className="text-lg font-semibold">Dados Estruturados</h3>
                <div className="space-y-1.5">
                  {structuredData.map((item) => (
                    <div key={item.label} className="text-sm">
                      <span className="font-medium">{item.label}:</span>{" "}
                      <span className="text-muted-foreground">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </BlurFade>
      </div>
    </section>
  )
}
