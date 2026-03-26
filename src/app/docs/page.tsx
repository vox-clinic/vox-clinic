import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "VoxClinic - Documentacao de Funcionalidades",
  description: "Documentacao completa de todas as funcionalidades do CRM VoxClinic para clinicas e consultorios.",
}

/*
 * ============================================================================
 * INSTRUCOES PARA AGENTES (Claude Code / AI Assistants)
 * ============================================================================
 * Esta pagina documenta TODAS as funcionalidades do VoxClinic.
 *
 * REGRA: Sempre que uma nova feature for implementada ou uma feature existente
 * for alterada, esta pagina DEVE ser atualizada no mesmo commit.
 *
 * Para adicionar uma feature:
 * 1. Encontre a categoria correta (ou crie uma nova)
 * 2. Adicione um novo <FeatureCard> com titulo, descricao e status
 * 3. Incremente o contador da categoria no FEATURES_SUMMARY
 * 4. Atualize lastUpdated no final da pagina
 *
 * Status possiveis: "done" | "partial" | "planned"
 * ============================================================================
 */

const lastUpdated = "2026-03-26"

type FeatureStatus = "done" | "partial" | "planned"

function StatusBadge({ status }: { status: FeatureStatus }) {
  const config = {
    done: { label: "Disponivel", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    partial: { label: "Parcial", bg: "bg-amber-50 text-amber-700 border-amber-200" },
    planned: { label: "Planejado", bg: "bg-slate-50 text-slate-500 border-slate-200" },
  }
  const { label, bg } = config[status]
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${bg}`}>{label}</span>
}

function FeatureCard({ title, description, status = "done" }: { title: string; description: string; status?: FeatureStatus }) {
  return (
    <div className="group flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-4 transition-all hover:border-slate-200 hover:shadow-sm">
      <div className={`mt-0.5 size-2 shrink-0 rounded-full ${status === "done" ? "bg-emerald-400" : status === "partial" ? "bg-amber-400" : "bg-slate-300"}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
          <StatusBadge status={status} />
        </div>
        <p className="text-[13px] text-slate-500 mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

function CategorySection({ icon, title, description, count, children }: { icon: string; title: string; description: string; count: number; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20" id={title.toLowerCase().replace(/[^a-z0-9]/g, "-")}>
      <div className="flex items-start gap-3 mb-4">
        <span className="text-2xl">{icon}</span>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            <span className="inline-flex items-center rounded-full bg-teal-50 border border-teal-200 px-2 py-0.5 text-[10px] font-bold text-teal-700 tabular-nums">{count}</span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">{children}</div>
    </section>
  )
}

const FEATURES_SUMMARY = {
  total: 70,
  categories: 10,
}

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 text-white text-sm font-bold shadow-sm">V</div>
            <span className="text-sm font-bold text-slate-900">VoxClinic</span>
          </Link>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>Atualizado: {lastUpdated}</span>
            <Link href="/sign-in" className="rounded-lg bg-teal-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-600 transition-colors">
              Entrar
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 space-y-12">
        {/* Hero */}
        <div className="text-center space-y-4 pb-4">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Funcionalidades do CRM
          </h1>
          <p className="text-base text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Documentacao completa de todas as funcionalidades disponiveis no VoxClinic.
            CRM inteligente com IA para clinicas e consultorios.
          </p>
          <div className="flex items-center justify-center gap-6 pt-2">
            <div className="text-center">
              <p className="text-2xl font-extrabold text-teal-600 tabular-nums">{FEATURES_SUMMARY.total}</p>
              <p className="text-[11px] text-slate-400 font-medium">Funcionalidades</p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="text-center">
              <p className="text-2xl font-extrabold text-teal-600 tabular-nums">{FEATURES_SUMMARY.categories}</p>
              <p className="text-[11px] text-slate-400 font-medium">Categorias</p>
            </div>
          </div>
        </div>

        {/* Table of Contents */}
        <nav className="rounded-2xl border border-slate-100 bg-white p-5">
          <h2 className="text-sm font-bold text-slate-900 mb-3">Indice</h2>
          <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3 text-[13px]">
            {[
              { icon: "👤", label: "Gestao de Pacientes", id: "gestao-de-pacientes" },
              { icon: "📅", label: "Agendamento e Agenda", id: "agendamento-e-agenda" },
              { icon: "🎙️", label: "Prontuario e IA", id: "prontuario-e-ia" },
              { icon: "💊", label: "Prescricoes e Documentos", id: "prescricoes-e-documentos" },
              { icon: "💬", label: "Comunicacao", id: "comunicacao" },
              { icon: "💰", label: "Financeiro", id: "financeiro" },
              { icon: "📊", label: "Relatorios e Analytics", id: "relatorios-e-analytics" },
              { icon: "⚙️", label: "Configuracoes", id: "configuracoes" },
              { icon: "🔐", label: "Seguranca e LGPD", id: "seguranca-e-lgpd" },
              { icon: "📱", label: "Infraestrutura e UX", id: "infraestrutura-e-ux" },
            ].map((item) => (
              <a key={item.id} href={`#${item.id}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-slate-600 hover:bg-slate-50 hover:text-teal-600 transition-colors">
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </a>
            ))}
          </div>
        </nav>

        {/* ── 1. GESTAO DE PACIENTES ── */}
        <CategorySection icon="👤" title="Gestao de Pacientes" description="Cadastro completo, busca avancada, tags e organizacao de pacientes." count={11}>
          <FeatureCard title="Cadastro Completo" description="Nome, CPF, RG, telefone, email, data de nascimento, sexo, endereco completo, convenio, responsavel (menores), origem/fonte do paciente." />
          <FeatureCard title="Campos Personalizaveis" description="Campos extras configuraveis por especialidade: texto, numero, booleano, data, selecao. Gerados automaticamente pela IA no onboarding." />
          <FeatureCard title="Historico Medico" description="Secao dedicada com alergias, doencas cronicas, medicacoes em uso, tipo sanguineo e observacoes medicas. Tudo editavel inline." />
          <FeatureCard title="Upload de Documentos" description="Galeria de imagens, PDFs e documentos Word anexados ao perfil do paciente. Limite de 10MB, URLs assinadas de 5 minutos." />
          <FeatureCard title="Busca Avancada" description="Busca por nome, CPF, telefone, email, convenio. Filtro por tags com barra de tags clicaveis. Paginacao server-side." />
          <FeatureCard title="Tags e Segmentacao" description="Sistema de tags com cores (VIP, retorno pendente, gestante, etc). Filtro por tag na lista de pacientes. Tags visiveis no perfil." />
          <FeatureCard title="Importacao/Exportacao" description="Importacao CSV com mapeamento de colunas (PapaParse). Exportacao individual em JSON. Exportacao em massa para Excel (.xlsx)." />
          <FeatureCard title="Deteccao e Merge de Duplicatas" description="Deteccao por CPF e nome. Merge atomico: transfere consultas, gravacoes, documentos e planos. Unifica tags, alertas e historico medico." />
          <FeatureCard title="Origem do Paciente" description="Campo de rastreamento de fonte: Instagram, Google, Facebook, Indicacao, Convenio, Site, Outro. Para medir ROI de marketing." />
          <FeatureCard title="Desativacao Segura" description="Soft delete de pacientes (nunca perde historico). Atende exigencia CFM de 20 anos de guarda de prontuario." />
          <FeatureCard title="Relatorio Imprimivel" description="Pagina de relatorio completo do paciente com todos os dados, historico e tratamentos. Ctrl+P gera PDF." />
        </CategorySection>

        {/* ── 2. AGENDAMENTO ── */}
        <CategorySection icon="📅" title="Agendamento e Agenda" description="Calendario completo com multiplas visoes, bloqueio de horarios e agendamentos recorrentes." count={8}>
          <FeatureCard title="Calendario Multi-visao" description="Visualizacao diaria, semanal, mensal e em lista. Navegacao por data, responsivo. Acoes rapidas de status por consulta." />
          <FeatureCard title="Drag and Drop" description="Arraste consultas na visao semanal para reagendar. Integrado com @dnd-kit/core. Atualiza data automaticamente." />
          <FeatureCard title="Deteccao de Conflitos" description="Verifica janela de +/-30 minutos. Alerta visual com opcao de forcar agendamento. Tambem verifica bloqueios de horario." />
          <FeatureCard title="Bloqueio de Horarios" description="Bloqueie almoco, ferias, feriados ou reunioes. Suporte a bloqueios unicos e recorrentes semanais. Barras cinza no calendario." />
          <FeatureCard title="Agenda Recorrente" description="Agende series de consultas: semanal ou quinzenal, de 2 a 52 ocorrencias. Criacao atomica em transacao. Ideal para fisioterapia e estetica." />
          <FeatureCard title="Duracao por Procedimento" description="Cada procedimento pode ter duracao em minutos configuravel em Configuracoes. Padrao: 30 minutos." />
          <FeatureCard title="Reagendamento" description="Mova consultas para outra data/hora via drag-and-drop ou formulario. Atualiza automaticamente." />
          <FeatureCard title="Cancelamento com Confirmacao" description="Cancele agendamentos com confirmacao. Status atualiza para 'cancelado' com registro no historico." />
        </CategorySection>

        {/* ── 3. PRONTUARIO E IA ── */}
        <CategorySection icon="🎙️" title="Prontuario e IA" description="Gravacao de voz, transcricao automatica e extracao de dados por inteligencia artificial." count={10}>
          <FeatureCard title="Gravacao de Audio" description="Gravacao via MediaRecorder (webm/opus). Consentimento LGPD obrigatorio. Audio nunca salvo localmente. Limite de 25MB." />
          <FeatureCard title="Transcricao por IA (Whisper)" description="Transcricao automatica em portugues via OpenAI Whisper. Vocabulario medico como hints. Timeout de 60 segundos." />
          <FeatureCard title="Extracao de Dados (Claude)" description="Claude Sonnet extrai nome, CPF, telefone, procedimentos, observacoes via tool_use. Validacao Zod. Temperatura 0 para precisao." />
          <FeatureCard title="Revisao antes de Salvar" description="Dados extraidos pela IA nunca sao salvos automaticamente. Profissional revisa, edita e confirma. Campos com confianca < 80% destacados em amarelo." />
          <FeatureCard title="Cadastro por Voz" description="Fale os dados do paciente e a IA preenche o cadastro. Deteccao de duplicatas por CPF/nome antes de salvar." />
          <FeatureCard title="Templates por Especialidade" description="IA gera templates customizados no onboarding: procedimentos, campos extras e perguntas de anamnese por profissao." />
          <FeatureCard title="Reproducao de Audio" description="Player de audio com controles play/pause na aba de gravacoes do paciente. URLs assinadas de 5 minutos." />
          <FeatureCard title="Planos de Tratamento" description="Crie planos com multiplas sessoes (ex: clareamento 6 sessoes). Rastreie progresso, marque sessoes concluidas, pause ou cancele." />
          <FeatureCard title="Anamnese Customizada" description="Template de perguntas por profissao (texto, booleano, selecao). Preenchido na aba Anamnese do paciente. Gerado pela IA no onboarding." />
          <FeatureCard title="Extracao Estruturada (7 campos)" description="IA separa: procedimentos, diagnostico, observacoes, medicamentos, recomendacoes, proxima consulta e atualizacoes de dados pessoais do paciente." />
        </CategorySection>

        {/* ── 4. PRESCRICOES E DOCUMENTOS ── */}
        <CategorySection icon="💊" title="Prescricoes e Documentos" description="Prescricao eletronica, atestados, declaracoes e laudos com impressao em PDF." count={4}>
          <FeatureCard title="Prescricao Eletronica" description="Crie prescricoes com lista de medicamentos (nome, posologia, frequencia, duracao, observacoes). Imprima como PDF (Ctrl+P). Acessivel pelo perfil do paciente." />
          <FeatureCard title="Atestados Medicos" description="Geracao automatica de texto com nome, CPF, data e dias de afastamento. Campo opcional para codigo CID. Impressao em PDF." />
          <FeatureCard title="Declaracao de Comparecimento" description="Texto auto-gerado com horario de entrada e saida. Impressao em PDF com assinatura e dados da clinica." />
          <FeatureCard title="Encaminhamento e Laudo" description="Documentos com texto livre para encaminhamentos medicos e laudos tecnicos. Impressao em PDF padronizada." />
        </CategorySection>

        {/* ── 5. COMUNICACAO ── */}
        <CategorySection icon="💬" title="Comunicacao" description="WhatsApp Business API, lembretes automaticos, NPS e notificacoes." count={7}>
          <FeatureCard title="WhatsApp Business API" description="Integracao completa via Meta Cloud API. Setup wizard de 5 passos com Facebook Embedded Signup. Envio e recebimento de mensagens." />
          <FeatureCard title="Lembretes Automaticos" description="Cron diario envia lembretes 24h antes da consulta. WhatsApp com botoes interativos (Confirmar/Nao poderei ir), email como fallback." />
          <FeatureCard title="Confirmacao Automatizada" description="Paciente confirma ou cancela via clique de botao WhatsApp ou resposta em texto (sim/nao). Status da consulta atualiza automaticamente." />
          <FeatureCard title="Mensagens de Aniversario" description="Cron diario verifica aniversariantes. Envia felicitacao via WhatsApp ou email automaticamente." />
          <FeatureCard title="Pesquisa NPS" description="Enviada automaticamente apos consultas completadas. Pagina publica com escala 0-10 + comentario. Score NPS nos relatorios." />
          <FeatureCard title="Email Transacional" description="Lembretes, confirmacoes e NPS via Resend API. Templates HTML em pt-BR. Fallback gracioso se API key nao configurada." />
          <FeatureCard title="Notificacoes In-App" description="Sino de notificacoes no header. Tipos: consulta em breve, falta, tratamento completo, sistema. Polling a cada 60 segundos." />
        </CategorySection>

        {/* ── 6. FINANCEIRO ── */}
        <CategorySection icon="💰" title="Financeiro" description="Controle de precos, receitas e recibos por consulta." count={3}>
          <FeatureCard title="Preco por Consulta" description="Cada consulta pode ter valor em BRL. Editavel na revisao e no historico. Procedimentos com preco configuravel." />
          <FeatureCard title="Recibos de Atendimento" description="Geracao automatica com dados do paciente, procedimentos e valor. Impressao em PDF (Ctrl+P). Assinatura manual." />
          <FeatureCard title="Dashboard Financeiro" description="Receita total, ticket medio, faturamento mensal, breakdown por procedimento. Exportacao para Excel." />
        </CategorySection>

        {/* ── 7. RELATORIOS ── */}
        <CategorySection icon="📊" title="Relatorios e Analytics" description="Dashboard gerencial com KPIs, graficos e rankings." count={8}>
          <FeatureCard title="Dashboard Gerencial" description="KPIs: total de pacientes, consultas mensais, receita total, taxa de retorno, taxa de no-show, NPS score." />
          <FeatureCard title="Grafico de Receita Mensal" description="Linha/barra de evolucao de receita e atendimentos por mes. Periodos: 3, 6 ou 12 meses." />
          <FeatureCard title="Novos Pacientes por Mes" description="Grafico de barras com crescimento da base de pacientes ao longo do tempo." />
          <FeatureCard title="Distribuicao por Status" description="Grafico de pizza: concluidos, agendados, cancelados, faltaram." />
          <FeatureCard title="Horarios mais Procurados" description="Heatmap de atendimentos por hora do dia (7h-20h). Identifica picos de demanda." />
          <FeatureCard title="Procedimentos mais Realizados" description="Ranking dos 10 procedimentos mais frequentes com barras de progresso." />
          <FeatureCard title="Ranking de Pacientes" description="Top 10 pacientes por frequencia de consultas e top 10 por receita gerada. Identifica VIPs automaticamente." />
          <FeatureCard title="Exportacao Excel" description="Exporte lista de pacientes e relatorios completos em .xlsx. Multi-sheet: Resumo, Mensal, Procedimentos." />
        </CategorySection>

        {/* ── 8. CONFIGURACOES ── */}
        <CategorySection icon="⚙️" title="Configuracoes" description="Personalize o workspace, equipe e integracoes." count={6}>
          <FeatureCard title="Procedimentos com Duracao" description="Cadastre procedimentos com nome, categoria, preco e duracao em minutos. Gerados por IA no onboarding." />
          <FeatureCard title="Campos Personalizados" description="Crie campos extras por especialidade: texto, numero, booleano, data, selecao com opcoes. Aparecem no cadastro e perfil do paciente." />
          <FeatureCard title="Anamnese Configuravel" description="Template de perguntas de anamnese por profissao. Texto, booleano ou selecao. Gerado pela IA." />
          <FeatureCard title="Gestao de Equipe" description="Convite por email com roles: proprietario, admin, membro. Controle de acesso basico. Convites com expiracao de 7 dias." />
          <FeatureCard title="Configuracao WhatsApp" description="Wizard de 5 etapas para conectar WhatsApp Business via Facebook Embedded Signup. Tokens criptografados." />
          <FeatureCard title="Tema Claro/Escuro" description="Alterne entre modo claro, escuro ou preferencia do sistema. Salvo localmente." />
        </CategorySection>

        {/* ── 9. SEGURANCA ── */}
        <CategorySection icon="🔐" title="Seguranca e LGPD" description="Conformidade com LGPD e boas praticas de seguranca." count={6}>
          <FeatureCard title="Consentimento LGPD" description="Modal obrigatorio antes de gravacao de audio. ConsentRecord armazenado no banco com timestamp e responsavel." />
          <FeatureCard title="Isolamento Multi-tenant" description="Todas as queries filtradas por workspaceId. Gravacoes, pacientes e consultas completamente isolados entre clinicas." />
          <FeatureCard title="Auditoria Completa" description="Log de todas as operacoes: criacao, edicao, exclusao, merge, exportacao. Registra usuario, acao, entidade e timestamp." />
          <FeatureCard title="Soft Delete (20 anos)" description="Pacientes desativados, nunca deletados. Atende exigencia do CFM de guarda por 20 anos. Dados retidos para compliance." />
          <FeatureCard title="Criptografia" description="HTTPS em transito (Fly.io). Tokens WhatsApp criptografados em repouso (AES). URLs de audio assinadas (5 min expiry)." />
          <FeatureCard title="Autenticacao Clerk" description="Login seguro via Clerk com suporte a Google, social login e 2FA. Sessoes gerenciadas automaticamente." />
        </CategorySection>

        {/* ── 10. INFRAESTRUTURA ── */}
        <CategorySection icon="📱" title="Infraestrutura e UX" description="Performance, responsividade e experiencia do usuario." count={9}>
          <FeatureCard title="Design Responsivo" description="Mobile-first com sidebar no desktop e bottom nav no mobile. Funciona em celular, tablet e desktop." />
          <FeatureCard title="PWA Ready" description="Manifest.json e service worker para instalacao como app. Icones configurados para iOS e Android." />
          <FeatureCard title="Performance" description="Next.js 16 com Turbopack. Server components, cache com unstable_cache. Carregamento rapido com skeletons." />
          <FeatureCard title="Busca Global (Ctrl+K)" description="Paleta de comandos acessivel de qualquer pagina. Busca pacientes, paginas e acoes rapidas. Navegacao por teclado." />
          <FeatureCard title="Onboarding com IA" description="Wizard de 4 etapas: escolha da profissao (8 opcoes), perguntas contextuais, dados da clinica, preview editavel gerado por Claude. Workspace pronto em segundos." />
          <FeatureCard title="Impressao em PDF" description="Paginas de recibo, prescricao e atestado otimizadas para impressao (Ctrl+P). Estilos @media print dedicados." />
          <FeatureCard title="Health Check" description="Endpoint /api/health para monitoramento de disponibilidade e integracao com ferramentas de uptime." />
          <FeatureCard title="Validacao de Ambiente" description="Todas as variaveis de ambiente validadas via Zod no startup. App falha rapido se configuracao incorreta." />
          <FeatureCard title="Indicador de Horario Atual" description="Linha vermelha no calendario semanal mostrando a hora atual, com auto-scroll para o horario do dia." />
        </CategorySection>

        {/* Footer */}
        <footer className="border-t border-slate-100 pt-8 pb-12 text-center space-y-2">
          <p className="text-xs text-slate-400">
            VoxClinic — CRM inteligente com IA para clinicas e consultorios
          </p>
          <p className="text-[10px] text-slate-300">
            Ultima atualizacao: {lastUpdated} · {FEATURES_SUMMARY.total} funcionalidades documentadas
          </p>
          {/* Agent instruction: update lastUpdated and FEATURES_SUMMARY when adding features */}
        </footer>
      </main>
    </div>
  )
}
