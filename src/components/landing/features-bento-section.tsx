"use client"

import { useState } from "react"
import {
  Mic,
  MicOff,
  FileText,
  Database,
  CheckCircle2,
  ClipboardList,
  History,
  Stethoscope,
  Pill,
  FolderOpen,
  Camera,
  AudioLines,
  FileSpreadsheet,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MessageCircle,
  Send,
  DollarSign,
  TrendingUp,
  CreditCard,
  Receipt,
  BarChart3,
  Phone,
  Video,
  Star,
  Mail,
} from "lucide-react"
import dynamic from "next/dynamic"
import { BlurFade } from "@/components/ui/blur-fade"

const Particles = dynamic(
  () => import("@/components/ui/particles").then((m) => ({ default: m.Particles })),
  { ssr: false }
)

/* ─── Mockup sub-components ─── */

function MockupShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full rounded-xl border border-white/[0.08] overflow-hidden bg-[#0c1117] text-white select-none">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 bg-[#161b22] border-b border-white/[0.06] px-3 py-2">
        <div className="flex gap-1.5">
          <div className="size-2 rounded-full bg-[#ff5f57]" />
          <div className="size-2 rounded-full bg-[#febc2e]" />
          <div className="size-2 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 mx-6">
          <div className="h-4 rounded-md bg-white/[0.06] flex items-center justify-center">
            <span className="text-[8px] text-white/30">app.voxclinic.com</span>
          </div>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

/* ─── [01] IA de Voz mockups ─── */

function GravacaoMockup() {
  return (
    <MockupShell>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="size-5 rounded-lg bg-vox-primary/20 flex items-center justify-center">
            <Mic className="size-3 text-vox-primary" />
          </div>
          <span className="text-[10px] font-medium opacity-80">Gravando consulta...</span>
          <span className="ml-auto text-[9px] font-mono text-red-400 tabular-nums">02:34</span>
          <div className="size-2 rounded-full bg-red-500 animate-pulse" />
        </div>
        {/* Waveform */}
        <div className="flex items-center justify-center gap-[2px] h-16 px-2">
          {[20, 45, 30, 60, 25, 70, 40, 55, 35, 65, 28, 50, 38, 72, 22, 58, 42, 68, 32, 52, 48, 62, 30, 55, 40, 70, 35, 45, 60, 25].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-full bg-vox-primary/70"
              style={{ height: `${h}%`, opacity: i > 22 ? 0.3 : 1 }}
            />
          ))}
        </div>
        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <button className="size-10 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
            <MicOff className="size-4 text-red-400" />
          </button>
        </div>
        <p className="text-[8px] text-center opacity-40">Áudio capturado em tempo real com Whisper</p>
      </div>
    </MockupShell>
  )
}

function TranscricaoMockup() {
  return (
    <MockupShell>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-vox-primary" />
          <span className="text-[10px] font-medium opacity-80">Transcrição</span>
        </div>
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 space-y-2">
          <p className="text-[9px] leading-relaxed opacity-70">
            Paciente <span className="text-vox-primary font-medium">Maria Silva</span>, <span className="text-amber-400 font-medium">34 anos</span>, retorno de <span className="text-emerald-400 font-medium">limpeza periodontal</span>. Sem queixas. Gengiva com boa cicatrização. Orientei uso de fio dental diário e retorno em <span className="text-amber-400 font-medium">6 meses</span>.
          </p>
          <p className="text-[9px] leading-relaxed opacity-70">
            Pressão arterial <span className="text-emerald-400 font-medium">120/80 mmHg</span>. Prescrevi <span className="text-vox-primary font-medium">Periogard</span> por 7 dias.
          </p>
        </div>
        <div className="flex gap-1.5">
          <span className="text-[7px] rounded-full bg-vox-primary/10 text-vox-primary px-2 py-0.5">Paciente</span>
          <span className="text-[7px] rounded-full bg-amber-400/10 text-amber-400 px-2 py-0.5">Dados</span>
          <span className="text-[7px] rounded-full bg-emerald-400/10 text-emerald-400 px-2 py-0.5">Procedimento</span>
        </div>
      </div>
    </MockupShell>
  )
}

function ExtracaoMockup() {
  return (
    <MockupShell>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Database className="size-4 text-vox-primary" />
          <span className="text-[10px] font-medium opacity-80">Dados extraídos pela IA</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Paciente", value: "Maria Silva" },
            { label: "Idade", value: "34 anos" },
            { label: "Procedimento", value: "Limpeza periodontal" },
            { label: "Status", value: "Retorno" },
            { label: "PA", value: "120/80 mmHg" },
            { label: "Prescrição", value: "Periogard 7d" },
          ].map((item) => (
            <div key={item.label} className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2">
              <p className="text-[7px] uppercase tracking-wider opacity-40">{item.label}</p>
              <p className="text-[9px] font-medium text-vox-primary">{item.value}</p>
            </div>
          ))}
        </div>
        <div className="rounded-lg bg-vox-primary/5 border border-vox-primary/20 p-2">
          <p className="text-[8px] text-vox-primary">Próximo retorno: 6 meses</p>
        </div>
      </div>
    </MockupShell>
  )
}

function RevisaoMockup() {
  return (
    <MockupShell>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4 text-vox-primary" />
          <span className="text-[10px] font-medium opacity-80">Revisão antes de salvar</span>
        </div>
        {[
          { label: "Queixa principal", value: "Retorno — sem queixas", ok: true },
          { label: "Procedimento", value: "Limpeza periodontal", ok: true },
          { label: "Conduta", value: "Fio dental diário, retorno 6m", ok: true },
          { label: "Prescrição", value: "Periogard 7 dias", ok: false },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2 rounded-lg bg-white/[0.03] border border-white/[0.06] p-2">
            <div className={`size-4 rounded-full flex items-center justify-center text-[8px] ${item.ok ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
              {item.ok ? "✓" : "✎"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[7px] uppercase tracking-wider opacity-40">{item.label}</p>
              <p className="text-[9px] opacity-80 truncate">{item.value}</p>
            </div>
            {!item.ok && (
              <span className="text-[7px] rounded bg-amber-500/10 text-amber-400 px-1.5 py-0.5">Editar</span>
            )}
          </div>
        ))}
        <button className="w-full h-7 rounded-lg bg-vox-primary text-[10px] font-medium text-white">
          Confirmar e salvar no prontuário
        </button>
      </div>
    </MockupShell>
  )
}

/* ─── [02] Prontuário mockup ─── */

function ProntuarioMockup() {
  const tabs = [
    { icon: ClipboardList, label: "Resumo" },
    { icon: History, label: "Histórico" },
    { icon: Stethoscope, label: "Tratamentos" },
    { icon: Pill, label: "Prescrições" },
    { icon: FolderOpen, label: "Documentos" },
    { icon: Camera, label: "Imagens" },
    { icon: AudioLines, label: "Gravações" },
    { icon: FileSpreadsheet, label: "Formulários" },
  ]
  return (
    <MockupShell>
      <div className="space-y-3">
        {/* Patient header */}
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-full bg-vox-primary/20 flex items-center justify-center text-[10px] font-bold text-vox-primary">M</div>
          <div>
            <p className="text-[10px] font-medium">Maria Silva</p>
            <p className="text-[8px] opacity-40">34 anos · CPF 123.456.789-00</p>
          </div>
        </div>
        {/* Tab bar */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {tabs.map((tab, i) => (
            <div
              key={tab.label}
              className={`flex items-center gap-1 shrink-0 rounded-lg px-2 py-1.5 text-[8px] ${
                i === 0 ? "bg-vox-primary/15 text-vox-primary font-medium" : "opacity-40 hover:opacity-60"
              }`}
            >
              <tab.icon className="size-3" />
              {tab.label}
            </div>
          ))}
        </div>
        {/* Sample content — Resumo */}
        <div className="space-y-2">
          <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2">
            <p className="text-[7px] uppercase tracking-wider opacity-40 mb-1">Alergias</p>
            <div className="flex gap-1">
              <span className="text-[8px] rounded-full bg-red-500/10 text-red-400 px-2 py-0.5">Penicilina</span>
              <span className="text-[8px] rounded-full bg-red-500/10 text-red-400 px-2 py-0.5">Dipirona</span>
            </div>
          </div>
          <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2">
            <p className="text-[7px] uppercase tracking-wider opacity-40 mb-1">Última consulta</p>
            <p className="text-[9px] opacity-70">15/03/2026 — Limpeza periodontal — Dr. João</p>
          </div>
          <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2">
            <p className="text-[7px] uppercase tracking-wider opacity-40 mb-1">CID-10</p>
            <span className="text-[8px] rounded-full bg-vox-primary/10 text-vox-primary px-2 py-0.5">K05.1 — Gengivite crônica</span>
          </div>
        </div>
      </div>
    </MockupShell>
  )
}

/* ─── [03] Agenda mockup ─── */

function AgendaMockup() {
  const hours = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00"]
  const days = ["Seg", "Ter", "Qua", "Qui", "Sex"]
  return (
    <MockupShell>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-vox-primary" />
            <span className="text-[10px] font-medium opacity-80">Semana 24–28 Mar</span>
          </div>
          <div className="flex items-center gap-1">
            <ChevronLeft className="size-3 opacity-40" />
            <ChevronRight className="size-3 opacity-40" />
          </div>
        </div>
        {/* View tabs */}
        <div className="flex gap-1">
          {["Semana", "Dia", "Mês", "Lista"].map((v, i) => (
            <span key={v} className={`text-[7px] rounded-md px-2 py-0.5 ${i === 0 ? "bg-vox-primary/15 text-vox-primary" : "opacity-40"}`}>{v}</span>
          ))}
        </div>
        {/* Calendar grid */}
        <div className="grid grid-cols-6 gap-[2px] text-[7px]">
          <div className="opacity-0">.</div>
          {days.map((d) => (
            <div key={d} className="text-center opacity-40 py-1">{d}</div>
          ))}
          {hours.map((h) => (
            <div key={h} className="contents">
              <div className="text-right opacity-30 font-mono pr-1 py-1 tabular-nums">{h}</div>
              {days.map((d) => (
                <div key={`${h}-${d}`} className="rounded bg-white/[0.02] border border-white/[0.04] py-1 min-h-[18px]">
                  {h === "09:00" && d === "Seg" && (
                    <div className="bg-vox-primary/20 text-vox-primary rounded px-0.5 text-[6px] truncate">Maria S.</div>
                  )}
                  {h === "10:00" && d === "Ter" && (
                    <div className="bg-blue-500/20 text-blue-400 rounded px-0.5 text-[6px] truncate">João P.</div>
                  )}
                  {h === "09:00" && d === "Qua" && (
                    <div className="bg-amber-500/20 text-amber-400 rounded px-0.5 text-[6px] truncate">Ana C.</div>
                  )}
                  {h === "11:00" && d === "Qui" && (
                    <div className="bg-purple-500/20 text-purple-400 rounded px-0.5 text-[6px] truncate">Pedro M.</div>
                  )}
                  {h === "08:00" && d === "Sex" && (
                    <div className="bg-emerald-500/20 text-emerald-400 rounded px-0.5 text-[6px] truncate">Carla R.</div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </MockupShell>
  )
}

/* ─── [04] Financeiro mockup ─── */

function FinanceiroMockup() {
  return (
    <MockupShell>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <DollarSign className="size-4 text-vox-primary" />
          <span className="text-[10px] font-medium opacity-80">Financeiro — Mar 2026</span>
        </div>
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Receita", value: "R$ 42.800", color: "text-emerald-400", icon: TrendingUp },
            { label: "A receber", value: "R$ 8.200", color: "text-amber-400", icon: Clock },
            { label: "Despesas", value: "R$ 12.600", color: "text-red-400", icon: CreditCard },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2">
              <div className="flex items-center gap-1 mb-1">
                <kpi.icon className="size-2.5 opacity-40" />
                <p className="text-[7px] uppercase tracking-wider opacity-40">{kpi.label}</p>
              </div>
              <p className={`text-[11px] font-bold ${kpi.color} tabular-nums`}>{kpi.value}</p>
            </div>
          ))}
        </div>
        {/* Chart */}
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2">
          <p className="text-[8px] font-medium opacity-50 mb-2">Fluxo de caixa</p>
          <div className="flex items-end gap-[3px] h-12">
            {[35, 50, 42, 65, 55, 72, 48, 80, 60, 75, 68, 85].map((h, i) => (
              <div key={i} className="flex-1 rounded-t-sm bg-emerald-500/50" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
        {/* Payment methods */}
        <div className="flex gap-1.5">
          {[
            { icon: Receipt, label: "NFS-e" },
            { icon: CreditCard, label: "Cartão" },
            { icon: BarChart3, label: "PIX" },
          ].map((m) => (
            <div key={m.label} className="flex-1 rounded-lg bg-white/[0.03] border border-white/[0.06] p-1.5 flex items-center gap-1">
              <m.icon className="size-3 text-vox-primary" />
              <span className="text-[7px] opacity-60">{m.label}</span>
            </div>
          ))}
        </div>
      </div>
    </MockupShell>
  )
}

/* ─── [05] Comunicação mockup ─── */

function ComunicacaoMockup() {
  return (
    <MockupShell>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="size-4 text-emerald-500" />
          <span className="text-[10px] font-medium opacity-80">Inbox — WhatsApp</span>
          <span className="ml-auto text-[8px] rounded-full bg-emerald-500/20 text-emerald-400 px-2 py-0.5">3 novas</span>
        </div>
        {/* Conversation list */}
        <div className="space-y-1.5">
          {[
            { name: "Maria Silva", msg: "Confirmo presença amanhã 9h!", time: "10:32", unread: false },
            { name: "João Santos", msg: "Preciso remarcar minha consulta", time: "09:15", unread: true },
            { name: "Ana Costa", msg: "Obrigada pelo lembrete!", time: "Ontem", unread: false },
          ].map((conv) => (
            <div key={conv.name} className={`flex items-center gap-2 rounded-lg p-2 ${conv.unread ? "bg-emerald-500/5 border border-emerald-500/20" : "bg-white/[0.02] border border-white/[0.06]"}`}>
              <div className="size-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-[8px] font-bold text-emerald-400">{conv.name[0]}</div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-medium truncate">{conv.name}</p>
                <p className="text-[8px] opacity-50 truncate">{conv.msg}</p>
              </div>
              <span className="text-[7px] opacity-30 shrink-0">{conv.time}</span>
            </div>
          ))}
        </div>
        {/* Action buttons */}
        <div className="flex gap-1.5">
          {[
            { icon: Send, label: "Lembrete" },
            { icon: Phone, label: "Ligar" },
            { icon: Video, label: "Teleconsulta" },
            { icon: Star, label: "NPS" },
            { icon: Mail, label: "E-mail" },
          ].map((a) => (
            <div key={a.label} className="flex-1 rounded-lg bg-white/[0.03] border border-white/[0.06] p-1.5 flex flex-col items-center gap-0.5">
              <a.icon className="size-3 text-vox-primary" />
              <span className="text-[6px] opacity-50">{a.label}</span>
            </div>
          ))}
        </div>
      </div>
    </MockupShell>
  )
}

/* ─── Feature block data ─── */

interface FeatureTab {
  label: string
  mockup: React.ReactNode
}

interface FeatureBlock {
  id: string
  number: string
  title: string
  description: string
  highlight: string
  tabs: FeatureTab[]
}

const featureBlocks: FeatureBlock[] = [
  {
    id: "ia-voz",
    number: "01",
    title: "Fale. A IA transcreve e organiza.",
    description:
      "Grave a consulta com um clique. O VoxClinic transcreve com Whisper, extrai dados estruturados com Claude, e preenche o prontuário automaticamente. Você só revisa e confirma.",
    highlight: "O profissional sempre revisa antes de salvar",
    tabs: [
      { label: "Gravação", mockup: <GravacaoMockup /> },
      { label: "Transcrição", mockup: <TranscricaoMockup /> },
      { label: "Extração", mockup: <ExtracaoMockup /> },
      { label: "Revisão", mockup: <RevisaoMockup /> },
    ],
  },
  {
    id: "prontuario",
    number: "02",
    title: "Tudo sobre o paciente, em um lugar só.",
    description:
      "Prontuário com 8 abas: resumo, histórico, tratamentos, prescrições, documentos, imagens clínicas, gravações e formulários personalizados.",
    highlight: "Templates por especialidade · CID-10 · ANVISA",
    tabs: [{ label: "Prontuário", mockup: <ProntuarioMockup /> }],
  },
  {
    id: "agenda",
    number: "03",
    title: "Sua agenda trabalha para você.",
    description:
      "Visualização por semana, dia, mês ou lista. Arraste para reagendar. Múltiplas agendas com cores. Agendamento online com widget. Lembretes automáticos por WhatsApp.",
    highlight: "Reduza faltas em até 40% com lembretes automáticos",
    tabs: [{ label: "Agenda", mockup: <AgendaMockup /> }],
  },
  {
    id: "financeiro",
    number: "04",
    title: "Controle financeiro completo.",
    description:
      "Contas a receber com parcelamento, despesas, fluxo de caixa, comissões por profissional. Emissão de NFS-e em 1 clique. Guias TISS para convênios. Cobrança por PIX, boleto ou cartão.",
    highlight: "NFS-e · TISS · PIX · Boleto · Cartão",
    tabs: [{ label: "Financeiro", mockup: <FinanceiroMockup /> }],
  },
  {
    id: "comunicacao",
    number: "05",
    title: "Conecte-se onde seus pacientes estão.",
    description:
      "Inbox do WhatsApp integrado. Lembretes de consulta com botões de confirmação. Mensagens de aniversário. Pesquisa NPS automática. Teleconsulta com gravação.",
    highlight: "WhatsApp · Email · Teleconsulta · NPS",
    tabs: [{ label: "Comunicação", mockup: <ComunicacaoMockup /> }],
  },
]

/* ─── Feature block component ─── */

function FeatureBlockItem({ block, index }: { block: FeatureBlock; index: number }) {
  const [activeTab, setActiveTab] = useState(0)
  const reversed = index % 2 !== 0

  const textContent = (
    <div className="flex flex-col justify-center space-y-5">
      <div className="flex items-center gap-3">
        <span className="text-4xl md:text-5xl font-bold text-vox-primary/30 tabular-nums">{block.number}</span>
      </div>
      <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-white">{block.title}</h3>
      <p className="text-gray-400 leading-relaxed">{block.description}</p>
      {block.tabs.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {block.tabs.map((tab, i) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(i)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                i === activeTab
                  ? "bg-vox-primary text-white"
                  : "bg-white/10 text-gray-300 hover:bg-white/15"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}
      <div className="inline-flex items-center gap-2 rounded-xl bg-vox-primary/10 border border-vox-primary/20 px-4 py-2 w-fit">
        <CheckCircle2 className="size-4 text-vox-primary shrink-0" />
        <span className="text-sm text-vox-primary font-medium">{block.highlight}</span>
      </div>
    </div>
  )

  const mockupContent = (
    <div className="w-full">{block.tabs[activeTab].mockup}</div>
  )

  return (
    <BlurFade inView delay={0.1 * (index + 2)}>
      <div id={block.id} className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        {reversed ? (
          <>
            <div className="order-2 lg:order-1">{mockupContent}</div>
            <div className="order-1 lg:order-2">{textContent}</div>
          </>
        ) : (
          <>
            {textContent}
            {mockupContent}
          </>
        )}
      </div>
    </BlurFade>
  )
}

/* ─── Main section ─── */

export function FeaturesBentoSection() {
  return (
    <section id="features" className="py-20 md:py-28 relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
        <BlurFade inView delay={0.1}>
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-vox-primary tracking-wider uppercase mb-3">Funcionalidades</p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-white">
              Tudo que sua clínica precisa, em um só lugar
            </h2>
            <p className="mt-4 text-base text-white/60 max-w-2xl mx-auto">
              Do agendamento ao financeiro, cada módulo foi desenhado para profissionais de saúde que não têm tempo a perder.
            </p>
          </div>
        </BlurFade>

        <div className="space-y-16 md:space-y-24">
          {featureBlocks.map((block, i) => (
            <FeatureBlockItem key={block.id} block={block} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
