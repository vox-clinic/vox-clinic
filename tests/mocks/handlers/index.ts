import { patientHandlers } from "./patient.handlers"
import { appointmentHandlers } from "./appointment.handlers"
import { medicationHandlers } from "./medication.handlers"

export const handlers = [
  ...patientHandlers,
  ...appointmentHandlers,
  ...medicationHandlers,
]
