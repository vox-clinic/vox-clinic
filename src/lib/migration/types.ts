// ── Source identification ──
export type MigrationSource = "csv" | "excel" | "iclinic" | "feegow" | "ai_pdf" | "db_dump"

// ── Canonical patient format ──
export interface MigrationPatient {
  externalId: string | null
  name: string
  document: string | null
  rg: string | null
  phone: string | null
  email: string | null
  birthDate: string | null
  gender: string | null
  address: {
    street?: string | null
    number?: string | null
    complement?: string | null
    neighborhood?: string | null
    city?: string | null
    state?: string | null
    zipCode?: string | null
  } | null
  insurance: string | null
  guardian: string | null
  source: string | null
  tags: string[]
  medicalHistory: {
    allergies?: string[]
    chronicDiseases?: string[]
    medications?: string[]
    bloodType?: string | null
    notes?: string | null
  }
  customData: Record<string, unknown>
  alerts: string[]
  _meta: {
    sourceRow: number
    rawData?: Record<string, unknown>
  }
}

// ── Canonical appointment format ──
export interface MigrationAppointment {
  externalId: string | null
  patientExternalId: string | null
  patientDocument: string | null
  patientName: string | null
  date: string
  procedures: string[]
  notes: string | null
  status: "scheduled" | "completed" | "cancelled" | "no_show"
  price: number | null
  _meta: {
    sourceRow: number
    rawData?: Record<string, unknown>
  }
}

// ── Error tracking ──
export type MigrationErrorSeverity = "fatal" | "error" | "warning"

export interface MigrationError {
  phase: "parse" | "normalize" | "validate" | "deduplicate" | "load"
  severity: MigrationErrorSeverity
  sourceRow: number | null
  field: string | null
  message: string
  value?: unknown
}

// ── Deduplication ──
export type DeduplicationAction = "create" | "update" | "skip" | "conflict"

export interface DeduplicationResult {
  patient: MigrationPatient
  action: DeduplicationAction
  existingPatientId: string | null
  conflictFields: string[]
}

// ── Session tracking ──
export type MigrationStatus =
  | "parsing"
  | "normalizing"
  | "validating"
  | "deduplicating"
  | "pending_review"
  | "loading"
  | "completed"
  | "failed"
  | "cancelled"

export interface MigrationStats {
  totalRows: number
  parsed: number
  valid: number
  created: number
  updated: number
  skipped: number
  errors: number
}

export interface MigrationSessionData {
  id: string
  workspaceId: string
  userId: string
  source: MigrationSource
  status: MigrationStatus
  config: Record<string, unknown>
  stats: MigrationStats
  errors: MigrationError[]
  deduplicationResults: DeduplicationResult[]
  startedAt: Date
  completedAt: Date | null
}

// ── Pipeline output ──
export interface MigrationPreview {
  sessionId: string
  stats: MigrationStats
  sampleConflicts: DeduplicationResult[]
  errors: MigrationError[]
  canProceed: boolean
}

export interface MigrationResult {
  sessionId: string
  stats: MigrationStats
  errors: MigrationError[]
  duration: number
}

// ── Adapter interface ──
export interface MigrationAdapterConfig {
  source: MigrationSource
  columnMapping?: Record<string, string>
  apiKey?: string
  apiUrl?: string
}

export interface MigrationAdapterResult {
  patients: MigrationPatient[]
  appointments: MigrationAppointment[]
  errors: MigrationError[]
}

export interface MigrationAdapter {
  readonly source: MigrationSource
  validateConfig(config: MigrationAdapterConfig): MigrationError[]
  parse(data: unknown, config: MigrationAdapterConfig): Promise<MigrationAdapterResult>
}
