export interface AgendaItem {
  id: string
  name: string
  color: string
  isDefault: boolean
  isActive: boolean
  appointmentCount: number
  slotDuration?: number
  bufferBefore?: number
  bufferAfter?: number
  conflictWindow?: number
  operatingHours?: Record<number, { start: string; end: string } | null> | null
  maxBookingsPerDay?: number | null
  minNoticeMinutes?: number
}

export interface AppointmentItem {
  id: string
  date: string
  patient: { id: string; name: string; alerts?: string[]; personalNotes?: string | null }
  procedures: string[]
  notes: string | null
  status: string
  type?: string | null
  source?: string | null
  agendaId: string
  agenda?: { id: string; name: string; color: string }
  cidCodes?: { code: string; description: string }[]
}

export interface PatientOption {
  id: string
  name: string
  phone: string | null
  document: string | null
  updatedAt: Date
}

export type ViewMode = "month" | "week" | "day" | "list"
