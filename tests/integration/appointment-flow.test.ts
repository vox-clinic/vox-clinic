import { describe, it, expect, beforeEach, vi } from "vitest"

// Mocks must be imported before the modules under test
import { mockDb } from "@/test/mocks/db"
import { mockAuth } from "@/test/mocks/auth"
import "@/test/mocks/services"

import {
  scheduleAppointment,
  checkAppointmentConflicts,
  updateAppointmentStatus,
  getAppointments,
  rescheduleAppointment,
} from "@/server/actions/appointment"

// Standard workspace context
const WORKSPACE_ID = "ws_integration_123"
const CLERK_ID = "clerk_test_user_123"
const AGENDA_ID = "agenda_1"
const PATIENT_ID = "patient_1"

const mockUser = {
  id: "user_1",
  clerkId: CLERK_ID,
  workspace: { id: WORKSPACE_ID },
}

describe("Fluxo de consulta — ciclo de vida completo", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ userId: CLERK_ID })
    mockDb.user.findUnique.mockResolvedValue(mockUser)
    // Default: agenda and patient exist in workspace
    mockDb.agenda.findFirst.mockResolvedValue({ id: AGENDA_ID, workspaceId: WORKSPACE_ID })
    mockDb.patient.findFirst.mockResolvedValue({ id: PATIENT_ID, workspaceId: WORKSPACE_ID, name: "Maria Silva" })
    mockDb.workspace.findUnique.mockResolvedValue({ id: WORKSPACE_ID, plan: "pro" })
    // Advisory lock mock
    mockDb.$executeRawUnsafe.mockResolvedValue(undefined)
  })

  it("deve completar fluxo: agendar -> verificar conflitos -> completar -> cancelar", async () => {
    const appointmentDate = "2026-04-15T14:00:00.000Z"
    const appointmentId = "apt_1"

    // ─── STEP 1: Agendar consulta ────────────────────────────
    // No conflicts found during scheduling
    mockDb.appointment.findMany.mockResolvedValue([])
    mockDb.appointment.create.mockResolvedValue({
      id: appointmentId,
      workspaceId: WORKSPACE_ID,
      agendaId: AGENDA_ID,
      patientId: PATIENT_ID,
      date: new Date(appointmentDate),
      procedures: ["Limpeza"],
      notes: "Primeira consulta",
      status: "scheduled",
      patient: { id: PATIENT_ID, name: "Maria Silva" },
    })

    const scheduleResult = await scheduleAppointment({
      patientId: PATIENT_ID,
      date: appointmentDate,
      agendaId: AGENDA_ID,
      notes: "Primeira consulta",
      procedures: ["Limpeza"],
    })

    expect("error" in scheduleResult).toBe(false)
    if (!("error" in scheduleResult)) {
      expect(scheduleResult.id).toBe(appointmentId)
      expect(scheduleResult.status).toBe("scheduled")
      expect(scheduleResult.patient.name).toBe("Maria Silva")
    }

    // ─── STEP 2: Verificar conflitos no mesmo horario ────────
    // Now mock findMany to return the scheduled appointment as a conflict
    mockDb.appointment.findMany.mockResolvedValue([
      {
        id: appointmentId,
        date: new Date(appointmentDate),
        status: "scheduled",
        patient: { id: PATIENT_ID, name: "Maria Silva" },
      },
    ])
    mockDb.blockedSlot.findMany.mockResolvedValue([])

    const conflicts = await checkAppointmentConflicts(appointmentDate, AGENDA_ID)

    expect(conflicts.appointments).toHaveLength(1)
    expect(conflicts.appointments[0].id).toBe(appointmentId)
    expect(conflicts.appointments[0].patient.name).toBe("Maria Silva")

    // ─── STEP 3: Completar consulta ──────────────────────────
    mockDb.appointment.findFirst.mockResolvedValue({
      id: appointmentId,
      workspaceId: WORKSPACE_ID,
      agendaId: AGENDA_ID,
      status: "scheduled",
      price: null,
    })
    mockDb.appointment.update.mockResolvedValue({
      id: appointmentId,
      status: "completed",
    })

    const completeResult = await updateAppointmentStatus(appointmentId, "completed")
    expect("error" in completeResult).toBe(false)
    if (!("error" in completeResult)) {
      expect(completeResult.status).toBe("completed")
    }

    // ─── STEP 4: Verificar na listagem ───────────────────────
    mockDb.appointment.findMany.mockResolvedValue([
      {
        id: appointmentId,
        date: new Date(appointmentDate),
        patient: { id: PATIENT_ID, name: "Maria Silva" },
        procedures: ["Limpeza"],
        notes: "Primeira consulta",
        aiSummary: null,
        status: "completed",
        cidCodes: [],
      },
    ])
    mockDb.appointment.count.mockResolvedValue(1)

    const listResult = await getAppointments(1, "completed")
    expect(listResult.appointments).toHaveLength(1)
    expect(listResult.appointments[0].status).toBe("completed")
  })

  it("deve detectar conflito e permitir agendamento forcado", async () => {
    const appointmentDate = "2026-04-20T10:00:00.000Z"

    // ─── STEP 1: Agendar primeira consulta ───────────────────
    mockDb.appointment.findMany.mockResolvedValue([])
    mockDb.appointment.create.mockResolvedValue({
      id: "apt_first",
      date: new Date(appointmentDate),
      status: "scheduled",
      patient: { id: PATIENT_ID, name: "Maria Silva" },
      procedures: [],
      notes: null,
      workspaceId: WORKSPACE_ID,
      agendaId: AGENDA_ID,
      patientId: PATIENT_ID,
    })

    await scheduleAppointment({
      patientId: PATIENT_ID,
      date: appointmentDate,
      agendaId: AGENDA_ID,
    })

    // ─── STEP 2: Tentar agendar no mesmo horario — deve retornar conflito
    mockDb.appointment.findMany.mockResolvedValue([
      {
        id: "apt_first",
        date: new Date(appointmentDate),
        status: "scheduled",
        patient: { id: PATIENT_ID, name: "Maria Silva" },
      },
    ])

    const conflictResult = await scheduleAppointment({
      patientId: PATIENT_ID,
      date: appointmentDate,
      agendaId: AGENDA_ID,
    })

    expect("error" in conflictResult).toBe(true)
    if ("error" in conflictResult) {
      expect(conflictResult.error).toContain("CONFLICT:")
      expect(conflictResult.error).toContain("Maria Silva")
    }

    // ─── STEP 3: Forcar agendamento com forceSchedule ────────
    // findMany still returns existing appointment, but forceSchedule bypasses the check
    mockDb.appointment.create.mockResolvedValue({
      id: "apt_forced",
      date: new Date(appointmentDate),
      status: "scheduled",
      patient: { id: "patient_2", name: "Joao Santos" },
      procedures: ["Exame"],
      notes: null,
      workspaceId: WORKSPACE_ID,
      agendaId: AGENDA_ID,
      patientId: "patient_2",
    })
    mockDb.patient.findFirst.mockResolvedValue({ id: "patient_2", workspaceId: WORKSPACE_ID })

    const forcedResult = await scheduleAppointment({
      patientId: "patient_2",
      date: appointmentDate,
      agendaId: AGENDA_ID,
      procedures: ["Exame"],
      forceSchedule: true,
    })

    expect("error" in forcedResult).toBe(false)
    if (!("error" in forcedResult)) {
      expect(forcedResult.id).toBe("apt_forced")
    }
  })

  it("deve reagendar consulta e verificar novo horario", async () => {
    const originalDate = "2026-04-22T09:00:00.000Z"
    const newDate = "2026-04-23T15:00:00.000Z"
    const appointmentId = "apt_reschedule"

    // ─── STEP 1: Agendar consulta ────────────────────────────
    mockDb.appointment.findMany.mockResolvedValue([])
    mockDb.appointment.create.mockResolvedValue({
      id: appointmentId,
      date: new Date(originalDate),
      status: "scheduled",
      patient: { id: PATIENT_ID, name: "Maria Silva" },
      procedures: ["Limpeza"],
      notes: null,
      workspaceId: WORKSPACE_ID,
      agendaId: AGENDA_ID,
      patientId: PATIENT_ID,
    })

    await scheduleAppointment({
      patientId: PATIENT_ID,
      date: originalDate,
      agendaId: AGENDA_ID,
      procedures: ["Limpeza"],
    })

    // ─── STEP 2: Reagendar para novo horario ─────────────────
    mockDb.appointment.findFirst.mockResolvedValue({
      id: appointmentId,
      workspaceId: WORKSPACE_ID,
      agendaId: AGENDA_ID,
      status: "scheduled",
    })
    // No conflicts at new time
    mockDb.appointment.findMany.mockResolvedValue([])
    mockDb.appointment.update.mockResolvedValue({
      id: appointmentId,
      date: new Date(newDate),
    })

    const rescheduleResult = await rescheduleAppointment(appointmentId, newDate)
    expect("error" in rescheduleResult).toBe(false)
    if (!("error" in rescheduleResult)) {
      expect(rescheduleResult.id).toBe(appointmentId)
      expect(rescheduleResult.date).toBe(new Date(newDate).toISOString())
    }
  })

  it("deve cancelar consulta e verificar status invalido", async () => {
    const appointmentId = "apt_cancel"

    // ─── STEP 1: Agendar consulta ────────────────────────────
    mockDb.appointment.findMany.mockResolvedValue([])
    mockDb.appointment.create.mockResolvedValue({
      id: appointmentId,
      date: new Date("2026-04-25T11:00:00.000Z"),
      status: "scheduled",
      patient: { id: PATIENT_ID, name: "Maria Silva" },
      procedures: [],
      notes: null,
      workspaceId: WORKSPACE_ID,
      agendaId: AGENDA_ID,
      patientId: PATIENT_ID,
    })

    await scheduleAppointment({
      patientId: PATIENT_ID,
      date: "2026-04-25T11:00:00.000Z",
      agendaId: AGENDA_ID,
    })

    // ─── STEP 2: Cancelar consulta ──────────────────────────
    mockDb.appointment.findFirst.mockResolvedValue({
      id: appointmentId,
      workspaceId: WORKSPACE_ID,
      agendaId: AGENDA_ID,
      status: "scheduled",
      date: new Date("2026-04-25T11:00:00.000Z"),
    })
    mockDb.appointment.update.mockResolvedValue({
      id: appointmentId,
      status: "cancelled",
    })

    const cancelResult = await updateAppointmentStatus(appointmentId, "cancelled")
    expect("error" in cancelResult).toBe(false)
    if (!("error" in cancelResult)) {
      expect(cancelResult.status).toBe("cancelled")
    }

    // ─── STEP 3: Tentar status invalido ──────────────────────
    mockDb.appointment.findFirst.mockResolvedValue({
      id: appointmentId,
      workspaceId: WORKSPACE_ID,
    })

    const invalidResult = await updateAppointmentStatus(appointmentId, "invalid_status")
    expect("error" in invalidResult).toBe(true)
    if ("error" in invalidResult) {
      expect(invalidResult.error).toBe("Status inválido")
    }
  })

  it("deve rejeitar agendamento para paciente de outro workspace", async () => {
    mockDb.agenda.findFirst.mockResolvedValue({ id: AGENDA_ID, workspaceId: WORKSPACE_ID })
    mockDb.patient.findFirst.mockResolvedValue(null) // Patient not in this workspace

    const result = await scheduleAppointment({
      patientId: "patient_other_ws",
      date: "2026-05-01T10:00:00.000Z",
      agendaId: AGENDA_ID,
    })

    expect("error" in result).toBe(true)
  })
})
