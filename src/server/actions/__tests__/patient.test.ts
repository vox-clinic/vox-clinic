import { describe, it, expect, beforeEach, vi } from "vitest"

// Mocks must be imported before the modules under test
import { mockDb } from "@/test/mocks/db"
import { mockAuth } from "@/test/mocks/auth"
import "@/test/mocks/services"

import {
  getPatients,
  getPatient,
  createPatient,
  updatePatient,
  deactivatePatient,
  searchPatients,
  getAudioPlaybackUrl,
} from "@/server/actions/patient"
import {
  ERR_UNAUTHORIZED,
  ERR_WORKSPACE_NOT_CONFIGURED,
  ERR_PATIENT_NOT_FOUND,
} from "@/lib/error-messages"

// Standard user/workspace mock
const WORKSPACE_ID = "ws_test_123"
const CLERK_ID = "clerk_test_user_123"
const mockUser = {
  id: "user_1",
  clerkId: CLERK_ID,
  workspace: { id: WORKSPACE_ID, procedures: [{ name: "Limpeza" }], customFields: [] },
}

describe("patient actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ userId: CLERK_ID })
    mockDb.user.findUnique.mockResolvedValue(mockUser)
  })

  // ─── getPatients ─────────────────────────────────────────────
  describe("getPatients", () => {
    it("returns paginated patients filtered by workspaceId and isActive:true", async () => {
      const patients = [
        {
          id: "p1", name: "Maria Silva", phone: "11999990000", document: "12345678900",
          email: "maria@test.com", alerts: [], appointments: [{ date: new Date("2024-01-15") }],
        },
      ]
      mockDb.patient.findMany.mockResolvedValue(patients)
      mockDb.patient.count.mockResolvedValue(1)

      const result = await getPatients(undefined, 1, 20)

      expect(result.patients).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.totalPages).toBe(1)
      expect(result.page).toBe(1)

      // Verify workspaceId scoping
      const findManyCall = mockDb.patient.findMany.mock.calls[0][0]
      expect(findManyCall.where.workspaceId).toBe(WORKSPACE_ID)
      expect(findManyCall.where.isActive).toBe(true)
    })

    it("applies search query to name, phone, and document", async () => {
      mockDb.patient.findMany.mockResolvedValue([])
      mockDb.patient.count.mockResolvedValue(0)

      await getPatients("Maria", 1, 20)

      const findManyCall = mockDb.patient.findMany.mock.calls[0][0]
      expect(findManyCall.where.OR).toBeDefined()
      expect(findManyCall.where.OR).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: { contains: "Maria", mode: "insensitive" } }),
        ])
      )
    })

    it("throws Unauthorized when not authenticated", async () => {
      mockAuth.mockResolvedValue({ userId: null })

      await expect(getPatients()).rejects.toThrow(ERR_UNAUTHORIZED)
    })

    it("throws when workspace not configured", async () => {
      mockDb.user.findUnique.mockResolvedValue({ id: "u1", clerkId: CLERK_ID, workspace: null })

      await expect(getPatients()).rejects.toThrow(ERR_WORKSPACE_NOT_CONFIGURED)
    })
  })

  // ─── getPatient ──────────────────────────────────────────────
  describe("getPatient", () => {
    it("returns single patient with appointments and recordings", async () => {
      const patient = {
        id: "p1", name: "Maria Silva", document: "12345678900",
        phone: "11999990000", email: "maria@test.com", birthDate: null,
        customData: {}, alerts: [], createdAt: new Date(),
        appointments: [{
          id: "a1", date: new Date(), procedures: ["Limpeza"],
          notes: "OK", aiSummary: null, status: "completed",
          recordings: [{ id: "r1", duration: 120, createdAt: new Date(), status: "processed" }],
        }],
        recordings: [{ id: "r1", audioUrl: "audio/test.webm", duration: 120, transcript: "test", createdAt: new Date(), status: "processed" }],
      }
      mockDb.patient.findFirst.mockResolvedValue(patient)

      const result = await getPatient("p1")

      expect(result.id).toBe("p1")
      expect(result.appointments).toHaveLength(1)
      expect(result.recordings).toHaveLength(1)

      // Verify scoped by workspaceId
      expect(mockDb.patient.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "p1", workspaceId: WORKSPACE_ID } })
      )
    })

    it("throws when patient not found", async () => {
      mockDb.patient.findFirst.mockResolvedValue(null)

      await expect(getPatient("nonexistent")).rejects.toThrow(ERR_PATIENT_NOT_FOUND)
    })
  })

  // ─── createPatient ───────────────────────────────────────────
  describe("createPatient", () => {
    it("creates patient with workspaceId and logs audit", async () => {
      const newPatient = { id: "p_new", name: "Joao Santos" }
      mockDb.patient.create.mockResolvedValue(newPatient)

      const formData = new FormData()
      formData.set("name", "Joao Santos")
      formData.set("document", "52998224725")
      formData.set("phone", "11999990000")

      const result = await createPatient(formData)

      expect(result).toEqual({ patientId: "p_new" })
      expect(mockDb.patient.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workspaceId: WORKSPACE_ID,
          name: "Joao Santos",
          document: "52998224725",
          phone: "11999990000",
        }),
      })
    })

    it("throws when name is empty", async () => {
      const formData = new FormData()
      formData.set("name", "  ")

      await expect(createPatient(formData)).rejects.toThrow("Nome e obrigatorio")
    })

    it("parses customData JSON from FormData", async () => {
      mockDb.patient.create.mockResolvedValue({ id: "p_new" })

      const formData = new FormData()
      formData.set("name", "Test Patient")
      formData.set("customData", JSON.stringify({ alergias: "penicilina" }))

      const result = await createPatient(formData)

      expect(result).toEqual({ patientId: "p_new" })
      expect(mockDb.patient.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          customData: { alergias: "penicilina" },
        }),
      })
    })
  })

  // ─── updatePatient ───────────────────────────────────────────
  describe("updatePatient", () => {
    it("updates patient fields and logs audit", async () => {
      mockDb.patient.findFirst.mockResolvedValue({ id: "p1", workspaceId: WORKSPACE_ID })
      mockDb.patient.update.mockResolvedValue({ id: "p1", name: "Maria Updated" })

      const result = await updatePatient("p1", { name: "Maria Updated" })

      expect(result.name).toBe("Maria Updated")
      expect(mockDb.patient.update).toHaveBeenCalledWith({
        where: { id: "p1" },
        data: expect.objectContaining({ name: "Maria Updated" }),
      })
    })

    it("throws when patient not in workspace", async () => {
      mockDb.patient.findFirst.mockResolvedValue(null)

      await expect(updatePatient("p_other", { name: "X" })).rejects.toThrow(ERR_PATIENT_NOT_FOUND)
    })
  })

  // ─── deactivatePatient ───────────────────────────────────────
  describe("deactivatePatient", () => {
    it("sets isActive:false (soft delete) and logs audit", async () => {
      mockDb.patient.findFirst.mockResolvedValue({ id: "p1", workspaceId: WORKSPACE_ID })
      mockDb.patient.update.mockResolvedValue({ id: "p1", isActive: false })

      const result = await deactivatePatient("p1")

      expect(result).toEqual({ success: true })
      expect(mockDb.patient.update).toHaveBeenCalledWith({
        where: { id: "p1" },
        data: { isActive: false },
      })
    })

    it("throws when patient not in workspace", async () => {
      mockDb.patient.findFirst.mockResolvedValue(null)

      await expect(deactivatePatient("p_other")).rejects.toThrow(ERR_PATIENT_NOT_FOUND)
    })
  })

  // ─── searchPatients ──────────────────────────────────────────
  describe("searchPatients", () => {
    it("returns matching patients by name, phone, or document", async () => {
      const patients = [{ id: "p1", name: "Maria Silva", phone: null, document: null, updatedAt: new Date() }]
      mockDb.patient.findMany.mockResolvedValue(patients)

      const result = await searchPatients("Maria")

      expect(result).toHaveLength(1)
      const call = mockDb.patient.findMany.mock.calls[0][0]
      expect(call.where.workspaceId).toBe(WORKSPACE_ID)
      expect(call.where.isActive).toBe(true)
    })

    it("returns empty array for empty query", async () => {
      const result = await searchPatients("  ")
      expect(result).toEqual([])
      expect(mockDb.patient.findMany).not.toHaveBeenCalled()
    })
  })

  // ─── getAudioPlaybackUrl ─────────────────────────────────────
  describe("getAudioPlaybackUrl", () => {
    it("returns signed URL for audio belonging to workspace", async () => {
      mockDb.recording.findFirst.mockResolvedValue({ id: "r1", audioUrl: "audio/test.webm" })

      const url = await getAudioPlaybackUrl("audio/test.webm")

      expect(url).toBe("https://signed-url.example.com/audio.webm")
    })

    it("throws when audio not found in workspace", async () => {
      mockDb.recording.findFirst.mockResolvedValue(null)

      await expect(getAudioPlaybackUrl("audio/other.webm")).rejects.toThrow("Audio nao encontrado")
    })
  })
})
