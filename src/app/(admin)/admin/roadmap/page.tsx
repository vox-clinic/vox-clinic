"use client"

import { useState } from "react"

/*
 * INSTRUÇÕES PARA AGENTES:
 * Esta página é o roadmap interativo do VoxClinic.
 * Atualize os items quando features forem implementadas.
 * Mude status de "planned" para "in_progress" ou "done".
 * Adicione novos items conforme demanda.
 */

type ItemStatus = "done" | "in_progress" | "planned"
type Priority = "essential" | "important" | "differential"
type Effort = "low" | "medium" | "high"

interface RoadmapItem {
  id: string
  name: string
  description: string
  status: ItemStatus
  priority: Priority
  effort: Effort
  category: string
}

const STATUS_CONFIG: Record<ItemStatus, { label: string; color: string; bg: string }> = {
  done: { label: "Concluído", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  in_progress: { label: "Em andamento", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  planned: { label: "Planejado", color: "text-slate-500", bg: "bg-slate-50 border-slate-200" },
}

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string }> = {
  essential: { label: "Essencial", color: "text-red-600" },
  important: { label: "Importante", color: "text-amber-600" },
  differential: { label: "Diferencial", color: "text-blue-600" },
}

const EFFORT_CONFIG: Record<Effort, { label: string; dots: number }> = {
  low: { label: "Baixo", dots: 1 },
  medium: { label: "Médio", dots: 2 },
  high: { label: "Alto", dots: 3 },
}

const CATEGORIES = [
  "Gestão de Pacientes",
  "Agendamento",
  "Prontuário e IA",
  "Prescrições e Documentos",
  "Comunicação",
  "Financeiro",
  "Relatórios",
  "Configurações",
  "Segurança e LGPD",
  "Admin",
  "Infraestrutura",
  "Marketing",
  "Telemedicina",
  "Integrações",
  "Portal do Paciente",
  "Estoque",
]

// ============================================================================
// ROADMAP DATA — Atualizar quando features forem implementadas
// ============================================================================
const ROADMAP_ITEMS: RoadmapItem[] = [
  // ── GESTÃO DE PACIENTES ──
  { id: "p01", name: "Cadastro completo", description: "Nome, CPF, RG, sexo, endereço, telefone, email, convênio, responsável, origem", status: "done", priority: "essential", effort: "medium", category: "Gestão de Pacientes" },
  { id: "p02", name: "Campos personalizáveis", description: "Campos extras configuráveis por especialidade (5 tipos)", status: "done", priority: "important", effort: "medium", category: "Gestão de Pacientes" },
  { id: "p03", name: "Histórico médico", description: "Alergias, doenças crônicas, medicações, tipo sanguíneo", status: "done", priority: "essential", effort: "medium", category: "Gestão de Pacientes" },
  { id: "p04", name: "Upload de documentos", description: "Imagens, PDFs, Word — 10MB limite, URLs assinadas", status: "done", priority: "important", effort: "medium", category: "Gestão de Pacientes" },
  { id: "p05", name: "Busca avançada", description: "Por nome, CPF, telefone, email, convênio. Filtro por tags", status: "done", priority: "essential", effort: "low", category: "Gestão de Pacientes" },
  { id: "p06", name: "Tags e segmentação", description: "Tags customizáveis com filtro na lista de pacientes", status: "done", priority: "important", effort: "low", category: "Gestão de Pacientes" },
  { id: "p07", name: "Import/export dados", description: "CSV import com mapeamento, Excel export em massa, CSV individual", status: "done", priority: "important", effort: "medium", category: "Gestão de Pacientes" },
  { id: "p08", name: "Merge de duplicatas", description: "Detecção por CPF/nome, merge atômico com transferência de registros", status: "done", priority: "differential", effort: "high", category: "Gestão de Pacientes" },
  { id: "p09", name: "Portal do paciente", description: "Área de autoatendimento para pacientes acessarem seus dados", status: "planned", priority: "differential", effort: "high", category: "Portal do Paciente" },

  // ── AGENDAMENTO ──
  { id: "a01", name: "Calendário multi-visão", description: "Dia, semana, mês e lista com navegação por data", status: "done", priority: "essential", effort: "high", category: "Agendamento" },
  { id: "a02", name: "Drag and drop", description: "Arrastar consultas na visão semanal para reagendar", status: "done", priority: "essential", effort: "medium", category: "Agendamento" },
  { id: "a03", name: "Detecção de conflitos", description: "Verifica +/-30min, alerta visual, opção de forçar", status: "done", priority: "essential", effort: "medium", category: "Agendamento" },
  { id: "a04", name: "Bloqueio de horários", description: "Almoço, férias, feriados — únicos e recorrentes semanais", status: "done", priority: "essential", effort: "medium", category: "Agendamento" },
  { id: "a05", name: "Agenda recorrente", description: "Semanal/quinzenal, 2-52 ocorrências, criação atômica", status: "done", priority: "important", effort: "medium", category: "Agendamento" },
  { id: "a06", name: "Duração por procedimento", description: "Campo de duração em minutos por procedimento", status: "done", priority: "important", effort: "low", category: "Agendamento" },
  { id: "a07", name: "Agendamento online (paciente)", description: "Link público para paciente agendar sozinho", status: "done", priority: "essential", effort: "high", category: "Agendamento" },
  { id: "a08", name: "Múltiplas agendas", description: "Suporte a várias agendas por profissional", status: "done", priority: "essential", effort: "high", category: "Agendamento" },
  { id: "a09", name: "Lista de espera", description: "Waitlist com preferências (dias/horários/agenda), matching automático em cancelamento, panel no calendário, notificação de matches, prioridade (normal/alta/urgente)", status: "done", priority: "important", effort: "medium", category: "Agendamento" },
  { id: "a10", name: "Google Calendar sync", description: "Sincronização bidirecional com calendário pessoal", status: "planned", priority: "differential", effort: "high", category: "Integrações" },
  { id: "a11", name: "Controle de salas", description: "Vincular agendamento a sala ou equipamento", status: "planned", priority: "important", effort: "medium", category: "Agendamento" },

  // ── PRONTUÁRIO E IA ──
  { id: "c01", name: "Gravação de áudio", description: "MediaRecorder com consentimento LGPD, webm/opus", status: "done", priority: "essential", effort: "high", category: "Prontuário e IA" },
  { id: "c02", name: "Transcrição Whisper", description: "OpenAI Whisper em pt-BR com vocabulário médico", status: "done", priority: "essential", effort: "high", category: "Prontuário e IA" },
  { id: "c03", name: "Extração IA (Claude)", description: "7 campos estruturados via tool_use com validação Zod", status: "done", priority: "essential", effort: "high", category: "Prontuário e IA" },
  { id: "c04", name: "Revisão antes de salvar", description: "Profissional revisa e edita antes de confirmar", status: "done", priority: "essential", effort: "medium", category: "Prontuário e IA" },
  { id: "c05", name: "Templates por especialidade", description: "IA gera templates no onboarding por profissão", status: "done", priority: "essential", effort: "medium", category: "Prontuário e IA" },
  { id: "c06", name: "Planos de tratamento", description: "Múltiplas sessões, progresso, status", status: "done", priority: "important", effort: "medium", category: "Prontuário e IA" },
  { id: "c07", name: "Formulários customizáveis", description: "Editor visual de formulários (11 tipos de campo), biblioteca de 5 templates por especialidade, histórico de respostas por paciente/consulta, compatibilidade com anamnese legada", status: "done", priority: "important", effort: "high", category: "Prontuário e IA" },
  { id: "c08", name: "CID-10/CID-11", description: "1022 códigos PT-BR, autocomplete accent-insensitive, sugestão por IA via Claude, vinculado a consultas e atestados", status: "done", priority: "important", effort: "medium", category: "Prontuário e IA" },
  { id: "c09", name: "Assinatura digital ICP-Brasil", description: "Schema preparado (SignatureConfig, campos assinatura em Prescrição/Certificado, verificationToken). Página pública /verificar/[token]. Implementação de signing em fase futura.", status: "in_progress", priority: "important", effort: "high", category: "Prontuário e IA" },
  { id: "c10", name: "SOAP estruturado", description: "Formato Subjetivo/Objetivo/Avaliação/Plano", status: "planned", priority: "differential", effort: "medium", category: "Prontuário e IA" },

  // ── PRESCRIÇÕES E DOCUMENTOS ──
  { id: "d01", name: "Prescrição eletrônica", description: "Medicamentos com posologia, impressão PDF", status: "done", priority: "essential", effort: "medium", category: "Prescrições e Documentos" },
  { id: "d02", name: "Atestados médicos", description: "Texto auto-gerado, CID opcional, impressão PDF", status: "done", priority: "essential", effort: "medium", category: "Prescrições e Documentos" },
  { id: "d03", name: "Declaração de comparecimento", description: "Horário entrada/saída, impressão PDF", status: "done", priority: "essential", effort: "low", category: "Prescrições e Documentos" },
  { id: "d04", name: "Encaminhamento e laudo", description: "Texto livre, impressão PDF padronizada", status: "done", priority: "essential", effort: "low", category: "Prescrições e Documentos" },
  // ── COMUNICAÇÃO ──
  { id: "m01", name: "WhatsApp Business API", description: "Meta Cloud API, setup wizard, envio e recebimento", status: "done", priority: "essential", effort: "high", category: "Comunicação" },
  { id: "m02", name: "Lembretes automáticos", description: "24h antes, WhatsApp com botões + email fallback", status: "done", priority: "essential", effort: "medium", category: "Comunicação" },
  { id: "m03", name: "Confirmação automatizada", description: "Botão/texto WhatsApp atualiza status consulta", status: "done", priority: "essential", effort: "medium", category: "Comunicação" },
  { id: "m04", name: "Mensagens de aniversário", description: "Cron diário, WhatsApp ou email", status: "done", priority: "differential", effort: "low", category: "Comunicação" },
  { id: "m05", name: "Pesquisa NPS", description: "Pós-consulta, página pública 0-10, score no relatório", status: "done", priority: "important", effort: "medium", category: "Comunicação" },
  { id: "m06", name: "Notificações in-app", description: "Sino com tipos: consulta, falta, tratamento, sistema", status: "done", priority: "important", effort: "medium", category: "Comunicação" },
  { id: "m07", name: "Inbox unificada", description: "Painel de conversas WhatsApp centralizado", status: "planned", priority: "important", effort: "high", category: "Comunicação" },
  { id: "m08", name: "Chatbot de atendimento", description: "IA para triagem, agendamento, FAQ via WhatsApp", status: "planned", priority: "important", effort: "high", category: "Comunicação" },
  { id: "m09", name: "Email marketing", description: "Campanhas, newsletters, segmentação", status: "planned", priority: "differential", effort: "high", category: "Marketing" },

  // ── FINANCEIRO ──
  { id: "f01", name: "Preço por consulta", description: "Valor em BRL por consulta, editável", status: "done", priority: "essential", effort: "low", category: "Financeiro" },
  { id: "f02", name: "Recibos", description: "Impressão PDF com dados paciente e procedimentos", status: "done", priority: "essential", effort: "medium", category: "Financeiro" },
  { id: "f03", name: "Dashboard financeiro", description: "Receita total, ticket médio, por procedimento", status: "done", priority: "essential", effort: "medium", category: "Financeiro" },
  { id: "f04", name: "Contas a receber", description: "Registro de pagamentos, parcelas, pendências", status: "done", priority: "essential", effort: "high", category: "Financeiro" },
  { id: "f05", name: "Fluxo de caixa", description: "Visão diária/mensal de entradas e saídas", status: "done", priority: "essential", effort: "high", category: "Financeiro" },
  { id: "f06", name: "NFS-e", description: "Geração de nota fiscal de serviço", status: "done", priority: "essential", effort: "high", category: "Financeiro" },
  { id: "f07", name: "Gateway de pagamento", description: "Stripe, PagSeguro ou Mercado Pago", status: "planned", priority: "important", effort: "high", category: "Financeiro" },
  { id: "f08", name: "Gestão de convênios e TISS", description: "Operadoras, Guia de Consulta, Guia SP/SADT, XML ANS 4.01.00, lote batch, dados de convênio no paciente, ciclo de vida de guias", status: "done", priority: "important", effort: "high", category: "Financeiro" },
  { id: "f09", name: "Comissão / repasse profissionais", description: "Regras de comissão (% ou fixo) por profissional/procedimento, cálculo automático na conclusão de consulta, tab financeiro com relatório e bulk payment", status: "done", priority: "important", effort: "medium", category: "Financeiro" },

  // ── RELATÓRIOS ──
  { id: "r01", name: "Dashboard KPIs", description: "Pacientes, consultas, receita, retorno, no-show, NPS", status: "done", priority: "essential", effort: "medium", category: "Relatórios" },
  { id: "r02", name: "Gráficos mensais", description: "Receita, novos pacientes, status, horários", status: "done", priority: "essential", effort: "medium", category: "Relatórios" },
  { id: "r03", name: "Ranking de pacientes", description: "Top 10 por frequência e por receita", status: "done", priority: "important", effort: "low", category: "Relatórios" },
  { id: "r04", name: "Ranking procedimentos", description: "Top 10 mais realizados com contagem", status: "done", priority: "important", effort: "low", category: "Relatórios" },
  { id: "r05", name: "Exportação Excel", description: "Pacientes e relatórios multi-sheet .xlsx", status: "done", priority: "essential", effort: "medium", category: "Relatórios" },
  { id: "r06", name: "Relatórios customizáveis", description: "Builder onde usuário escolhe métricas e filtros", status: "planned", priority: "differential", effort: "high", category: "Relatórios" },

  // ── CONFIGURAÇÕES ──
  { id: "s01", name: "Procedimentos com duração", description: "Nome, categoria, preço, duração em minutos", status: "done", priority: "essential", effort: "low", category: "Configurações" },
  { id: "s02", name: "Campos personalizados", description: "5 tipos de campo, obrigatoriedade configurável", status: "done", priority: "important", effort: "medium", category: "Configurações" },
  { id: "s03", name: "Gestão de equipe", description: "Convites por email, roles owner/admin/member", status: "done", priority: "essential", effort: "medium", category: "Configurações" },
  { id: "s04", name: "Config WhatsApp", description: "Wizard 5 etapas, Facebook Embedded Signup", status: "done", priority: "essential", effort: "high", category: "Configurações" },
  { id: "s05", name: "Tema claro/escuro", description: "Toggle light/dark/system", status: "done", priority: "differential", effort: "low", category: "Configurações" },

  // ── SEGURANÇA E LGPD ──
  { id: "g01", name: "Consentimento LGPD", description: "Modal obrigatório, ConsentRecord no banco", status: "done", priority: "essential", effort: "medium", category: "Segurança e LGPD" },
  { id: "g02", name: "Multi-tenant isolation", description: "Todas queries filtradas por workspaceId", status: "done", priority: "essential", effort: "high", category: "Segurança e LGPD" },
  { id: "g03", name: "Auditoria completa", description: "Log de todas operações com usuário e timestamp", status: "done", priority: "essential", effort: "medium", category: "Segurança e LGPD" },
  { id: "g04", name: "Soft delete (20 anos)", description: "Pacientes desativados, nunca deletados (CFM)", status: "done", priority: "essential", effort: "low", category: "Segurança e LGPD" },
  { id: "g05", name: "Criptografia tokens", description: "WhatsApp tokens AES, áudio URLs assinadas", status: "done", priority: "essential", effort: "medium", category: "Segurança e LGPD" },
  { id: "g06", name: "RBAC granular", description: "5 roles (owner/admin/doctor/secretary/viewer), 20 permissões, nav filtrada por role, settings guard, team invite com roles expandidos", status: "done", priority: "important", effort: "high", category: "Segurança e LGPD" },

  // ── ADMIN ──
  { id: "x01", name: "Painel superadmin", description: "Dashboard executivo com KPIs cross-workspace", status: "done", priority: "essential", effort: "high", category: "Admin" },
  { id: "x02", name: "Gestão de workspaces", description: "Lista, busca, drill-down, ativar/suspender", status: "done", priority: "essential", effort: "medium", category: "Admin" },
  { id: "x03", name: "Lista de usuários", description: "Todos usuários com role, plano, status", status: "done", priority: "essential", effort: "low", category: "Admin" },
  { id: "x04", name: "Billing/planos", description: "Stripe integration, upgrade/downgrade, MRR", status: "done", priority: "essential", effort: "high", category: "Admin" },

  // ── INFRAESTRUTURA ──
  { id: "i01", name: "Design responsivo", description: "Mobile-first, sidebar + bottom nav", status: "done", priority: "essential", effort: "medium", category: "Infraestrutura" },
  { id: "i02", name: "PWA", description: "Manifest + service worker, instalável", status: "done", priority: "important", effort: "low", category: "Infraestrutura" },
  { id: "i03", name: "Busca global Cmd+K", description: "Command palette com pacientes, páginas, ações", status: "done", priority: "important", effort: "medium", category: "Infraestrutura" },
  { id: "i04", name: "Onboarding com IA", description: "Wizard 4 etapas, workspace gerado por Claude", status: "done", priority: "essential", effort: "high", category: "Infraestrutura" },
  { id: "i04b", name: "Tour guiado pós-onboarding", description: "10 steps com TourProvider, data-tour attributes, progress tracking, skip/restart, desktop/mobile adaptação", status: "done", priority: "important", effort: "medium", category: "Infraestrutura" },
  { id: "i05", name: "Multi-idioma", description: "Suporte a português, inglês, espanhol", status: "planned", priority: "differential", effort: "high", category: "Infraestrutura" },
  { id: "i06", name: "Modo offline", description: "Funcionalidades básicas sem internet", status: "planned", priority: "differential", effort: "high", category: "Infraestrutura" },
  { id: "i07", name: "White-label", description: "Logo, cores e domínio customizáveis por clínica", status: "planned", priority: "differential", effort: "high", category: "Infraestrutura" },

  // ── TELEMEDICINA ──
  { id: "t01", name: "Teleconsulta por vídeo", description: "Videochamada integrada (WebRTC/Daily.co)", status: "done", priority: "essential", effort: "high", category: "Telemedicina" },
  { id: "t02", name: "Sala de espera virtual", description: "Paciente aguarda até médico iniciar", status: "planned", priority: "important", effort: "medium", category: "Telemedicina" },

  // ── MARKETING ──
  { id: "k01", name: "Origem do paciente", description: "Campo source: Instagram, Google, Indicação, etc", status: "done", priority: "essential", effort: "low", category: "Marketing" },
  { id: "k02", name: "Funil de leads", description: "Pipeline: lead > contato > agendou > compareceu", status: "planned", priority: "important", effort: "high", category: "Marketing" },
  { id: "k03", name: "Reativação de inativos", description: "Identificar e contatar pacientes sem retorno", status: "planned", priority: "important", effort: "medium", category: "Marketing" },

  // ── INTEGRAÇÕES ──
  { id: "n01", name: "API REST documentada", description: "API pública com documentação Swagger/OpenAPI", status: "planned", priority: "important", effort: "high", category: "Integrações" },
  { id: "n02", name: "Zapier / Make", description: "Conectar a centenas de apps via no-code", status: "planned", priority: "differential", effort: "medium", category: "Integrações" },

  // ── ESTOQUE ──
  { id: "e01", name: "Controle de estoque", description: "Categorias, itens com SKU/unidade/custo/mínimo, movimentações atômicas (entrada/saída/ajuste), alerta de estoque baixo, tab financeiro", status: "done", priority: "important", effort: "high", category: "Estoque" },
]

export default function RoadmapPage() {
  const [filterStatus, setFilterStatus] = useState<ItemStatus | "all">("all")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  const filtered = ROADMAP_ITEMS.filter((item) => {
    if (filterStatus !== "all" && item.status !== filterStatus) return false
    if (filterCategory !== "all" && item.category !== filterCategory) return false
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase()) && !item.description.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const stats = {
    total: ROADMAP_ITEMS.length,
    done: ROADMAP_ITEMS.filter((i) => i.status === "done").length,
    inProgress: ROADMAP_ITEMS.filter((i) => i.status === "in_progress").length,
    planned: ROADMAP_ITEMS.filter((i) => i.status === "planned").length,
  }

  const progressPct = Math.round((stats.done / stats.total) * 100)

  const usedCategories = [...new Set(ROADMAP_ITEMS.map((i) => i.category))].sort()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Roadmap</h1>
        <p className="text-sm text-slate-500 mt-1">Visão geral do desenvolvimento da plataforma</p>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <span className="text-3xl font-extrabold text-slate-900 tabular-nums">{progressPct}%</span>
            <span className="text-sm text-slate-500">concluído</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-emerald-400" />
              <span className="text-slate-600">{stats.done} concluídos</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-amber-400" />
              <span className="text-slate-600">{stats.inProgress} em andamento</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-slate-300" />
              <span className="text-slate-600">{stats.planned} planejados</span>
            </span>
          </div>
        </div>
        <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500" style={{ width: `${progressPct}%` }} />
        </div>
        <p className="text-xs text-slate-400 mt-2 tabular-nums">{stats.done} de {stats.total} funcionalidades</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Buscar funcionalidade..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 w-64"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as ItemStatus | "all")}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-slate-400"
        >
          <option value="all">Todos os status</option>
          <option value="done">Concluídos</option>
          <option value="in_progress">Em andamento</option>
          <option value="planned">Planejados</option>
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-slate-400"
        >
          <option value="all">Todas as categorias</option>
          {usedCategories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} items</span>
      </div>

      {/* Items table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-8">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Funcionalidade</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">Categoria</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Prioridade</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Esforço</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const statusCfg = STATUS_CONFIG[item.status]
              const priorityCfg = PRIORITY_CONFIG[item.priority]
              const effortCfg = EFFORT_CONFIG[item.effort]
              return (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusCfg.bg} ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-xs text-slate-500">{item.category}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`text-xs font-medium ${priorityCfg.color}`}>{priorityCfg.label}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex gap-0.5" title={effortCfg.label}>
                      {Array.from({ length: 3 }, (_, i) => (
                        <div key={i} className={`size-1.5 rounded-full ${i < effortCfg.dots ? "bg-slate-600" : "bg-slate-200"}`} />
                      ))}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Category summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {usedCategories.map((cat) => {
          const items = ROADMAP_ITEMS.filter((i) => i.category === cat)
          const done = items.filter((i) => i.status === "done").length
          const pct = Math.round((done / items.length) * 100)
          return (
            <button
              key={cat}
              onClick={() => { setFilterCategory(cat === filterCategory ? "all" : cat); setFilterStatus("all") }}
              className={`rounded-xl border p-3 text-left transition-all hover:shadow-sm ${filterCategory === cat ? "border-slate-400 bg-slate-50" : "border-slate-200 bg-white"}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">{cat}</span>
                <span className="text-xs text-slate-400 tabular-nums">{done}/{items.length}</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 mt-2 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${pct}%` }} />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
