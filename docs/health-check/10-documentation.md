# 10 - Documentation

## 10.1 Stale References in ARCHITECTURE.md

🔴 `docs/ARCHITECTURE.md` references **5 deleted files/modules**:

| Reference | Line | Status |
|-----------|------|--------|
| `memed.ts` server action | 78 | DELETED |
| `memed-prescription-panel.tsx` component | 97 | DELETED |
| `src/lib/memed/client.ts` integration | 126 | DELETED |
| `create-prescription-dialog.tsx` as "Manual/Memed" | 92 | Stale description |
| Settings route mentions "Memed" | 23 | Memed section deleted |

🟠 **Additional stale Memed references:**
- `docs/DATA-MODEL.md:59` — References `MemedPrescriber` model
- `docs/DATA-MODEL.md:17` — References `source (manual/memed)` on Prescription
- `docs/features/memed.md` — Entire 260-line feature doc for removed integration
- `docs/features/inngest.md:26,115-143,242-276` — Memed sync sections
- `docs/features/prescricao-avancada.md` — 15+ Memed references, says "NAO remover Memed"
- `docs/testing-plan.md:40,53` — References memed.ts for testing

## 10.2 Feature Docs vs Implementation

| Doc | Status |
|-----|--------|
| `memed.md` | 🔴 Feature removed, doc still exists |
| `prescricao-avancada.md` | 🟠 Memed coexistence guidance is wrong |
| `inngest.md` | 🟠 Phase 4 "Memed Async Sync" references deleted code |
| 13 other feature docs | ✅ Likely current |

## 10.3 Missing Documentation

| Document | Status | Severity |
|----------|--------|----------|
| `README.md` | EXISTS — 60+ lines | ✅ |
| `CLAUDE.md` | EXISTS — comprehensive | ✅ |
| `CONTRIBUTING.md` | MISSING | 🟡 |
| `CHANGELOG.md` | MISSING | 🟡 |
| `docs/adr/` (ADRs) | MISSING | 🟡 |
| API route documentation | MISSING — 15+ routes undocumented | 🟠 |
| `.env.example` | EXISTS | ✅ |

## 10.4 Code Documentation

198 JSDoc-style comments across server actions and lib files (~2.4 per file average). Most are brief — lack `@param`/`@returns`/`@throws`.

🟡 For healthcare compliance, `@throws` on server actions would help document error contracts.

## 10.5 BUSINESS-RULES.md

✅ **Strongest documentation asset.** Well-structured with:
- Data integrity rules (confirmation-before-save, atomic transactions)
- LGPD/WhatsApp consent rules
- CFM audit logging requirements
- Server action error handling pattern

## 10.6 Summary

| Category | Severity | Action |
|----------|----------|--------|
| ARCHITECTURE.md references 5 deleted Memed files | 🔴 | Remove all Memed references |
| `docs/features/memed.md` for removed feature | 🔴 | Delete or mark as DEPRECATED |
| `inngest.md` + `prescricao-avancada.md` stale sections | 🟠 | Update to reflect native-only prescription |
| DATA-MODEL.md references MemedPrescriber | 🟠 | Update to match current schema |
| No API route documentation | 🟠 | Document webhook contracts and public routes |
| No CONTRIBUTING.md or CHANGELOG.md | 🟡 | Create when team grows |
| JSDoc lacks `@throws` | 🟡 | Add for compliance visibility |
| BUSINESS-RULES.md | ✅ | High quality |
| README.md | ✅ | Adequate |
| CLAUDE.md | ✅ | Excellent |
