"use client"

import { useState } from "react"

/*
 * INSTRUCOES PARA AGENTES:
 * Esta pagina é o roadmap interativo do VoxClinic.
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
  done: { label: "Concluido", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
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
  medium: { label: "Medio", dots: 2 },
  high: { label: "Alto", dots: 3 },
}

const CATEGORIES = [
  "Gestao de Pacientes",
  "Agendamento",
  "Prontuario e IA",
  "Prescricoes e Documentos",
  "Comunicacao",
  "Financeiro",
  "Relatorios",
  "Configuracoes",
  "Seguranca e LGPD",
  "Admin",
  "Infraestrutura",
  "Marketing",
  "Telemedicina",
  "Integracoes",
  "Portal do Paciente",
  "Estoque",
]

// ============================================================================
// ROADMAP DATA — Atualizar quando features forem implementadas
// ============================================================================
const ROADMAP_ITEMS: RoadmapItem[] = [
  // ── GESTAO DE PACIENTES ──
  { id: "p01", name: "Cadastro completo", description: "Nome, CPF, RG, sexo, endereco, telefone, email, convenio, responsavel, origem", status: "done", priority: "essential", effort: "medium", category: "Gestao de Pacientes" },
  { id: "p02", name: "Campos personalizaveis", description: "Campos extras configuraveis por especialidade (5 tipos)", status: "done", priority: "important", effort: "medium", category: "Gestao de Pacientes" },
  { id: "p03", name: "Historico medico", description: "Alergias, doencas cronicas, medicacoes, tipo sanguineo", status: "done", priority: "essential", effort: "medium", category: "Gestao de Pacientes" },
  { id: "p04", name: "Upload de documentos", description: "Imagens, PDFs, Word — 10MB limite, URLs assinadas", status: "done", priority: "important", effort: "medium", category: "Gestao de Pacientes" },
  { id: "p05", name: "Busca avancada", description: "Por nome, CPF, telefone, email, convenio. Filtro por tags", status: "done", priority: "essential", effort: "low", category: "Gestao de Pacientes" },
  { id: "p06", name: "Tags e segmentacao", description: "Tags customizaveis com filtro na lista de pacientes", status: "done", priority: "important", effort: "low", category: "Gestao de Pacientes" },
  { id: "p07", name: "Import/export dados", description: "CSV import com mapeamento, Excel export em massa, CSV individual", status: "done", priority: "important", effort: "medium", category: "Gestao de Pacientes" },
  { id: "p08", name: "Merge de duplicatas", description: "Deteccao por CPF/nome, merge atomico com transferencia de registros", status: "done", priority: "differential", effort: "high", category: "Gestao de Pacientes" },
  { id: "p09", name: "Portal do paciente", description: "Area de autoatendimento para pacientes acessarem seus dados", status: "planned", priority: "differential", effort: "high", category: "Portal do Paciente" },

  // ── AGENDAMENTO ──
  { id: "a01", name: "Calendario multi-visao", description: "Dia, semana, mes e lista com navegacao por data", status: "done", priority: "essential", effort: "high", category: "Agendamento" },
  { id: "a02", name: "Drag and drop", description: "Arrastar consultas na visao semanal para reagendar", status: "done", priority: "essential", effort: "medium", category: "Agendamento" },
  { id: "a03", name: "Deteccao de conflitos", description: "Verifica +/-30min, alerta visual, opcao de forcar", status: "done", priority: "essential", effort: "medium", category: "Agendamento" },
  { id: "a04", name: "Bloqueio de horarios", description: "Almoco, ferias, feriados — unicos e recorrentes semanais", status: "done", priority: "essential", effort: "medium", category: "Agendamento" },
  { id: "a05", name: "Agenda recorrente", description: "Semanal/quinzenal, 2-52 ocorrencias, criacao atomica", status: "done", priority: "important", effort: "medium", category: "Agendamento" },
  { id: "a06", name: "Duracao por procedimento", description: "Campo de duracao em minutos por procedimento", status: "done", priority: "important", effort: "low", category: "Agendamento" },
  { id: "a07", name: "Agendamento online (paciente)", description: "Link publico para paciente agendar sozinho", status: "planned", priority: "essential", effort: "high", category: "Agendamento" },
  { id: "a08", name: "Multiplas agendas", description: "Suporte a varias agendas por profissional", status: "done", priority: "essential", effort: "high", category: "Agendamento" },
  { id: "a09", name: "Lista de espera", description: "Fila quando nao ha horario, notificacao automatica", status: "planned", priority: "important", effort: "medium", category: "Agendamento" },
  { id: "a10", name: "Google Calendar sync", description: "Sincronizacao bidirecional com calendario pessoal", status: "planned", priority: "differential", effort: "high", category: "Integracoes" },
  { id: "a11", name: "Controle de salas", description: "Vincular agendamento a sala ou equipamento", status: "planned", priority: "important", effort: "medium", category: "Agendamento" },

  // ── PRONTUARIO E IA ──
  { id: "c01", name: "Gravacao de audio", description: "MediaRecorder com consentimento LGPD, webm/opus", status: "done", priority: "essential", effort: "high", category: "Prontuario e IA" },
  { id: "c02", name: "Transcricao Whisper", description: "OpenAI Whisper em pt-BR com vocabulario medico", status: "done", priority: "essential", effort: "high", category: "Prontuario e IA" },
  { id: "c03", name: "Extracao IA (Claude)", description: "7 campos estruturados via tool_use com validacao Zod", status: "done", priority: "essential", effort: "high", category: "Prontuario e IA" },
  { id: "c04", name: "Revisao antes de salvar", description: "Profissional revisa e edita antes de confirmar", status: "done", priority: "essential", effort: "medium", category: "Prontuario e IA" },
  { id: "c05", name: "Templates por especialidade", description: "IA gera templates no onboarding por profissao", status: "done", priority: "essential", effort: "medium", category: "Prontuario e IA" },
  { id: "c06", name: "Planos de tratamento", description: "Multiplas sessoes, progresso, status", status: "done", priority: "important", effort: "medium", category: "Prontuario e IA" },
  { id: "c07", name: "Anamnese customizada", description: "Template de perguntas por profissao", status: "done", priority: "important", effort: "medium", category: "Prontuario e IA" },
  { id: "c08", name: "CID-10/CID-11", description: "Busca e vinculacao de codigos CID ao diagnostico", status: "planned", priority: "important", effort: "medium", category: "Prontuario e IA" },
  { id: "c09", name: "Assinatura digital ICP-Brasil", description: "Validade juridica do prontuario eletronico", status: "planned", priority: "important", effort: "high", category: "Prontuario e IA" },
  { id: "c10", name: "SOAP estruturado", description: "Formato Subjetivo/Objetivo/Avaliacao/Plano", status: "planned", priority: "differential", effort: "medium", category: "Prontuario e IA" },

  // ── PRESCRICOES E DOCUMENTOS ──
  { id: "d01", name: "Prescricao eletronica", description: "Medicamentos com posologia, impressao PDF", status: "done", priority: "essential", effort: "medium", category: "Prescricoes e Documentos" },
  { id: "d02", name: "Atestados medicos", description: "Texto auto-gerado, CID opcional, impressao PDF", status: "done", priority: "essential", effort: "medium", category: "Prescricoes e Documentos" },
  { id: "d03", name: "Declaracao de comparecimento", description: "Horario entrada/saida, impressao PDF", status: "done", priority: "essential", effort: "low", category: "Prescricoes e Documentos" },
  { id: "d04", name: "Encaminhamento e laudo", description: "Texto livre, impressao PDF padronizada", status: "done", priority: "essential", effort: "low", category: "Prescricoes e Documentos" },
  { id: "d05", name: "Solicitacao de exames", description: "Pedidos de exames com modelos por tipo", status: "planned", priority: "important", effort: "medium", category: "Prescricoes e Documentos" },

  // ── COMUNICACAO ──
  { id: "m01", name: "WhatsApp Business API", description: "Meta Cloud API, setup wizard, envio e recebimento", status: "done", priority: "essential", effort: "high", category: "Comunicacao" },
  { id: "m02", name: "Lembretes automaticos", description: "24h antes, WhatsApp com botoes + email fallback", status: "done", priority: "essential", effort: "medium", category: "Comunicacao" },
  { id: "m03", name: "Confirmacao automatizada", description: "Botao/texto WhatsApp atualiza status consulta", status: "done", priority: "essential", effort: "medium", category: "Comunicacao" },
  { id: "m04", name: "Mensagens de aniversario", description: "Cron diario, WhatsApp ou email", status: "done", priority: "differential", effort: "low", category: "Comunicacao" },
  { id: "m05", name: "Pesquisa NPS", description: "Pos-consulta, pagina publica 0-10, score no relatorio", status: "done", priority: "important", effort: "medium", category: "Comunicacao" },
  { id: "m06", name: "Notificacoes in-app", description: "Sino com tipos: consulta, falta, tratamento, sistema", status: "done", priority: "important", effort: "medium", category: "Comunicacao" },
  { id: "m07", name: "Inbox unificada", description: "Painel de conversas WhatsApp centralizado", status: "planned", priority: "important", effort: "high", category: "Comunicacao" },
  { id: "m08", name: "Chatbot de atendimento", description: "IA para triagem, agendamento, FAQ via WhatsApp", status: "planned", priority: "important", effort: "high", category: "Comunicacao" },
  { id: "m09", name: "Email marketing", description: "Campanhas, newsletters, segmentacao", status: "planned", priority: "differential", effort: "high", category: "Marketing" },

  // ── FINANCEIRO ──
  { id: "f01", name: "Preco por consulta", description: "Valor em BRL por consulta, editavel", status: "done", priority: "essential", effort: "low", category: "Financeiro" },
  { id: "f02", name: "Recibos", description: "Impressao PDF com dados paciente e procedimentos", status: "done", priority: "essential", effort: "medium", category: "Financeiro" },
  { id: "f03", name: "Dashboard financeiro", description: "Receita total, ticket medio, por procedimento", status: "done", priority: "essential", effort: "medium", category: "Financeiro" },
  { id: "f04", name: "Contas a receber", description: "Registro de pagamentos, parcelas, pendencias", status: "planned", priority: "essential", effort: "high", category: "Financeiro" },
  { id: "f05", name: "Fluxo de caixa", description: "Visao diaria/mensal de entradas e saidas", status: "planned", priority: "essential", effort: "high", category: "Financeiro" },
  { id: "f06", name: "NFS-e", description: "Geracao de nota fiscal de servico", status: "planned", priority: "essential", effort: "high", category: "Financeiro" },
  { id: "f07", name: "Gateway de pagamento", description: "Stripe, PagSeguro ou Mercado Pago", status: "planned", priority: "important", effort: "high", category: "Financeiro" },
  { id: "f08", name: "Gestao de convenios", description: "Tabela de precos por convenio, guias TISS", status: "planned", priority: "important", effort: "high", category: "Financeiro" },

  // ── RELATORIOS ──
  { id: "r01", name: "Dashboard KPIs", description: "Pacientes, consultas, receita, retorno, no-show, NPS", status: "done", priority: "essential", effort: "medium", category: "Relatorios" },
  { id: "r02", name: "Graficos mensais", description: "Receita, novos pacientes, status, horarios", status: "done", priority: "essential", effort: "medium", category: "Relatorios" },
  { id: "r03", name: "Ranking de pacientes", description: "Top 10 por frequencia e por receita", status: "done", priority: "important", effort: "low", category: "Relatorios" },
  { id: "r04", name: "Ranking procedimentos", description: "Top 10 mais realizados com contagem", status: "done", priority: "important", effort: "low", category: "Relatorios" },
  { id: "r05", name: "Exportacao Excel", description: "Pacientes e relatorios multi-sheet .xlsx", status: "done", priority: "essential", effort: "medium", category: "Relatorios" },
  { id: "r06", name: "Relatorios customizaveis", description: "Builder onde usuario escolhe metricas e filtros", status: "planned", priority: "differential", effort: "high", category: "Relatorios" },

  // ── CONFIGURACOES ──
  { id: "s01", name: "Procedimentos com duracao", description: "Nome, categoria, preco, duracao em minutos", status: "done", priority: "essential", effort: "low", category: "Configuracoes" },
  { id: "s02", name: "Campos personalizados", description: "5 tipos de campo, obrigatoriedade configuravel", status: "done", priority: "important", effort: "medium", category: "Configuracoes" },
  { id: "s03", name: "Gestao de equipe", description: "Convites por email, roles owner/admin/member", status: "done", priority: "essential", effort: "medium", category: "Configuracoes" },
  { id: "s04", name: "Config WhatsApp", description: "Wizard 5 etapas, Facebook Embedded Signup", status: "done", priority: "essential", effort: "high", category: "Configuracoes" },
  { id: "s05", name: "Tema claro/escuro", description: "Toggle light/dark/system", status: "done", priority: "differential", effort: "low", category: "Configuracoes" },

  // ── SEGURANCA E LGPD ──
  { id: "g01", name: "Consentimento LGPD", description: "Modal obrigatorio, ConsentRecord no banco", status: "done", priority: "essential", effort: "medium", category: "Seguranca e LGPD" },
  { id: "g02", name: "Multi-tenant isolation", description: "Todas queries filtradas por workspaceId", status: "done", priority: "essential", effort: "high", category: "Seguranca e LGPD" },
  { id: "g03", name: "Auditoria completa", description: "Log de todas operacoes com usuario e timestamp", status: "done", priority: "essential", effort: "medium", category: "Seguranca e LGPD" },
  { id: "g04", name: "Soft delete (20 anos)", description: "Pacientes desativados, nunca deletados (CFM)", status: "done", priority: "essential", effort: "low", category: "Seguranca e LGPD" },
  { id: "g05", name: "Criptografia tokens", description: "WhatsApp tokens AES, audio URLs assinadas", status: "done", priority: "essential", effort: "medium", category: "Seguranca e LGPD" },
  { id: "g06", name: "RBAC granular", description: "Permissoes detalhadas por role (recepcionista, medico, financeiro)", status: "planned", priority: "important", effort: "high", category: "Seguranca e LGPD" },

  // ── ADMIN ──
  { id: "x01", name: "Painel superadmin", description: "Dashboard executivo com KPIs cross-workspace", status: "done", priority: "essential", effort: "high", category: "Admin" },
  { id: "x02", name: "Gestao de workspaces", description: "Lista, busca, drill-down, ativar/suspender", status: "done", priority: "essential", effort: "medium", category: "Admin" },
  { id: "x03", name: "Lista de usuarios", description: "Todos usuarios com role, plano, status", status: "done", priority: "essential", effort: "low", category: "Admin" },
  { id: "x04", name: "Billing/planos", description: "Stripe integration, upgrade/downgrade, MRR", status: "planned", priority: "essential", effort: "high", category: "Admin" },

  // ── INFRAESTRUTURA ──
  { id: "i01", name: "Design responsivo", description: "Mobile-first, sidebar + bottom nav", status: "done", priority: "essential", effort: "medium", category: "Infraestrutura" },
  { id: "i02", name: "PWA", description: "Manifest + service worker, instalavel", status: "done", priority: "important", effort: "low", category: "Infraestrutura" },
  { id: "i03", name: "Busca global Cmd+K", description: "Command palette com pacientes, paginas, acoes", status: "done", priority: "important", effort: "medium", category: "Infraestrutura" },
  { id: "i04", name: "Onboarding com IA", description: "Wizard 4 etapas, workspace gerado por Claude", status: "done", priority: "essential", effort: "high", category: "Infraestrutura" },
  { id: "i05", name: "Multi-idioma", description: "Suporte a portugues, ingles, espanhol", status: "planned", priority: "differential", effort: "high", category: "Infraestrutura" },
  { id: "i06", name: "Modo offline", description: "Funcionalidades basicas sem internet", status: "planned", priority: "differential", effort: "high", category: "Infraestrutura" },
  { id: "i07", name: "White-label", description: "Logo, cores e dominio customizaveis por clinica", status: "planned", priority: "differential", effort: "high", category: "Infraestrutura" },

  // ── TELEMEDICINA ──
  { id: "t01", name: "Teleconsulta por video", description: "Videochamada integrada (WebRTC/Daily.co)", status: "planned", priority: "essential", effort: "high", category: "Telemedicina" },
  { id: "t02", name: "Sala de espera virtual", description: "Paciente aguarda ate medico iniciar", status: "planned", priority: "important", effort: "medium", category: "Telemedicina" },

  // ── MARKETING ──
  { id: "k01", name: "Origem do paciente", description: "Campo source: Instagram, Google, Indicacao, etc", status: "done", priority: "essential", effort: "low", category: "Marketing" },
  { id: "k02", name: "Funil de leads", description: "Pipeline: lead > contato > agendou > compareceu", status: "planned", priority: "important", effort: "high", category: "Marketing" },
  { id: "k03", name: "Reativacao de inativos", description: "Identificar e contatar pacientes sem retorno", status: "planned", priority: "important", effort: "medium", category: "Marketing" },

  // ── INTEGRACOES ──
  { id: "n01", name: "API REST documentada", description: "API publica com documentacao Swagger/OpenAPI", status: "planned", priority: "important", effort: "high", category: "Integracoes" },
  { id: "n02", name: "Zapier / Make", description: "Conectar a centenas de apps via no-code", status: "planned", priority: "differential", effort: "medium", category: "Integracoes" },

  // ── ESTOQUE ──
  { id: "e01", name: "Controle de estoque", description: "Cadastro de produtos, entrada/saida, alerta minimo", status: "planned", priority: "important", effort: "high", category: "Estoque" },
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
        <p className="text-sm text-slate-500 mt-1">Visao geral do desenvolvimento da plataforma</p>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <span className="text-3xl font-extrabold text-slate-900 tabular-nums">{progressPct}%</span>
            <span className="text-sm text-slate-500">concluido</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-emerald-400" />
              <span className="text-slate-600">{stats.done} concluidos</span>
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
          <option value="done">Concluidos</option>
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
              <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Esforco</th>
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
