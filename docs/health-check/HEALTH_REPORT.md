# 🏥 Relatório de Saúde do Projeto — 2026-03-28

## Resumo Executivo

**Score geral: 6.8/10**

VoxClinic é um projeto ambicioso e bem-estruturado para um SaaS de saúde. Os fundamentos são sólidos — TypeScript strict com zero erros, isolamento multi-tenant perfeito, pipeline AI bem desenhado, e patterns de error handling consistentes. No entanto, existem **vulnerabilidades de segurança críticas** (webhook sem verificação, RBAC não-enforced) e **gaps de qualidade** (sem Prettier/Husky, cache desabilitado, 35 server actions sem testes) que precisam ser corrigidos antes de escalar.

- 🔴 Críticos: **8**
- 🟠 Altos: **21**
- 🟡 Médios: **30**
- 🟢 Baixos: **5**
- ✅ Pontos positivos: **18**

## Diagnóstico por Área

| Área | Score | 🔴 | 🟠 | 🟡 | Status |
|------|-------|-----|-----|-----|--------|
| Arquitetura | 7/10 | 2 | 4 | 2 | Boa base, gaps em App Router boundaries e safeAction |
| Qualidade do Código | 6/10 | 1 | 2 | 5 | Zero tsc errors, mas ~85 `any`, sem Prettier/Husky |
| Banco de Dados | 8/10 | 2 | 3 | 3 | Excelente isolamento, indexes bons, N+1 pontuais |
| Segurança | 5/10 | 2 | 3 | 3 | Gateway webhook sem auth, RBAC UI-only |
| Performance | 6/10 | 0 | 2 | 4 | Cache desabilitado, N+1 em crons |
| Infraestrutura | 6/10 | 0 | 4 | 3 | CI incompleto, cron não registrado, Sentry mal configurado |
| Dependências & Debt | 7/10 | 2 | 0 | 4 | xlsx vuln sem fix, Clerk SSRF |
| Testes | 6/10 | 1 | 3 | 2 | 432 passando, mas 35/51 actions sem teste |
| UX & Acessibilidade | 7/10 | 0 | 2 | 4 | Loading/error states parciais, a11y básico |
| Documentação | 6/10 | 2 | 2 | 3 | ARCHITECTURE.md 30 files desatualizados, Memed ghost refs |

## O Que Está Bom ✅

1. **TypeScript strict com zero erros** — `tsc --noEmit` limpo em 49 modelos + 51 actions
2. **Isolamento multi-tenant perfeito** — ZERO queries sem workspaceId em todo o codebase
3. **safeAction + ActionError pattern** — error handling consistente, mensagens pt-BR centralizadas, Sentry integrado
4. **Prisma schema bem-indexado** — 7 indexes no Appointment, compostos onde importa
5. **Webhook security sólido** — Clerk (Svix), Stripe (SDK), Daily.co (HMAC), WhatsApp (HMAC) todos com verificação de assinatura timing-safe
6. **Criptografia bem implementada** — AES-256-GCM com IV/auth tag/key derivation em `crypto.ts`
7. **432 testes passando** — zero failures, boa cobertura nos módulos testados
8. **LGPD compliance** — ConsentRecord, audit logging, soft delete 20 anos, DPO endpoint, signed URLs
9. **Import consistency** — 100% `@/` alias, zero imports relativos, zero dependências circulares
10. **Calendar architecture** — modular, co-located, memoized, O(1) lookup
11. **Design system** — Tailwind v4 theming, shadcn/ui, pt-BR consistente
12. **Font optimization** — `next/font/google` self-hosted, zero external requests
13. **Dynamic imports** — Settings e financial pages usam `next/dynamic` extensivamente
14. **E2E framework** — Playwright com Page Objects, 10 specs, auth setup robusto
15. **Health check endpoint** — DB connectivity test
16. **Deploy region** — gru1 (São Paulo), correto para healthcare BR
17. **Standalone build** — `output: "standalone"` para containers
18. **TODO debt muito baixo** — apenas 3 TODOs em todo o codebase

## Top 10 Problemas Mais Urgentes

### 1. 🔴 Gateway webhook sem verificação de assinatura
**`src/app/api/webhooks/gateway/route.ts:13`**
Qualquer pessoa que descubra a URL pode enviar eventos de pagamento forjados, marcando pagamentos como "paid" sem transação real. **Risco de fraude financeira.**

### 2. 🔴 RBAC permissions — UI-only, não enforced no server
**`src/lib/permissions.ts`** — 30+ permissions definidas mas `hasPermission()` nunca chamado em server actions. Um `viewer` pode deletar pacientes, criar prescrições, editar financeiro.

### 3. 🔴 `xlsx` com Prototype Pollution — sem fix disponível
**`package.json`** — 7 vulnerabilidades npm (6 high). `xlsx` não tem patch, usado em exports. Substituir por `exceljs`.

### 4. 🔴 `@clerk/backend` SSRF — vaza secret keys
**`package.json`** — Resolver com `npm audit fix` imediatamente.

### 5. 🟠 Sentry `sendDefaultPii: true` — dados de saúde para servidores US
**`sentry.*.config.ts`** — LGPD violation para app de saúde brasileiro. Envia IPs, cookies, dados de usuário.

### 6. 🟠 Redis/cache completamente desabilitado
**`src/lib/cache.ts`** — Todo page load bate direto no banco. Sem caching, performance degradará com crescimento.

### 7. 🟠 CI pipeline incompleto
**`.github/workflows/deploy.yml`** — Sem type-check, lint, build, security scan. Erros de TypeScript e vulnerabilidades passam para main.

### 8. 🟠 N+1 queries em crons (7,000+ queries/run)
**`src/app/api/notifications/generate/route.ts`** — Itera todos workspaces × appointments × users com queries individuais. E este cron nem está registrado no `vercel.json`.

### 9. 🟠 Missing HSTS header
**`next.config.ts`** — Healthcare app sem Strict-Transport-Security. Obrigatório para compliance.

### 10. 🟠 35 de 51 server actions sem testes
Gaps críticos em: financeiro, gateway, NFS-e, TISS, WhatsApp, audit, admin.

## Plano de Ação

### Sprint 1 (Semana 1-2) — Apagar incêndios 🔴

| # | Ação | Arquivo(s) | Esforço |
|---|------|-----------|---------|
| 1 | Adicionar verificação de assinatura no webhook Asaas | `api/webhooks/gateway/route.ts` | 2h |
| 2 | Enforce RBAC server-side nas server actions | `lib/permissions.ts` + all actions | 1d |
| 3 | `npm audit fix` para @clerk/backend SSRF | `package.json` | 15min |
| 4 | Substituir `xlsx` por `exceljs` | `lib/export-xlsx.ts`, `api/export/*`, migration | 4h |
| 5 | Set `sendDefaultPii: false` no Sentry | `sentry.*.config.ts` (3 files) | 15min |
| 6 | Adicionar HSTS header | `next.config.ts` | 15min |
| 7 | Deletar `forms.ts` e `tiss-guide.ts` (dead code) | `server/actions/` | 15min |
| 8 | Adicionar `not-found.tsx` em `(dashboard)/` e rotas dinâmicas | `src/app/(dashboard)/` | 1h |

### Sprint 2 (Semana 3-4) — Fortalecer fundações 🟠

| # | Ação | Arquivo(s) | Esforço |
|---|------|-----------|---------|
| 9 | Completar CI: tsc, lint, prisma validate, npm audit, build | `.github/workflows/deploy.yml` | 2h |
| 10 | Re-habilitar Redis (Upstash) | `lib/cache.ts`, `lib/redis.ts` | 4h |
| 11 | Fix N+1 em `drug-interaction.ts` e `commission.ts` | Server actions | 2h |
| 12 | Registrar cron `/api/notifications/generate` no vercel.json | `vercel.json` | 15min |
| 13 | Fix Sentry server tracesSampleRate=1.0 → 0.1 | `sentry.server.config.ts` | 15min |
| 14 | Wrap `whatsapp.ts` e `notification.ts` mutations em safeAction | Server actions | 2h |
| 15 | Adicionar `loading.tsx` em 5 subroutes faltantes | Routes | 1h |
| 16 | Adicionar audit logging em mutations financeiras | `receivable.ts`, `gateway.ts`, `billing.ts`, `expense.ts` | 2h |
| 17 | Criar `src/lib/types/prisma-json.ts` — elimina ~60% dos `any` | New file | 3h |
| 18 | Adicionar composite indexes: Prescription, MedicalCertificate, TreatmentPlan | `schema.prisma` | 30min |

### Sprint 3 (Semana 5-8) — Melhorias estruturais 🟡

| # | Ação | Arquivo(s) | Esforço |
|---|------|-----------|---------|
| 19 | Setup Prettier + Husky + lint-staged | Root config files | 2h |
| 20 | Adicionar testes para financial, gateway, nfse, tiss, whatsapp | `__tests__/` | 3d |
| 21 | Split `migration/page.tsx` (1,778 lines) e `imagens-tab.tsx` (1,032) | Components | 4h |
| 22 | Atualizar ARCHITECTURE.md (30 files missing, remover Memed refs) | `docs/ARCHITECTURE.md` | 2h |
| 23 | Deletar/deprecar `docs/features/memed.md` | `docs/features/` | 30min |
| 24 | Standardizar auth helper naming (4 padrões → 1) | All server actions | 4h |
| 25 | Adicionar `take` limits em findMany sem paginação | Multiple actions | 2h |
| 26 | Usar Inngest para fan-out em crons (evitar timeout) | `api/reminders/`, `api/birthdays/` | 4h |
| 27 | Adicionar Zod schemas para input validation em mutations | Server actions | 2d |
| 28 | Sync `.env.example` com `env.ts` | Config files | 30min |

### Backlog — Melhorias contínuas 🟢

| # | Ação | Esforço |
|---|------|---------|
| 29 | Remover deps não usadas (jsdom, vite-tsconfig-paths, @dnd-kit/utilities) | 15min |
| 30 | Mover @types/fluent-ffmpeg e shadcn para devDependencies | 15min |
| 31 | Adicionar aria-live regions para search results e notifications | 2h |
| 32 | Adicionar skip-nav link para keyboard navigation | 30min |
| 33 | Adicionar ESLint rules: no-explicit-any, no-console | 1h |
| 34 | Documentar API routes (webhooks, public endpoints) | 4h |
| 35 | Recharts lazy-load em reports page | 1h |
| 36 | Adicionar `updatedAt` em MedicalCertificate, ExpenseCategory, etc. | 30min |
| 37 | Sentry DSN via env var (não hardcoded) | 30min |
| 38 | Adicionar component tests (7% coverage atual) | Ongoing |
