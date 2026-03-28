import { describe, it, expect, beforeEach, vi } from "vitest"

// Mock env before anything else
vi.mock("@/lib/env", () => ({
  env: {
    DATABASE_URL: "postgresql://test",
    DIRECT_URL: "postgresql://test",
    ANTHROPIC_API_KEY: "test",
    OPENAI_API_KEY: "test",
    NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "test",
  },
}))

// Mocks must be imported before the modules under test
import { mockDb } from "@/test/mocks/db"
import { mockAuth } from "@/test/mocks/auth"
import { mockLogAudit } from "@/test/mocks/services"

import {
  createPrescription,
  getPrescription,
  getPatientPrescriptions,
  deletePrescription,
} from "@/server/actions/prescription"
import {
  ERR_PATIENT_NOT_FOUND,
  ERR_PRESCRIPTION_NOT_FOUND,
} from "@/lib/error-messages"

// Standard user/workspace mock
const WORKSPACE_ID = "ws_test_123"
const CLERK_ID = "clerk_test_user_123"
const mockUser = {
  id: "user_1",
  clerkId: CLERK_ID,
  clinicName: "Clinica Teste",
  profession: "dentista",
  name: "Dr. Teste",
  workspace: { id: WORKSPACE_ID },
  memberships: [],
}

const validMedications = [
  { name: "Amoxicilina", dosage: "500mg", frequency: "8/8h", duration: "7 dias", notes: "Tomar com agua" },
]

describe("prescription actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ userId: CLERK_ID })
    mockDb.user.findUnique.mockResolvedValue(mockUser)
  })

  // ─── createPrescription ──────────────────────────────────────
  describe("createPrescription", () => {
    it("creates prescription with workspaceId and returns id+source", async () => {
      mockDb.patient.findFirst.mockResolvedValue({ id: "p1", workspaceId: WORKSPACE_ID })
      mockDb.prescription.create.mockResolvedValue({ id: "rx_1", source: "manual" })

      const result = await createPrescription({
        patientId: "p1",
        medications: validMedications,
        notes: "Uso oral",
      })

      expect(result).toEqual({ id: "rx_1", source: "manual" })
      expect(mockDb.prescription.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          patientId: "p1",
          workspaceId: WORKSPACE_ID,
          medications: validMedications,
          notes: "Uso oral",
          source: "manual",
          appointmentId: null,
        }),
      })
    })

    it("returns error when no medications provided", async () => {
      mockDb.patient.findFirst.mockResolvedValue({ id: "p1", workspaceId: WORKSPACE_ID })

      const result = await createPrescription({
        patientId: "p1",
        medications: [],
      })

      expect(result).toHaveProperty("error")
      if ("error" in result) {
        expect(result.error).toBe("Adicione pelo menos um medicamento")
      }
    })

    it("returns error when medication name is empty", async () => {
      mockDb.patient.findFirst.mockResolvedValue({ id: "p1", workspaceId: WORKSPACE_ID })

      const result = await createPrescription({
        patientId: "p1",
        medications: [{ name: "  ", dosage: "500mg", frequency: "8/8h", duration: "7 dias" }],
      })

      expect(result).toHaveProperty("error")
      if ("error" in result) {
        expect(result.error).toBe("Nome do medicamento é obrigatório.")
      }
    })

    it("returns error when duration is empty", async () => {
      mockDb.patient.findFirst.mockResolvedValue({ id: "p1", workspaceId: WORKSPACE_ID })

      const result = await createPrescription({
        patientId: "p1",
        medications: [{ name: "Amoxicilina", dosage: "500mg", frequency: "8/8h", duration: "" }],
      })

      expect(result).toHaveProperty("error")
      if ("error" in result) {
        expect(result.error).toBe("Duração é obrigatória para cada medicamento.")
      }
    })

    it("returns error when patient not found in workspace", async () => {
      mockDb.patient.findFirst.mockResolvedValue(null)

      const result = await createPrescription({
        patientId: "p_nonexistent",
        medications: validMedications,
      })

      expect(result).toHaveProperty("error")
      if ("error" in result) {
        expect(result.error).toBe(ERR_PATIENT_NOT_FOUND)
      }
    })

    it("returns error when appointmentId belongs to different workspace", async () => {
      mockDb.patient.findFirst.mockResolvedValue({ id: "p1", workspaceId: WORKSPACE_ID })
      mockDb.appointment.findFirst.mockResolvedValue(null)

      const result = await createPrescription({
        patientId: "p1",
        appointmentId: "apt_other_ws",
        medications: validMedications,
      })

      expect(result).toHaveProperty("error")
      if ("error" in result) {
        expect(result.error).toBe("Consulta nao encontrada neste workspace.")
      }
    })

    it("wraps create and audit in $transaction", async () => {
      mockDb.patient.findFirst.mockResolvedValue({ id: "p1", workspaceId: WORKSPACE_ID })
      mockDb.prescription.create.mockResolvedValue({ id: "rx_1", source: "manual" })

      await createPrescription({
        patientId: "p1",
        medications: validMedications,
      })

      expect(mockDb.$transaction).toHaveBeenCalledTimes(1)
      expect(mockDb.prescription.create).toHaveBeenCalled()
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: WORKSPACE_ID,
          action: "prescription.created",
          entityType: "Prescription",
          entityId: "rx_1",
        })
      )
    })
  })

  // ─── deletePrescription ──────────────────────────────────────
  describe("deletePrescription", () => {
    it("deletes prescription and logs audit", async () => {
      mockDb.prescription.findFirst.mockResolvedValue({ id: "rx_1", workspaceId: WORKSPACE_ID })
      mockDb.prescription.delete.mockResolvedValue({ id: "rx_1" })

      const result = await deletePrescription("rx_1")

      expect(result).toEqual({ success: true })
      expect(mockDb.prescription.delete).toHaveBeenCalledWith({ where: { id: "rx_1" } })
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: WORKSPACE_ID,
          action: "prescription.deleted",
          entityType: "Prescription",
          entityId: "rx_1",
        })
      )
    })

    it("returns error when prescription not found", async () => {
      mockDb.prescription.findFirst.mockResolvedValue(null)

      const result = await deletePrescription("rx_nonexistent")

      expect(result).toHaveProperty("error")
      if ("error" in result) {
        expect(result.error).toBe(ERR_PRESCRIPTION_NOT_FOUND)
      }
    })
  })

  // ─── getPrescription ─────────────────────────────────────────
  describe("getPrescription", () => {
    it("throws when prescription not found", async () => {
      mockDb.prescription.findFirst.mockResolvedValue(null)

      await expect(getPrescription("rx_bad")).rejects.toThrow(ERR_PRESCRIPTION_NOT_FOUND)
    })
  })

  // ─── getPatientPrescriptions ──────────────────────────────────
  describe("getPatientPrescriptions", () => {
    it("throws when patient not found", async () => {
      mockDb.patient.findFirst.mockResolvedValue(null)

      await expect(getPatientPrescriptions("p_bad")).rejects.toThrow(ERR_PATIENT_NOT_FOUND)
    })
  })
})
