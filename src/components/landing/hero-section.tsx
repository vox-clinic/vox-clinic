"use client"

import Link from "next/link"
import { BlurFade } from "@/components/ui/blur-fade"
import { BorderBeam } from "@/components/ui/border-beam"
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text"
import { Mic, Users, Calendar, BarChart3, ChevronRight, Play } from "lucide-react"

function VoiceWaveform() {
  return (
    <div className="inline-flex items-center gap-[3px] h-8 mx-3 align-middle">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="inline-block w-[3px] rounded-full bg-vox-primary animate-[waveform_1.2s_ease-in-out_infinite]"
          style={{
            animationDelay: `${i * 0.15}s`,
            height: "100%",
          }}
        />
      ))}
      <style>{`
        @keyframes waveform {
          0%, 100% { transform: scaleY(0.3); opacity: 0.4; }
          50% { transform: scaleY(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

function DashboardMockup() {
  return (
    <div className="w-full bg-[#0c1117] text-white p-3 space-y-3 select-none">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-lg bg-vox-primary flex items-center justify-center text-[8px] font-bold">V</div>
          <span className="text-[10px] font-semibold opacity-80">VoxClinic</span>
          <span className="text-[9px] opacity-40 ml-1">clínica exemplo</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-6 w-24 rounded-lg bg-white/5 border border-white/10 flex items-center px-2">
            <span className="text-[8px] opacity-30">Buscar...</span>
          </div>
          <div className="size-6 rounded-full bg-vox-primary/20" />
        </div>
      </div>

      <div className="flex gap-4">
        {/* Sidebar */}
        <div className="hidden sm:flex flex-col gap-1.5 w-28 shrink-0">
          {[
            { icon: BarChart3, label: "Dashboard", active: true },
            { icon: Users, label: "Pacientes", active: false },
            { icon: Calendar, label: "Agenda", active: false },
            { icon: Mic, label: "Consulta", active: false },
          ].map((item) => (
            <div key={item.label} className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[9px] ${item.active ? "bg-vox-primary/15 text-vox-primary font-medium" : "opacity-40"}`}>
              <item.icon className="size-3" />
              {item.label}
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 space-y-3">
          {/* KPI cards */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Pacientes", value: "847", color: "text-vox-primary" },
              { label: "Este Mês", value: "124", color: "text-emerald-400" },
              { label: "Agendados", value: "18", color: "text-white" },
              { label: "Gravações", value: "1.2k", color: "text-vox-primary" },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2">
                <p className="text-[7px] uppercase tracking-wider opacity-40">{kpi.label}</p>
                <p className={`text-sm font-bold ${kpi.color} tabular-nums`}>{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Chart area */}
          <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
            <p className="text-[8px] font-medium opacity-60 mb-2">Receita Mensal</p>
            <div className="flex items-end gap-[3px] h-12">
              {[20, 35, 28, 42, 38, 55, 48, 62, 58, 70, 65, 82].map((h, i) => (
                <div key={i} className="flex-1 rounded-t-sm bg-vox-primary/60 transition-all" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>

          {/* Activity */}
          <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2 space-y-1.5">
            <p className="text-[8px] font-medium opacity-60">Agenda de Hoje</p>
            {[
              { time: "09:00", name: "Maria Silva", proc: "Limpeza" },
              { time: "10:30", name: "João Santos", proc: "Retorno" },
              { time: "14:00", name: "Ana Costa", proc: "Avaliação" },
            ].map((apt) => (
              <div key={apt.time} className="flex items-center gap-2 rounded-md bg-white/[0.02] px-2 py-1">
                <span className="text-[8px] text-vox-primary font-mono tabular-nums">{apt.time}</span>
                <div className="size-4 rounded-full bg-vox-primary/20 flex items-center justify-center text-[6px] font-bold text-vox-primary">{apt.name[0]}</div>
                <span className="text-[8px] opacity-70 flex-1 truncate">{apt.name}</span>
                <span className="text-[7px] rounded-full bg-vox-primary/10 text-vox-primary px-1.5 py-0.5">{apt.proc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

interface HeroSectionProps {
  isAuthenticated?: boolean
  dashboardUrl?: string
}

export function HeroSection({ isAuthenticated = false, dashboardUrl = "/dashboard" }: HeroSectionProps) {
  return (
    <section className="relative bg-[#0a0f1a]">
      {/* Background gradient effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_center,_rgba(20,184,166,0.08)_0%,_transparent_70%)]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 md:px-6 lg:px-8 pt-16 md:pt-24 pb-8 md:pb-12">
        {/* Centered text content */}
        <div className="text-center space-y-6">
          {/* Badge */}
          <BlurFade delay={0.05} inView>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-1.5 text-sm backdrop-blur-sm">
              <ChevronRight className="size-3.5 text-vox-primary" />
              <AnimatedGradientText colorFrom="#14B8A6" colorTo="#5eead4">
                Novo: Prescrição eletrônica com assinatura digital
              </AnimatedGradientText>
              <span className="text-sm">✨</span>
            </div>
          </BlurFade>

          {/* Headline — staggered word reveal with waveform */}
          <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.1]">
            {["Seu", "prontuário,", "preenchido"].map((word, i) => (
              <BlurFade key={word} delay={0.12 + i * 0.08} inView>
                <span className="inline-block mr-[0.3em]">{word}</span>
              </BlurFade>
            ))}
            <br className="hidden sm:block" />
            <BlurFade delay={0.4} inView>
              <span className="inline-flex items-center">
                <VoiceWaveform />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-vox-primary to-teal-300">
                  pela sua voz.
                </span>
              </span>
            </BlurFade>
          </div>

          {/* Subheadline */}
          <BlurFade delay={0.5} inView>
            <p className="max-w-2xl mx-auto text-base sm:text-lg md:text-xl text-gray-400 leading-relaxed">
              Fale durante a consulta e o VoxClinic transcreve, extrai dados e preenche o prontuário automaticamente.
              Para médicos, dentistas e profissionais de saúde.
            </p>
          </BlurFade>

          {/* CTAs */}
          <BlurFade delay={0.6} inView>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Link
                href={isAuthenticated ? dashboardUrl : "/sign-up"}
                className="inline-flex h-12 items-center justify-center rounded-xl bg-vox-primary px-8 text-sm font-semibold text-white hover:bg-vox-primary/90 transition-all active:scale-[0.98] shadow-lg shadow-vox-primary/25"
              >
                {isAuthenticated ? "Ir para o Dashboard" : "Começar grátis"}
              </Link>
              <a
                href="#como-funciona"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/15 px-8 text-sm font-medium text-white hover:bg-white/[0.05] transition-all active:scale-[0.98]"
              >
                <Play className="size-4" />
                Ver como funciona
              </a>
            </div>
          </BlurFade>

          {/* Trust signals */}
          <BlurFade delay={0.7} inView>
            <div className="flex flex-col items-center gap-2 pt-2">
              <p className="text-xs text-gray-500">
                Grátis por 14 dias &bull; Sem cartão &bull; Cancele quando quiser
              </p>
              <div className="flex items-center gap-4 text-[11px] text-gray-600">
                <span className="flex items-center gap-1">
                  <svg className="size-3 text-vox-primary" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  LGPD compliant
                </span>
                <span className="flex items-center gap-1">
                  <svg className="size-3 text-vox-primary" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  Dados criptografados
                </span>
                <span className="flex items-center gap-1">
                  <svg className="size-3 text-vox-primary" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  +500 profissionais
                </span>
              </div>
            </div>
          </BlurFade>
        </div>
      </div>

      {/* Product mockup with glow + float animation */}
      <div className="relative max-w-4xl mx-auto px-4 md:px-6 lg:px-8 pb-16 md:pb-24">
        <BlurFade delay={0.8} inView>
          <div className="relative animate-[float_6s_ease-in-out_infinite]">
            {/* Glow effect behind mockup */}
            <div className="pointer-events-none absolute -inset-4 md:-inset-8 bg-[radial-gradient(ellipse_at_center,_rgba(20,184,166,0.15)_0%,_transparent_60%)] blur-2xl" />

            {/* Mockup card */}
            <div className="relative rounded-xl md:rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
              <BorderBeam
                colorFrom="#14B8A6"
                colorTo="#0D9488"
                size={200}
                duration={8}
                borderWidth={1.5}
              />
              <div className="rounded-xl md:rounded-2xl border border-white/[0.08] overflow-hidden bg-[#0c1117]">
                {/* Browser top bar */}
                <div className="flex items-center gap-2 bg-[#161b22] border-b border-white/[0.06] px-3 py-2.5">
                  <div className="flex gap-1.5">
                    <div className="size-2.5 rounded-full bg-[#ff5f57]" />
                    <div className="size-2.5 rounded-full bg-[#febc2e]" />
                    <div className="size-2.5 rounded-full bg-[#28c840]" />
                  </div>
                  <div className="flex-1 mx-8">
                    <div className="h-5 rounded-md bg-white/[0.06] flex items-center justify-center">
                      <span className="text-[9px] text-white/30">app.voxclinic.com</span>
                    </div>
                  </div>
                </div>
                <DashboardMockup />
              </div>
            </div>
          </div>
          <style>{`
            @keyframes float {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-8px); }
            }
          `}</style>
        </BlurFade>
      </div>
    </section>
  )
}
