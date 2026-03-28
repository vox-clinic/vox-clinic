# 05 - Performance

## 1. Server vs Client Rendering

🟡 87 files under `(dashboard)` use `"use client"`. Most justified (forms, charts, tabs). Issues:

| Severity | Finding | Solution |
|----------|---------|----------|
| 🟡 | Reports page entirely client-rendered with `useEffect` data fetch — empty initial load | Server Component wrapper with initial data as props |
| 🟡 | Financial/cashflow tabs same pattern | Server Component wrapper |

✅ **Good patterns:**
- `patients/[id]/patient-tabs.tsx` uses `next/dynamic` with `{ ssr: false }` for lazy-loading tabs
- `settings/page.tsx` uses `next/dynamic` for all sections
- `financial/page.tsx` uses `next/dynamic` for heavy tabs

## 2. Caching

🟠 **Redis is completely disabled.** `src/lib/cache.ts` — all `cached()` calls are pass-through. `invalidate()` and `invalidatePrefix()` are no-ops. `src/lib/redis.ts` exports `null`.

Without caching, every page load hits the database directly.

| What should be cached | TTL | Priority |
|----------------------|-----|----------|
| Workspace config | 5 min | High |
| Dashboard aggregations | 2 min | High |
| Medication search | 1 hour | Medium |
| CID-10 search | 24 hours | Medium |

**Fix:** Re-enable Redis (Upstash). Env vars already defined in `env.ts`.

## 3. Database Performance

### N+1 Queries

| Severity | File | Issue | Solution |
|----------|------|-------|----------|
| 🟠 | `api/notifications/generate/route.ts:32-118` | N+1 per workspace × appointments × users — potentially 7,000+ queries/run | Batch with `findMany` + `IN` clauses |
| 🟡 | `api/nps/send/route.ts:33-38` | `NOT IN (full table scan)` — builds exclusion list in memory | Use `LEFT JOIN WHERE IS NULL` |

### Missing Pagination

| Severity | File | Query |
|----------|------|-------|
| 🟡 | `financial.ts:33` | All appointments for year without `take` |
| 🟡 | `reports.ts:120-131` | All appointments for period — JS-side aggregation |

**Fix:** Use Prisma `aggregate()` and `groupBy()` for server-side aggregation.

✅ Good patterns: `appointment.ts` uses `pageSize: 20`, exports have `EXPORT_LIMIT = 10000`, booking uses advisory locks.

## 4. Bundle Size

| Severity | Library | Size | Location | Solution |
|----------|---------|------|----------|----------|
| 🟡 | Recharts | ~200KB | `reports/page.tsx` — eager import | Wrap in `next/dynamic` |
| 🟡 | Recharts | ~200KB | `cashflow-tab.tsx` — mitigated by tab | — |
| 🟡 | XLSX | ~300KB | `lib/export-xlsx.ts` — server only | Use dynamic `import()` |
| 🟢 | pdf-lib | ~200KB | `lib/pdf/` — server only | Acceptable |

✅ Settings page uses dynamic imports extensively (10 components).

## 5. Assets & Fonts

| Area | Status |
|------|--------|
| `next/image` | 🟡 Not used anywhere — but no `<img>` tags either (SVG/Lucide only) |
| Fonts | ✅ `next/font/google` with `variable` strategy — self-hosted, optimal |

## Summary

| # | Severity | Finding | File |
|---|----------|---------|------|
| 1 | 🟠 | Redis caching completely disabled — all DB calls direct | `src/lib/cache.ts` |
| 2 | 🟠 | N+1 in notification cron (7,000+ queries/run) | `api/notifications/generate/route.ts` |
| 3 | 🟡 | Reports/financial load unbounded rows for JS aggregation | `reports.ts`, `financial.ts` |
| 4 | 🟡 | Recharts (~200KB) loaded eagerly | `reports/page.tsx` |
| 5 | 🟡 | NPS cron uses in-memory exclusion list | `api/nps/send/route.ts` |
