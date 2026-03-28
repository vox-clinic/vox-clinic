# CLAUDE.md

Guidance for Claude Code. Detailed docs in `docs/` — read as needed.

## Project Overview

VoxClinic — voice-powered CRM for healthcare professionals. Speak during appointments → AI transcribes → extracts structured data → populates patient records.

## Commands

```bash
npm run dev          # Dev server (Next.js 16 + Turbopack)
npm run build        # Production build
npm test             # Run tests (vitest)
npm run test:watch   # Tests in watch mode
npx prisma generate  # Regenerate Prisma client after schema changes
npx prisma db push   # Push schema to database
npx prisma validate  # Validate schema
npx tsc --noEmit     # Type-check
```

## Development Workflow

1. **Branch** → `git checkout -b feat/nome-curto` (nunca commitar direto na main)
2. **Feature doc first** → `docs/features/<name>.md`
3. **Implement** → parallel agents for independent phases
4. **QA** → `npx prisma validate` + `npx tsc --noEmit` + `npm test` (zero errors)
5. **Docs update** → update `src/app/docs/page.tsx` FeatureCards + `admin/roadmap` status
6. **PR** → Push branch, abrir PR, aguardar CI verde + review
7. **Merge** → Squash and merge, deletar branch
8. **Never skip QA**

See `docs/CONTRIBUTING.md` for full team workflow.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui
- **Database:** PostgreSQL via Supabase + Prisma 6
- **Auth:** Clerk (pt-BR) | **AI:** Claude (tool_use) + Whisper
- **Storage:** Supabase Storage (signed URLs) | **Email:** Resend
- **Video:** Daily.co | **Fiscal:** NuvemFiscal
- **Payment:** Asaas | **Background Jobs:** Inngest | **Monitoring:** Sentry

## Design System (Tailwind v4)

`@theme inline` in `globals.css`. NO `tailwind.config.ts`.
- Primary: `--color-vox-primary: #14B8A6` (teal) → `bg-vox-primary`
- Cards: `rounded-2xl`, `border-border/40` | Inputs: `h-10`, `rounded-xl`
- Buttons: `rounded-xl`, `h-9` | Inter font, Lucide icons
- All UI in pt-BR. Dates DD/MM/AAAA, CPF validation

## Critical Patterns

### Server Action Error Handling
```typescript
// Server: safeAction + ActionError for expected errors
export const myAction = safeAction(async (data) => {
  if (!valid) throw new ActionError("Mensagem pt-BR")
  return { id: result.id }
})
// Client: always check error
const result = await myAction(data)
if ('error' in result) { toast.error(result.error); return }
```

### Multi-tenant Isolation
Every query scoped by workspaceId. Auth via `auth()` from Clerk.

### Confirmation-before-save
AI data NEVER saved automatically. Professional reviews first.

### Atomic Transactions
All multi-step mutations wrapped in `db.$transaction()`.

## Reference Docs (read when needed)

| Doc | When to read |
|-----|-------------|
| `docs/ARCHITECTURE.md` | Routes, server actions, components, integrations |
| `docs/DATA-MODEL.md` | Prisma models, constraints, indexes |
| `docs/BUSINESS-RULES.md` | LGPD, RBAC, error handling, audit, consent |
| `docs/features/*.md` | Feature-specific implementation details |
| `prisma/schema.prisma` | Authoritative data model |

## Environment Variables

Required: `DATABASE_URL`, `DIRECT_URL`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

Optional: `RESEND_API_KEY`, `CRON_SECRET`, `ENCRYPTION_KEY`, `DAILY_API_KEY`, `STRIPE_SECRET_KEY`, `INNGEST_DEV`, `NEXT_PUBLIC_SENTRY_DSN`

See `.env.example` for full list.

## GitHub Project

- **Repo:** [vox-clinic/vox-clinic](https://github.com/vox-clinic/vox-clinic)
- **Board:** [VoxClinic Roadmap](https://github.com/orgs/vox-clinic/projects/1) (Backlog > Ready > In progress > Done)
- **Issue convention:** `[a07] Feature name` — ID maps to roadmap page

## Public Docs Page

`src/app/docs/page.tsx` — When implementing features, update FeatureCards + increment total.
