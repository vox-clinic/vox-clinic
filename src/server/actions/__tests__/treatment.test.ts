import { describe, it, expect, beforeEach, vi } from "vitest"

import { mockDb } from "@/test/mocks/db"
import { mockAuth } from "@/test/mocks/auth"
import { mockLogAudit } from "@/test/mocks/services"

import {
  getTreatmentPlans,
  createTreatmentPlan,
  addSessionToTreatment,
  updateTreatmentPlanStatus,
  deleteTreatmentPlan,
} from "@/server/actions/treatment"

const WORKSPACE_ID = "ws_test_123"
const CLERK_ID = "clerk_test_user_123"
const mockUser = {
  id: "user_1",
  clerkId: CLERK_ID,
  workspace: { id: WORKSPACE_ID },
}

describe("treatment actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ userId: CLERK_ID })
    mockDb.user.findUnique.mockResolvedValue(mockUser)
  })

  // ─── getTreatmentPlans ───────────────────────────────────────
  describe("getTreatmentPlans", () => {
    it("returns plans for patient scoped to workspace", async () => {
      mockDb.patient.findFirst.mockResolvedValue({ id: "p1", workspaceId: WORKSPACE_ID })
      const plans = [
        {
          id: "tp1", name: "Ortodontia", procedures: ["Aparelho"],
          totalSessions: 12, completedSessions: 3, status: "active",
          notes: "Ajuste mensal", startDate: new Date("2024-01-15"),
          estimatedEndDate: new Date("2025-01-15"), completedAt: null,
          createdAt: new Date("2024-01-15"),
        },
      ]
      mockDb.treatmentPlan.findMany.mockResolvedValue(plans)

      const result = await getTreatmentPlans("p1")

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe("tp1")
      expect(result[0].name).toBe("Ortodontia")
      expect(result[0].totalSessions).toBe(12)
      expect(result[0].completedSessions).toBe(3)

      // Verify workspace scoping
      expect(mockDb.treatmentPlan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { patientId: "p1", workspaceId: WORKSPACE_ID },
        })
      )
    })

    it("throws when patient not in workspace", async () => {
      mockDb.patient.findFirst.mockResolvedValue(null)

      await expect(getTreatmentPlans("p_other")).rejects.toThrow("Paciente nao encontrado")
    })
  })

  // ─── createTreatmentPlan ─────────────────────────────────────
  describe("createTreatmentPlan", () => {
    it("creates plan with workspaceId and logs audit", async () => {
      mockDb.patient.findFirst.mockResolvedValue({ id: "p1", workspaceId: WORKSPACE_ID })
      mockDb.treatmentPlan.create.mockResolvedValue({ id: "tp_new" })

      const result = await createTreatmentPlan({
        patientId: "p1",
        name: "Clareamento",
        procedures: ["Clareamento a laser"],
        totalSessions: 3,
        notes: "Sessoes quinzenais",
      })

      expect(result.id).toBe("tp_new")
      expect(mockDb.treatmentPlan.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workspaceId: WORKSPACE_ID,
          patientId: "p1",
          name: "Clareamento",
          totalSessions: 3,
        }),
      })
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "treatmentPlan.created",
          entityId: "tp_new",
        })
      )
    })

    it("validates totalSessions >= 1", async () => {
      mockDb.patient.findFirst.mockResolvedValue({ id: "p1", workspaceId: WORKSPACE_ID })

      await expect(
        createTreatmentPlan({
          patientId: "p1",
          name: "Invalid Plan",
          procedures: [],
          totalSessions: 0,
        })
      ).rejects.toThrow("Total de sessoes deve ser pelo menos 1")
    })

    it("throws when patient not in workspace", async () => {
      mockDb.patient.findFirst.mockResolvedValue(null)

      await expect(
        createTreatmentPlan({
          patientId: "p_other",
          name: "Test",
          procedures: [],
          totalSessions: 1,
        })
      ).rejects.toThrow("Paciente nao encontrado")
    })
  })

  // ─── addSessionToTreatment ───────────────────────────────────
  describe("addSessionToTreatment", () => {
    it("increments completedSessions", async () => {
      mockDb.$queryRawUnsafe.mockResolvedValue([
        { id: "tp1", completedSessions: 2, totalSessions: 5, status: "active" },
      ])
      mockDb.treatmentPlan.update.mockResolvedValue({
        id: "tp1", completedSessions: 3, totalSessions: 5, status: "active",
      })

      const result = await addSessionToTreatment("tp1")

      expect(result.completedSessions).toBe(3)
      expect(result.status).toBe("active")
      expect(mockDb.$transaction).toHaveBeenCalled()
    })

    it("auto-completes when all sessions done", async () => {
      mockDb.$queryRawUnsafe.mockResolvedValue([
        { id: "tp1", completedSessions: 4, totalSessions: 5, status: "active" },
      ])
      mockDb.treatmentPlan.update.mockResolvedValue({
        id: "tp1", completedSessions: 5, totalSessions: 5, status: "completed",
      })

      const result = await addSessionToTreatment("tp1")

      expect(result.status).toBe("completed")
      // Verify update call set status to completed and completedAt
      expect(mockDb.treatmentPlan.update).toHaveBeenCalledWith({
        where: { id: "tp1" },
        data: expect.objectContaining({
          completedSessions: 5,
          status: "completed",
          completedAt: expect.any(Date),
        }),
      })
    })

    it("rejects when plan not active", async () => {
      mockDb.$queryRawUnsafe.mockResolvedValue([
        { id: "tp1", completedSessions: 3, totalSessions: 5, status: "paused" },
      ])

      await expect(addSessionToTreatment("tp1")).rejects.toThrow("Plano nao esta ativo")
    })

    it("rejects when all sessions already completed", async () => {
      mockDb.$queryRawUnsafe.mockResolvedValue([
        { id: "tp1", completedSessions: 5, totalSessions: 5, status: "active" },
      ])

      await expect(addSessionToTreatment("tp1")).rejects.toThrow("Todas as sessoes ja foram concluidas")
    })

    it("throws when plan not found", async () => {
      mockDb.$queryRawUnsafe.mockResolvedValue([])

      await expect(addSessionToTreatment("tp_missing")).rejects.toThrow("Plano de tratamento nao encontrado")
    })

    it("logs audit with session details", async () => {
      mockDb.$queryRawUnsafe.mockResolvedValue([
        { id: "tp1", completedSessions: 2, totalSessions: 5, status: "active" },
      ])
      mockDb.treatmentPlan.update.mockResolvedValue({
        id: "tp1", completedSessions: 3, totalSessions: 5, status: "active",
      })

      await addSessionToTreatment("tp1")

      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "treatmentPlan.sessionAdded",
          details: { completedSessions: 3, totalSessions: 5 },
        })
      )
    })
  })

  // ─── updateTreatmentPlanStatus ───────────────────────────────
  describe("updateTreatmentPlanStatus", () => {
    it.each(["active", "completed", "cancelled", "paused"])("accepts status '%s'", async (status) => {
      mockDb.treatmentPlan.findFirst.mockResolvedValue({ id: "tp1", status: "active", workspaceId: WORKSPACE_ID })
      mockDb.treatmentPlan.update.mockResolvedValue({ id: "tp1", status })

      const result = await updateTreatmentPlanStatus("tp1", status)
      expect(result.status).toBe(status)
    })

    it("rejects invalid status", async () => {
      await expect(updateTreatmentPlanStatus("tp1", "invalid")).rejects.toThrow("Status invalido")
    })

    it("sets completedAt when status is completed", async () => {
      mockDb.treatmentPlan.findFirst.mockResolvedValue({ id: "tp1", status: "active", workspaceId: WORKSPACE_ID })
      mockDb.treatmentPlan.update.mockResolvedValue({ id: "tp1", status: "completed" })

      await updateTreatmentPlanStatus("tp1", "completed")

      expect(mockDb.treatmentPlan.update).toHaveBeenCalledWith({
        where: { id: "tp1" },
        data: expect.objectContaining({
          status: "completed",
          completedAt: expect.any(Date),
        }),
      })
    })

    it("clears completedAt when status is not completed", async () => {
      mockDb.treatmentPlan.findFirst.mockResolvedValue({ id: "tp1", status: "completed", workspaceId: WORKSPACE_ID })
      mockDb.treatmentPlan.update.mockResolvedValue({ id: "tp1", status: "active" })

      await updateTreatmentPlanStatus("tp1", "active")

      expect(mockDb.treatmentPlan.update).toHaveBeenCalledWith({
        where: { id: "tp1" },
        data: expect.objectContaining({
          status: "active",
          completedAt: null,
        }),
      })
    })

    it("throws when plan not found", async () => {
      mockDb.treatmentPlan.findFirst.mockResolvedValue(null)

      await expect(updateTreatmentPlanStatus("tp_missing", "active")).rejects.toThrow(
        "Plano de tratamento nao encontrado"
      )
    })

    it("logs audit with from/to status", async () => {
      mockDb.treatmentPlan.findFirst.mockResolvedValue({ id: "tp1", status: "active", workspaceId: WORKSPACE_ID })
      mockDb.treatmentPlan.update.mockResolvedValue({ id: "tp1", status: "paused" })

      await updateTreatmentPlanStatus("tp1", "paused")

      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "treatmentPlan.statusChanged",
          details: { from: "active", to: "paused" },
        })
      )
    })
  })

  // ─── deleteTreatmentPlan ─────────────────────────────────────
  describe("deleteTreatmentPlan", () => {
    it("removes plan that belongs to workspace", async () => {
      mockDb.treatmentPlan.findFirst.mockResolvedValue({ id: "tp1", workspaceId: WORKSPACE_ID })
      mockDb.treatmentPlan.delete.mockResolvedValue({ id: "tp1" })

      const result = await deleteTreatmentPlan("tp1")

      expect(result).toEqual({ success: true })
      expect(mockDb.treatmentPlan.delete).toHaveBeenCalledWith({ where: { id: "tp1" } })
    })

    it("throws when plan not found in workspace", async () => {
      mockDb.treatmentPlan.findFirst.mockResolvedValue(null)

      await expect(deleteTreatmentPlan("tp_missing")).rejects.toThrow("Plano de tratamento nao encontrado")
    })

    it("logs audit after deletion", async () => {
      mockDb.treatmentPlan.findFirst.mockResolvedValue({ id: "tp1", workspaceId: WORKSPACE_ID })
      mockDb.treatmentPlan.delete.mockResolvedValue({ id: "tp1" })

      await deleteTreatmentPlan("tp1")

      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "treatmentPlan.deleted",
          entityType: "TreatmentPlan",
          entityId: "tp1",
        })
      )
    })
  })
})
