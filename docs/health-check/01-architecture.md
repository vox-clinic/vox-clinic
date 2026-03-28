# 01 - Architecture

## 1. Folder Structure

| Severity | Finding | Location | Solution |
|----------|---------|----------|----------|
| 🔴 | **Dead file: `forms.ts` is entirely unused** (487 lines). `form-template.ts` and `form-response.ts` replaced it. Zero importers. | `src/server/actions/forms.ts` | Delete the file |
| 🟠 | **Dead file: `tiss-guide.ts`** is a deprecated re-export stub with TODO to remove | `src/server/actions/tiss-guide.ts` | Delete once verified no imports remain |
| ✅ | Memed files fully cleaned up — no code references remain | Codebase-wide | Docs still reference Memed (see Analysis 10) |
| ✅ | Import alias consistency is excellent — 100% `@/` usage, zero relative imports | Codebase-wide | — |
| ✅ | Calendar co-location pattern is good — components co-located with route | `calendar/components/` | — |

## 2. App Router Usage

### Route Boundaries

| Boundary | Status | Details |
|----------|--------|---------|
| `layout.tsx` | ✅ Present in all route groups | `(auth)`, `(dashboard)`, `(admin)`, root |
| `error.tsx` | 🟠 Missing in `(auth)` | `(dashboard)` and `(admin)` have it |
| `loading.tsx` | 🟠 Partially covered | **Missing:** `patients/`, `prescriptions/`, `certificates/`, `mensagens/`, `teleconsulta/` |
| `not-found.tsx` | 🔴 Missing everywhere | Invalid IDs show generic Next.js 404 |

### "use client" Usage

24 of 47 `page.tsx` files use `"use client"` (51%). All checked and justified — interactive state, forms, charts, tabs.

| Severity | Finding | Solution |
|----------|---------|----------|
| 🔴 | No `not-found.tsx` in any route group | Add to `(dashboard)/` and dynamic routes (`patients/[id]/`, `prescriptions/[id]/`, `certificates/[id]/`) |
| 🟠 | Missing `error.tsx` in `(auth)/` | Add to catch Clerk failures gracefully |
| 🟠 | 5 dashboard subroutes lack `loading.tsx` | Add loading.tsx to patients/, prescriptions/, certificates/, mensagens/, teleconsulta/ |
| 🟡 | Metadata only on public/root pages. Dashboard pages have none | Low priority (behind auth), but helps browser tab clarity |

## 3. Pattern Compliance

### 3a. safeAction Wrapper

| Severity | File | Unwrapped Mutations | Solution |
|----------|------|---------------------|----------|
| 🔴 | `whatsapp.ts` | `saveWhatsAppConfig`, `disconnectWhatsApp`, `sendTextMessage`, `sendTemplateMessage`, `markConversationAsRead` (5 mutations, 0 safeAction) | Wrap all write operations |
| 🔴 | `notification.ts` | `markAsRead`, `markAllAsRead`, `generateUpcomingNotifications` (3 mutations) | Wrap in safeAction |
| 🟠 | `expense.ts` | `createExpenseCategory` without safeAction | Wrap in safeAction |
| 🟠 | `messaging.ts` | `updateMessagingConfig` without safeAction | Wrap in safeAction |
| 🟠 | `admin.ts` | `toggleWorkspaceStatus` without safeAction | Wrap in safeAction |
| 🟠 | `gateway.ts` | `recordGatewayPayment` without safeAction | Wrap or document as internal-only |
| 🟡 | `migration.ts` | All 5 functions plain exports (delegates to service) | Verify error propagation |

### 3b. Auth Verification

✅ All 51 server action files call `auth()`. No unauthenticated server actions found.

`recordTeleconsultaConsent` intentionally skips auth — public patient endpoint validated by `videoToken` lookup. Correct.

### 3c. Auth Helper Inconsistency

🟠 **4 different auth patterns duplicated across ~50 files:**

| Pattern | Files Using |
|---------|------------|
| `getAuthContext()` (inline) | ~19 files |
| `getWorkspaceContext()` (inline) | ~10 files |
| `getWorkspaceId()` (inline) | ~10 files |
| Direct inline `auth()` + `findUnique` | ~11 files |
| `requireWorkspaceRole()` (from `auth-context.ts`) | **0 files** (never used!) |

**Solution:** Standardize on one naming convention (`getAuthContext` is most common). Document inline pattern as intentional (Vercel bundler constraint).

### 3d. workspaceId Scoping

✅ **All queries properly scoped by workspaceId.** `admin.ts` correctly uses `requireSuperAdmin()` instead.

### 3e. ARCHITECTURE.md Staleness

| Severity | Finding | Solution |
|----------|---------|----------|
| 🔴 | **30 server action files NOT listed** in ARCHITECTURE.md table | Update to list all 51 files |
| 🔴 | `memed.ts` listed but deleted. Also `memed-prescription-panel.tsx` and Memed in settings | Remove all Memed references |

### 3f. RBAC Enforcement

🟠 **Only 3 of 51 action files check feature/role permissions.** `hasPermission()` exists but is unused server-side. Sensitive ops like `deleteAppointment`, `removeMember`, `deleteExpense` have no role checks.

## 4. Separation of Concerns

| Severity | Finding | Solution |
|----------|---------|----------|
| ✅ | Components never import `db` directly | Excellent discipline |
| ✅ | Page server components only use `db` for auth/redirect | Acceptable |
| 🟡 | API routes contain business logic (reminders, birthdays, NPS) | Extract into service functions for testability |
| 🟡 | WhatsApp webhook has appointment confirmation logic inline | Extract into server actions |

## 5. Large Files (>500 lines)

| Lines | File | Severity |
|-------|------|----------|
| **1,778** | `settings/migration/page.tsx` | 🔴 Split into sub-components |
| **1,032** | `patients/[id]/tabs/imagens-tab.tsx` | 🔴 Split into image-grid, viewer, upload-dialog |
| **969** | `financial/tiss-tab.tsx` | 🟠 Extract form dialogs and table |
| **880** | `settings/form-builder/[id]/page.tsx` | 🟠 Extract field editor, preview panel |
| **858** | `patients/[id]/tabs/formularios-tab.tsx` | 🟠 Extract response viewer |
| **816** | `financial/inventory-tab.tsx` | 🟠 Extract dialogs |
| **749** | `patients/[id]/prescricao/prescription-editor.tsx` | 🟠 Extract medication row |
| **690** | `booking/[token]/page.tsx` | 🟠 Extract step components |
| 666-502 | 16 more files | 🟡 On the edge |

## 6. Import Consistency

| Severity | Finding |
|----------|---------|
| ✅ | 100% `@/` alias usage — no relative imports |
| ✅ | No circular dependencies detected |

## Summary

| Area | Score | Issues |
|------|-------|--------|
| Folder Structure | ✅ Good | 2 dead files |
| App Router Boundaries | 🟠 Needs Work | No not-found.tsx; partial loading.tsx |
| safeAction Compliance | 🟠 Needs Work | 8+ mutations unwrapped |
| Auth/Workspace Scoping | ✅ Good | All actions authenticated; all queries scoped |
| ARCHITECTURE.md | 🔴 Stale | 30 missing files, Memed ghosts |
| RBAC Enforcement | 🟠 Needs Work | Only 3/51 files check roles |
| Large Files | 🟠 Needs Work | 2 files >1,000 lines |
| Import Consistency | ✅ Excellent | 100% alias, no circular deps |
