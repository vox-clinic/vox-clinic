# Entendimento do Projeto

## O que é

VoxClinic — CRM de saúde com IA de voz. Profissionais falam durante consultas → IA transcreve (Whisper) → extrai dados estruturados (Claude tool_use) → popula prontuários. Multi-tenant SaaS para clínicas brasileiras, com LGPD compliance.

## Stack completa

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 16 (App Router) + TypeScript (strict) + React 19 |
| Styling | Tailwind CSS v4 + shadcn/ui + Lucide icons |
| ORM/DB | Prisma 6 + PostgreSQL (Supabase) |
| Auth | Clerk (pt-BR) |
| AI | Claude (tool_use, extração estruturada) + OpenAI Whisper (transcrição) |
| Storage | Supabase Storage (signed URLs) |
| Email | Resend |
| Video | Daily.co (teleconsulta) |
| Fiscal | NuvemFiscal (NFS-e DPS Nacional) |
| Pagamento | Asaas (gateway PIX/boleto/cartão) + Stripe (billing SaaS) |
| Background Jobs | Inngest |
| Monitoring | Sentry (Next.js SDK) |
| Testes | Vitest + Testing Library + Playwright (E2E) + MSW (mocks) |
| CI/CD | GitHub Actions (unit + E2E) → Vercel |
| WhatsApp | Meta Cloud API |
| TISS | ANS billing XML |

## Números

| Métrica | Quantidade |
|---------|-----------|
| Server action files | 51 |
| Componentes React | ~89 |
| Modelos Prisma | 49 |
| Arquivos de teste | 30 |
| Feature docs | 16 |
| Integrações externas | 10+ (Clerk, Supabase, OpenAI, Anthropic, Resend, Daily.co, NuvemFiscal, Asaas, Stripe, Meta WhatsApp, Inngest, Sentry) |
| Dependências (prod) | 33 |
| Dependências (dev) | 17 |

## Patterns do projeto

### Server Actions
- `safeAction()` wrapper + `ActionError` para erros esperados → retorna `{ error }` em vez de throw
- Auth via `auth()` do Clerk em todo server action
- Multi-tenant: `getWorkspaceIdCached(userId)` → todas queries filtram por `workspaceId`

### Error Handling
- `ActionError` para erros de validação/negócio (mensagens pt-BR)
- `throw new Error(ERR_*)` para erros de auth (error boundaries)
- Client sempre verifica `'error' in result`

### Multi-tenant
- Isolamento por `workspaceId` em todas as queries
- RBAC: 5 roles (owner > admin > doctor > secretary > viewer), 20 permissões
- Navegação filtrada por role

### AI Pipeline
- Whisper → transcrição (60s timeout, pt-BR)
- Claude → extração estruturada via tool_use (30s timeout, temperature:0)
- Confirmação obrigatória antes de salvar dados extraídos

### Compliance (LGPD)
- Consentimento antes de gravação
- Audit logging (CFM 1.821/2007)
- Signed URLs com TTL curto
- DPO request page (/dpo)
- Soft delete para pacientes (retenção 20 anos CFM)

## Estado atual

### Implementado
- Core CRM: pacientes, consultas, agendamento, calendário modular
- AI pipeline: gravação → transcrição → extração → revisão → confirmação
- Financeiro: contas a receber, despesas, fluxo de caixa
- NFS-e, TISS, gateway pagamento (Asaas)
- Prescrição manual, atestados, planos de tratamento
- WhatsApp Business, teleconsulta (Daily.co)
- Form builder, booking online, NPS
- RBAC, onboarding wizard, admin panel
- Imagens clínicas, estoque, comissões, lista de espera
- Assinatura digital (ICP-Brasil)

### Em progresso / Planejado
- Prescrição avançada nativa (Memed removido)
- Redis cache (feature doc existe, implementação parcial)
- E2E tests (Playwright config exists, tests dir created)

### Problemas conhecidos
- Memed code still referenced in ARCHITECTURE.md but deleted from codebase
- Several untracked files in git (new features in progress)
- 30 test files for 51 server action files (~59% coverage by file count)
