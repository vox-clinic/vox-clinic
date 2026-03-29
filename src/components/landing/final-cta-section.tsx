"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { BlurFade } from "@/components/ui/blur-fade"

const Particles = dynamic(
  () =>
    import("@/components/ui/particles").then((m) => ({ default: m.Particles })),
  { ssr: false }
)

const footerLinks = {
  Produto: [
    { label: "Funcionalidades", href: "/#features" },
    { label: "Preços", href: "/#pricing" },
    { label: "Documentação", href: "/docs" },
    { label: "Changelog", href: "/changelog" },
  ],
  Recursos: [
    { label: "Central de Ajuda", href: "/ajuda" },
    { label: "Status", href: "/status" },
  ],
  Empresa: [
    { label: "Sobre", href: "/sobre" },
    { label: "Contato", href: "/contato" },
  ],
  Legal: [
    { label: "Privacidade", href: "/privacidade" },
    { label: "Termos", href: "/termos" },
    { label: "DPO", href: "/dpo" },
    { label: "LGPD", href: "/lgpd" },
  ],
}

export function FinalCTASection() {
  return (
    <section className="bg-gradient-to-br from-[#0a0f1a] via-[#0a0f1a] to-teal-950/20 text-white py-20 md:py-28 relative overflow-hidden">
      {/* CTA */}
      <div className="max-w-2xl mx-auto px-4 text-center relative z-10">
        {/* Gradient background glow */}
        <div className="absolute inset-0 -top-20 mx-auto max-w-lg h-64 bg-vox-primary/10 blur-[100px] rounded-full pointer-events-none" />

        <BlurFade inView delay={0.05}>
          <p className="text-sm font-semibold text-vox-primary tracking-wider uppercase mb-3">
            Comece agora
          </p>
        </BlurFade>

        <BlurFade inView delay={0.15}>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Pronto para transformar sua clínica?
          </h2>
        </BlurFade>

        <BlurFade inView delay={0.25}>
          <p className="text-lg text-white/70 mb-10">
            Junte-se a centenas de profissionais que já economizam horas por
            semana com o VoxClinic.
          </p>
        </BlurFade>

        <BlurFade inView delay={0.35}>
          <div className="relative inline-block">
            {/* Animated glow behind button */}
            <div className="absolute -inset-1 bg-vox-primary/30 blur-lg rounded-xl animate-pulse pointer-events-none" />
            <Link
              href="/sign-up"
              className="relative inline-flex items-center justify-center h-12 px-10 text-base font-medium rounded-xl bg-vox-primary text-white hover:bg-vox-primary/90 transition-colors active:scale-[0.98]"
            >
              Começar grátis — 14 dias, sem cartão
            </Link>
          </div>
          <p className="text-sm text-white/50 mt-4">
            <Link
              href="/contato"
              className="underline underline-offset-4 hover:text-white/80 transition-colors"
            >
              Ou agende uma demonstração
            </Link>
          </p>
        </BlurFade>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 mt-16 pt-10 max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-gray-400 mb-3">
                {category}
              </h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 pt-6 pb-2 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <p>&copy; 2026 VoxClinic. Todos os direitos reservados.</p>
          <div className="flex gap-4">
            <a
              href="https://twitter.com/voxclinic"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Twitter
            </a>
            <a
              href="https://linkedin.com/company/voxclinic"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              LinkedIn
            </a>
            <a
              href="https://instagram.com/voxclinic"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Instagram
            </a>
          </div>
        </div>
      </footer>
    </section>
  )
}
