export interface ExtractedPatientData {
  name: string | null
  document: string | null
  phone: string | null
  email: string | null
  birthDate: string | null
  age: number | null
  procedures: string[]
  notes: string | null
  alerts: string[]
  customData: Record<string, any>
  confidence: Record<string, number>
}

export interface WorkspaceConfig {
  procedures: Procedure[]
  customFields: CustomField[]
  anamnesisTemplate: AnamnesisQuestion[]
  categories: Category[]
}

export interface Procedure {
  id: string
  name: string
  category: string
  price?: number
  duration?: number // minutes (default 30)
}

export interface CustomField {
  id: string
  name: string
  type: 'text' | 'number' | 'boolean' | 'date' | 'select'
  required: boolean
  options?: string[]
}

export interface AnamnesisQuestion {
  id: string
  question: string
  type: 'text' | 'boolean' | 'select'
  options?: string[]
}

export interface Category {
  id: string
  name: string
}

export interface ConsultationMedication {
  name: string
  dosage?: string
  frequency?: string
  notes?: string
}

export interface PatientInfoUpdates {
  address?: string | null
  phone?: string | null
  insurance?: string | null
  allergies?: string[]
  medications?: string[]
  chronicDiseases?: string[]
}

export interface AppointmentSummary {
  procedures: string[]
  observations: string | null
  recommendations: string | null
  nextAppointment: string | null
  diagnosis?: string | null
  medications?: ConsultationMedication[]
  patientInfoUpdates?: PatientInfoUpdates
}
