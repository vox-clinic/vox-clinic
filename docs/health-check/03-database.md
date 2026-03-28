# 03 - Database

## 1. Schema Quality

### 1.1 Timestamps
- ✅ 33 models have both `createdAt` + `updatedAt`
- 10 models have `createdAt` only — mostly immutable records (audit logs, notifications, consent). Correct by design.

| Severity | Model | Issue | Solution |
|----------|-------|-------|----------|
| 🟡 | `MedicalCertificate` | No `updatedAt` but has signature fields that change | Add `updatedAt DateTime @updatedAt` |
| 🟡 | `ExpenseCategory` | No `updatedAt` — categories can be renamed | Add `updatedAt` |
| 🟡 | `InventoryCategory` | Same | Add `updatedAt` |
| 🟡 | `MedicationFavorite` | No `updatedAt` but has `lastUsedAt` and `usageCount` | Add `updatedAt` |

### 1.2 Soft Delete
✅ Well-implemented:
- `isActive` flag on: Patient, Agenda, Operadora, NfseConfig, etc.
- `status` with "cancelled" on: Appointment, Prescription, Charge, Payment, etc.

🟠 **Missing:** Recording, PatientDocument (should consider LGPD retention).

### 1.3 Unique Constraints
✅ All multi-tenant uniqueness includes `workspaceId`. 13 `@@unique` constraints properly defined.

### 1.4 Json Fields — TypeScript Typing

🔴 **This is the single biggest source of `any` pollution.** None of the Json fields have centralized TypeScript types.

| Severity | Field | Cast Pattern | Solution |
|----------|-------|-------------|----------|
| 🔴 | `Workspace.procedures` | `as any[]` everywhere | Define `ProcedureConfig[]` |
| 🔴 | `Workspace.customFields` | `as any[]` | Define `CustomField[]` |
| 🔴 | `Workspace.anamnesisTemplate` | `as any[]` | Define `AnamnesisField[]` |
| 🔴 | `Workspace.categories` | `as any` | Define `WorkspaceCategories` |
| 🟠 | `Appointment.procedures` | `as any[]` in ~10 files | Define `ProcedureRef[]` |
| 🟠 | `Appointment.cidCodes` | `as any[]` | Define `CidCode[]` |
| 🟠 | `Patient.medicalHistory` | `as any` | Define `MedicalHistory` |
| 🟠 | `Patient.alerts`, `customData` | `as any` | Define interfaces |
| 🟡 | `Prescription.medications` | Inline typed in some files | Centralize |
| 🟡 | `FormTemplate.fields/sections` | `Json` | Define `FormField[]` / `FormSection[]` |

**Fix:** Create `src/lib/types/prisma-json.ts` with all interfaces. Eliminates ~60% of all `any`.

## 2. Indexes

### ✅ Excellent coverage overall
Every model with `workspaceId` has `@@index([workspaceId])` at minimum. Multi-column indexes on Appointment (7 indexes), Patient (4), Charge (4), Payment (4).

### Missing Indexes

| Severity | Table | Missing Index | Query Pattern |
|----------|-------|---------------|---------------|
| 🟠 | `Prescription` | `[workspaceId, patientId]` | `getPatientPrescriptions` |
| 🟠 | `MedicalCertificate` | `[workspaceId, patientId]` | `getPatientCertificates` |
| 🟡 | `TreatmentPlan` | `[workspaceId, patientId]` (has them separately) | `getTreatmentPlans` |
| 🟡 | `PatientDocument` | `[workspaceId, patientId]` (has them separately) | `getPatientDocuments` |

## 3. Problematic Queries

### N+1 Patterns

| Severity | File | Pattern | Solution |
|----------|------|---------|----------|
| 🔴 | `drug-interaction.ts:60-82` | `for (name of names)` with `findFirst` in loop | Use single `findMany` with `OR` |
| 🔴 | `commission.ts:316-324` | `for (entry of entries)` with `upsert` in loop | Batch with `$transaction(entries.map(...))` |
| 🟠 | `prescription.ts:202-216` | `prescriptions.map(async => checkExpiry)` | Verify if DB-dependent; batch if so |

### findMany Without Pagination

| Severity | File | Query | Solution |
|----------|------|-------|----------|
| 🔴 | `financial.ts:33` | All completed appointments for month/year | Add pagination or `aggregate()` |
| 🟠 | `treatment.ts:31` | Unbounded per patient | Add `take: 100` |
| 🟠 | `certificate.ts:144` | Unbounded per patient | Add `take: 100` |
| 🟠 | `prescription.ts:196` | Unbounded per patient | Add `take: 100` |
| 🟠 | `forms.ts:290` | No `take`, filtered by workspace | Add pagination |
| 🟠 | `commission.ts:33,385` | Unbounded per workspace | Add `take: 200` or pagination |

### Deep Includes
🟡 All 3-level includes use `select` to constrain nested data. No 4+ levels. Acceptable.

### Queries Without workspaceId
✅ **Zero violations.** Every tenant-scoped query filters by `workspaceId`. Only global data (medications, drug interactions) and token-based lookups skip it. Excellent.

### Missing `$transaction`

| Severity | File | Issue |
|----------|------|-------|
| 🟠 | `commission.ts:316-324` | N sequential `upsert` calls not wrapped in `$transaction` |
| ✅ | All other multi-step mutations | Properly wrapped (31 `$transaction` usages) |

## 4. Connection

| Area | Status |
|------|--------|
| Prisma singleton | ✅ Standard `globalForPrisma` pattern in `db.ts` |
| Connection pooling | ✅ `DATABASE_URL` (Supabase PgBouncer) + `DIRECT_URL` (migrations) |
| Pool config | 🟡 No explicit `connection_limit`/`pool_timeout` — relies on Supabase defaults |
| Query logging | 🟡 Not enabled — consider `log: ["query"]` in dev |

## Summary

| Category | Grade | Key Finding |
|----------|-------|-------------|
| Schema quality | B+ | Good timestamps/constraints, but Json fields need TS types |
| Indexes | A- | Excellent, 4-5 composite indexes missing |
| Query safety | A- | Zero workspaceId violations, good transactions, 2 N+1 patterns |
| Pagination | B- | ~10 queries missing `take` limits |
| Connection | A | Correct singleton, Supabase pooling |

**Top 3 fixes:**
1. 🔴 Fix N+1 in `drug-interaction.ts` and `commission.ts`
2. 🟠 Add `take` limits to unbounded `findMany` calls
3. 🟠 Add composite indexes on `[workspaceId, patientId]` for Prescription, MedicalCertificate
