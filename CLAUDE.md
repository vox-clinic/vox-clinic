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
npx prisma migrate dev  # Run migrations (requires DATABASE_URL)
npx shadcn@latest add [component] -y  # Add shadcn/ui component
```

## Tech Stack

- **Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui
- **Backend/API:** Next.js Server Actions + API Routes
- **Database:** PostgreSQL via Supabase (with Row Level Security)
- **ORM:** Prisma
- **Auth:** Clerk (with pt-BR localization)
- **Speech-to-Text:** OpenAI Whisper API
- **AI/LLM:** Anthropic Claude API (Sonnet) — entity extraction, workspace generation, clinical summaries
- **AI Validation:** Zod schemas for all AI responses (`src/lib/schemas.ts`)
- **Storage:** Supabase Storage (audio files with signed URLs, private bucket)

## Architecture

### Tailwind v4 — No tailwind.config.ts
This project uses **Tailwind CSS v4** with `@theme inline` in `src/app/globals.css`. There is NO `tailwind.config.ts`. Custom colors are CSS variables:
- `--color-vox-primary: #1A73E8` → use `bg-vox-primary`, `text-vox-primary`
- `--color-vox-success: #22c55e`, `--color-vox-warning: #f59e0b`, `--color-vox-error: #f87171`

### Route Groups
- `src/app/(auth)/` — Sign-in/sign-up pages (Clerk components)
- `src/app/(dashboard)/` — Authenticated pages with layout (sidebar + bottom nav + auth guard)
- `src/app/onboarding/` — Multi-step onboarding wizard (public after auth)
- `src/app/api/` — Webhooks and API routes

### Navigation
- `src/components/nav-sidebar.tsx` — Desktop sidebar (hidden on mobile, md+)
- `src/components/nav-bottom.tsx` — Mobile bottom nav (fixed, md:hidden)
- Links: Dashboard, Pacientes, Nova Consulta, Configuracoes
- Active state via `usePathname()` with `bg-vox-primary/10 text-vox-primary`

### Server Actions (src/server/actions/)
All data mutations use Server Actions with `"use server"` directive:
- `workspace.ts` — generateWorkspace, getWorkspacePreview, getWorkspace, updateWorkspace
- `voice.ts` — processVoiceRegistration, confirmPatientRegistration, checkDuplicatePatient
- `consultation.ts` — processConsultation (returns data only), confirmConsultation (creates Appointment)
- `patient.ts` — getPatients (paginated), getPatient, updatePatient, createPatient, searchPatients, getRecentPatients
- `dashboard.ts` — getDashboardData

All actions authenticate via `auth()` from `@clerk/nextjs/server` and scope queries to the user's workspace.

### AI Pipeline
- `src/lib/openai.ts` — `transcribeAudio(buffer, filename)` via Whisper API
- `src/lib/claude.ts` — `extractEntities`, `generateWorkspaceSuggestions`, `generateConsultationSummary`
  - Uses system message for instructions, user message for transcription (mitigates prompt injection)
  - `parseAIResponse<T>(text, schema)` helper: extracts JSON, validates with Zod, returns typed data
- `src/lib/schemas.ts` — Zod schemas: `ExtractedPatientDataSchema`, `WorkspaceConfigSchema`, `AppointmentSummarySchema`
- `src/lib/storage.ts` — `uploadAudio(buffer, filename)` returns storage path (not URL), `getSignedAudioUrl(path)` returns signed URL with 5min expiration, `getAudioBuffer(path)` downloads from private bucket

### Confirmation-before-save Pattern
AI-extracted data is NEVER saved automatically to the final record:
- **Voice registration:** `processVoiceRegistration` creates a Recording with extracted data. Patient + Appointment are only created in `confirmPatientRegistration` after professional review.
- **Consultation:** `processConsultation` creates a Recording and returns summary data. Appointment is only created in `confirmConsultation` after professional review.

### Audio Recording
`src/components/record-button.tsx` — Client component using MediaRecorder API. Props:
- `onRecordingComplete`, `maxDuration`, `size`, `floating`, `disabled`
- `requireConsent` (default: true) — Shows LGPD consent modal before first recording
- Audio blobs are kept in memory only (never cached locally per LGPD)
- Audio size validated server-side (max 50MB)

### Multi-tenant via Prisma
Every query must be scoped to the user's workspace. Pattern:
```typescript
const { userId } = await auth()
const user = await db.user.findUnique({ where: { clerkId: userId }, include: { workspace: true } })
const workspaceId = user.workspace.id
// All queries filter by workspaceId
```

### JSONB for Dynamic Fields
Workspace stores profession-specific config as JSON: `customFields`, `procedures`, `anamnesisTemplate`, `categories`. Patient stores `customData` and `alerts` as JSON. This avoids schema changes per profession. CustomData is displayed in patient detail using workspace field definitions for labels.

## Key Domain Entities (Prisma)

- **User**: clerkId, profession, clinicName, onboardingComplete → has one Workspace
- **Workspace**: professionType, customFields (Json), procedures (Json), anamnesisTemplate (Json)
- **Patient**: belongs to Workspace, has customData (Json), alerts (Json)
- **Appointment**: links Patient to procedures, notes, aiSummary, audioUrl (storage path), transcript
- **Recording**: audioUrl (storage path), transcript, aiExtractedData (Json), status

## Regulatory Requirements (Brazil)

- **LGPD (Lei 13.709/2018):** Sensitive health data. Requires consent before audio recording (enforced in RecordButton). Audio stored in private Supabase bucket with signed URLs (5min expiry). Audio never cached locally.
- **CFM Resolucao 1.821/2007:** Medical records retained minimum 20 years.
- **Confirmation-before-save:** AI-extracted data is never saved automatically. Professional must review and approve.
- **Data residency:** All data in Brazilian infrastructure (sa-east-1).

## UI/UX

- Mobile-first, minimal interface. RecordButton is the primary UI element.
- Palette: primary blue (#1A73E8), Geist Sans font, 12px border-radius, Lucide icons.
- Fields with AI confidence < 0.8 highlighted in amber (border-vox-warning).
- All UI in Brazilian Portuguese (pt-BR). Dates DD/MM/AAAA, phone +55 DDD, CPF validation.
- Navigation: sidebar on desktop (w-56, border-r), bottom nav on mobile (fixed, z-50).
- Error boundary and loading state at dashboard layout level.
- Patient list with pagination (20 per page) and debounced search (300ms).

## Webhook (Clerk)

`src/app/api/webhooks/clerk/route.ts` handles:
- `user.created` — upsert User in database
- `user.updated` — sync email/name changes
- `user.deleted` — cascade delete user and related data

## Reference Document

Full product requirements in `VoxClinic_PRD_v1.2.docx` at repo root.
