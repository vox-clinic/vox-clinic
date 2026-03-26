"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { BlurFade } from "@/components/ui/blur-fade"

const Particles = dynamic(
  () => import("@/components/ui/particles").then((m) => ({ default: m.Particles })),
  { ssr: false }
)

export function FinalCTASection() {
  return (
    <section className="bg-gradient-to-br from-gray-900 via-gray-900 to-vox-primary/20 text-white py-20 md:py-28 relative overflow-hidden">
      <Particles
        className="absolute inset-0 size-full"
        quantity={40}
        color="#14B8A6"
        size={0.6}
        staticity={30}
      />

      <div className="max-w-2xl mx-auto px-4 text-center relative z-10">
        <BlurFade inView>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Comece a economizar tempo hoje
          </h2>
        </BlurFade>

        <BlurFade inView delay={0.1}>
          <p className="text-lg text-white/70 mb-8">
            Crie sua conta em 30 segundos. Sem cartao de credito.
          </p>
        </BlurFade>

        <BlurFade inView delay={0.2}>
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center h-12 px-10 text-base font-medium rounded-xl bg-vox-primary text-white hover:bg-vox-primary/90 transition-colors active:scale-[0.98]"
          >
            Comecar Gratis &rarr;
          </Link>
          <p className="text-sm text-white/50 mt-4">
            Plano gratuito disponivel. Cancele quando quiser.
          </p>
        </BlurFade>
      </div>

      <footer className="relative z-10 border-t border-white/10 mt-16 pt-8 max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/50">
        <p>&copy; 2026 VoxClinic. Todos os direitos reservados.</p>
        <div className="flex gap-6">
          <Link href="/sign-up" className="hover:text-white/80 transition-colors">
            Termos de uso
          </Link>
          <Link href="/sign-up" className="hover:text-white/80 transition-colors">
            Privacidade
          </Link>
        </div>
      </footer>
    </section>
  )
}
