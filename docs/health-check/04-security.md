# 04 - Security

## 1. Authentication

### API Route Coverage

| Route | Auth | Rate Limit | Status |
|-------|------|------------|--------|
| `GET /api/health` | None | None | ✅ Public by design |
| `GET /api/appointments/[id]` | Clerk `auth()` | None | ✅ |
| `GET/POST /api/export/*` | Clerk `auth()` | None | 🟡 No rate limit on exports |
| `GET/POST /api/booking` | Token-based | 20/min | ✅ |
| `GET /api/booking/slots` | Token-based | 60/min | ✅ |
| `GET/POST /api/nps` | Token-based | 30/10min | ✅ |
| `POST /api/dpo` | **None** | **None** | 🟠 Public POST without rate limit |
| `POST /api/webhooks/clerk` | Svix HMAC | — | ✅ |
| `POST /api/webhooks/stripe` | Stripe SDK | — | ✅ |
| `POST /api/webhooks/daily` | HMAC-SHA256 | — | ✅ |
| `POST /api/webhooks/gateway` | **None** | **None** | 🔴 **No signature verification** |
| `GET/POST /api/whatsapp/webhook` | HMAC-SHA256 | 120/min | ✅ |
| Crons (`/api/reminders`, etc.) | CRON_SECRET | — | ✅ |

### Critical Findings

🔴 **Gateway webhook has no signature verification** (`src/app/api/webhooks/gateway/route.ts:13`). Anyone who discovers this URL can send forged payment events, marking payments as "paid" without actual transactions. **Financial fraud risk.**

**Fix:** Add Asaas access token validation or IP whitelist.

🟠 **DPO endpoint has no rate limiting** (`src/app/api/dpo/route.ts:4`). Public POST that can flood `dpoRequest` table.

**Fix:** Add rate limiting (5 req/min per IP).

## 2. Authorization (RBAC)

🔴 **`hasPermission()` is defined but NEVER called in any server action** (`src/lib/permissions.ts:75`).

The project defines 5 roles and 30+ permissions, but **no server action enforces them**. All actions only check that `auth()` returns a valid userId. A `viewer` can create prescriptions, delete patients, edit financial data.

`hasPermission()` is only imported in 2 client-side nav components — trivially bypassed.

**Fix:** Add `requirePermission(role, permission)` to server actions. At minimum enforce on: `clinical.*`, `financial.*`, `settings.*`, `team.*`, `billing.*`, `patients.delete`.

## 3. Tenant Isolation

✅ **Excellent.** All 51 server action files scope queries by `workspaceId`. Spot-checked across patient, prescription, recording, financial, appointment, notification, audit, export, medication — all properly scoped.

🟡 **Edge case:** Stripe webhook (`src/app/api/webhooks/stripe/route.ts:56-58`) looks up workspace by `stripeSubId`/`stripeCustomerId` without unique constraints. Add unique constraints on these fields.

## 4. Sensitive Data

| Area | Status |
|------|--------|
| Encryption lib | ✅ AES-256-GCM in `lib/crypto.ts` — proper IV, auth tag, key derivation |
| WhatsApp tokens | ✅ Encrypted before DB storage |
| Env validation | ✅ Zod with strict prefixes in `lib/env.ts` |
| `NEXT_PUBLIC_` vars | ✅ Only Supabase URL and App URL exposed |

🟠 **Sentry `sendDefaultPii: true`** across ALL configs (`sentry.*.config.ts`). Sends IP addresses, cookies, and user data to Sentry (US-based). **LGPD compliance risk** for Brazilian healthcare app.

**Fix:** Set `sendDefaultPii: false` or add `beforeSend` to strip PII.

🟡 **`ENCRYPTION_KEY` defaults to empty string** in `env.ts:36-38`. No startup validation if WhatsApp integration needs it.

## 5. Webhook Security

| Webhook | Signature | Timing-safe | Status |
|---------|-----------|-------------|--------|
| Clerk | Svix HMAC | ✅ | ✅ |
| Stripe | `constructEvent()` | ✅ | ✅ |
| Daily.co | HMAC-SHA256 | ✅ | ✅ |
| WhatsApp | HMAC-SHA256 | ✅ | ✅ |
| **Asaas Gateway** | **None** | N/A | 🔴 |

## 6. Security Headers

✅ Good overall CSP with domain whitelisting in `next.config.ts`.

| Header | Status |
|--------|--------|
| `X-Frame-Options: DENY` | ✅ (except booking pages) |
| `X-Content-Type-Options: nosniff` | ✅ |
| `Referrer-Policy: strict-origin-when-cross-origin` | ✅ |
| **`Strict-Transport-Security`** | 🟠 **Missing** — mandatory for healthcare |
| CSP `unsafe-eval` | 🟡 Weakens CSP — check if removable |

**Fix:** Add HSTS: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`

## 7. LGPD Compliance

| Area | Status |
|------|--------|
| Consent recording | ✅ `ConsentRecord` model + booking auto-consent |
| WhatsApp consent | ✅ `whatsappConsent` flag enforced |
| Audit logging | 🟡 Present in 25 files, **missing** in: receivable, gateway, billing, expense, blocked-slot, messaging, booking-config |
| DPO requests | ✅ Endpoint exists, saves to DB. 🟡 No automated workflow |
| Data retention | ✅ Soft delete respects 20-year CFM requirement |
| Data portability | ✅ `exportPatientData()` for LGPD Art. 18 |
| Sentry PII | 🟠 `sendDefaultPii: true` — sends data to US servers |

## Summary: Critical Security Issues

| # | Severity | Finding | File |
|---|----------|---------|------|
| 1 | 🔴 | Gateway webhook — no signature verification, financial fraud risk | `api/webhooks/gateway/route.ts` |
| 2 | 🔴 | RBAC permissions — UI-only, no server-side enforcement | `lib/permissions.ts` unused in actions |
| 3 | 🟠 | Sentry `sendDefaultPii: true` — LGPD violation | `sentry.*.config.ts` |
| 4 | 🟠 | Missing HSTS header | `next.config.ts` |
| 5 | 🟠 | DPO endpoint — no rate limiting | `api/dpo/route.ts` |
| 6 | 🟡 | Missing audit logging on financial mutations | Multiple files |
| 7 | 🟡 | CSP uses `unsafe-eval` | `next.config.ts:59` |
