# Testing Plan — VoxClinic

## Phase 0 Survey (2026-03-28)

### Existing Infrastructure
- **Runner:** Vitest 4.1.2 + happy-dom (vitest.config.mts)
- **Libraries:** @testing-library/react 16.3.2, @testing-library/jest-dom 6.9.1, @testing-library/user-event 14.6.1
- **Setup:** src/test/setup.ts (imports jest-dom/vitest)
- **Mocks:** src/test/mocks/ (auth.ts, db.ts, services.ts) — manual mocks, no MSW
- **CI:** .github/workflows/deploy.yml → `vitest run`
- **Coverage:** v8, configured for src/server/actions/** and src/lib/**

### Existing Test Files (20)
| Category | Files | Location |
|----------|-------|----------|
| Server Actions | 6 | src/server/actions/__tests__/ (appointment, consultation, patient, prescription, treatment, voice) |
| Components | 6 | src/components/__tests__/ (breadcrumb, command-palette, nav-bar, notification-bell, pricing-section, record-button) |
| Lib/Utils | 5 | src/lib/__tests__/ (claude, crypto, env, openai, schemas) |
| API Webhooks | 2 | src/app/api/webhooks/clerk/__tests__, src/app/api/whatsapp/webhook/__tests__ |
| Business Rules | 1 | src/test/business-rules.test.ts |

### Not Found
- Playwright / Cypress / Selenium — no E2E
- MSW (Mock Service Worker) — not installed
- Factories (@faker-js/faker) — not installed
- Fixtures — none
- data-testid strategy — none

### Project Stats
- 51 server actions files
- 76+ React components
- 45 Prisma models
- 5 RBAC roles (owner, admin, doctor, secretary, viewer)
- Auth: Clerk | Deploy: Vercel | DB: Supabase PostgreSQL + Prisma

### Critical Modules (priority order)
1. Patient CRUD (patient.ts — 633 lines)
2. Appointments (appointment.ts — 19KB, recurring, conflicts)
3. Consultation/Voice (consultation.ts, voice.ts — AI pipeline)
4. Prescription (prescription.ts, medication.ts, memed.ts)
5. Financial (receivable.ts, billing.ts, financial.ts, cashflow.ts, nfse.ts, commission.ts)
6. Auth/RBAC (permissions.ts, auth-context.ts, team.ts)
7. WhatsApp (whatsapp.ts, messaging.ts)
8. Scheduling (agenda.ts, blocked-slot.ts, booking-config.ts)

### Integrations to Mock
- Claude API (AI extraction, summaries)
- OpenAI Whisper (audio transcription)
- Supabase Storage (file upload/download)
- Daily.co (video rooms)
- Stripe (checkout, portal, webhooks)
- Asaas (payment gateway)
- Memed (digital prescriptions)
- Inngest (background jobs)
- Resend (email)
- WhatsApp Business API
- NuvemFiscal (NFS-e)
- ViaCEP (address lookup)

## Implementation Phases

### Phase 1: Setup tools (Vitest already done, add Playwright + factories)
### Phase 2: Folder structure (tests/ root dir for E2E + helpers)
### Phase 3: Factories + MSW handlers
### Phase 4: Expand unit tests (cover remaining 45 server actions + components)
### Phase 5: Integration tests (multi-step flows)
### Phase 6: E2E with Playwright
### Phase 7: Selenium cross-browser (optional, lower priority)
### Phase 8: CI/CD updates
### Phase 9: data-testid in components
