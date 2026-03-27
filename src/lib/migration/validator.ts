import { MigrationPatientSchema, MigrationAppointmentSchema } from "./schemas"
import type { MigrationPatient, MigrationAppointment, MigrationError } from "./types"

export function validatePatients(patients: MigrationPatient[]): {
  valid: MigrationPatient[]
  errors: MigrationError[]
} {
  const valid: MigrationPatient[] = []
  const errors: MigrationError[] = []

  for (const patient of patients) {
    const result = MigrationPatientSchema.safeParse(patient)

    if (result.success) {
      valid.push(patient)
    } else {
      let hasFatal = false
      for (const issue of result.error.issues) {
        const field = issue.path.join(".")
        const isNameError = field === "name"

        if (isNameError) {
          hasFatal = true
          errors.push({
            phase: "validate",
            severity: "error",
            sourceRow: patient._meta.sourceRow,
            field,
            message: issue.message,
            value: (patient as any)[field],
          })
        } else {
          // Non-fatal: clear the field and keep the record
          errors.push({
            phase: "validate",
            severity: "warning",
            sourceRow: patient._meta.sourceRow,
            field,
            message: issue.message,
            value: (patient as any)[field],
          })
        }
      }

      if (!hasFatal) {
        // Clear invalid fields and keep the patient
        const cleaned = { ...patient }
        for (const issue of result.error.issues) {
          const field = issue.path[0] as string
          if (field === "email") cleaned.email = null
          if (field === "gender") cleaned.gender = null
          if (field === "source") cleaned.source = null
          if (field === "birthDate") cleaned.birthDate = null
        }
        valid.push(cleaned)
      }
    }
  }

  return { valid, errors }
}

export function validateAppointments(appointments: MigrationAppointment[]): {
  valid: MigrationAppointment[]
  errors: MigrationError[]
} {
  const valid: MigrationAppointment[] = []
  const errors: MigrationError[] = []

  for (const appt of appointments) {
    const result = MigrationAppointmentSchema.safeParse(appt)

    if (result.success) {
      valid.push(appt)
    } else {
      const hasDateError = result.error.issues.some((i) => i.path[0] === "date")
      if (hasDateError) {
        errors.push({
          phase: "validate",
          severity: "error",
          sourceRow: appt._meta.sourceRow,
          field: "date",
          message: "Data da consulta invalida ou ausente",
        })
      } else {
        valid.push(appt)
        for (const issue of result.error.issues) {
          errors.push({
            phase: "validate",
            severity: "warning",
            sourceRow: appt._meta.sourceRow,
            field: issue.path.join("."),
            message: issue.message,
          })
        }
      }
    }
  }

  return { valid, errors }
}
