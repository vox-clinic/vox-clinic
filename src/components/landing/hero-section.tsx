"use client"

import Link from "next/link"
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text"
import { WordRotate } from "@/components/ui/word-rotate"
import { TypingAnimation } from "@/components/ui/typing-animation"
import { BlurFade } from "@/components/ui/blur-fade"
import { Safari } from "@/components/ui/safari"
import { BorderBeam } from "@/components/ui/border-beam"
import { DotPattern } from "@/components/ui/dot-pattern"
import { ChevronRight } from "lucide-react"

export function HeroSection() {
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-20 md:py-28">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        {/* Left column — text */}
        <div className="space-y-6">
          <BlurFade delay={0} inView>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 px-4 py-1.5 text-sm">
              <ChevronRight className="size-3.5 text-vox-primary" />
              <AnimatedGradientText colorFrom="#14B8A6" colorTo="#0D9488">
                CRM com Inteligencia Artificial
              </AnimatedGradientText>
            </div>
          </BlurFade>

          <BlurFade delay={0.1} inView>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              Fale.{" "}
              <br className="hidden sm:block" />
              A <span className="text-vox-primary">IA</span> organiza.
            </h1>
          </BlurFade>

          <BlurFade delay={0.2} inView>
            <div className="flex flex-wrap items-center gap-x-2 text-xl md:text-2xl text-muted-foreground">
              <span>O CRM inteligente para</span>
              <WordRotate
                words={["dentistas", "medicos", "nutricionistas", "esteticistas", "advogados"]}
                className="text-vox-primary font-bold text-xl md:text-2xl"
                duration={2500}
              />
            </div>
          </BlurFade>

          <BlurFade delay={0.3} inView>
            <div className="rounded-xl bg-muted/50 border border-border/60 p-4">
              <TypingAnimation
                duration={40}
                className="text-sm text-muted-foreground font-mono leading-relaxed"
                showCursor
                cursorStyle="line"
              >
                Paciente Maria Silva, 34 anos, retorno de limpeza periodontal. Sem queixas. Gengiva com boa cicatrizacao...
              </TypingAnimation>
            </div>
          </BlurFade>

          <BlurFade delay={0.4} inView>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/sign-up"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-vox-primary px-8 text-sm font-medium text-white hover:bg-vox-primary/90 transition-colors active:scale-[0.98]"
              >
                Comecar Gratis
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-border px-8 text-sm font-medium hover:bg-muted transition-colors active:scale-[0.98]"
              >
                Ver como funciona
              </a>
            </div>
          </BlurFade>

          <BlurFade delay={0.5} inView>
            <p className="text-xs text-muted-foreground">
              Gratis para sempre. Sem cartao de credito.
            </p>
          </BlurFade>
        </div>

        {/* Right column — visual */}
        <BlurFade delay={0.3} inView>
          <div className="relative">
            <DotPattern
              className="opacity-20 [mask-image:radial-gradient(400px_circle_at_center,white,transparent)]"
              cr={1}
              width={20}
              height={20}
            />
            <div className="relative rounded-xl overflow-hidden shadow-2xl">
              <BorderBeam
                colorFrom="#14B8A6"
                colorTo="#0D9488"
                size={200}
                duration={8}
                borderWidth={2}
              />
              <Safari
                url="app.voxclinic.com"
                imageSrc="/screenshots/dashboard.png"
                className="w-full"
              />
            </div>
          </div>
        </BlurFade>
      </div>
    </section>
  )
}
