# Ações por Prioridade

## 🔴 CRÍTICO

- [ ] Adicionar verificação de assinatura no webhook Asaas — `src/app/api/webhooks/gateway/route.ts` — 2h
- [ ] Enforce RBAC server-side (hasPermission em server actions) — `src/lib/permissions.ts` + all actions — 1d
- [ ] `npm audit fix` para @clerk/backend SSRF — `package.json` — 15min
- [ ] Substituir `xlsx` por `exceljs` (prototype pollution, sem fix) — `src/lib/export-xlsx.ts`, `src/app/api/export/*` — 4h
- [ ] Set `sendDefaultPii: false` no Sentry — `sentry.*.config.ts` — 15min
- [ ] Adicionar HSTS header — `next.config.ts` — 15min
- [ ] Deletar dead code: `forms.ts`, `tiss-guide.ts` — `src/server/actions/` — 15min
- [ ] Adicionar `not-found.tsx` em `(dashboard)/` e rotas dinâmicas — `src/app/` — 1h

## 🟠 ALTO

- [ ] Completar CI pipeline: tsc, lint, prisma validate, npm audit, build — `.github/workflows/deploy.yml` — 2h
- [ ] Re-habilitar Redis/Upstash caching — `src/lib/cache.ts`, `src/lib/redis.ts` — 4h
- [ ] Fix N+1 em `drug-interaction.ts` (batch findFirst→findMany) — `src/server/actions/drug-interaction.ts:60-82` — 1h
- [ ] Fix N+1 em `commission.ts` (wrap upsert loop em $transaction) — `src/server/actions/commission.ts:316-324` — 1h
- [ ] Registrar cron `/api/notifications/generate` no vercel.json — `vercel.json` — 15min
- [ ] Fix Sentry server tracesSampleRate: 1.0 → 0.1 em produção — `sentry.server.config.ts:11` — 15min
- [ ] Wrap `whatsapp.ts` mutations (5) em safeAction — `src/server/actions/whatsapp.ts` — 1h
- [ ] Wrap `notification.ts` mutations (3) em safeAction — `src/server/actions/notification.ts` — 30min
- [ ] Wrap mutations em `expense.ts`, `messaging.ts`, `admin.ts`, `gateway.ts` em safeAction — Multiple — 1h
- [ ] Adicionar `loading.tsx` em patients/, prescriptions/, certificates/, mensagens/, teleconsulta/ — Routes — 1h
- [ ] Adicionar audit logging em receivable, gateway, billing, expense, messaging, booking-config — Multiple — 2h
- [ ] Adicionar `error.tsx` em `(auth)/` — `src/app/(auth)/` — 30min
- [ ] Criar `src/lib/types/prisma-json.ts` (tipos para Json fields) — New file — 3h
- [ ] Adicionar composite index `[workspaceId, patientId]` em Prescription, MedicalCertificate — `prisma/schema.prisma` — 30min
- [ ] Adicionar `take` limits em findMany sem paginação (financial, treatment, certificate, prescription, forms, commission) — Multiple actions — 2h
- [ ] Fix N+1 em `notifications/generate` cron (batch queries) — `src/app/api/notifications/generate/route.ts` — 2h
- [ ] Usar Inngest para fan-out em crons reminders/birthdays (evitar timeout Vercel) — `api/reminders/`, `api/birthdays/` — 4h
- [ ] Rate limiting no DPO endpoint — `src/app/api/dpo/route.ts` — 30min
- [ ] Adicionar unique constraints em `stripeSubId`/`stripeCustomerId` — `prisma/schema.prisma` — 15min
- [ ] Testes para server actions financeiras (financial, gateway, nfse, billing) — `__tests__/` — 2d
- [ ] Testes para WhatsApp, TISS, admin actions — `__tests__/` — 1d

## 🟡 MÉDIO

- [ ] Setup Prettier + Husky + lint-staged — Root config — 2h
- [ ] Split `settings/migration/page.tsx` (1,778 lines) — Components — 3h
- [ ] Split `patients/[id]/tabs/imagens-tab.tsx` (1,032 lines) — Components — 2h
- [ ] Atualizar ARCHITECTURE.md (adicionar 30 files missing, remover Memed refs) — `docs/ARCHITECTURE.md` — 2h
- [ ] Deletar/deprecar `docs/features/memed.md` e limpar refs em inngest.md, prescricao-avancada.md — `docs/features/` — 1h
- [ ] Atualizar DATA-MODEL.md (remover MemedPrescriber, atualizar Prescription) — `docs/DATA-MODEL.md` — 30min
- [ ] Standardizar auth helper naming (4 padrões → `getAuthContext`) — All 51 server actions — 4h
- [ ] Adicionar Zod schemas para input validation em mutations — Server actions — 2d
- [ ] Sync `.env.example` com `env.ts` (6 vars missing) — Config files — 30min
- [ ] Validar Clerk core keys no startup (`env.ts`) — `src/lib/env.ts` — 30min
- [ ] Sentry DSN via env var (não hardcoded) — `sentry.*.config.ts` — 30min
- [ ] Adicionar aria-live regions para search results e notifications — Components — 2h
- [ ] Adicionar skip-nav link para keyboard navigation — `src/app/layout.tsx` — 30min
- [ ] Remover `unsafe-eval` do CSP se possível — `next.config.ts:59` — 1h (investigar)
- [ ] Console.log → logger em `whatsapp/webhook/route.ts` (15 ocorrências) — Server code — 1h
- [ ] Lazy-load Recharts em reports page (next/dynamic) — `reports/page.tsx` — 1h
- [ ] NPS cron: substituir in-memory exclusion list por SQL LEFT JOIN — `api/nps/send/route.ts` — 1h
- [ ] Reports/financial: usar aggregate() em vez de carregar todas as rows — `reports.ts`, `financial.ts` — 2h
- [ ] Adicionar metadata/title templates nas dashboard pages — Routes — 1h
- [ ] Adicionar `updatedAt` em MedicalCertificate, ExpenseCategory, InventoryCategory, MedicationFavorite — `prisma/schema.prisma` — 30min
- [ ] Type mockDb com Prisma types (em vez de `any`) — `src/test/mocks/db.ts` — 2h
- [ ] Documentar API routes (webhooks, public endpoints) — `docs/` — 4h
- [ ] Component tests (7% coverage → mínimo 30% em componentes críticos) — `__tests__/` — Ongoing

## 🟢 BAIXO

- [ ] Remover deps não usadas: jsdom, vite-tsconfig-paths, @dnd-kit/utilities — `package.json` — 15min
- [ ] Mover @types/fluent-ffmpeg e shadcn para devDependencies — `package.json` — 15min
- [ ] Substituir @radix-ui/react-icons por Lucide (usado em 1 file) — `bento-grid.tsx` — 15min
- [ ] Adicionar ESLint rules: no-explicit-any warn, no-console warn — `eslint.config.mjs` — 1h
- [ ] Adicionar aria-busy em loading states — Components — 1h
