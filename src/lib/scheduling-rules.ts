/**
 * Scheduling rules utilities — pure functions for operating hours,
 * slot duration, and buffer time calculations.
 */

export type DaySchedule = { start: string; end: string } | null
export type OperatingHoursMap = Record<number, DaySchedule> | null

const VALID_SLOT_DURATIONS = [15, 20, 30, 45, 60] as const
const VALID_BUFFER_VALUES = [0, 5, 10, 15, 30] as const
const VALID_CONFLICT_WINDOWS = [0, 15, 30, 45, 60] as const

export { VALID_SLOT_DURATIONS, VALID_BUFFER_VALUES, VALID_CONFLICT_WINDOWS }

/**
 * Parse HH:MM string into { hour, minute }
 */
function parseTime(time: string): { hour: number; minute: number } | null {
  const match = time.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hour = parseInt(match[1])
  const minute = parseInt(match[2])
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return { hour, minute }
}

/**
 * Get effective operating hours for a day, falling back to BookingConfig defaults.
 * Returns null if the agenda is closed on that day.
 */
export function getEffectiveHours(
  dayOfWeek: number,
  agendaHours: OperatingHoursMap,
  fallbackStartHour: number,
  fallbackEndHour: number,
): { startHour: number; startMinute: number; endHour: number; endMinute: number } | null {
  // No per-agenda config → use BookingConfig fallback
  if (!agendaHours) {
    return { startHour: fallbackStartHour, startMinute: 0, endHour: fallbackEndHour, endMinute: 0 }
  }

  const dayConfig = agendaHours[dayOfWeek]

  // Explicitly closed
  if (dayConfig === null || dayConfig === undefined) return null

  const start = parseTime(dayConfig.start)
  const end = parseTime(dayConfig.end)

  if (!start || !end) {
    // Invalid config, fall back
    return { startHour: fallbackStartHour, startMinute: 0, endHour: fallbackEndHour, endMinute: 0 }
  }

  return { startHour: start.hour, startMinute: start.minute, endHour: end.hour, endMinute: end.minute }
}

/**
 * Validate operatingHours JSON shape.
 * Returns true if valid, error message string if invalid.
 */
export function validateOperatingHours(json: unknown): true | string {
  if (json === null || json === "null") return true

  if (typeof json !== "object" || Array.isArray(json)) {
    return "Formato inválido: deve ser um objeto com dias da semana (0-6)"
  }

  const obj = json as Record<string, unknown>

  for (const [key, value] of Object.entries(obj)) {
    const dayNum = parseInt(key)
    if (isNaN(dayNum) || dayNum < 0 || dayNum > 6) {
      return `Dia inválido: ${key} (use 0=Dom a 6=Sáb)`
    }

    if (value === null) continue // closed day

    if (typeof value !== "object" || Array.isArray(value) || !value) {
      return `Configuração inválida para dia ${key}`
    }

    const schedule = value as Record<string, unknown>
    if (typeof schedule.start !== "string" || typeof schedule.end !== "string") {
      return `Dia ${key}: start e end devem ser strings HH:MM`
    }

    const start = parseTime(schedule.start)
    const end = parseTime(schedule.end)

    if (!start) return `Dia ${key}: horário de início inválido (${schedule.start})`
    if (!end) return `Dia ${key}: horário de fim inválido (${schedule.end})`

    const startMinutes = start.hour * 60 + start.minute
    const endMinutes = end.hour * 60 + end.minute
    if (endMinutes <= startMinutes) {
      return `Dia ${key}: horário de fim deve ser posterior ao início`
    }
  }

  return true
}

/**
 * Validate scheduling rule values.
 */
export function validateSchedulingRules(data: {
  slotDuration?: number
  bufferBefore?: number
  bufferAfter?: number
  conflictWindow?: number
  maxBookingsPerDay?: number | null
  minNoticeMinutes?: number
  operatingHours?: unknown
}): true | string {
  if (data.slotDuration !== undefined && !VALID_SLOT_DURATIONS.includes(data.slotDuration as any)) {
    return `Duração do slot inválida: ${data.slotDuration}. Use: ${VALID_SLOT_DURATIONS.join(", ")}`
  }
  if (data.bufferBefore !== undefined && !VALID_BUFFER_VALUES.includes(data.bufferBefore as any)) {
    return `Buffer antes inválido: ${data.bufferBefore}. Use: ${VALID_BUFFER_VALUES.join(", ")}`
  }
  if (data.bufferAfter !== undefined && !VALID_BUFFER_VALUES.includes(data.bufferAfter as any)) {
    return `Buffer depois inválido: ${data.bufferAfter}. Use: ${VALID_BUFFER_VALUES.join(", ")}`
  }
  if (data.conflictWindow !== undefined && !VALID_CONFLICT_WINDOWS.includes(data.conflictWindow as any)) {
    return `Janela de conflito inválida: ${data.conflictWindow}. Use: ${VALID_CONFLICT_WINDOWS.join(", ")}`
  }
  if (data.maxBookingsPerDay !== undefined && data.maxBookingsPerDay !== null) {
    if (data.maxBookingsPerDay < 1 || data.maxBookingsPerDay > 100) {
      return "Máximo de agendamentos por dia deve ser entre 1 e 100"
    }
  }
  if (data.minNoticeMinutes !== undefined) {
    if (data.minNoticeMinutes < 0 || data.minNoticeMinutes > 1440) {
      return "Antecedência mínima deve ser entre 0 e 1440 minutos"
    }
  }
  if (data.operatingHours !== undefined) {
    const result = validateOperatingHours(data.operatingHours)
    if (result !== true) return result
  }
  return true
}
