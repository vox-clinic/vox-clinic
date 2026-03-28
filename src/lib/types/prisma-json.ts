/**
 * Typed interfaces for all Prisma Json fields.
 *
 * Prisma stores Json columns as `JsonValue` (essentially `unknown`). These
 * types document the actual shapes stored at runtime so consumers can cast
 * once and get full type-safety instead of scattering `as any` everywhere.
 *
 * Usage:
 *   import type { PatientAddress, MedicalHistory } from "@/lib/types/prisma-json"
 *   const addr = patient.address as PatientAddress | null
 *
 * Adopt incrementally — no other files are changed by this module.
 */

// ============================================================
// Workspace model — Json fields
// ============================================================

/** Workspace.customFields — array of custom field definitions */
export interface WorkspaceCustomField {
  id: string
  name: string
  type: "text" | "number" | "boolean" | "date" | "select"
  required: boolean
  options?: string[]
}

/** Workspace.procedures — array of procedure configs */
export interface WorkspaceProcedure {
  id: string
  name: string
  category: string
  price?: number    // centavos
  duration?: number // minutes (default 30)
}

/** Workspace.anamnesisTemplate — array of anamnesis question definitions */
export interface WorkspaceAnamnesisQuestion {
  id: string
  question: string
  type: "text" | "boolean" | "select"
  options?: string[]
}

/** Workspace.categories — array of appointment categories */
export interface WorkspaceCategory {
  id: string
  name: string
}

// ============================================================
// Appointment model — Json fields
// ============================================================

/**
 * Appointment.procedures — array of procedure references.
 *
 * Mixed format in the wild: sometimes `string[]`, sometimes `{ name, duration?, price? }[]`.
 * This union represents both shapes. Consumers should normalise with
 * `typeof p === "string" ? p : p.name`.
 */
export type AppointmentProcedure = string | {
  name: string
  duration?: number
  price?: number
}

/** Appointment.cidCodes — array of CID-10 diagnostic codes */
export interface AppointmentCidCode {
  code: string
  description: string
}

// ============================================================
// Patient model — Json fields
// ============================================================

/** Patient.medicalHistory — structured medical background */
export interface PatientMedicalHistory {
  allergies?: string[]
  chronicDiseases?: string[]
  medications?: string[]
  bloodType?: string | null
  notes?: string | null
}

/** Patient.customData — workspace-defined key-value custom fields */
export type PatientCustomData = Record<string, string | number | boolean | null>

/** Patient.alerts — array of alert strings (e.g. "Alergia a penicilina") */
export type PatientAlerts = string[]

/**
 * Patient.address — structured address.
 *
 * Uses English field names (street, city, etc.) matching the schema comment
 * and the UI components in resumo-tab / manual-patient-form.
 */
export interface PatientAddress {
  street?: string | null
  number?: string | null
  complement?: string | null
  neighborhood?: string | null
  city?: string | null
  state?: string | null
  zipCode?: string | null
}

/**
 * Patient.insuranceData — health insurance plan details.
 *
 * operadoraId links to the Operadora model for TISS integration.
 */
export interface PatientInsuranceData {
  operadoraId?: string | null
  cardNumber?: string | null
  planName?: string | null
  planCode?: string | null
  validUntil?: string | null // ISO date string
}

// ============================================================
// Prescription model — Json fields
// ============================================================

/**
 * Prescription.medications — array of prescribed medication objects.
 *
 * Shape from schema comment:
 *   [{ name, dosage, frequency, duration, notes,
 *      activeIngredient?, concentration?, pharmaceuticalForm?,
 *      quantity?, route?, anvisaCode?, isContinuousUse?, controlType?, order? }]
 */
export interface PrescriptionMedication {
  name: string
  dosage?: string
  frequency?: string
  duration?: string
  notes?: string
  instructions?: string
  activeIngredient?: string
  concentration?: string | null
  pharmaceuticalForm?: string | null
  quantity?: number
  route?: string
  anvisaCode?: string
  isContinuousUse?: boolean
  controlType?: string
  order?: number
}

// ============================================================
// TreatmentPlan model — Json fields
// ============================================================

/** TreatmentPlan.procedures — array of procedure names */
export type TreatmentPlanProcedures = string[]

// ============================================================
// FormTemplate model — Json fields
// ============================================================

/**
 * FormTemplate.fields — array of form field definitions.
 *
 * Re-exported from the canonical `@/types/forms` module.
 * Included here for completeness so consumers can import from one place.
 */
export type { FormField as FormTemplateField } from "@/types/forms"
export type { FormSection as FormTemplateSection } from "@/types/forms"

// ============================================================
// FormResponse model — Json fields
// ============================================================

/** FormResponse.answers — mapping of fieldId to submitted value */
export type FormResponseAnswers = Record<string, unknown>

// ============================================================
// TissGuide model — Json fields
// ============================================================

/** TissGuide.procedimentos — array of TUSS procedure entries */
export interface TissGuideProcedure {
  tussCode: string
  description: string
  quantity: number
  unitPrice: number  // centavos
  totalPrice: number // centavos
}

// ============================================================
// ClinicalImage model — Json fields
// ============================================================

/** ClinicalImage.annotations — array of image annotation objects */
export interface ClinicalImageAnnotation {
  id: string
  type: string   // e.g. "circle", "arrow", "text"
  x: number
  y: number
  width?: number
  height?: number
  text?: string
  color?: string
}

// ============================================================
// Recording model — Json fields
// ============================================================

/**
 * Recording.aiExtractedData — AI-extracted entities from transcription.
 *
 * Shape mirrors ExtractedPatientData from `@/types/index`.
 */
export interface RecordingAiExtractedData {
  name?: string | null
  document?: string | null
  phone?: string | null
  email?: string | null
  birthDate?: string | null
  age?: number | null
  procedures?: string[]
  notes?: string | null
  alerts?: string[]
  customData?: Record<string, string | number | boolean | null>
  confidence?: Record<string, number>
}

// ============================================================
// AuditLog model — Json fields
// ============================================================

/** AuditLog.details — optional before/after snapshot */
export type AuditLogDetails = Record<string, unknown> | null

// ============================================================
// WhatsAppMessage model — Json fields
// ============================================================

/** WhatsAppMessage.metadata — provider-specific message metadata */
export type WhatsAppMessageMetadata = Record<string, unknown> | null

// ============================================================
// MigrationSession model — Json fields
// ============================================================

/** MigrationSession.config — session configuration */
export type MigrationSessionConfig = Record<string, unknown>

/** MigrationSession.stats — session statistics */
export type MigrationSessionStats = Record<string, unknown>

/** MigrationSession.errors — array of error entries */
export type MigrationSessionErrors = Array<Record<string, unknown>>

/** MigrationSession.preview — preview data (dedup results) */
export type MigrationSessionPreview = Array<Record<string, unknown>> | null

/** MigrationSession.resolutions — conflict resolutions */
export type MigrationSessionResolutions = Record<string, unknown> | null
