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
- Background has subtle teal tint (`oklch(0.988 0.004 175)`)
- Cards: `rounded-2xl`, `border-border/40`, subtle shadow
- Inputs: `h-10`, `rounded-xl`, teal focus ring
- Buttons: `rounded-xl`, `h-9` default, `scale-[0.98]` active press
- Full-width system layout (no max-width constraint), content uses `px-4 md:px-6 lg:px-8`

### Route Groups
- `src/app/(auth)/` — Sign-in/sign-up (Clerk components)
- `src/app/(dashboard)/` — Authenticated pages (sidebar + bottom nav + auth guard)
  - `/dashboard` — Stat cards, today's agenda, recent activity, quick actions
  - `/patients` — Paginated list with search
  - `/patients/[id]` — Detail with tabs (Resumo, Historico, Tratamentos, Documentos, Gravacoes, Anamnese) + audio playback
  - `/patients/[id]/report` — Print-friendly patient report (Ctrl+P → PDF)
  - `/appointments/[id]/receipt` — Print-friendly receipt (Ctrl+P → PDF)
  - `/patients/new/voice` — Voice registration flow
  - `/patients/new/manual` — Manual registration form
  - `/calendar` — Week/day/month/list views with scheduling, conflict detection, drag & drop rescheduling (week view, via @dnd-kit/core), time blocking (BlockedSlot), recurring appointments (weekly/biweekly)
  - `/appointments/new` — Record consultation for existing patient
  - `/appointments/review` — Review AI summary before confirming
  - `/prescriptions/[id]` — Print-friendly prescription page (medications table, Ctrl+P → PDF)
  - `/certificates/[id]` — Print-friendly medical certificate page (atestado/declaracao/encaminhamento/laudo, Ctrl+P → PDF)
  - `/settings` — Workspace config (procedures with duration, custom fields, clinic name)
  - `/settings/import` — CSV patient import with column mapping
  - `/settings/whatsapp` — WhatsApp Business API setup wizard (5-step: intro, connect, verify, templates, done)
- `src/app/(admin)/` — Superadmin panel (own layout, no sidebar/nav)
  - `/admin` — Executive dashboard (KPIs: workspaces, users, patients, plan distribution)
  - `/admin/workspaces` — All workspaces table with search, plan/status badges
  - `/admin/workspaces/[id]` — Per-workspace drill-down (stats, recent activity, toggle status)
- `src/app/onboarding/` — 4-step wizard (profession → questions → clinic → AI preview)
- `src/app/api/webhooks/clerk/` — User sync webhook
- `src/app/api/reminders/` — Cron-triggered appointment reminders (email + WhatsApp with interactive confirm/cancel buttons)
- `src/app/api/birthdays/` — Cron-triggered birthday messages (WhatsApp preferred, email fallback)
- `src/app/api/nps/` — NPS survey API (GET survey by token, POST submit score+comment, public/token-based)
- `src/app/api/nps/send/` — Cron-triggered NPS survey sending after completed appointments
- `src/app/api/export/patients/` — Excel export of all active patients
- `src/app/api/export/reports/` — Excel export of reports data (multi-sheet: Resumo, Mensal, Procedimentos)
- `src/app/api/whatsapp/webhook/` — WhatsApp webhook (GET for Meta verification, POST for incoming messages/status updates/appointment confirmations)
- `src/app/nps/[token]/` — Public NPS survey page (no auth, token-based access, 0-10 score + comment)

### Command Palette (Cmd+K)
- `src/components/command-palette.tsx` — Global search accessible from any page
- Triggered via `Cmd+K` / `Ctrl+K` keyboard shortcut, or search button in header
- Three result groups: **Pacientes** (live search via `searchPatients()`), **Paginas**, **Acoes**
- Full keyboard navigation: Arrow keys, Enter to navigate, Escape to close
- 200ms debounce on patient search, max 5 results
- Uses shadcn Dialog component

### Navigation
- `src/components/nav-sidebar.tsx` — Desktop sidebar (hidden on mobile, md+), grouped sections (Menu/Acoes)
- `src/components/nav-bottom.tsx` — Mobile bottom nav (fixed, md:hidden, grid-cols-5)
- Links: Dashboard, Pacientes, Agenda, Nova Consulta, Config
- Active state via `usePathname()` with `bg-vox-primary/10 text-vox-primary shadow-sm`

### Server Actions (src/server/actions/)
All data mutations use Server Actions with `"use server"` directive:
- `workspace.ts` — generateWorkspace (accepts edited preview, NOT re-generated), getWorkspacePreview, getWorkspace, updateWorkspace
- `voice.ts` — processVoiceRegistration, confirmPatientRegistration (in $transaction), checkDuplicatePatient
- `consultation.ts` — processConsultation, getRecordingForReview (server-side data fetch), confirmConsultation (in $transaction with double-confirm guard)
- `patient.ts` — getPatients (paginated, filters isActive, supports tag/insurance filters), getPatient, updatePatient, createPatient, searchPatients (name/CPF/phone/email/insurance), getRecentPatients, getAudioPlaybackUrl, deactivatePatient (soft delete), mergePatients (atomic merge with $transaction), getAllPatientTags
- `appointment.ts` — getAppointmentsByDateRange, scheduleAppointment, scheduleRecurringAppointments (weekly/biweekly, 2-52 occurrences, atomic $transaction), checkAppointmentConflicts (returns { appointments, blockedSlots }), updateAppointmentStatus, rescheduleAppointment, deleteAppointment
- `receipt.ts` — generateReceiptData
- `prescription.ts` — createPrescription, getPrescription, getPatientPrescriptions, deletePrescription
- `certificate.ts` — createCertificate (auto-generates content for atestado/declaracao), getCertificate, getPatientCertificates, deleteCertificate
- `blocked-slot.ts` — getBlockedSlots (expands weekly recurring), createBlockedSlot, deleteBlockedSlot
- `reports.ts` — getReportsData (analytics: monthly revenue, patient trends, procedure ranking, hour heatmap, return rate, no-show rate, patient ranking by frequency/revenue, NPS score)
- `dashboard.ts` — getDashboardData (stats, today's agenda, recent activity, trends)
- `reminder.ts` — sendAppointmentReminder, sendBulkReminders
- `treatment.ts` — getTreatmentPlans, createTreatmentPlan, addSessionToTreatment, updateTreatmentPlanStatus, deleteTreatmentPlan
- `notification.ts` — getNotifications, getUnreadCount, markAsRead, markAllAsRead, generateUpcomingNotifications
- `document.ts` — getPatientDocuments, uploadPatientDocument, getDocumentSignedUrl, deletePatientDocument
- `import.ts` — importPatients (bulk CSV import with validation)
- `team.ts` — getTeamMembers, inviteTeamMember, cancelInvite, updateMemberRole, removeMember, acceptInvite
- `messaging.ts` — getMessagingConfig, updateMessagingConfig, sendAppointmentMessage (email/WhatsApp/SMS)
- `whatsapp.ts` — getWhatsAppConfig, saveWhatsAppConfig, disconnectWhatsApp, fetchConversations, fetchMessages, sendTextMessage, sendTemplateMessage, markConversationAsRead, fetchTemplates, checkWhatsAppHealth
- `admin.ts` — requireSuperAdmin guard, getAdminDashboard (cross-workspace aggregates), getAdminWorkspaces, getAdminWorkspaceDetail, toggleWorkspaceStatus

All actions authenticate via `auth()` from `@clerk/nextjs/server` and scope queries to the user's workspace.

### Key Components
- `src/components/create-prescription-dialog.tsx` — Modal with dynamic medication rows (add/remove), submits and opens print page
- `src/components/create-certificate-dialog.tsx` — Modal with type selector (atestado/declaracao/encaminhamento/laudo), conditional fields, auto-generated content
- `src/components/record-button.tsx` — Audio recording with LGPD consent modal
- `src/components/command-palette.tsx` — Cmd+K global search
- `src/components/notification-bell.tsx` — In-app notification dropdown
- `src/app/(dashboard)/patients/[id]/merge-dialog.tsx` — Patient merge search + confirm

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
- `src/lib/export-xlsx.ts` — `generateXlsx(data, sheetName)` and `generateXlsxMultiSheet(sheets)` for Excel export via `xlsx` library

### Excel Export API Routes
- `src/app/api/export/patients/route.ts` — GET, auth via Clerk, exports all active patients as .xlsx with columns: Nome, CPF, RG, Telefone, Email, Data Nascimento, Sexo, Convenio, Origem, Tags, Cadastrado em, Ultimo Atendimento
- `src/app/api/export/reports/route.ts` — GET, auth via Clerk, accepts `period` query param (3m/6m/12m), exports multi-sheet .xlsx (Resumo, Mensal, Procedimentos)

### Confirmation-before-save Pattern
AI-extracted data is NEVER saved automatically to the final record:
- **Voice registration:** `processVoiceRegistration` creates a Recording with extracted data. Patient + Appointment are only created in `confirmPatientRegistration` after professional review.
- **Consultation:** `processConsultation` creates a Recording and returns summary. Review page fetches data server-side via `getRecordingForReview(recordingId)`. Appointment is only created in `confirmConsultation` after professional review.

### Transaction Safety
All multi-step mutations are wrapped in `db.$transaction()`:
- `confirmPatientRegistration`: Patient.create → Appointment.create → Recording.update (atomic)
- `confirmConsultation`: Recording.findUnique (double-confirm guard) → Appointment.create → Recording.update
- `generateWorkspace`: User.upsert → Workspace.upsert → User.update (onboardingComplete)
- `mergePatients`: Move appointments/recordings/documents/treatmentPlans → Merge tags/alerts/medicalHistory → Fill missing fields → Soft-delete merged patient
- `scheduleRecurringAppointments`: Creates 2-52 appointments atomically (weekly/biweekly pattern)

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

### WhatsApp Business API Integration
- `src/lib/whatsapp/types.ts` — TypeScript types for Meta Cloud API (webhook payloads, outgoing messages, templates, embedded signup)
- `src/lib/whatsapp/client.ts` — `WhatsAppClient` class using native `fetch` (no axios). Factory: `createWhatsAppClient(workspaceId)` reads credentials from `WhatsAppConfig` table via Prisma.
- `src/app/api/whatsapp/webhook/route.ts` — GET (Meta webhook verification via `WHATSAPP_WEBHOOK_VERIFY_TOKEN`), POST (async processing of incoming messages and status updates)
- `src/app/(dashboard)/settings/whatsapp/page.tsx` — 5-step setup wizard (intro, connect via Facebook Embedded Signup, verify/manual config, templates info, done)
- Prisma models: `WhatsAppConfig` (per-workspace credentials), `WhatsAppConversation` (contact threads), `WhatsAppMessage` (individual messages with status tracking)
- Config lookup in webhook: identifies workspace by `phoneNumberId` (not by auth, since webhooks are unauthenticated)
- Conversations are upserted on incoming messages (unique by `[workspaceId, contactPhone, configId]`)

### Multi-tenant via Prisma
Every query must be scoped to the user's workspace. Pattern:
```typescript
const { userId } = await auth()
const user = await db.user.findUnique({ where: { clerkId: userId }, include: { workspace: true } })
const workspaceId = user.workspace.id
// All queries filter by workspaceId
```

### JSONB for Dynamic Fields
Workspace stores profession-specific config as JSON: `customFields`, `procedures` (each with id, name, category, price?, duration? in minutes), `anamnesisTemplate`, `categories`. Patient stores `customData`, `alerts`, and `medicalHistory` as JSON. This avoids schema changes per profession.

## Key Domain Entities (Prisma)

- **User**: clerkId, profession, clinicName, onboardingComplete → has one Workspace
- **Workspace**: professionType, customFields, procedures, anamnesisTemplate, categories → has many Patients, Appointments, Recordings
- **Patient**: belongs to Workspace. name, document (CPF, unique per workspace), rg, gender, address (JSON: street/number/complement/neighborhood/city/state/zipCode), insurance (convenio), guardian (responsavel), source (origin: instagram/google/indicacao/convenio/site/facebook/outro), tags (String[]), medicalHistory (JSON: allergies/chronicDiseases/medications/bloodType/notes), customData, alerts, isActive (soft delete). Has many Appointments, Recordings, TreatmentPlans
- **Appointment**: links Patient + Workspace. date, procedures, notes, aiSummary, audioUrl, transcript, status (scheduled/completed/cancelled/no_show)
- **TreatmentPlan**: links Patient + Workspace. name, procedures, totalSessions, completedSessions, status (active/completed/cancelled/paused), notes, startDate, estimatedEndDate, completedAt
- **Notification**: workspaceId, userId, type (appointment_soon/appointment_missed/treatment_complete/system), title, body, entityType, entityId, read. Polling-based (60s)
- **PatientDocument**: links Patient + Workspace. name, url (Supabase Storage), type (image/pdf/other), mimeType, fileSize. 10MB limit, signed URLs
- **WorkspaceInvite**: workspaceId, email, role, token (unique), invitedBy, status (pending/accepted/expired), expiresAt (7 days)
- **WhatsAppConfig**: workspaceId, phoneNumberId, wabaId, displayPhoneNumber, businessName, accessToken, webhookSecret, isActive. `@@unique([workspaceId, phoneNumberId])`
- **WhatsAppConversation**: workspaceId, configId, contactPhone, contactName, lastMessageAt, lastMessagePreview, status (open/closed/pending/bot), assignedTo, tags, unreadCount. `@@unique([workspaceId, contactPhone, configId])`
- **WhatsAppMessage**: conversationId, workspaceId, waMessageId (unique), direction (inbound/outbound), type, content, mediaUrl, status (pending/sent/delivered/read/failed)
- **Recording**: audioUrl, transcript, aiExtractedData, status (pending/processed), workspaceId, errorMessage, fileSize, duration
- **Prescription**: patientId, workspaceId, appointmentId?, medications (JSON: [{ name, dosage, frequency, duration, notes }]), notes. Print-to-PDF via `/prescriptions/[id]`
- **MedicalCertificate**: patientId, workspaceId, type (atestado/declaracao_comparecimento/encaminhamento/laudo), content (auto-generated for standard types), days?, cid?. Print-to-PDF via `/certificates/[id]`
- **BlockedSlot**: workspaceId, title, startDate, endDate, allDay, recurring (null=one-time, "weekly"=repeats). Shown as gray bars in calendar
- **NpsSurvey**: workspaceId, patientId, appointmentId? (unique), score (0-10), comment, token (unique, public access), sentAt, answeredAt. Public survey page at `/nps/[token]`
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
4. **Duplicate patient detection & merge**: By CPF (normalized, both formatted/unformatted) and by name (case-insensitive contains). `@@unique([workspaceId, document])` enforces at DB level. `mergePatients()` allows merging two records: keeps target, transfers all related records (appointments, recordings, documents, treatment plans), merges tags/alerts/medicalHistory (union), fills missing fields from source, then soft-deletes source. UI via MergeDialog on patient detail page.
5. **Soft delete for patients**: `isActive` flag. `getPatients` filters `isActive: true`. Records retained for CFM 20-year requirement.
6. **Appointment conflict detection**: `checkAppointmentConflicts()` checks ±30min window. `scheduleAppointment()` rejects with `CONFLICT:` prefix error. UI shows confirm dialog, `forceSchedule: true` bypasses.
7. **Automated appointment reminders**: Cron sends reminders 24h before. WhatsApp (preferred, with interactive confirm/cancel buttons) → email fallback. Patient can confirm via button click or text reply ("sim"/"nao"). Webhook processes button_reply IDs (`confirm_<id>`, `cancel_<id>`) and text replies to update appointment status.
8. **Birthday messages**: Daily cron checks birthDate (month+day match). WhatsApp preferred → email fallback. Runs via `/api/birthdays` with CRON_SECRET auth.

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
- Palette: teal/verde-agua primary (#14B8A6), Inter font (latin-ext for pt-BR), JetBrains Mono for code/data, 10px base radius, Lucide icons.
- Subtle cool-tinted background, cards with border/shadow instead of hard rings.
- Fields with AI confidence < 0.8 highlighted in amber (border-vox-warning).
- All UI in Brazilian Portuguese (pt-BR). Dates DD/MM/AAAA, phone +55 DDD, CPF validation.
- Navigation: sidebar on desktop (w-56, 5 items), bottom nav on mobile (grid-cols-5).
- Dashboard: stat cards (4), today's agenda, recent activity, quick actions sidebar.
- Calendar: month/week/day/list views, scheduling, quick status actions. Week view supports drag & drop rescheduling (@dnd-kit/core). Time blocking (gray bars for lunch/holidays/etc). Recurring appointments (weekly/biweekly).
- Patient detail: hero with tags/insurance, action buttons (Prescricao, Atestado, Exportar, Relatorio, Mesclar, Desativar).
- Prescriptions & certificates: print-friendly pages (Ctrl+P → PDF).
- Reports: KPI cards (revenue, appointments, return rate, no-show, NPS), charts (revenue, new patients, status pie), rankings (top patients by frequency/revenue), procedure ranking, hour heatmap. Excel export.
- NPS survey: public token-based page at `/nps/[token]` with 0-10 score grid + comment.
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
- `CRON_SECRET` — For authenticating cron-triggered endpoints (reminders, birthdays, NPS)
- `NEXT_PUBLIC_APP_URL` — Base URL for public links (NPS survey URLs). Defaults to `https://app.voxclinic.com`
- `SUPERADMIN_EMAILS` — Comma-separated emails auto-assigned superadmin role on Clerk webhook
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN` — For Meta webhook verification handshake
- `NEXT_PUBLIC_META_APP_ID` — Meta App ID for Facebook Embedded Signup
- `NEXT_PUBLIC_META_CONFIG_ID` — Meta config ID for Embedded Signup flow

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

## Public Docs Page

`src/app/docs/page.tsx` — Public feature documentation page at `/docs` (no auth required).

**IMPORTANT FOR ALL AGENTS:** When implementing new features or modifying existing ones, you MUST update this page in the same commit:
1. Add/update the `<FeatureCard>` in the correct `<CategorySection>`
2. Increment `FEATURES_SUMMARY.total` counter
3. Update `lastUpdated` date constant
4. Add new categories if needed (follow the existing pattern)
