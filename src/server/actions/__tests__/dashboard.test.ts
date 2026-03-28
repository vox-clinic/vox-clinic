import { describe, it, expect, beforeEach, vi } from "vitest"

// Mocks must be imported before the modules under test
import { mockDb } from "@/test/mocks/db"
import { mockAuth } from "@/test/mocks/auth"
import "@/test/mocks/services"

vi.mock("@/lib/cache", () => ({ cached: vi.fn((_k: string, _t: number, fn: () => unknown) => fn()), invalidate: vi.fn() }))

import { getDashboardData } from "@/server/actions/dashboard"
import {
  ERR_UNAUTHORIZED,
  ERR_WORKSPACE_NOT_FOUND,
} from "@/lib/error-messages"

const WORKSPACE_ID = "ws_test_123"
const CLERK_ID = "clerk_test_user_123"
const mockUser = {
  id: "user_1",
  clerkId: CLERK_ID,
  clinicName: "Clinica Teste",
  profession: "Dentista",
  workspace: { id: WORKSPACE_ID, professionType: "Odontologia" },
  memberships: [],
}

describe("dashboard actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ userId: CLERK_ID })
    mockDb.user.findUnique.mockResolvedValue(mockUser)
  })

  // ─── getDashboardData ────────────────────────────────────────
  describe("getDashboardData", () => {
    it("retorna dados do dashboard com sucesso", async () => {
      const mockPatients = [
        { id: "p1", name: "Maria Silva", appointments: [{ date: new Date("2024-06-01") }] },
        { id: "p2", name: "Joao Santos", appointments: [] },
      ]
      const mockTodayAppointments = [
        {
          id: "a1",
          date: new Date(),
          status: "scheduled",
          procedures: ["Limpeza"],
          notes: "Retorno",
          patient: { id: "p1", name: "Maria Silva" },
          agenda: { id: "ag1", name: "Agenda Principal", color: "#14B8A6" },
        },
      ]
      const mockRecentAppointments = [
        {
          id: "a2",
          date: new Date(),
          status: "completed",
          procedures: ["Consulta"],
          patient: { id: "p2", name: "Joao Santos" },
        },
      ]

      mockDb.patient.findMany.mockResolvedValue(mockPatients)
      mockDb.patient.count.mockResolvedValue(15)
      mockDb.appointment.count
        .mockResolvedValueOnce(8) // monthlyAppointments
        .mockResolvedValueOnce(5) // lastMonthAppointments
        .mockResolvedValueOnce(3) // scheduledAppointments
      mockDb.appointment.findMany
        .mockResolvedValueOnce(mockTodayAppointments) // todayAppointments
        .mockResolvedValueOnce(mockRecentAppointments) // recentAppointments
      mockDb.recording.count.mockResolvedValue(10)

      const result = await getDashboardData()

      expect(result.clinicName).toBe("Clinica Teste")
      expect(result.profession).toBe("Dentista")
      expect(result.totalPatients).toBe(15)
      expect(result.monthlyAppointments).toBe(8)
      expect(result.lastMonthAppointments).toBe(5)
      expect(result.scheduledAppointments).toBe(3)
      expect(result.totalRecordings).toBe(10)
      expect(result.recentPatients).toHaveLength(2)
      expect(result.recentPatients[0]).toEqual({
        id: "p1",
        name: "Maria Silva",
        lastAppointment: new Date("2024-06-01"),
      })
      expect(result.recentPatients[1]).toEqual({
        id: "p2",
        name: "Joao Santos",
        lastAppointment: null,
      })
      expect(result.todayAppointments).toHaveLength(1)
      expect(result.todayAppointments[0].patient.name).toBe("Maria Silva")
      expect(result.recentAppointments).toHaveLength(1)

      // Verifica escopo por workspaceId
      const patientFindMany = mockDb.patient.findMany.mock.calls[0][0]
      expect(patientFindMany.where.workspaceId).toBe(WORKSPACE_ID)
    })

    it("lanca erro quando nao autenticado", async () => {
      mockAuth.mockResolvedValue({ userId: null })

      await expect(getDashboardData()).rejects.toThrow(ERR_UNAUTHORIZED)
    })

    it("lanca erro quando workspace nao encontrado", async () => {
      mockDb.user.findUnique.mockResolvedValue({
        id: "user_1",
        clerkId: CLERK_ID,
        workspace: null,
        memberships: [],
      })

      await expect(getDashboardData()).rejects.toThrow(ERR_WORKSPACE_NOT_FOUND)
    })

    it("usa workspaceId da membership quando usuario nao e dono", async () => {
      mockDb.user.findUnique.mockResolvedValue({
        id: "user_1",
        clerkId: CLERK_ID,
        clinicName: "Clinica Membro",
        profession: "Fisioterapeuta",
        workspace: null,
        memberships: [{ workspaceId: "ws_member_456" }],
      })
      mockDb.workspace.findUnique.mockResolvedValue({ professionType: "Fisioterapia" })

      // Stub all DB calls used by fetchDashboardData
      mockDb.patient.findMany.mockResolvedValue([])
      mockDb.patient.count.mockResolvedValue(0)
      mockDb.appointment.count.mockResolvedValue(0)
      mockDb.appointment.findMany.mockResolvedValue([])
      mockDb.recording.count.mockResolvedValue(0)

      const result = await getDashboardData()

      expect(result.clinicName).toBe("Clinica Membro")
      expect(result.profession).toBe("Fisioterapeuta")
      // Verifica que buscou professionType do workspace via fallback
      expect(mockDb.workspace.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "ws_member_456" } })
      )
    })
  })
})
