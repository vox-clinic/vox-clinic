import { db } from "@/lib/db"
import { logAudit } from "@/lib/audit"
import type { MigrationPatient, MigrationAppointment, MigrationError, MigrationStats, DeduplicationResult } from "./types"

const CHUNK_SIZE = 100

export async function loadMigration(
  results: DeduplicationResult[],
  appointments: MigrationAppointment[],
  workspaceId: string,
  agendaId: string,
  userId: string,
  resolutions: Record<string, "keep" | "overwrite" | "merge">
): Promise<{
  stats: MigrationStats
  errors: MigrationError[]
  createdPatientIds: string[]
}> {
  const errors: MigrationError[] = []
  const createdPatientIds: string[] = []
  let created = 0
  let updated = 0
  let skipped = 0

  // ── Phase 1: Create new patients in chunks ──
  const toCreate = results.filter((r) => r.action === "create")
  const createChunks = chunkArray(toCreate, CHUNK_SIZE)

  for (const chunk of createChunks) {
    try {
      const data = chunk.map((r) => ({
        workspaceId,
        name: r.patient.name,
        document: r.patient.document || null,
        rg: r.patient.rg || null,
        phone: r.patient.phone || null,
        email: r.patient.email || null,
        birthDate: r.patient.birthDate ? new Date(r.patient.birthDate) : null,
        gender: r.patient.gender || null,
        address: r.patient.address || {},
        insurance: r.patient.insurance || null,
        guardian: r.patient.guardian || null,
        source: r.patient.source || null,
        tags: r.patient.tags,
        medicalHistory: r.patient.medicalHistory || {},
        customData: {
          ...r.patient.customData,
          _migrationExternalId: r.patient.externalId,
        },
        alerts: r.patient.alerts || [],
      }))

      const result = await db.patient.createMany({
        data,
        skipDuplicates: true,
      })

      created += result.count
      skipped += chunk.length - result.count
    } catch (err: any) {
      errors.push({
        phase: "load",
        severity: "error",
        sourceRow: null,
        field: null,
        message: `Erro ao criar lote de ${chunk.length} pacientes: ${err.message}`,
      })
      skipped += chunk.length
    }
  }

  // ── Phase 2: Update existing patients ──
  const toUpdate = results.filter((r) => r.action === "update")
  const toMerge = results.filter(
    (r) => r.action === "conflict" && r.existingPatientId && resolutions[r.existingPatientId] === "overwrite"
  )
  const toMergeFields = results.filter(
    (r) => r.action === "conflict" && r.existingPatientId && resolutions[r.existingPatientId] === "merge"
  )

  for (const item of [...toUpdate, ...toMerge]) {
    if (!item.existingPatientId) continue
    try {
      await db.patient.update({
        where: { id: item.existingPatientId },
        data: buildUpdateData(item.patient),
      })
      updated++
    } catch (err: any) {
      errors.push({
        phase: "load",
        severity: "warning",
        sourceRow: item.patient._meta.sourceRow,
        field: null,
        message: `Erro ao atualizar paciente: ${err.message}`,
      })
    }
  }

  // Merge: only fill empty fields
  for (const item of toMergeFields) {
    if (!item.existingPatientId) continue
    try {
      const existing = await db.patient.findUnique({ where: { id: item.existingPatientId } })
      if (!existing) continue

      const mergeData: Record<string, any> = {}
      if (!existing.phone && item.patient.phone) mergeData.phone = item.patient.phone
      if (!existing.email && item.patient.email) mergeData.email = item.patient.email
      if (!existing.birthDate && item.patient.birthDate) mergeData.birthDate = new Date(item.patient.birthDate)
      if (!existing.gender && item.patient.gender) mergeData.gender = item.patient.gender
      if (!existing.insurance && item.patient.insurance) mergeData.insurance = item.patient.insurance
      if (!existing.guardian && item.patient.guardian) mergeData.guardian = item.patient.guardian
      if (!existing.rg && item.patient.rg) mergeData.rg = item.patient.rg

      if (Object.keys(mergeData).length > 0) {
        await db.patient.update({
          where: { id: item.existingPatientId },
          data: mergeData,
        })
        updated++
      } else {
        skipped++
      }
    } catch (err: any) {
      errors.push({
        phase: "load",
        severity: "warning",
        sourceRow: item.patient._meta.sourceRow,
        field: null,
        message: `Erro ao mesclar paciente: ${err.message}`,
      })
    }
  }

  // Count skipped (keep + unresolved conflicts)
  const kept = results.filter(
    (r) => r.action === "skip" || (r.action === "conflict" && (!r.existingPatientId || resolutions[r.existingPatientId] === "keep" || !resolutions[r.existingPatientId]))
  )
  skipped += kept.length

  // ── Phase 3: Create appointments ──
  // TODO: Link appointments to patients by externalId/document/name
  // For now, appointments import is a future enhancement

  // ── Audit ──
  await logAudit({
    workspaceId,
    userId,
    action: "MIGRATION_COMPLETED",
    entityType: "MigrationSession",
    entityId: workspaceId,
    details: {
      created,
      updated,
      skipped,
      errors: errors.length,
      totalRows: results.length,
    },
  })

  return {
    stats: {
      totalRows: results.length,
      parsed: results.length,
      valid: results.length,
      created,
      updated,
      skipped,
      errors: errors.length,
    },
    errors,
    createdPatientIds,
  }
}

function buildUpdateData(patient: MigrationPatient): Record<string, any> {
  const data: Record<string, any> = {}
  if (patient.phone) data.phone = patient.phone
  if (patient.email) data.email = patient.email
  if (patient.birthDate) data.birthDate = new Date(patient.birthDate)
  if (patient.gender) data.gender = patient.gender
  if (patient.insurance) data.insurance = patient.insurance
  if (patient.guardian) data.guardian = patient.guardian
  if (patient.rg) data.rg = patient.rg
  if (patient.address) data.address = patient.address
  if (patient.source) data.source = patient.source
  if (patient.tags.length > 0) data.tags = patient.tags
  if (patient.medicalHistory) data.medicalHistory = patient.medicalHistory
  return data
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}
