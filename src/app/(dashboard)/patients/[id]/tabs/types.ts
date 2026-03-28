export type PatientData = {
  id: string
  name: string
  document: string | null
  rg: string | null
  phone: string | null
  email: string | null
  birthDate: Date | null
  gender: string | null
  address: Record<string, string> | null
  insurance: string | null
  insuranceData: Record<string, unknown> | null
  guardian: string | null
  source: string | null
  tags: string[]
  medicalHistory: Record<string, unknown>
  customData: Record<string, unknown>
  alerts: string[]
  whatsappConsent: boolean
  whatsappConsentAt: Date | null
  createdAt: Date
  appointments: {
    id: string
    date: Date
    procedures: string[]
    notes: string | null
    aiSummary: string | null
    status: string
    type: string | null
    price: number | null
    transcript: string | null
    videoRecordingUrl: string | null
    cidCodes: { code: string; description: string }[]
    recordings: {
      id: string
      duration: number | null
      createdAt: Date
      status: string
    }[]
  }[]
  recordings: {
    id: string
    audioUrl: string
    duration: number | null
    transcript: string | null
    createdAt: Date
    status: string
  }[]
}

export type CustomFieldDef = {
  id: string
  name: string
  type: string
  required: boolean
}

export type AnamnesisQuestionDef = {
  id: string
  question: string
  type: string
  options?: string[]
}

export type TreatmentPlanItem = {
  id: string
  name: string
  procedures: string[]
  totalSessions: number
  completedSessions: number
  status: string
  notes: string | null
  startDate: string
  estimatedEndDate: string | null
  completedAt: string | null
}

export type DocumentItem = {
  id: string
  name: string
  url: string
  type: string
  mimeType: string | null
  fileSize: number | null
  createdAt: string
}

export type PrescriptionItem = {
  id: string
  medications: { name: string; dosage: string; frequency: string; duration: string; notes?: string }[]
  notes: string | null
  createdAt: string
  source?: string | null
  signedPdfUrl?: string | null
  sentVia?: string[]
  status: string
  type: string
}

export type ClinicalImageItem = {
  id: string
  url: string
  signedUrl: string
  thumbnailUrl: string | null
  mimeType: string
  fileSize: number | null
  bodyRegion: string | null
  category: string
  pairedImageId: string | null
  annotations: unknown
  tags: string[]
  notes: string | null
  takenAt: string | null
  createdAt: string
  appointment: {
    id: string
    date: string
    procedures: unknown
  } | null
}

export type CertificateItem = {
  id: string
  type: string
  content: string
  days: number | null
  cid: string | null
  createdAt: string
}
