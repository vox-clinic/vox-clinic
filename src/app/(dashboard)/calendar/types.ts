export interface AgendaItem {
  id: string
  name: string
  color: string
  isDefault: boolean
  isActive: boolean
  appointmentCount: number
}

export interface AppointmentItem {
  id: string
  date: string
  patient: { id: string; name: string }
  procedures: string[]
  notes: string | null
  status: string
  type?: string | null
  agendaId: string
  agenda?: { id: string; name: string; color: string }
}

export interface PatientOption {
  id: string
  name: string
  phone: string | null
  document: string | null
  updatedAt: Date
}

export type ViewMode = "month" | "week" | "day" | "list"
