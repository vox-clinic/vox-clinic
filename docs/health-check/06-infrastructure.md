# 06 - Infrastructure & Deploy

## 1. CI/CD Pipeline

### Current (`.github/workflows/deploy.yml`)
- **Triggers:** Push to main, PRs to main
- **Concurrency:** Cancels in-progress runs ✅
- **Jobs:** `unit-tests` (npm ci + test:coverage + artifact) → `e2e-tests` (Playwright Chromium)

### 🟠 Missing from CI

| Missing Step | Impact |
|-------------|--------|
| `npx tsc --noEmit` | TypeScript errors slip into main |
| `npm run lint` | ESLint rules never enforced |
| `npx prisma validate` | Schema errors not caught |
| `npm audit --audit-level=moderate` | Security vulns not caught |
| `npm run build` | Build errors not caught before merge |

**Fix:** Add all 5 steps to CI pipeline.

### E2E Environment
🟡 Tests reference `TEST_BASE_URL: http://localhost:3000` but no step starts the dev server. Relies on `webServer` in `playwright.config.ts`.

## 2. Build Configuration

| Setting | Status |
|---------|--------|
| `output: "standalone"` | ✅ Correct for Docker/serverless |
| `serverExternalPackages` | ✅ ffmpeg-static, fluent-ffmpeg |
| `serverActions.bodySizeLimit: "25mb"` | ✅ Required for audio |
| Sentry source maps | ✅ `widenClientFileUpload`, tunnel route |

### Issues

| Severity | Finding | Solution |
|----------|---------|----------|
| 🟠 | Server Sentry `tracesSampleRate: 1.0` (100%) in production — high overhead + cost | Use `process.env.NODE_ENV === "production" ? 0.1 : 1.0` |
| 🟡 | Sentry DSN hardcoded in 3 config files instead of env var | Use `process.env.NEXT_PUBLIC_SENTRY_DSN` |

## 3. Monitoring

| Area | Status |
|------|--------|
| Sentry (client/server/edge) | ✅ All configs present |
| Error filtering | ✅ Ignores NEXT_REDIRECT, NEXT_NOT_FOUND, ChunkLoadError |
| Session replay | ✅ 1% normal, 100% on error |
| Structured logging | ✅ `lib/logger.ts` with JSON, levels, stack traces |
| Health check | ✅ `GET /api/health` tests DB connectivity |
| Health check gaps | 🟡 No Redis, Supabase Storage, or external service checks |
| Uptime monitoring | 🟡 No custom alerts configured |
| DB query monitoring | 🟡 No Prisma metrics integration |

## 4. Cron Jobs

### Registered in vercel.json

| Path | Schedule | Auth | Timeout Risk |
|------|----------|------|-------------|
| `/api/reminders` | Daily 11:00 UTC | ✅ CRON_SECRET | 🟡 Sequential WhatsApp API calls |
| `/api/birthdays` | Daily 10:00 UTC | ✅ CRON_SECRET | 🟡 Sequential API calls per patient |
| `/api/nps/send` | Daily 22:00 UTC | ✅ CRON_SECRET | 🟡 Iterates all completed appointments |

### 🟠 Not Registered

| Path | Issue |
|------|-------|
| `/api/notifications/generate` | Has CRON_SECRET auth, designed as cron, but **NOT in vercel.json** — never runs |

**Fix:** Add to `vercel.json` with appropriate schedule.

### Timeout Concern
🟠 Vercel has 60s (Hobby) / 300s (Pro) timeout. Crons send individual messages sequentially — with 100+ appointments, easily exceeds limit.

**Fix:** Use Inngest (already integrated) to fan-out message sends as background jobs.

## 5. Environment Variables

🟡 **6 variables in `env.ts` missing from `.env.example`:** `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_ENTERPRISE`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, `SUPERADMIN_EMAILS`, `NEXT_PUBLIC_APP_URL`.

🟡 **Clerk core keys** (`CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`) not validated in `env.ts` — missing these causes confusing runtime errors instead of clear startup failure.

✅ Deploy region: `gru1` (São Paulo) — optimal for Brazilian healthcare app.

## Summary

| # | Severity | Finding |
|---|----------|---------|
| 1 | 🟠 | CI missing type-check, lint, build, security scan |
| 2 | 🟠 | Notifications cron not in vercel.json — never runs |
| 3 | 🟠 | Server Sentry tracesSampleRate=1.0 in production |
| 4 | 🟠 | Cron jobs may timeout — sequential API calls without fan-out |
| 5 | 🟡 | Sentry DSN hardcoded |
| 6 | 🟡 | `.env.example` out of sync with `env.ts` |
| 7 | 🟡 | Clerk keys not validated at startup |
