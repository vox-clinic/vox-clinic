import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "VoxClinic - Documentação de Funcionalidades",
  description: "Documentação completa de todas as funcionalidades do CRM VoxClinic para clínicas e consultórios.",
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

const lastUpdated = "2026-03-28"

type FeatureStatus = "done" | "partial" | "planned"

function StatusBadge({ status }: { status: FeatureStatus }) {
  const config = {
    done: { label: "Disponível", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
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
    <section className="scroll-mt-20" id={title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "-")}>
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
  total: 118,
  categories: 11,
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
            Documentação completa de todas as funcionalidades disponíveis no VoxClinic.
            CRM inteligente com IA para clínicas e consultórios.
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
          <h2 className="text-sm font-bold text-slate-900 mb-3">Índice</h2>
          <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3 text-[13px]">
            {[
              { icon: "👤", label: "Gestão de Pacientes", id: "gestao-de-pacientes" },
              { icon: "📅", label: "Agendamento e Agenda", id: "agendamento-e-agenda" },
              { icon: "🎙️", label: "Prontuário e IA", id: "prontuario-e-ia" },
              { icon: "💊", label: "Prescrições e Documentos", id: "prescricoes-e-documentos" },
              { icon: "💬", label: "Comunicação", id: "comunicacao" },
              { icon: "💰", label: "Financeiro", id: "financeiro" },
              { icon: "📊", label: "Relatórios e Analytics", id: "relatorios-e-analytics" },
              { icon: "⚙️", label: "Configurações", id: "configuracoes" },
              { icon: "🔐", label: "Segurança e LGPD", id: "seguranca-e-lgpd" },
              { icon: "📱", label: "Infraestrutura e UX", id: "infraestrutura-e-ux" },
              { icon: "🎥", label: "Telemedicina", id: "telemedicina" },
            ].map((item) => (
              <a key={item.id} href={`#${item.id}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-slate-600 hover:bg-slate-50 hover:text-teal-600 transition-colors">
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </a>
            ))}
          </div>
        </nav>

        {/* ── 1. GESTAO DE PACIENTES ── */}
        <CategorySection icon="👤" title="Gestão de Pacientes" description="Cadastro completo, busca avançada, tags e organização de pacientes." count={12}>
          <FeatureCard title="Cadastro Completo" description="Nome, CPF, RG, telefone, email, data de nascimento, sexo, endereço completo, convênio, responsável (menores), origem/fonte do paciente." />
          <FeatureCard title="Campos Personalizáveis" description="Campos extras configuráveis por especialidade: texto, número, booleano, data, seleção. Gerados automaticamente pela IA no onboarding." />
          <FeatureCard title="Histórico Médico" description="Seção dedicada com alergias, doenças crônicas, medicações em uso, tipo sanguíneo e observações médicas. Tudo editável inline." />
          <FeatureCard title="Upload de Documentos" description="Galeria de imagens, PDFs e documentos Word anexados ao perfil do paciente. Limite de 10MB, URLs assinadas de 5 minutos." />
          <FeatureCard title="Busca Avançada" description="Busca por nome, CPF, telefone, email, convênio. Filtro por tags com barra de tags clicáveis. Paginação server-side." />
          <FeatureCard title="Tags e Segmentação" description="Sistema de tags com cores (VIP, retorno pendente, gestante, etc). Filtro por tag na lista de pacientes. Tags visíveis no perfil." />
          <FeatureCard title="Importação/Exportação" description="Importação CSV com mapeamento de colunas (PapaParse). Exportação individual em JSON. Exportação em massa para Excel (.xlsx)." />
          <FeatureCard title="Detecção e Merge de Duplicatas" description="Detecção por CPF e nome. Merge atômico: transfere consultas, gravações, documentos e planos. Unifica tags, alertas e histórico médico." />
          <FeatureCard title="Origem do Paciente" description="Campo de rastreamento de fonte: Instagram, Google, Facebook, Indicação, Convênio, Site, Outro. Para medir ROI de marketing." />
          <FeatureCard title="Desativação Segura" description="Soft delete de pacientes (nunca perde histórico). Atende exigência CFM de 20 anos de guarda de prontuário." />
          <FeatureCard title="Relatório Imprimível" description="Página de relatório completo do paciente com todos os dados, histórico e tratamentos. Ctrl+P gera PDF." />
          <FeatureCard title="Imagens Clínicas" description="Galeria de fotos clínicas por paciente. Upload com câmera ou galeria, compressão automática (2048px JPEG 85%), categorias (antes/depois/progresso/geral/intraoral), regiões corporais, pareamento antes/depois com comparação lado a lado, lightbox com navegação, filtros por região e categoria, views grid e timeline." />
        </CategorySection>

        {/* ── 2. AGENDAMENTO ── */}
        <CategorySection icon="📅" title="Agendamento e Agenda" description="Calendário completo com múltiplas visões, bloqueio de horários, agendamentos recorrentes, múltiplas agendas, agendamento online e lista de espera." count={14}>
          <FeatureCard title="Agendamento Online (Paciente)" description="Link público para pacientes agendarem sozinhos. Multi-step: procedimento, data/hora com slots disponíveis, dados do paciente. Sem login. Configura em Settings > Online. Advisory lock anti-double-booking." />
          <FeatureCard title="Múltiplas Agendas" description="Suporte a várias agendas por workspace (por profissional ou sala). Pills coloridos para filtrar. Conflitos e bloqueios por agenda. CRUD completo em Configurações > Agendas." />
          <FeatureCard title="Calendário Multi-visão" description="Visualização diária, semanal, mensal e em lista. Arquitetura modular com 12 sub-componentes otimizados (React.memo). Cache client-side com TTL de 60s para navegação rápida. Busca O(1) via indexes Map." />
          <FeatureCard title="Drag and Drop" description="Arraste consultas na visão semanal para reagendar. Integrado com @dnd-kit/core. Suporte a forceSchedule no reagendamento." />
          <FeatureCard title="Detecção de Conflitos" description="Verifica janela de +/-30 minutos. AlertDialog dedicado (substitui confirm() nativo) com opção de forçar agendamento. Também verifica bloqueios de horário." />
          <FeatureCard title="Bloqueio de Horários" description="Bloqueie almoço, férias, feriados ou reuniões. Suporte a bloqueios únicos e recorrentes semanais. Barras cinza no calendário." />
          <FeatureCard title="Agenda Recorrente" description="Agende séries de consultas: semanal ou quinzenal, de 2 a 52 ocorrências. Criação atômica em transação. Ideal para fisioterapia e estética." />
          <FeatureCard title="Duração por Procedimento" description="Cada procedimento pode ter duração em minutos configurável em Configurações. Padrão: 30 minutos." />
          <FeatureCard title="Reagendamento" description="Mova consultas para outra data/hora via drag-and-drop ou formulário. Atualiza automaticamente." />
          <FeatureCard title="Cancelamento com Confirmação" description="Cancele agendamentos com confirmação. Status atualiza para 'cancelado' com registro no histórico." />
          <FeatureCard title="Valor no Agendamento" description="Campo opcional de preço (R$) ao agendar consulta pelo calendário. Valor salvo no atendimento para uso no financeiro." />
          <FeatureCard title="Botão de Lembrete Manual" description="Botão no card de consulta agendada para enviar lembrete por email ao paciente sob demanda." />
          <FeatureCard title="Lista de Espera" description="Fila de pacientes com preferências (dias, horários, agenda, procedimento). Matching automático ao cancelar consulta. Panel no calendário com badge, prioridade (normal/alta/urgente)." />
          <FeatureCard title="Widget de Agendamento Embeddable" description="Script leve (widget.js) para incorporar agendamento no site da clínica. Botão flutuante ou modo inline. Popup com iframe em modo compacto. Comunicação via postMessage (resize, booked, close). Gerador de código embed nas Configurações. Cor e posição customizáveis. Mobile: overlay full-screen." />
        </CategorySection>

        {/* ── 3. PRONTUARIO E IA ── */}
        <CategorySection icon="🎙️" title="Prontuário e IA" description="Gravação de voz, transcrição automática, extração de dados por inteligência artificial e formulários customizáveis." count={15}>
          <FeatureCard title="Gravação de Áudio" description="Gravação via MediaRecorder (webm/opus). Consentimento LGPD obrigatório. Áudio nunca salvo localmente. Limite de 25MB." />
          <FeatureCard title="Transcrição por IA (Whisper)" description="Transcrição automática em português via OpenAI Whisper. Vocabulário médico como hints. Timeout de 60 segundos." />
          <FeatureCard title="Extração de Dados (Claude)" description="Claude Sonnet extrai nome, CPF, telefone, procedimentos, observações via tool_use. Validação Zod. Temperatura 0 para precisão." />
          <FeatureCard title="Revisão antes de Salvar" description="Dados extraídos pela IA nunca são salvos automaticamente. Profissional revisa, edita e confirma. Campos com confiança < 80% destacados em amarelo." />
          <FeatureCard title="Cadastro por Voz" description="Fale os dados do paciente e a IA preenche o cadastro. Detecção de duplicatas por CPF/nome antes de salvar." />
          <FeatureCard title="Templates por Especialidade" description="IA gera templates customizados no onboarding: procedimentos, campos extras e perguntas de anamnese por profissão." />
          <FeatureCard title="Reprodução de Áudio" description="Player de áudio com controles play/pause na aba de gravações do paciente. URLs assinadas de 5 minutos." />
          <FeatureCard title="Planos de Tratamento" description="Crie planos com múltiplas sessões (ex: clareamento 6 sessões). Rastreie progresso, marque sessões concluídas, pause ou cancele." />
          <FeatureCard title="Anamnese Customizada" description="Template de perguntas por profissão (texto, booleano, seleção). Preenchido na aba Anamnese do paciente. Gerado pela IA no onboarding." />
          <FeatureCard title="Extração Estruturada (7 campos)" description="IA separa: procedimentos, diagnóstico, observações, medicamentos, recomendações, próxima consulta e atualizações de dados pessoais do paciente." />
          <FeatureCard title="CID-10 com Sugestão por IA" description="Busca de códigos CID-10 (1022 códigos PT-BR) com autocomplete. IA sugere CIDs a partir da transcrição. Códigos vinculados a consultas e atestados. Busca accent-insensitive por código ou descrição." />
          <FeatureCard title="Formulários Customizáveis" description="Editor visual de formulários com 11 tipos de campo (texto, número, seleção, escala, etc). Templates por especialidade. Respostas vinculadas a pacientes e consultas." />
          <FeatureCard title="Biblioteca de Templates" description="5 templates pré-construídos (Anamnese Geral, Odontológica, Nutricional, SOAP, Retorno). Importar, clonar e customizar para o workspace." />
          <FeatureCard title="Histórico de Formulários" description="Aba Formulários no perfil do paciente com histórico cronológico de respostas. Draft e completed status. Visualização inline read-only. Compatibilidade com anamnese legada." />
          <FeatureCard title="Preenchimento Automático de Endereço (CEP)" description="Ao digitar o CEP, o sistema busca automaticamente rua, bairro, cidade e estado via ViaCEP. Funciona no cadastro e edição de pacientes." />
        </CategorySection>

        {/* ── 4. PRESCRICOES E DOCUMENTOS ── */}
        <CategorySection icon="💊" title="Prescrições e Documentos" description="Prescrição eletrônica nativa, atestados, declarações e laudos com impressão em PDF." count={4}>
          <FeatureCard title="Prescrição Eletrônica" description="Crie prescrições com lista de medicamentos (nome, posologia, frequência, duração, observações). Imprima como PDF (Ctrl+P). Acessível pelo perfil do paciente." />
          <FeatureCard title="Atestados Médicos" description="Geração automática de texto com nome, CPF, data e dias de afastamento. Campo opcional para código CID. Impressão em PDF." />
          <FeatureCard title="Declaração de Comparecimento" description="Texto auto-gerado com horário de entrada e saída. Impressão em PDF com assinatura e dados da clínica." />
          <FeatureCard title="Encaminhamento e Laudo" description="Documentos com texto livre para encaminhamentos médicos e laudos técnicos. Impressão em PDF padronizada." />
        </CategorySection>

        {/* ── 5. COMUNICACAO ── */}
        <CategorySection icon="💬" title="Comunicação" description="WhatsApp Business API, lembretes automáticos, NPS e notificações." count={8}>
          <FeatureCard title="WhatsApp Business API" description="Integração completa via Meta Cloud API. Setup wizard de 5 passos com Facebook Embedded Signup. Envio e recebimento de mensagens." />
          <FeatureCard title="Lembretes Automáticos" description="Cron diário envia lembretes 24h antes da consulta. WhatsApp com botões interativos (Confirmar/Não poderei ir), email como fallback." />
          <FeatureCard title="Confirmação Automatizada" description="Paciente confirma ou cancela via clique de botão WhatsApp ou resposta em texto (sim/não). Status da consulta atualiza automaticamente." />
          <FeatureCard title="Mensagens de Aniversário" description="Cron diário verifica aniversariantes. Envia felicitação via WhatsApp ou email automaticamente." />
          <FeatureCard title="Pesquisa NPS" description="Enviada automaticamente após consultas completadas. Página pública com escala 0-10 + comentário. Score NPS nos relatórios." />
          <FeatureCard title="Email Transacional" description="Lembretes, confirmações e NPS via Resend API. Templates HTML em pt-BR. Fallback gracioso se API key não configurada." />
          <FeatureCard title="Notificações In-App" description="Sino de notificações no header. Tipos: consulta em breve, falta, tratamento completo, sistema. Polling a cada 60 segundos." />
          <FeatureCard title="Inbox WhatsApp" description="Página de mensagens com lista de conversas e chat em tempo real. Envio de texto, indicador de leitura, busca de contatos. Polling automático." />
        </CategorySection>

        {/* ── 6. FINANCEIRO ── */}
        <CategorySection icon="💰" title="Financeiro" description="Controle completo de receitas, despesas, pagamentos, NFS-e, TISS e fluxo de caixa." count={19}>
          <FeatureCard title="Preço por Consulta" description="Cada consulta pode ter valor em BRL. Editável na revisão e no histórico. Procedimentos com preço configurável." />
          <FeatureCard title="Recibos de Atendimento" description="Geração automática com dados do paciente, procedimentos e valor. Impressão em PDF (Ctrl+P). Assinatura manual." />
          <FeatureCard title="Dashboard Financeiro" description="Receita total, ticket médio, faturamento mensal, breakdown por procedimento. Exportação para Excel." />
          <FeatureCard title="Contas a Receber" description="Registro de cobranças com parcelamento (1-24x), controle de pagamentos por método (PIX, cartão, dinheiro, boleto, convênio), detecção automática de vencidos, saldo por paciente." />
          <FeatureCard title="Fluxo de Caixa" description="Visão diária/mensal de entradas e saídas com gráfico combinado (barras + linha de saldo). Despesas com categorias, recorrência e projeção futura." />
          <FeatureCard title="Gestão de Despesas" description="Cadastro de despesas com 8 categorias padrão (Aluguel, Salários, Material, etc.), recorrência semanal/mensal/anual, pagamento inline." />
          <FeatureCard title="NFS-e (Nota Fiscal)" description="Emissão de Nota Fiscal de Serviço Eletrônica via API Nuvem Fiscal. Configuração fiscal completa (CNPJ, ISS, regime tributário). Download PDF, cancelamento." />
          <FeatureCard title="Tabela de Preços" description="Configuração de preços por procedimento, editável diretamente na página financeira." />
          <FeatureCard title="Edição de Despesas" description="Despesas podem ser editadas após criação. Dialog pré-preenchido com dados atuais, salvamento via updateExpense." />
          <FeatureCard title="Projeção de Fluxo de Caixa" description="Gráfico de projeção de receitas e despesas para os próximos 6 meses. Baseado em cobranças e despesas recorrentes." />
          <FeatureCard title="Saldo do Paciente" description="Badge no detalhe do paciente mostrando saldo devedor total e valores vencidos, com destaque visual em vermelho." />
          <FeatureCard title="Certificado Digital NFS-e" description="Upload de certificado digital A1 (.pfx) para emissão de NFS-e. Cadastro automático da empresa na NuvemFiscal e configuração fiscal integrada." />
          <FeatureCard title="TISS — Guia de Consulta" description="Geração de Guia de Consulta TISS (ANS 4.01.00) com XML válido, código TUSS, dados do beneficiário e profissional. Integrado com agenda e paciente." />
          <FeatureCard title="TISS — Guia SP/SADT" description="Geração de Guia SP/SADT para procedimentos e exames. Lista de procedimentos com código TUSS, quantidade e valores." />
          <FeatureCard title="TISS — Gestão de Operadoras" description="Cadastro de convênios (operadoras) com registro ANS, CNPJ. Dados estruturados de convênio no perfil do paciente (carteira, plano, validade)." />
          <FeatureCard title="TISS — Lote XML e Ciclo de Vida" description="Exportação em lote de guias TISS como XML batch. Ciclo de vida: rascunho, enviada, paga, glosada, cancelada. Hash SHA-256 para integridade." />
          <FeatureCard title="Comissões / Repasse" description="Regras de comissão por profissional e/ou procedimento (percentual ou valor fixo). Cálculo automático ao concluir consulta. Relatório por profissional com receita bruta, comissão e retenção clínica. Pagamento em lote com data." />
          <FeatureCard title="Controle de Estoque" description="Cadastro de itens (insumos, materiais, medicamentos) com categorias, unidade de medida, custo unitário e fornecedor. Movimentações atômicas (entrada/saída/ajuste) com histórico. Alerta de estoque mínimo com banner visual. Cards de resumo: total de itens, itens abaixo do mínimo, valor total em estoque." />
          <FeatureCard title="Gateway de Pagamento (Asaas)" description="Cobrança online via PIX (QR code instantâneo), boleto e cartão de crédito. Integração com Asaas, webhook para confirmação automática de pagamento, link de pagamento para envio ao paciente. Configuração em Configurações > Pagamento com modo sandbox para testes." />
        </CategorySection>

        {/* ── 7. RELATORIOS ── */}
        <CategorySection icon="📊" title="Relatórios e Analytics" description="Dashboard gerencial com KPIs, gráficos e rankings." count={9}>
          <FeatureCard title="Dashboard Gerencial" description="KPIs: total de pacientes, consultas mensais, receita total, taxa de retorno, taxa de no-show, NPS score." />
          <FeatureCard title="Gráfico de Receita Mensal" description="Linha/barra de evolução de receita e atendimentos por mês. Períodos: 3, 6 ou 12 meses." />
          <FeatureCard title="Novos Pacientes por Mês" description="Gráfico de barras com crescimento da base de pacientes ao longo do tempo." />
          <FeatureCard title="Distribuição por Status" description="Gráfico de pizza: concluídos, agendados, cancelados, faltaram." />
          <FeatureCard title="Horários mais Procurados" description="Heatmap de atendimentos por hora do dia (7h-20h). Identifica picos de demanda." />
          <FeatureCard title="Procedimentos mais Realizados" description="Ranking dos 10 procedimentos mais frequentes com barras de progresso." />
          <FeatureCard title="Ranking de Pacientes" description="Top 10 pacientes por frequência de consultas e top 10 por receita gerada. Identifica VIPs automaticamente." />
          <FeatureCard title="Exportação Excel" description="Exporte lista de pacientes e relatórios completos em .xlsx. Multi-sheet: Resumo, Mensal, Procedimentos." />
          <FeatureCard title="Respostas Individuais NPS" description="Listagem detalhada de respostas NPS com nome do paciente, score colorido (Promotor/Neutro/Detrator), comentário e data." />
        </CategorySection>

        {/* ── 8. CONFIGURACOES ── */}
        <CategorySection icon="⚙️" title="Configurações" description="Personalize o workspace, equipe, permissões e integrações." count={7}>
          <FeatureCard title="Procedimentos com Duração" description="Cadastre procedimentos com nome, categoria, preço e duração em minutos. Gerados por IA no onboarding." />
          <FeatureCard title="Campos Personalizados" description="Crie campos extras por especialidade: texto, número, booleano, data, seleção com opções. Aparecem no cadastro e perfil do paciente." />
          <FeatureCard title="Anamnese Configurável" description="Template de perguntas de anamnese por profissão. Texto, booleano ou seleção. Gerado pela IA." />
          <FeatureCard title="Gestão de Equipe" description="Convite por email com roles: proprietário, admin, profissional, secretária, visualizador. Convites com expiração de 7 dias." />
          <FeatureCard title="Controle de Acesso (RBAC)" description="5 papéis com permissões granulares. Navegação e páginas filtradas por role. Secretária sem acesso clínico, visualizador somente leitura, profissional sem financeiro/configurações." />
          <FeatureCard title="Configuração WhatsApp" description="Wizard de 5 etapas para conectar WhatsApp Business via Facebook Embedded Signup. Tokens criptografados." />
          <FeatureCard title="Tema Claro/Escuro" description="Alterne entre modo claro, escuro ou preferência do sistema. Salvo localmente." />
        </CategorySection>

        {/* ── 9. SEGURANCA ── */}
        <CategorySection icon="🔐" title="Segurança e LGPD" description="Conformidade com LGPD e boas práticas de segurança." count={10}>
          <FeatureCard title="Consentimento LGPD" description="Modal obrigatório antes de gravação de áudio. ConsentRecord armazenado no banco com timestamp e responsável." />
          <FeatureCard title="Isolamento Multi-tenant" description="Todas as queries filtradas por workspaceId. Gravações, pacientes e consultas completamente isolados entre clínicas." />
          <FeatureCard title="Auditoria Completa" description="Log de todas as operações: criação, edição, exclusão, merge, exportação. Registra usuário, ação, entidade e timestamp." />
          <FeatureCard title="Soft Delete (20 anos)" description="Pacientes desativados, nunca deletados. Atende exigência do CFM de guarda por 20 anos. Dados retidos para compliance." />
          <FeatureCard title="Criptografia" description="HTTPS em trânsito (Fly.io). Tokens WhatsApp criptografados em repouso (AES). URLs de áudio assinadas (5 min expiry)." />
          <FeatureCard title="Autenticação Clerk" description="Login seguro via Clerk com suporte a Google, social login e 2FA. Sessões gerenciadas automaticamente." />
          <FeatureCard title="Log de Auditoria" description="Página em Configurações > Auditoria com histórico paginado de todas as ações: criação, edição, exclusão de pacientes e consultas." />
          <FeatureCard title="Dashboard de Uso do Plano" description="Barras de progresso em Configurações > Plano mostrando consumo de pacientes, consultas e gravações vs limites do plano." />
          <FeatureCard title="Canal do DPO (Encarregado)" description="Página pública /dpo para exercício de direitos de titular (Art. 18 LGPD): acesso, correção, exclusão, portabilidade. Formulário com prazo de 15 dias." />
          <FeatureCard title="Plano de Resposta a Incidentes" description="Documento interno seguindo Resolução CD/ANPD 15/2024: classificação de severidade, fases de resposta, modelos de notificação a ANPD e titulares." />
        </CategorySection>

        {/* ── 10. INFRAESTRUTURA ── */}
        <CategorySection icon="📱" title="Infraestrutura e UX" description="Performance, responsividade e experiência do usuário." count={14}>
          <FeatureCard title="Design Responsivo" description="Mobile-first com sidebar no desktop e bottom nav no mobile. Funciona em celular, tablet e desktop." />
          <FeatureCard title="PWA Ready" description="Manifest.json e service worker para instalação como app. Ícones configurados para iOS e Android." />
          <FeatureCard title="Performance" description="Next.js 16 com Turbopack. Server components, cache com unstable_cache. Carregamento rápido com skeletons." />
          <FeatureCard title="Busca Global (Ctrl+K)" description="Paleta de comandos acessível de qualquer página. Busca pacientes, páginas e ações rápidas. Navegação por teclado." />
          <FeatureCard title="Onboarding com IA" description="Wizard de 4 etapas: escolha da profissão (8 opções), perguntas contextuais, dados da clínica, preview editável gerado por Claude. Workspace pronto em segundos." />
          <FeatureCard title="Tour Guiado Pós-Onboarding" description="10 steps interativos com spotlight overlay: dashboard, agenda, pacientes, financeiro, gravação de voz. Progress tracking, skip/restart, adaptação desktop/mobile." />
          <FeatureCard title="Verificação de Documento Digital" description="Página pública /verificar/[token] para validação de prescrições e atestados assinados digitalmente. Nome mascarado (LGPD), dados do profissional e certificado." />
          <FeatureCard title="Impressão em PDF" description="Páginas de recibo, prescrição e atestado otimizadas para impressão (Ctrl+P). Estilos @media print dedicados." />
          <FeatureCard title="Health Check" description="Endpoint /api/health para monitoramento de disponibilidade e integração com ferramentas de uptime." />
          <FeatureCard title="Validação de Ambiente" description="Todas as variáveis de ambiente validadas via Zod no startup. App falha rápido se configuração incorreta." />
          <FeatureCard title="Indicador de Horário Atual" description="Linha vermelha nas visões semanal e diária mostrando a hora atual (useRef, sem re-renders no pai), com auto-scroll para o horário do dia." />
          <FeatureCard title="Mensagens de Erro Amigáveis" description="Todas as mensagens de erro em português, claras e orientativas. Erros técnicos traduzidos automaticamente para linguagem acessível via helper centralizado (friendlyError)." />
          <FeatureCard title="Filtro por Convênio" description="Filtro de pacientes por convênio (plano de saúde) na lista de pacientes, complementando o filtro por tags existente." />
          <FeatureCard title="Busca Automática (Debounce)" description="Campos de busca em dialogs (NFS-e, merge de pacientes) iniciam a pesquisa automaticamente ao digitar, sem necessidade de clicar em botão. Debounce de 300ms." />
        </CategorySection>

        {/* ── 11. TELEMEDICINA ── */}
        <CategorySection icon="🎥" title="Telemedicina" description="Teleconsulta por vídeo integrada ao fluxo de atendimento." count={4}>
          <FeatureCard title="Teleconsulta por Vídeo" description="Videochamada integrada via Daily.co com sala privada, sala de espera (knocking), compartilhamento de tela e chat. Iframe embeddable sem dependências." />
          <FeatureCard title="Acesso do Paciente" description="Link público de acesso (/sala/[token]) sem necessidade de login. Janela de acesso de 24h antes/depois da consulta. Tela pré-chamada com consentimento LGPD, dados da consulta e botão de entrada." />
          <FeatureCard title="Gravação Automática de Vídeo" description="Webhook Daily.co captura gravações de teleconsulta e salva automaticamente no Supabase Storage. Vinculado ao atendimento para consulta posterior." />
          <FeatureCard title="Billing e Planos (Stripe)" description="Assinaturas via Stripe Checkout com planos Free/Pro/Enterprise. Customer Portal para autogestão, webhooks para sincronização de plano, suporte a PIX e boleto." />
        </CategorySection>

        {/* Footer */}
        <footer className="border-t border-slate-100 pt-8 pb-12 text-center space-y-2">
          <p className="text-xs text-slate-400">
            VoxClinic — CRM inteligente com IA para clínicas e consultórios
          </p>
          <p className="text-[10px] text-slate-300">
            Última atualização: {lastUpdated} · {FEATURES_SUMMARY.total} funcionalidades documentadas
          </p>
          {/* Agent instruction: update lastUpdated and FEATURES_SUMMARY when adding features */}
        </footer>
      </main>
    </div>
  )
}
