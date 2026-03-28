# 07 - Dependencies & Tech Debt

## 7.1 Security Vulnerabilities (`npm audit`)

| Package | Severity | Issue | Fix |
|---------|----------|-------|-----|
| `@clerk/backend` | 🔴 High | SSRF in clerkFrontendApiProxy leaks secret keys | `npm audit fix` |
| `brace-expansion` | 🟡 Moderate | Zero-step sequence causes hang/memory exhaustion | `npm audit fix` |
| `effect` (via Prisma) | 🟠 High | AsyncLocalStorage context lost under concurrent load | Requires Prisma upgrade (breaking) |
| `path-to-regexp` | 🟠 High | Two ReDoS vulnerabilities | `npm audit fix` |
| `xlsx` | 🔴 High | Prototype Pollution + ReDoS, **no fix available** | Replace with `exceljs` |

**Total: 7 vulnerabilities (1 moderate, 6 high)**

- `@clerk/backend` SSRF: 🔴 `npm audit fix` resolves it — secret key leakage in healthcare SaaS is critical.
- `xlsx` has **no fix available** and is actively used in `src/app/api/export/` and migration. 🔴 Replace with `exceljs` (MIT, maintained, no vulns).

## 7.2 Outdated Packages (`npm outdated`)

| Package | Current | Latest | Risk |
|---------|---------|--------|------|
| `@types/node` | 20.x | 25.x | Minor patches only in current major |
| `typescript` | 5.9.x | 6.0.x | Major version — evaluate before upgrading |
| Other 8 packages | Minor behind | Minor patches | Low risk, safe to update |

🟡 All minor/patch updates except TS 6. Run `npm update` for safe packages.

## 7.3 Unused Dependencies

| Package | Location | Status |
|---------|----------|--------|
| `@dnd-kit/utilities` | dependencies | Not imported anywhere — only `@dnd-kit/core` used |
| `jsdom` | devDependencies | Not used — vitest uses `happy-dom` exclusively |
| `vite-tsconfig-paths` | devDependencies | Not imported — manual `resolve.alias` used instead |

🟡 Remove these 3 packages.

## 7.4 Misplaced Dependencies

| Package | Current | Should Be | Why |
|---------|---------|-----------|-----|
| `@types/fluent-ffmpeg` | `dependencies` | `devDependencies` | Type declarations are dev-only |
| `shadcn` | `dependencies` | `devDependencies` | CLI code-gen tool, not runtime |

🟡 Bloats production `node_modules`.

## 7.5 Duplicate/Redundant Packages

| Issue | Severity |
|-------|----------|
| Both `jsdom` and `happy-dom` in devDeps — only `happy-dom` configured | 🟡 Remove `jsdom` |
| `@radix-ui/react-icons` used in 1 file while `lucide-react` is standard | 🟡 Replace with Lucide |

## 7.6 TODO/FIXME/HACK Comments

Only 3 genuine TODOs found (very clean):

| File | Line | Comment | Severity |
|------|------|---------|----------|
| `src/lib/migration/loader.ts` | 143 | `TODO: Link appointments to patients by externalId/document/name` | 🟡 |
| `src/server/actions/tiss-guide.ts` | 6 | `TODO: Remove this file once all imports migrated to tiss.ts` | 🟡 |
| `src/server/actions/messaging.ts` | 130 | `TODO: Implement Twilio SMS when user provides credentials` | 🟢 |

✅ Very low tech debt in comments.

## 7.7 Summary

| Category | Severity | Action |
|----------|----------|--------|
| `xlsx` prototype pollution (no fix) | 🔴 | Replace with `exceljs` |
| `@clerk/backend` SSRF | 🔴 | `npm audit fix` immediately |
| 3 unused deps | 🟡 | Remove `jsdom`, `vite-tsconfig-paths`, `@dnd-kit/utilities` |
| Misplaced deps | 🟡 | Move `@types/fluent-ffmpeg`, `shadcn` to devDependencies |
| Outdated packages | 🟡 | `npm update` for safe patches |
| TODOs | 🟢 | 3 total, all low priority |
