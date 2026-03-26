import { describe, it, expect, beforeEach, vi } from "vitest"

import { mockDb } from "@/test/mocks/db"
import { mockAuth } from "@/test/mocks/auth"
import {
  mockTranscribeAudio,
  mockExtractEntities,
  mockUploadAudio,
  mockDeleteAudio,
  mockPreprocessAudio,
  mockLogAudit,
  mockRecordConsent,
} from "@/test/mocks/services"

import {
  processVoiceRegistration,
  confirmPatientRegistration,
  checkDuplicatePatient,
} from "@/server/actions/voice"

const WORKSPACE_ID = "ws_test_123"
const CLERK_ID = "clerk_test_user_123"
const mockUser = {
  id: "user_1",
  clerkId: CLERK_ID,
  workspace: {
    id: WORKSPACE_ID,
    procedures: [{ name: "Limpeza" }, { name: "Restauracao" }],
    customFields: [{ name: "alergias", type: "text" }],
  },
}

function createAudioFile(sizeBytes: number = 1024, name: string = "test.webm"): File {
  const buffer = new ArrayBuffer(sizeBytes)
  return new File([buffer], name, { type: "audio/webm" })
}

describe("voice actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ userId: CLERK_ID })
    mockDb.user.findUnique.mockResolvedValue(mockUser)
  })

  // ─── processVoiceRegistration ────────────────────────────────
  describe("processVoiceRegistration", () => {
    it("full pipeline: upload → preprocess → transcribe → extract → save recording", async () => {
      const recording = { id: "rec_1" }
      mockDb.recording.create.mockResolvedValue(recording)

      const formData = new FormData()
      formData.set("audio", createAudioFile(5000))

      const result = await processVoiceRegistration(formData)

      expect(result.recordingId).toBe("rec_1")
      expect(result.transcript).toBeDefined()
      expect(result.extractedData).toBeDefined()

      // Verify pipeline order
      expect(mockUploadAudio).toHaveBeenCalledTimes(1)
      expect(mockPreprocessAudio).toHaveBeenCalledTimes(1)
      expect(mockTranscribeAudio).toHaveBeenCalledTimes(1)
      expect(mockExtractEntities).toHaveBeenCalledTimes(1)

      // Verify recording created in transaction
      expect(mockDb.$transaction).toHaveBeenCalledTimes(1)
      expect(mockDb.recording.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workspaceId: WORKSPACE_ID,
          status: "processed",
        }),
      })

      // Verify audit and consent logged
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: WORKSPACE_ID,
          action: "recording.created",
          entityType: "Recording",
        })
      )
      expect(mockRecordConsent).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: WORKSPACE_ID,
          consentType: "audio_recording",
        })
      )
    })

    it("rejects files > 25MB", async () => {
      const formData = new FormData()
      formData.set("audio", createAudioFile(26 * 1024 * 1024))

      await expect(processVoiceRegistration(formData)).rejects.toThrow("Arquivo de audio excede o limite de 25MB")
    })

    it("throws when no audio file provided", async () => {
      const formData = new FormData()

      await expect(processVoiceRegistration(formData)).rejects.toThrow("No audio file provided")
    })

    it("handles transcription failure and cleans up audio", async () => {
      mockTranscribeAudio.mockRejectedValueOnce(new Error("Whisper API timeout"))

      const formData = new FormData()
      formData.set("audio", createAudioFile(5000))

      await expect(processVoiceRegistration(formData)).rejects.toThrow("Whisper API timeout")

      // Audio should have been uploaded then cleaned up
      expect(mockUploadAudio).toHaveBeenCalledTimes(1)
      expect(mockDeleteAudio).toHaveBeenCalledWith("audio/test-file.webm")
    })

    it("handles extraction failure and cleans up audio", async () => {
      mockExtractEntities.mockRejectedValueOnce(new Error("Claude API error"))

      const formData = new FormData()
      formData.set("audio", createAudioFile(5000))

      await expect(processVoiceRegistration(formData)).rejects.toThrow("Claude API error")
      expect(mockDeleteAudio).toHaveBeenCalledWith("audio/test-file.webm")
    })

    it("throws Unauthorized when not authenticated", async () => {
      mockAuth.mockResolvedValue({ userId: null })
      const formData = new FormData()
      formData.set("audio", createAudioFile())

      await expect(processVoiceRegistration(formData)).rejects.toThrow("Unauthorized")
    })

    it("passes workspace procedure names as vocabulary hints to Whisper", async () => {
      mockDb.recording.create.mockResolvedValue({ id: "rec_1" })

      const formData = new FormData()
      formData.set("audio", createAudioFile(5000))

      await processVoiceRegistration(formData)

      expect(mockTranscribeAudio).toHaveBeenCalledWith(
        expect.any(Buffer),
        "processed.mp3",
        ["Limpeza", "Restauracao"]
      )
    })
  })

  // ─── confirmPatientRegistration ──────────────────────────────
  describe("confirmPatientRegistration", () => {
    it("creates patient + appointment + updates recording in transaction", async () => {
      // No duplicate found
      mockDb.patient.findFirst.mockResolvedValue(null)
      const createdPatient = { id: "p_new", name: "Maria Silva" }
      const createdAppointment = { id: "a_new" }
      mockDb.patient.create.mockResolvedValue(createdPatient)
      mockDb.appointment.create.mockResolvedValue(createdAppointment)
      mockDb.recording.update.mockResolvedValue({ id: "rec_1" })

      const result = await confirmPatientRegistration({
        recordingId: "rec_1",
        name: "Maria Silva",
        document: "12345678900",
        procedures: ["Limpeza"],
      })

      expect(result.patientId).toBe("p_new")
      expect(result.appointmentId).toBe("a_new")
      expect(result.duplicatePatient).toBeNull()

      // Verify transaction was used
      expect(mockDb.$transaction).toHaveBeenCalledTimes(1)

      // Verify all three operations in transaction
      expect(mockDb.patient.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workspaceId: WORKSPACE_ID,
          name: "Maria Silva",
          document: "12345678900",
        }),
      })
      expect(mockDb.appointment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ patientId: "p_new", workspaceId: WORKSPACE_ID }),
      })
      expect(mockDb.recording.update).toHaveBeenCalledWith({
        where: { id: "rec_1" },
        data: { appointmentId: "a_new", patientId: "p_new" },
      })
    })

    it("detects duplicate patients by CPF", async () => {
      // First call: findFirst by document returns a match
      mockDb.patient.findFirst
        .mockResolvedValueOnce({ id: "p_existing", name: "Maria S." }) // by document
      // Second findFirst (by name) should not be called since document matched

      const createdPatient = { id: "p_new", name: "Maria Silva" }
      const createdAppointment = { id: "a_new" }
      mockDb.patient.create.mockResolvedValue(createdPatient)
      mockDb.appointment.create.mockResolvedValue(createdAppointment)
      mockDb.recording.update.mockResolvedValue({ id: "rec_1" })

      const result = await confirmPatientRegistration({
        recordingId: "rec_1",
        name: "Maria Silva",
        document: "12345678900",
      })

      // Still creates the patient but returns duplicate info
      expect(result.duplicatePatient).toEqual({ id: "p_existing", name: "Maria S." })
    })

    it("detects duplicate patients by name when no document", async () => {
      // When no document is provided, only the name-based findFirst is called
      mockDb.patient.findFirst
        .mockResolvedValueOnce({ id: "p_existing", name: "Maria Silva" }) // name match (only call)

      const createdPatient = { id: "p_new", name: "Maria Silva" }
      const createdAppointment = { id: "a_new" }
      mockDb.patient.create.mockResolvedValue(createdPatient)
      mockDb.appointment.create.mockResolvedValue(createdAppointment)
      mockDb.recording.update.mockResolvedValue({ id: "rec_1" })

      const result = await confirmPatientRegistration({
        recordingId: "rec_1",
        name: "Maria Silva",
      })

      expect(result.duplicatePatient).toEqual({ id: "p_existing", name: "Maria Silva" })
    })

    it("logs audit for both patient and appointment creation", async () => {
      mockDb.patient.findFirst.mockResolvedValue(null)
      mockDb.patient.create.mockResolvedValue({ id: "p_new", name: "Test" })
      mockDb.appointment.create.mockResolvedValue({ id: "a_new" })
      mockDb.recording.update.mockResolvedValue({ id: "rec_1" })

      await confirmPatientRegistration({ recordingId: "rec_1", name: "Test" })

      expect(mockLogAudit).toHaveBeenCalledTimes(2)
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: "patient.created", entityId: "p_new" })
      )
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: "appointment.created", entityId: "a_new" })
      )
    })
  })

  // ─── checkDuplicatePatient ───────────────────────────────────
  describe("checkDuplicatePatient", () => {
    it("normalizes CPF before checking (removes formatting)", async () => {
      mockDb.patient.findFirst.mockResolvedValue({ id: "p1", name: "Maria" })

      const result = await checkDuplicatePatient("Maria", "123.456.789-00")

      expect(result).toEqual({ id: "p1", name: "Maria" })
      // Verify it searches for both formatted and unformatted
      expect(mockDb.patient.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workspaceId: WORKSPACE_ID,
            OR: [
              { document: "12345678900" },      // normalized
              { document: "123.456.789-00" },    // original
            ],
          }),
        })
      )
    })

    it("searches by name (case-insensitive) when no document", async () => {
      mockDb.patient.findFirst.mockResolvedValue({ id: "p1", name: "Maria Silva" })

      const result = await checkDuplicatePatient("Maria Silva")

      expect(result).toEqual({ id: "p1", name: "Maria Silva" })
      expect(mockDb.patient.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: "Maria Silva", mode: "insensitive" },
          }),
        })
      )
    })

    it("returns null when no duplicate found", async () => {
      mockDb.patient.findFirst.mockResolvedValue(null)

      const result = await checkDuplicatePatient("Unique Name")

      expect(result).toBeNull()
    })

    it("skips name search when name is too short (< 3 chars)", async () => {
      mockDb.patient.findFirst.mockResolvedValue(null)

      const result = await checkDuplicatePatient("Ma")

      expect(result).toBeNull()
      // findFirst should not be called for name search (only skipped)
      expect(mockDb.patient.findFirst).not.toHaveBeenCalled()
    })
  })
})
