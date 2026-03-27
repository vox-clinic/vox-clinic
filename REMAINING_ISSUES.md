# VoxClinic — Remaining Issues from Deep Code Review

> Generated: 2026-03-27
> Review covered: 80 issues across 15 modules
> Fixed: 42+ issues (all CRITICAL, 22/24 HIGH, 12 MEDIUM)
> Remaining: 2 HIGH, 21 MEDIUM, 19 LOW

---

## HIGH (2)

### H4 — LGPD consent not enforced server-side
- **Files:** `src/server/actions/voice.ts:82-88`, `src/server/actions/consultation.ts:83-89`
- **Problem:** Consent is recorded AFTER audio processing (inside success path). No server-side check that consent was given BEFORE processing. Client-side enforcement only (RecordButton component).
- **Risk:** A crafted API call could process audio without LGPD consent.
- **Fix:** Add a server-side consent check: either require a consent token in the FormData, or verify a recent ConsentRecord exists for the user/workspace before processing. Needs architectural decision on the flow.

### H9 partial — Public endpoints lack rate limiting
- **Files:** `src/app/api/nps/route.ts`, `src/app/api/booking/slots/route.ts`
- **Problem:** The POST `/api/nps` (public survey submission) and GET `/api/booking/slots` have no abuse protection. Booking POST was fixed with DB-based checks, but GET endpoints are unprotected.
- **Risk:** An attacker could spam these endpoints. Low real-world risk since they are read-only or token-gated.
- **Fix:** Add Vercel Edge Middleware rate limiting, or use Upstash Redis for IP-based rate limits.

---

## MEDIUM (21)

### Status Transitions (2)
- **BR-APT-003** (`appointment.ts:321-323`): No state machine for appointment status. A `cancelled` appointment can be changed back to `scheduled`.
- **BR-TP-004** (`treatment.ts:143-144`): Any treatment plan status can transition to any other. `completed` plan can be reactivated, potentially causing `completedSessions > totalSessions`.

### Blocked Slots (2)
- **BR-CAL-004** (`blocked-slot.ts:126`): `updateBlockedSlot` does NOT validate `endDate > startDate`. Caller could set `endDate` before `startDate`.
- **BR-CAL-007** (`appointment.ts`): `scheduleAppointment` transaction only checks appointment conflicts, NOT blocked slots. A manually scheduled appointment can overlap a blocked slot if UI pre-check is bypassed.

### Booking Consistency (1)
- **BR-BOOK-006** (`booking-availability.ts` vs `appointment.ts`): Internal scheduling uses fixed 30-min conflict window. Public booking uses actual procedure duration. Inconsistent conflict detection.

### Import (2)
- **BR-IMP-002** (`import.ts:92-95`): `skipDuplicates` relies on `@@unique([workspaceId, document])`. Patients with null CPF are never deduplicated — reimporting same CSV creates duplicates.
- **BR-IMP-003** (`import.ts:34`): No row count limit on import. Could submit millions of rows causing OOM.

### WhatsApp (1)
- **BR-WA-005** (`whatsapp/webhook/route.ts:286-292`): Appointment cancellation via webhook has no audit log entry.

### NPS (1)
- **BR-NPS-002** (`api/nps/route.ts:36-37`): Score validation accepts floats (e.g. 7.5). Should reject non-integers.

### Cron Resilience (1)
- **XM-006**: All cron endpoints (reminders, birthdays, NPS) process all workspaces in a single sequential loop. One workspace's failure (e.g. expired WhatsApp token) blocks processing of all subsequent workspaces.

### Error Handling (4)
- **BUG-5.10** (`api/export/patients/route.ts`, `api/export/reports/route.ts`): No try/catch. Errors return raw 500.
- **BUG-5.12** (`voice.ts:112`, `consultation.ts`): Inner catch block when creating error recording is empty — silently swallows secondary failures.
- **BUG-5.13** (`whatsapp/webhook/route.ts:62-67`): Malformed payloads accepted with 200 but raw body not logged.
- **BUG-5.15** (`document.ts:145`): Supabase storage deletion error not checked — orphaned files if delete fails.

### Stale Data / UI (3)
- **BUG-003** (`calendar/page.tsx:60-61`): Client-side cache (Map, 60s TTL) serves stale data when navigating away and back within TTL.
- **BUG-004** (`patient-tabs.tsx:214-241`): No `router.refresh()` after patient update. Other tabs show stale data until page reload.
- **BUG-005** (`patients/page.tsx`): Offset-based pagination can skip/duplicate patients when records are created/deleted while paginating.

### Input Validation (4)
- **BUG-009** (`schedule-form.tsx:58-68`): Invalid date string throws unhandled `RangeError` instead of showing validation error.
- **BUG-010** (`migration.ts:44-48`): Empty `agendaId` when no default agenda exists causes FK violation.
- **BUG-017** (`patient.ts:266-321`): No string length validation on createPatient. No CPF format validation. No HTML sanitization.
- **BUG-018** (`booking-config.ts:59-88`): No validation on `startHour`/`endHour`/`maxDaysAhead`. Negative or out-of-range values accepted.

---

## LOW (19)

### Timer Cleanup (3)
- `quick-search.tsx:16,26` — debounce setTimeout not cleaned on unmount
- `settings/page.tsx:201` — setTimeout not cleaned on unmount
- `rate-limit.ts` — DELETED (no longer applies)

### TypeScript (7)
- **ISSUE-003-005**: `as any` casts remain in ~15 server action files (blocked-slot, notification, treatment, document, etc.)
- **ISSUE-007** (`messaging.ts`): `categories` field used as object `{messaging:{...}}` instead of array — semantic mismatch
- **ISSUE-008** (`reports.ts`): Fixed in main path but `as string[]` cast still misleading in some code paths
- **ISSUE-009** (`nav-sidebar.tsx:32`): `icon: any` in link type
- **ISSUE-010** (`claude.ts:230,288`): `any[]` params instead of typed Procedure/CustomField

### Database (2)
- **ISSUE-021** (`nps/send/route.ts`): NPS cron sub-query loads all survey appointment IDs into memory. Should use NOT EXISTS.
- **ISSUE-024** (`schema.prisma`): Redundant `@@index([token])` on NpsSurvey (already has `@unique`).

### API Contract (1)
- **ISSUE-027** (`api/appointments/[id]/route.ts`): Dead endpoint with no frontend callers. Should be removed.

### Code Hygiene (4)
- `_helpers.ts` — Dead code (documented as unused due to Vercel bundler issue)
- `calendar.ts` — Unused unified server action
- `settings/page.tsx:800` — Empty catch block `/* silently handle */`
- `import.ts:67-75` — Date parsing accepts invalid day/month values (32/13/2025 wraps to valid date)

### Package.json (2)
- `@types/fluent-ffmpeg` in `dependencies` instead of `devDependencies`
- `prisma` CLI in `dependencies` instead of `devDependencies`

### Cosmetic (1)
- `patients/[id]/page.tsx:35-39` — Avatar initials break on empty/whitespace names
