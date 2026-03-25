# VoxClinic

CRM inteligente com voz para profissionais de saude. O profissional fala durante ou apos a consulta, e o sistema transcreve, extrai dados estruturados via IA e preenche o prontuario automaticamente.

## Funcionalidades

### Onboarding Inteligente
- Selecao de profissao (dentista, nutricionista, esteticista, medico, advogado)
- Perguntas contextuais por profissao
- Geracao de workspace personalizado via IA (procedimentos, campos customizados, template de anamnese)
- Revisao e edicao do workspace antes de confirmar

### Cadastro de Paciente por Voz
- Gravacao de audio com consentimento LGPD obrigatorio
- Transcricao via OpenAI Whisper
- Extracao automatica de dados (nome, CPF, telefone, procedimentos, alertas) via Claude AI
- Indicador visual de confianca da IA (campos com < 80% destacados em amarelo)
- Deteccao de pacientes duplicados (por CPF normalizado e nome)
- Revisao obrigatoria antes de salvar (confirmation-before-save)

### Consultas por Voz
- Selecao de paciente existente com busca
- Gravacao do atendimento (ate 30 minutos)
- Geracao de resumo com IA (procedimentos, observacoes, recomendacoes, proxima consulta)
- Revisao e edicao do resumo antes da confirmacao
- Appointment so e criado apos confirmacao do profissional

### Dashboard
- Metricas (total de pacientes, atendimentos no mes)
- Busca rapida de pacientes com debounce
- Pacientes recentes
- Acesso rapido a gravacao e novo paciente

### Gestao de Pacientes
- Listagem com paginacao e busca
- Ficha completa: dados pessoais, campos customizados do workspace, alertas
- Historico de consultas em timeline
- Gravacoes vinculadas
- Edicao inline de dados pessoais
- Cadastro manual com mascaras BR (CPF, telefone)

### Configuracoes
- Editar nome da clinica
- Gerenciar procedimentos (adicionar/remover)
- Gerenciar campos customizados (toggle obrigatorio, remover)

### Navegacao
- Sidebar desktop com 4 secoes (Dashboard, Pacientes, Nova Consulta, Configuracoes)
- Bottom navigation mobile
- Header com logo, nome da clinica e avatar do usuario

## Tech Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui |
| Backend | Next.js Server Actions + API Routes |
| Banco de Dados | PostgreSQL via Supabase |
| ORM | Prisma |
| Autenticacao | Clerk (pt-BR) |
| Speech-to-Text | OpenAI Whisper API |
| AI/LLM | Anthropic Claude API (Sonnet) |
| Validacao AI | Zod schemas para respostas da IA |
| Storage | Supabase Storage (audio com signed URLs) |

## Primeiros Passos

### Pre-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com) (banco PostgreSQL + Storage)
- Conta no [Clerk](https://clerk.com) (autenticacao)
- API key da [OpenAI](https://platform.openai.com) (Whisper)
- API key da [Anthropic](https://console.anthropic.com) (Claude)

### Instalacao

```bash
git clone https://github.com/seu-usuario/vox.git
cd vox
npm install
```

### Variaveis de Ambiente

Crie `.env.local` na raiz do projeto:

```env
# Banco de dados (Supabase)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
CLERK_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/onboarding"

# OpenAI (Whisper)
OPENAI_API_KEY="sk-..."

# Anthropic (Claude)
ANTHROPIC_API_KEY="sk-ant-..."
```

### Configurar Banco de Dados

```bash
npx prisma generate
npx prisma migrate dev
```

### Configurar Supabase Storage

1. Crie um bucket chamado `audio` no Supabase Dashboard
2. Configure o bucket como **privado** (nao publico)

### Configurar Webhook do Clerk

1. No Clerk Dashboard, crie um webhook endpoint apontando para `https://seu-dominio/api/webhooks/clerk`
2. Selecione os eventos: `user.created`, `user.updated`, `user.deleted`
3. Copie o signing secret para `CLERK_WEBHOOK_SECRET`

### Executar

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Estrutura do Projeto

```
src/
├── app/
│   ├── (auth)/              # Sign-in / Sign-up (Clerk)
│   ├── (dashboard)/         # Area autenticada
│   │   ├── dashboard/       # Painel principal
│   │   ├── patients/        # CRUD de pacientes
│   │   │   ├── [id]/        # Detalhe do paciente (tabs: resumo, historico, gravacoes)
│   │   │   └── new/         # Novo paciente (manual ou voz)
│   │   ├── appointments/    # Consultas
│   │   │   ├── new/         # Nova consulta (selecao + gravacao)
│   │   │   └── review/      # Revisao do resumo AI antes de salvar
│   │   ├── settings/        # Configuracoes do workspace
│   │   ├── layout.tsx       # Layout com sidebar + bottom nav + auth guard
│   │   ├── loading.tsx      # Loading state global
│   │   └── error.tsx        # Error boundary global
│   ├── api/
│   │   ├── appointments/    # API route para dados de consulta
│   │   └── webhooks/clerk/  # Webhook Clerk (user CRUD)
│   └── onboarding/          # Wizard de onboarding (4 etapas)
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── record-button.tsx    # Botao de gravacao com consentimento LGPD
│   ├── nav-sidebar.tsx      # Navegacao lateral (desktop)
│   └── nav-bottom.tsx       # Navegacao inferior (mobile)
├── lib/
│   ├── claude.ts            # AI: extracao de entidades, workspace, resumo (com Zod)
│   ├── openai.ts            # Speech-to-text via Whisper
│   ├── storage.ts           # Upload/download de audio (signed URLs)
│   ├── schemas.ts           # Zod schemas para validacao de respostas da IA
│   ├── db.ts                # Prisma client
│   └── utils.ts             # Utilitarios (cn)
├── server/actions/
│   ├── workspace.ts         # CRUD workspace + geracao AI
│   ├── voice.ts             # Pipeline de voz (upload → transcricao → extracao)
│   ├── consultation.ts      # Pipeline de consulta (confirmation-before-save)
│   ├── patient.ts           # CRUD pacientes (com paginacao)
│   └── dashboard.ts         # Dados do painel
├── types/
│   └── index.ts             # TypeScript interfaces
└── middleware.ts             # Clerk auth middleware
```

## Seguranca e LGPD

- **Consentimento obrigatorio** antes de qualquer gravacao de audio
- **Audio privado** armazenado com signed URLs (expiracao de 5 minutos)
- **Confirmation-before-save** em todos os dados extraidos por IA
- **Multi-tenant** com isolamento por workspace em todas as queries
- **Validacao Zod** em todas as respostas da IA (previne dados malformados)
- **System message separada** nos prompts da IA (mitiga prompt injection)
- **Limite de upload** de 50MB para arquivos de audio
- **CPF normalizado** para deteccao de duplicatas
- Audio nunca cacheado localmente no dispositivo

## Scripts

```bash
npm run dev          # Servidor de desenvolvimento (Turbopack)
npm run build        # Build de producao
npm run start        # Servidor de producao
npm run lint         # ESLint
npx prisma generate  # Regenerar Prisma client
npx prisma migrate dev  # Executar migracoes
```
