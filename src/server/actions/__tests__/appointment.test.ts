import { describe, it, expect, beforeEach, vi } from "vitest"

import { mockDb } from "@/test/mocks/db"
import { mockAuth } from "@/test/mocks/auth"
import "@/test/mocks/services"

import {
  getAppointmentsByDateRange,
  scheduleAppointment,
  updateAppointmentStatus,
  deleteAppointment,
  checkAppointmentConflicts,
  rescheduleAppointment,
} from "@/server/actions/appointment"

const WORKSPACE_ID = "ws_test_123"
const CLERK_ID = "clerk_test_user_123"
const mockUser = {
  id: "user_1",
  clerkId: CLERK_ID,
  workspace: { id: WORKSPACE_ID },
}

describe("appointment actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ userId: CLERK_ID })
    mockDb.user.findUnique.mockResolvedValue(mockUser)
  })

  // ─── getAppointmentsByDateRange ──────────────────────────────
  describe("getAppointmentsByDateRange", () => {
    it("filters by workspace and date range", async () => {
      const appointments = [
        {
          id: "a1", date: new Date("2024-06-15T10:00:00Z"),
          patient: { id: "p1", name: "Maria" },
          procedures: ["Limpeza"], notes: "OK", status: "scheduled",
        },
      ]
      mockDb.appointment.findMany.mockResolvedValue(appointments)

      const result = await getAppointmentsByDateRange("2024-06-15T00:00:00Z", "2024-06-15T23:59:59Z")

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe("a1")

      const call = mockDb.appointment.findMany.mock.calls[0][0]
      expect(call.where.workspaceId).toBe(WORKSPACE_ID)
      expect(call.where.date.gte).toBeInstanceOf(Date)
      expect(call.where.date.lte).toBeInstanceOf(Date)
    })

    it("throws Unauthorized when not authenticated", async () => {
      mockAuth.mockResolvedValue({ userId: null })
      await expect(getAppointmentsByDateRange("2024-06-15", "2024-06-16")).rejects.toThrow("Unauthorized")
    })
  })

  // ─── checkAppointmentConflicts ───────────────────────────────
  describe("checkAppointmentConflicts", () => {
    it("checks +-30min window for conflicts", async () => {
      mockDb.appointment.findMany.mockResolvedValue([])

      const result = await checkAppointmentConflicts("2024-06-15T10:00:00Z")

      expect(result).toEqual([])
      const call = mockDb.appointment.findMany.mock.calls[0][0]
      expect(call.where.workspaceId).toBe(WORKSPACE_ID)
      expect(call.where.status).toEqual({ in: ["scheduled", "completed"] })
      // Verify the window is +/- 30 minutes
      const target = new Date("2024-06-15T10:00:00Z").getTime()
      expect(call.where.date.gte.getTime()).toBe(target - 30 * 60 * 1000)
      expect(call.where.date.lte.getTime()).toBe(target + 30 * 60 * 1000)
    })
  })

  // ─── scheduleAppointment ─────────────────────────────────────
  describe("scheduleAppointment", () => {
    it("creates appointment when no conflicts", async () => {
      mockDb.patient.findFirst.mockResolvedValue({ id: "p1", workspaceId: WORKSPACE_ID })
      // Transaction mock: tx has the same methods as mockDb
      mockDb.$queryRawUnsafe.mockResolvedValue(undefined)
      mockDb.appointment.findMany.mockResolvedValue([]) // no conflicts
      const createdAppointment = {
        id: "a_new", date: new Date("2024-06-15T10:00:00Z"),
        patient: { id: "p1", name: "Maria" },
        procedures: ["Limpeza"], notes: null, status: "scheduled",
      }
      mockDb.appointment.create.mockResolvedValue(createdAppointment)

      const result = await scheduleAppointment({
        patientId: "p1",
        date: "2024-06-15T10:00:00Z",
        procedures: ["Limpeza"],
      })

      expect(result.id).toBe("a_new")
      expect(result.status).toBe("scheduled")
      expect(mockDb.$transaction).toHaveBeenCalled()
    })

    it("rejects with CONFLICT: prefix when overlap found", async () => {
      mockDb.patient.findFirst.mockResolvedValue({ id: "p1", workspaceId: WORKSPACE_ID })
      mockDb.$queryRawUnsafe.mockResolvedValue(undefined)
      mockDb.appointment.findMany.mockResolvedValue([
        { id: "a_existing", patient: { id: "p2", name: "Joao" }, date: new Date(), status: "scheduled" },
      ])

      await expect(
        scheduleAppointment({ patientId: "p1", date: "2024-06-15T10:00:00Z" })
      ).rejects.toThrow(/^CONFLICT:/)
    })

    it("allows override with forceSchedule:true", async () => {
      mockDb.patient.findFirst.mockResolvedValue({ id: "p1", workspaceId: WORKSPACE_ID })
      mockDb.$queryRawUnsafe.mockResolvedValue(undefined)
      const createdAppointment = {
        id: "a_forced", date: new Date("2024-06-15T10:00:00Z"),
        patient: { id: "p1", name: "Maria" },
        procedures: [], notes: null, status: "scheduled",
      }
      mockDb.appointment.create.mockResolvedValue(createdAppointment)

      const result = await scheduleAppointment({
        patientId: "p1",
        date: "2024-06-15T10:00:00Z",
        forceSchedule: true,
      })

      expect(result.id).toBe("a_forced")
      // Should not check for conflicts
      expect(mockDb.appointment.findMany).not.toHaveBeenCalled()
    })

    it("throws when patient not in workspace", async () => {
      mockDb.patient.findFirst.mockResolvedValue(null)

      await expect(
        scheduleAppointment({ patientId: "p_other", date: "2024-06-15T10:00:00Z" })
      ).rejects.toThrow("Paciente nao encontrado")
    })
  })

  // ─── updateAppointmentStatus ─────────────────────────────────
  describe("updateAppointmentStatus", () => {
    it("updates status for valid values", async () => {
      mockDb.appointment.findFirst.mockResolvedValue({ id: "a1", workspaceId: WORKSPACE_ID })
      mockDb.appointment.update.mockResolvedValue({ id: "a1", status: "completed" })

      const result = await updateAppointmentStatus("a1", "completed")

      expect(result.status).toBe("completed")
      expect(mockDb.appointment.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "a1", workspaceId: WORKSPACE_ID } })
      )
    })

    it.each(["scheduled", "completed", "cancelled", "no_show"])("accepts status '%s'", async (status) => {
      mockDb.appointment.findFirst.mockResolvedValue({ id: "a1", workspaceId: WORKSPACE_ID })
      mockDb.appointment.update.mockResolvedValue({ id: "a1", status })

      const result = await updateAppointmentStatus("a1", status)
      expect(result.status).toBe(status)
    })

    it("rejects invalid status", async () => {
      await expect(updateAppointmentStatus("a1", "invalid_status")).rejects.toThrow("Status invalido")
    })

    it("throws when appointment not in workspace", async () => {
      mockDb.appointment.findFirst.mockResolvedValue(null)

      await expect(updateAppointmentStatus("a_other", "completed")).rejects.toThrow("Consulta nao encontrada")
    })
  })

  // ─── deleteAppointment ───────────────────────────────────────
  describe("deleteAppointment", () => {
    it("removes appointment that belongs to workspace", async () => {
      mockDb.appointment.findFirst.mockResolvedValue({ id: "a1", workspaceId: WORKSPACE_ID })
      mockDb.appointment.delete.mockResolvedValue({ id: "a1" })

      const result = await deleteAppointment("a1")

      expect(result).toEqual({ success: true })
      expect(mockDb.appointment.delete).toHaveBeenCalledWith({ where: { id: "a1" } })
    })

    it("throws when appointment not found", async () => {
      mockDb.appointment.findFirst.mockResolvedValue(null)

      await expect(deleteAppointment("a_missing")).rejects.toThrow("Consulta nao encontrada")
    })
  })

  // ─── rescheduleAppointment ───────────────────────────────────
  describe("rescheduleAppointment", () => {
    it("updates the appointment date", async () => {
      mockDb.appointment.findFirst.mockResolvedValue({ id: "a1", workspaceId: WORKSPACE_ID })
      const newDate = new Date("2024-07-01T14:00:00Z")
      mockDb.appointment.update.mockResolvedValue({ id: "a1", date: newDate })

      const result = await rescheduleAppointment("a1", "2024-07-01T14:00:00Z")

      expect(result.id).toBe("a1")
      expect(result.date).toBe(newDate.toISOString())
    })

    it("throws when appointment not in workspace", async () => {
      mockDb.appointment.findFirst.mockResolvedValue(null)

      await expect(rescheduleAppointment("a_other", "2024-07-01T14:00:00Z")).rejects.toThrow("Consulta nao encontrada")
    })
  })
})
