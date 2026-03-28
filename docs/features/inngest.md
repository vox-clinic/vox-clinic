# Inngest for Background Jobs — Feature Document

> Replace inline long-running processes with step-function based background jobs to avoid Vercel serverless timeouts.

## 1. Overview

### Current Problems

VoxClinic runs several long-running processes synchronously inside Vercel serverless functions, which have a **60-second timeout on the Hobby plan** and **300 seconds on Pro**. The current audio processing pipeline is the worst offender:

1. **`processVoiceRegistration`** (`src/server/actions/voice.ts` lines 18-126) — executes 5 sequential steps inline:
   - Upload audio to Supabase Storage
   - Preprocess audio via FFmpeg (30s timeout in `src/lib/audio-preprocessing.ts`)
   - Transcribe via OpenAI Whisper (60s timeout in `src/lib/openai.ts`)
   - Extract entities via Claude (30s timeout in `src/lib/claude.ts`)
   - Save Recording to database in a transaction

   **Total worst-case: ~120s** — exceeds Vercel Hobby timeout. During this entire span, a Prisma connection pool slot is held idle waiting on external API calls.

2. **`processConsultation`** (`src/server/actions/consultation.ts` lines 18-130) — identical pipeline with `generateConsultationSummary` instead of `extractEntities`. Same timeout risk.

3. **Reminder cron** (`src/app/api/reminders/route.ts`) — iterates all tomorrow's appointments sequentially (`for...of` loop, line 54). Each iteration may call WhatsApp API + fallback to email. With 100+ appointments across workspaces, this can exceed the cron timeout.

4. **Notification generation cron** (`src/app/api/notifications/generate/route.ts`) — nested loops: for each workspace, query upcoming + missed appointments, then for each user, check for existing notification before creating. N+1 query pattern with no parallelism.

### Why Inngest

Inngest provides **step functions for serverless** — each step is independently retryable, with built-in concurrency control, fan-out, scheduling, and an event-driven architecture. It runs on existing Vercel infrastructure (no separate server).

Key benefits:
- **Per-step retries** — if Whisper fails, retry only Whisper, not the entire pipeline
- **No connection pool exhaustion** — steps release between invocations
- **Fan-out** — send 100 reminders in parallel with per-item retry
- **Scheduled functions** — replace Vercel Cron with Inngest schedules (more reliable, observable)
- **Dev server** — `npx inngest-cli@latest dev` for local testing with visual step inspector

---

## 2. Inngest Functions

### 2.1 `process-audio` — Audio Processing Pipeline

**Trigger:** `app/audio.uploaded` event

**Steps:**
```
step.run("upload-storage")      → Upload buffer to Supabase, return audioPath
step.run("preprocess-ffmpeg")   → FFmpeg silence removal + speed up, return processedBuffer
step.run("transcribe-whisper")  → OpenAI Whisper API, return { text, duration }
step.run("extract-ai")          → Claude extractEntities or generateConsultationSummary
step.run("save-recording")      → Create Recording in DB (transaction with audit + consent)
```

**Event payload:**
```typescript
{
  name: "app/audio.uploaded",
  data: {
    audioBuffer: string      // base64-encoded (or Supabase temp path)
    filename: string
    workspaceId: string
    userId: string
    patientId?: string       // present for consultation, absent for voice registration
    type: "registration" | "consultation"
    fileSize: number
  }
}
```

**Retry policy:** 3 retries per step, exponential backoff. The `upload-storage` step is idempotent (same filename overwrites). The `save-recording` step uses a transaction.

**Recording status flow:** Create a Recording with `status: "processing"` immediately upon event receipt. Update to `status: "processed"` on success or `status: "error"` on final failure.

**Error handling:** On final failure after all retries, save Recording with `status: "error"` and `errorMessage` (mirrors current catch block in voice.ts lines 105-124).

### 2.2 `send-reminder-batch` — Fan-out Reminders

**Trigger:** Inngest scheduled function (`cron: "0 11 * * *"`) — replaces current Vercel Cron at `/api/reminders`

**Steps:**
```
step.run("fetch-appointments")  → Query tomorrow's scheduled appointments (reminderSentAt: null)
step.run("load-whatsapp-configs") → Pre-load WhatsApp configs for involved workspaces
step.sendEvent()                → Fan-out: emit one "app/reminder.send" per appointment
```

**Child function:** `send-single-reminder` triggered by `app/reminder.send`
```
step.run("send-whatsapp")       → Try WhatsApp with interactive buttons (preferred)
step.run("send-email-fallback") → If WhatsApp fails or unavailable, send email
step.run("mark-sent")           → Update appointment.reminderSentAt
```

**Concurrency:** `{ limit: 10 }` to avoid WhatsApp API rate limits.

**Advantage over current:** If one reminder fails, it retries independently. Current implementation (lines 54-118 of reminders/route.ts) stops processing on unhandled errors and has no retry for individual items.

### 2.3 `generate-notifications` — Scheduled Notification Generation

**Trigger:** Inngest scheduled function (`cron: "*/5 * * * *"`) — replaces current Vercel Cron at `/api/notifications/generate`

**Steps:**
```
step.run("fetch-workspaces")     → Get active workspaces with user IDs
step.run("find-upcoming")        → Batch query: appointments in next 30min across all workspaces
step.run("find-missed")          → Batch query: scheduled appointments before now, today
step.run("check-existing")       → Batch query existing notifications to deduplicate
step.run("create-notifications") → Batch createMany for new notifications
```

**Improvement:** Replace the current N+1 pattern (per-workspace, per-appointment, per-user `findFirst`) with batch queries using `IN` clauses. The current code (lines 32-119 of generate/route.ts) does individual DB queries in nested loops.

---

## 3. Setup

### NPM Package
```
npm install inngest
```

### Inngest Route Handler
Create `src/app/api/inngest/route.ts`:
```typescript
import { serve } from "inngest/next"
import { inngest } from "@/lib/inngest/client"
import { processAudio } from "@/lib/inngest/functions/process-audio"
import { sendReminderBatch, sendSingleReminder } from "@/lib/inngest/functions/send-reminder"
import { generateNotifications } from "@/lib/inngest/functions/generate-notifications"
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processAudio,
    sendReminderBatch,
    sendSingleReminder,
    generateNotifications,
  ],
})
```

### Inngest Client
Create `src/lib/inngest/client.ts`:
```typescript
import { Inngest } from "inngest"

export const inngest = new Inngest({
  id: "voxclinic",
  // Event schemas defined via TypeScript generics
})
```

### Environment Variables
- `INNGEST_EVENT_KEY` — production event key (from Inngest dashboard)
- `INNGEST_SIGNING_KEY` — production signing key
- No env vars needed for local dev (Inngest dev server auto-discovers)

### Dev Server
```
npx inngest-cli@latest dev
```
Runs at `http://localhost:8288` with visual step inspector and event replay.

### Vercel Cron Updates
Remove from `vercel.json` once Inngest scheduled functions are deployed:
- `/api/reminders` (replaced by `send-reminder-batch`)
- `/api/notifications/generate` (replaced by `generate-notifications`)

Keep `/api/birthdays` and `/api/nps/send` as Vercel Cron until migrated in a future phase.

---

## 4. Data Model

**No schema changes required.** All functions use existing Prisma models:
- `Recording` — already has `status` field with values `pending | processed | error`
- `Appointment` — already has `reminderSentAt`
- `Notification` — existing model with deduplication fields
- `Prescription` — existing model with status/type fields

The Recording `status` field gains a new value `"processing"` to represent in-progress background jobs. This is a runtime convention, not a schema enum (the field is a String).

---

## 5. UI Changes

### Audio Processing ("processando..." status)

**Current flow:** User records audio → UI shows spinner → server action runs 60-120s → returns result or error.

**New flow:**
1. User records audio → server action sends Inngest event → returns `{ recordingId, status: "processing" }` immediately (< 1s)
2. UI navigates to a "processing" interstitial page at `/appointments/processing/[recordingId]`
3. Page polls `getRecordingStatus(recordingId)` every 3 seconds (or uses SSE via a lightweight API route)
4. When Recording status changes to `"processed"`, redirect to review page
5. When Recording status changes to `"error"`, show error message with retry button

**Files affected:**
- `src/app/(dashboard)/patients/new/voice/page.tsx` — change onRecordingComplete to handle async
- `src/app/(dashboard)/appointments/new/page.tsx` — change processConsultation call
- New: `src/app/(dashboard)/appointments/processing/[recordingId]/page.tsx` — processing status page
- New: `src/server/actions/recording.ts` — `getRecordingStatus(recordingId)` action

### Reminders & Notifications

No UI changes. These run in the background already (cron-triggered). The only visible improvement is better reliability (retries per item).

---

## 6. Implementation Plan

### Phase 1: Inngest Setup + Audio Processing
1. `npm install inngest`
2. Create `src/lib/inngest/client.ts` — Inngest client with event type definitions
3. Create `src/lib/inngest/functions/process-audio.ts` — 5-step function
4. Create `src/app/api/inngest/route.ts` — serve handler
5. Modify `src/server/actions/voice.ts` — `processVoiceRegistration` sends event, returns immediately with recordingId
6. Modify `src/server/actions/consultation.ts` — `processConsultation` sends event, returns immediately
7. Create `src/server/actions/recording.ts` — `getRecordingStatus` action
8. Create `src/app/(dashboard)/appointments/processing/[recordingId]/page.tsx` — polling status page
9. Update `src/app/(dashboard)/patients/new/voice/page.tsx` — redirect to processing page
10. Update `src/app/(dashboard)/appointments/new/page.tsx` — redirect to processing page

### Phase 2: Reminder Fan-out
1. Create `src/lib/inngest/functions/send-reminder.ts` — batch + single-reminder functions
2. Keep `/api/reminders/route.ts` as fallback during transition
3. Test with Inngest dev server
4. Remove `/api/reminders` cron from `vercel.json` after validation

### Phase 3: Notification Generation
1. Create `src/lib/inngest/functions/generate-notifications.ts` — optimized batch queries
2. Keep `/api/notifications/generate/route.ts` as fallback
3. Remove from cron after validation

---

## 7. Testing Considerations

- **Inngest dev server** provides event replay and step-by-step inspection
- **Unit tests:** Each step function can be tested independently by mocking Inngest context
- **Integration test:** Send event via `inngest.send()`, poll for Recording status change
- **Failure simulation:** Use Inngest dev server to manually fail individual steps and verify retry behavior
- **Timeout verification:** Confirm no single step exceeds 60s (the Whisper step is the tightest at 60s configured timeout)

---

## 8. Migration Strategy

- **Backward compatible:** The existing `/api/reminders` and `/api/notifications/generate` routes remain functional during migration
- **Feature flag:** Use an env var `USE_INNGEST=true` to toggle between inline processing and event-driven processing in voice.ts and consultation.ts
- **Rollback:** If Inngest is unavailable, the server actions fall back to inline processing (current behavior)
- **Gradual rollout:** Phase 1 (audio) first since it has the most impact, then Phase 2-4 independently
