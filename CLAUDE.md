# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VoxClinic is a voice-powered intelligent CRM for healthcare and service professionals (dentists, nutritionists, aestheticians, doctors, lawyers). Professionals speak during or after appointments, and the system automatically transcribes, extracts structured data via AI, and populates patient records. The key differentiator is an AI-driven onboarding that generates a fully customized workspace per profession.

## Commands

```bash
npm run dev          # Start dev server (Next.js 16 + Turbopack)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npx prisma generate  # Regenerate Prisma client after schema changes
npx prisma db push   # Push schema changes to database (dev)
npx shadcn@latest add [component] -y  # Add shadcn/ui component
```

## Tech Stack

- **Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui
- **Backend/API:** Next.js Server Actions + API Routes
- **Database:** PostgreSQL via Supabase (sa-east-1, PgBouncer on 6543, direct on 5432)
- **ORM:** Prisma (uses `directUrl` for migrations/push, `DATABASE_URL` for runtime)
- **Auth:** Clerk (with pt-BR localization)
- **Speech-to-Text:** OpenAI Whisper API (with medical vocabulary hints, verbose_json)
- **AI/LLM:** Anthropic Claude Sonnet (tool_use for structured output, temperature:0 for extraction)
- **AI Validation:** Zod schemas for all AI responses (`src/lib/schemas.ts`)
- **Storage:** Supabase Storage (private `audio` bucket, signed URLs 5min expiry)
- **Email:** Resend (optional, for appointment reminders)
- **Env Validation:** Zod-based at `src/lib/env.ts` — fail-fast on missing variables

## Architecture

### Design System — Tailwind v4
This project uses **Tailwind CSS v4** with `@theme inline` in `src/app/globals.css`. There is NO `tailwind.config.ts`. Custom colors are CSS variables:
- `--color-vox-primary: #14B8A6` (teal/verde-agua) → `bg-vox-primary`, `text-vox-primary`
- `--color-vox-success: #10B981` (emerald), `--color-vox-warning: #F59E0B`, `--color-vox-error: #EF4444`
- Background has subtle cool tint (`oklch(0.988 0.004 270)`)
- Cards: `rounded-2xl`, `border-border/40`, subtle shadow
- Inputs: `h-10`, `rounded-xl`, indigo focus ring
- Buttons: `rounded-xl`, `h-9` default, `scale-[0.98]` active press

### Route Groups
- `src/app/(auth)/` — Sign-in/sign-up (Clerk components)
- `src/app/(dashboard)/` — Authenticated pages (sidebar + bottom nav + auth guard)
  - `/dashboard` — Stat cards, today's agenda, recent activity, quick actions
  - `/patients` — Paginated list with search
  - `/patients/[id]` — Detail with tabs (Resumo, Historico, Gravacoes) + audio playback
  - `/patients/[id]/report` — Print-friendly patient report (Ctrl+P → PDF)
  - `/patients/new/voice` — Voice registration flow
  - `/patients/new/manual` — Manual registration form
  - `/calendar` — Month/list view agenda with scheduling
  - `/appointments/new` — Record consultation for existing patient
  - `/appointments/review` — Review AI summary before confirming
  - `/settings` — Workspace config (procedures, custom fields, clinic name)
- `src/app/onboarding/` — 4-step wizard (profession → questions → clinic → AI preview)
- `src/app/api/webhooks/clerk/` — User sync webhook
- `src/app/api/reminders/` — Cron-triggered appointment reminders

### Navigation
- `src/components/nav-sidebar.tsx` — Desktop sidebar (hidden on mobile, md+)
- `src/components/nav-bottom.tsx` — Mobile bottom nav (fixed, md:hidden, grid-cols-5)
- Links: Dashboard, Pacientes, Agenda, Nova Consulta, Config
- Active state via `usePathname()` with `bg-vox-primary/10 text-vox-primary shadow-sm`

### Server Actions (src/server/actions/)
All data mutations use Server Actions with `"use server"` directive:
- `workspace.ts` — generateWorkspace (accepts edited preview, NOT re-generated), getWorkspacePreview, getWorkspace, updateWorkspace
- `voice.ts` — processVoiceRegistration, confirmPatientRegistration (in $transaction), checkDuplicatePatient
- `consultation.ts` — processConsultation, getRecordingForReview (server-side data fetch), confirmConsultation (in $transaction with double-confirm guard)
- `patient.ts` — getPatients (paginated, filters isActive), getPatient, updatePatient, createPatient, searchPatients, getRecentPatients, getAudioPlaybackUrl, deactivatePatient (soft delete)
- `appointment.ts` — getAppointmentsByDateRange, scheduleAppointment, updateAppointmentStatus, deleteAppointment
- `dashboard.ts` — getDashboardData (stats, today's agenda, recent activity, trends)
- `reminder.ts` — sendAppointmentReminder, sendBulkReminders

All actions authenticate via `auth()` from `@clerk/nextjs/server` and scope queries to the user's workspace.

### AI Pipeline
- `src/lib/openai.ts` — `transcribeAudio(buffer, filename, vocabularyHints?)` via Whisper API
  - 60s timeout, `language: 'pt'`, `response_format: 'verbose_json'`
  - Medical vocabulary prompt + workspace procedure names as hints
  - MIME type detected from file extension (webm, mp4, wav, etc.)
  - Returns `{ text, duration }`
- `src/lib/claude.ts` — All calls use **tool_use** for structured JSON output (no regex parsing)
  - `extractEntities` — tool `extract_patient_data`, temperature:0, validates with Zod
  - `generateWorkspaceSuggestions` — tool `generate_workspace_config`, default temperature
  - `generateConsultationSummary` — tool `generate_consultation_summary`, temperature:0
  - `extractToolResult` helper: extracts tool_use block, validates, falls back to text parsing
  - `parseAIResponse` fallback: strips markdown fences, greedy JSON regex, Zod validation
  - 30s timeout, workspace config in user message (not system — anti-prompt-injection)
  - Empty transcript guard: throws if < 10 chars
- `src/lib/schemas.ts` — Zod schemas: `ExtractedPatientDataSchema`, `WorkspaceConfigSchema`, `AppointmentSummarySchema`
- `src/lib/storage.ts` — `uploadAudio`, `getSignedAudioUrl` (5min), `getAudioBuffer`

### Confirmation-before-save Pattern
AI-extracted data is NEVER saved automatically to the final record:
- **Voice registration:** `processVoiceRegistration` creates a Recording with extracted data. Patient + Appointment are only created in `confirmPatientRegistration` after professional review.
- **Consultation:** `processConsultation` creates a Recording and returns summary. Review page fetches data server-side via `getRecordingForReview(recordingId)`. Appointment is only created in `confirmConsultation` after professional review.

### Transaction Safety
All multi-step mutations are wrapped in `db.$transaction()`:
- `confirmPatientRegistration`: Patient.create → Appointment.create → Recording.update (atomic)
- `confirmConsultation`: Recording.findUnique (double-confirm guard) → Appointment.create → Recording.update
- `generateWorkspace`: User.upsert → Workspace.upsert → User.update (onboardingComplete)

### Audio Recording
`src/components/record-button.tsx` — Client component using MediaRecorder API. Props:
- `onRecordingComplete`, `maxDuration`, `size`, `floating`, `disabled`
- `requireConsent` (default: true) — Shows LGPD consent modal before first recording
- Audio blobs are kept in memory only (never cached locally per LGPD)
- Audio size validated server-side (max 25MB)
- Codec priority: webm/opus > webm > mp4 > browser default

### Email & Reminders
- `src/lib/email.ts` — Resend wrapper, graceful fallback if RESEND_API_KEY not set
- `src/lib/email-templates.ts` — `appointmentReminder()`, `appointmentConfirmation()` (HTML, pt-BR)
- `src/app/api/reminders/route.ts` — POST endpoint for cron (auth via CRON_SECRET header)

### Multi-tenant via Prisma
Every query must be scoped to the user's workspace. Pattern:
```typescript
const { userId } = await auth()
const user = await db.user.findUnique({ where: { clerkId: userId }, include: { workspace: true } })
const workspaceId = user.workspace.id
// All queries filter by workspaceId
```

### JSONB for Dynamic Fields
Workspace stores profession-specific config as JSON: `customFields`, `procedures`, `anamnesisTemplate`, `categories`. Patient stores `customData` and `alerts` as JSON. This avoids schema changes per profession.

## Key Domain Entities (Prisma)

- **User**: clerkId, profession, clinicName, onboardingComplete → has one Workspace
- **Workspace**: professionType, customFields, procedures, anamnesisTemplate, categories → has many Patients, Appointments, Recordings
- **Patient**: belongs to Workspace. name, document (CPF, unique per workspace), customData, alerts, isActive (soft delete). Has many Appointments, Recordings
- **Appointment**: links Patient + Workspace. date, procedures, notes, aiSummary, audioUrl, transcript, status (scheduled/completed/cancelled/no_show)
- **Recording**: audioUrl, transcript, aiExtractedData, status (pending/processed), workspaceId, errorMessage, fileSize, duration
- **AuditLog**: workspaceId, userId, action, entityType, entityId, details (Json)
- **ConsentRecord**: workspaceId, patientId?, recordingId?, consentType, givenBy, givenAt

### Key Constraints & Indexes
- `@@unique([workspaceId, document])` on Patient — CPF unique per workspace (nulls allowed)
- `@@index([workspaceId, name])` on Patient — composite for search
- `@@index([workspaceId, date])` on Appointment — for calendar queries
- Recording.workspaceId — multi-tenant isolation on recordings

## Business Rules

### Data Integrity
1. **Confirmation-before-save**: AI-extracted data is NEVER saved automatically. Professional must review and confirm.
2. **Atomic transactions**: All multi-step DB operations use `db.$transaction()`.
3. **Double-confirm guard**: `confirmConsultation` checks `recording.appointmentId == null` inside transaction to prevent duplicate appointments from double-clicks.
4. **Duplicate patient detection**: By CPF (normalized, both formatted/unformatted) and by name (case-insensitive contains). `@@unique([workspaceId, document])` enforces at DB level.
5. **Soft delete for patients**: `isActive` flag. `getPatients` filters `isActive: true`. Records retained for CFM 20-year requirement.

### Security & Privacy (LGPD)
6. **LGPD consent**: Required before audio recording (enforced in RecordButton). ConsentRecord stored in database.
7. **No PHI in URLs**: Review page fetches data server-side via recordingId. Transcript and summary are NEVER passed as URL query parameters.
8. **Signed URLs**: Audio accessed only via 5-minute signed URLs from Supabase Storage.
9. **Audio never cached locally**: Blobs kept in memory only, discarded after upload.
10. **Multi-tenant isolation**: All queries scoped by workspaceId. Recording model has workspaceId for isolation.
11. **Environment validation**: All API keys validated at startup via Zod (`src/lib/env.ts`). App fails fast on missing variables.
12. **Audit logging**: All CRUD operations on Patient, Appointment, Recording log to AuditLog.
13. **Data residency**: All data in Brazilian infrastructure (sa-east-1).

### AI Pipeline
14. **Timeouts**: OpenAI 60s, Anthropic 30s. Prevents indefinite hangs.
15. **Structured output**: Claude uses tool_use for guaranteed JSON. No fragile regex as primary path.
16. **Vocabulary hints**: Workspace procedure names passed to Whisper as prompt for better pt-BR medical transcription.
17. **Empty transcript guard**: Extraction functions reject transcripts < 10 chars to prevent hallucinated data.
18. **Prompt injection mitigation**: Workspace config (user-controlled data) goes in user message, not system message.

### Audio
19. **File size limit**: 25MB max (enforced server-side). Prevents OOM in serverless.
20. **MIME detection**: Detected from filename extension, not hardcoded. Supports webm, mp4, wav, ogg, flac, mp3.
21. **Appointment status**: scheduled → completed / cancelled / no_show. Default is "completed" for voice-recorded consultations.

## UI/UX

- Mobile-first, minimal interface. RecordButton is the primary UI element.
- Palette: teal/verde-agua primary (#14B8A6), Geist Sans font, 12px base radius, Lucide icons.
- Subtle cool-tinted background, cards with border/shadow instead of hard rings.
- Fields with AI confidence < 0.8 highlighted in amber (border-vox-warning).
- All UI in Brazilian Portuguese (pt-BR). Dates DD/MM/AAAA, phone +55 DDD, CPF validation.
- Navigation: sidebar on desktop (w-56, 5 items), bottom nav on mobile (grid-cols-5).
- Dashboard: stat cards (4), today's agenda, recent activity, quick actions sidebar.
- Calendar: month grid + list view, scheduling, quick status actions.
- Patient reports: print-friendly page with @media print styles (Ctrl+P → PDF).
- Audio playback: signed URL player in patient recordings tab.
- Error states shown to users (no silent catches). Toast/banner pattern.

## Environment Variables

Required (validated by `src/lib/env.ts`):
- `DATABASE_URL` — PostgreSQL via PgBouncer (port 6543)
- `DIRECT_URL` — PostgreSQL direct (port 5432, for migrations)
- `ANTHROPIC_API_KEY` — Claude API (starts with sk-ant-)
- `OPENAI_API_KEY` — Whisper API
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role (server-side only)

Optional:
- `CLERK_WEBHOOK_SECRET` — For webhook signature verification (not needed in local dev)
- `RESEND_API_KEY` — For email reminders (graceful fallback if missing)
- `CRON_SECRET` — For authenticating cron-triggered reminder endpoint

Implicit (Clerk SDK):
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`

See `.env.example` for full list with placeholder values.

## Webhook (Clerk)

`src/app/api/webhooks/clerk/route.ts` handles:
- `user.created` — upsert User in database
- `user.updated` — sync email/name changes
- `user.deleted` — cascade delete user and related data

Note: In local dev without webhook access, `generateWorkspace` does user upsert as fallback.
