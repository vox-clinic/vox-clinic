import { db } from "@/lib/db"
import type { MigrationPatient, MigrationError, DeduplicationResult } from "./types"

export async function deduplicatePatients(
  patients: MigrationPatient[],
  workspaceId: string
): Promise<{
  results: DeduplicationResult[]
  errors: MigrationError[]
}> {
  const errors: MigrationError[] = []
  const results: DeduplicationResult[] = []

  // Collect all non-null CPFs for batch query
  const cpfs = patients
    .map((p) => p.document)
    .filter((d): d is string => d !== null && d.length > 0)

  // Collect all names for fallback matching
  const names = patients.map((p) => p.name.toLowerCase())

  // Batch query: find existing patients by CPF
  const existingByCpf = cpfs.length > 0
    ? await db.patient.findMany({
        where: { workspaceId, document: { in: cpfs } },
        select: {
          id: true,
          name: true,
          document: true,
          phone: true,
          email: true,
          birthDate: true,
          gender: true,
          insurance: true,
          guardian: true,
          tags: true,
        },
      })
    : []

  // Batch query: find existing patients by name (for those without CPF)
  const existingByName = await db.patient.findMany({
    where: {
      workspaceId,
      name: { in: patients.map((p) => p.name), mode: "insensitive" },
    },
    select: {
      id: true,
      name: true,
      document: true,
      phone: true,
      email: true,
    },
  })

  // Build lookup maps
  const cpfMap = new Map(existingByCpf.map((p) => [p.document, p]))
  const nameMap = new Map(existingByName.map((p) => [p.name.toLowerCase(), p]))

  for (const patient of patients) {
    // Try match by CPF first (most reliable)
    if (patient.document) {
      const existing = cpfMap.get(patient.document)
      if (existing) {
        const conflictFields = getConflictFields(patient, existing)
        if (conflictFields.length === 0) {
          results.push({
            patient,
            action: "skip",
            existingPatientId: existing.id,
            conflictFields: [],
          })
        } else {
          // Check if all conflicts are just new data filling empty fields
          const isComplementary = conflictFields.every(
            (f) => !(existing as any)[f] && (patient as any)[f]
          )
          results.push({
            patient,
            action: isComplementary ? "update" : "conflict",
            existingPatientId: existing.id,
            conflictFields,
          })
        }
        continue
      }
    }

    // Fallback: match by name (less reliable)
    const existingByNameMatch = nameMap.get(patient.name.toLowerCase())
    if (existingByNameMatch && !patient.document) {
      // Name match without CPF — potential duplicate but not certain
      results.push({
        patient,
        action: "conflict",
        existingPatientId: existingByNameMatch.id,
        conflictFields: ["name (possivel duplicata)"],
      })
      continue
    }

    // No match — new patient
    results.push({
      patient,
      action: "create",
      existingPatientId: null,
      conflictFields: [],
    })
  }

  return { results, errors }
}

function getConflictFields(
  incoming: MigrationPatient,
  existing: {
    name: string
    document: string | null
    phone: string | null
    email: string | null
    birthDate: Date | null
    gender: string | null
    insurance: string | null
    guardian: string | null
    tags: string[]
  }
): string[] {
  const conflicts: string[] = []

  const check = (field: string, inVal: string | null | undefined, exVal: string | null | undefined) => {
    if (inVal && exVal && inVal.toLowerCase() !== exVal.toLowerCase()) {
      conflicts.push(field)
    }
  }

  check("phone", incoming.phone, existing.phone)
  check("email", incoming.email, existing.email)
  check("gender", incoming.gender, existing.gender)
  check("insurance", incoming.insurance, existing.insurance)
  check("guardian", incoming.guardian, existing.guardian)

  if (incoming.birthDate && existing.birthDate) {
    const inDate = new Date(incoming.birthDate).toISOString().slice(0, 10)
    const exDate = existing.birthDate.toISOString().slice(0, 10)
    if (inDate !== exDate) conflicts.push("birthDate")
  }

  return conflicts
}
