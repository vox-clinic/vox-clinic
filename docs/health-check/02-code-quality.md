# 02 - Code Quality

## 1. TypeScript

### 1.1 Type Checking
✅ `npx tsc --noEmit` — **ZERO errors.** Clean build. `strict: true` enabled.

### 1.2 `any` Usage (~85 occurrences)

**Root cause:** Prisma `Json` fields (`procedures`, `customFields`, `cidCodes`, `categories`, `anamnesisTemplate`) are cast as `any[]` everywhere. A single `src/lib/types/prisma-json.ts` would eliminate ~60% of all `any`.

**Server actions (🟠):**
- `appointment.ts:67,122,129,136` — `const where: any`
- `blocked-slot.ts:34,168` — `const baseWhere: any`, `const updateData: any`
- `commission.ts:379,498` — `const where: any`
- `inventory.ts:94,387` — `const where: any`
- `patient.ts:93,258-262,495-500` — `const where: any`, `as any` on Json fields

**Components (🟠):**
- `dashboard/page.tsx:246,306` — `(apt.procedures as any[])`
- `calendar/components/*.tsx` — `as any[]` on procedures, cidCodes
- `patients/[id]/tabs/resumo-tab.tsx:282,589,591` — `(field as any).icon`
- `patients/[id]/tabs/historico-tab.tsx:175-268` — `as any[]` on procedures
- `patients/[id]/report/page.tsx:50,155,291,324` — `as any[]`
- `api/booking/route.ts:38,40,56,137,139,298` — `as any[]`, `catch (err: any)`

**Lib code (🟠):**
- `audit.ts:10` — `details?: any`
- `claude.ts:243,301` — `customFields: any[]`, `workspaceProcedures: any[]`
- `booking-availability.ts:146` — `function getApptDuration(procedures: any)`
- `plan-enforcement.ts:7-11` — 5x `(args: any) => Promise<number>`
- `error-messages.ts:277-278` — `(error as any).error`
- `inngest/client.ts:42` — `data as any`
- `migration/*.ts` — 8+ occurrences

**UI (🟡):**
- `nav-sidebar.tsx:21`, `nav-bottom.tsx:29` — `icon: any` (use `LucideIcon`)
- `ui/globe.tsx:12,96` — `GLOBE_CONFIG: any`

✅ **Zero `@ts-ignore` / `@ts-expect-error` found.**

## 2. Code Standards

| Tool | Status | Severity |
|------|--------|----------|
| ESLint 9 (flat config) | ✅ Present — extends `next/core-web-vitals` + `next/typescript` | 🟡 No custom rules (`no-explicit-any`, `no-console`) |
| Prettier | 🔴 **Not configured** — no `.prettierrc`, no `prettier` in package.json | 🔴 |
| Husky / lint-staged | 🔴 **Not configured** — no `.husky/` directory, no pre-commit hooks | 🔴 |

**Impact:** No pre-commit quality gates. Broken code can be committed freely.

**Fix:** Add `.prettierrc`, install Prettier + Husky + lint-staged. ~30 min setup.

## 3. Code Smells

### Console Statements (~60 in production code)

| Severity | Location | Count | Notes |
|----------|----------|-------|-------|
| 🟡 | `api/whatsapp/webhook/route.ts` | 15 | Should use `logger` |
| 🟡 | `server/actions/whatsapp.ts` | 5 | Should use `logger` |
| 🟡 | Dashboard pages (multiple) | ~10 | Client-side error logging |
| ✅ | `lib/logger.ts` | 4 | IS the logger |
| ✅ | Error boundaries | 5 | Correct pattern |

### TODO/FIXME/HACK
Only 3 TODOs — very clean:
- `migration/loader.ts:143` — link appointments to patients
- `messaging.ts:130` — implement Twilio SMS
- `tiss-guide.ts:6` — remove deprecated file

### Empty Catch Blocks (~30)
Most are intentional fallbacks (JSON parse, ViaCEP offline). 🟡 `calendar/page.tsx` has 4 empty catches that should at least log.

### Large Functions/Components
See Architecture report — 2 files >1,000 lines, 8 >700 lines.

## 4. Validation

| Area | Status | Severity |
|------|--------|----------|
| AI output schemas | ✅ Zod in `lib/schemas.ts` | — |
| Env vars | ✅ Zod in `lib/env.ts` | — |
| Server action inputs | 🟠 Manual `if (!x) throw` instead of Zod `.parse()` | Add Zod for mutations |
| Client-side forms | 🟡 `required` attributes + React state, not Zod | Worse UX (errors after submit) |

## 5. Error Handling

| Area | Status |
|------|--------|
| `safeAction` adoption | ✅ 41 files import it |
| `"use server"` directive | ✅ All 51 action files |
| Sentry integration | ✅ Unexpected errors reported |
| Error messages | ✅ All pt-BR, centralized in `error-messages.ts` |
| Logger usage | 🟡 Under-used — many files use `console.error` directly |

## Summary

| Category | Grade | Key Finding |
|----------|-------|-------------|
| TypeScript strictness | B+ | Zero tsc errors, ~85 `any` (mostly Json casting) |
| Code standards tooling | D | No Prettier, no Husky, minimal ESLint rules |
| Code smells | B | Clean TODO count, no dangerous empty catches |
| Validation | B- | Zod for AI/env, manual in most server actions |
| Error handling | A- | safeAction consistent, centralized, Sentry integrated |

**Top 3 fixes:**
1. Create `src/lib/types/prisma-json.ts` — eliminates ~60% of `any`
2. Add Prettier + Husky + lint-staged — permanent quality gate
3. Add ESLint rules: `no-explicit-any: warn`, `no-console: warn`
