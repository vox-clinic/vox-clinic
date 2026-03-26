"use client"

import dynamic from "next/dynamic"
import { Shield, Lock, FileSearch, Timer } from "lucide-react"
import { BlurFade } from "@/components/ui/blur-fade"

const Globe = dynamic(
  () => import("@/components/ui/globe").then((m) => ({ default: m.Globe })),
  {
    ssr: false,
    loading: () => (
      <div className="aspect-square w-full rounded-full bg-vox-primary/10 animate-pulse" />
    ),
  }
)

const trustPoints = [
  {
    icon: Shield,
    text: "Dados armazenados no Brasil (sa-east-1)",
  },
  {
    icon: Lock,
    text: "Consentimento LGPD obrigatorio antes de gravar",
  },
  {
    icon: FileSearch,
    text: "Auditoria completa de todas as acoes",
  },
  {
    icon: Timer,
    text: "URLs de audio com expiracao de 5 minutos",
  },
]

const BRAZIL_GLOBE_CONFIG = {
  width: 800,
  height: 800,
  onRender: () => {},
  devicePixelRatio: 2,
  phi: 2.2,
  theta: -0.4,
  dark: 0,
  diffuse: 0.4,
  mapSamples: 16000,
  mapBrightness: 1.2,
  baseColor: [1, 1, 1] as [number, number, number],
  markerColor: [20 / 255, 184 / 255, 166 / 255] as [number, number, number],
  glowColor: [1, 1, 1] as [number, number, number],
  markers: [
    { location: [-23.5505, -46.6333] as [number, number], size: 0.12 },
    { location: [-22.9068, -43.1729] as [number, number], size: 0.1 },
    { location: [-15.7975, -47.8919] as [number, number], size: 0.08 },
    { location: [-3.119, -60.0217] as [number, number], size: 0.06 },
    { location: [-30.0346, -51.2177] as [number, number], size: 0.07 },
  ],
}

export function SecuritySection() {
  return (
    <section className="py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <BlurFade inView>
            <div>
              <h2 className="text-3xl md:text-4xl font-bold">
                Seguranca e conformidade LGPD
              </h2>
              <p className="mt-3 text-muted-foreground">
                Seus dados e os dos seus pacientes protegidos por design
              </p>

              <div className="mt-8 space-y-1">
                {trustPoints.map((point) => (
                  <div
                    key={point.text}
                    className="flex items-start gap-3 py-3"
                  >
                    <point.icon className="size-5 text-vox-primary shrink-0 mt-0.5" />
                    <p className="text-sm">{point.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </BlurFade>

          <BlurFade inView delay={0.2}>
            <div className="relative aspect-square max-w-[400px] mx-auto">
              <Globe config={BRAZIL_GLOBE_CONFIG} />
            </div>
          </BlurFade>
        </div>
      </div>
    </section>
  )
}
