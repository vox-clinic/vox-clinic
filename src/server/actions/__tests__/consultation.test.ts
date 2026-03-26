import { describe, it, expect, beforeEach, vi } from "vitest"

import { mockDb } from "@/test/mocks/db"
import { mockAuth } from "@/test/mocks/auth"
import {
  mockTranscribeAudio,
  mockGenerateConsultationSummary,
  mockUploadAudio,
  mockDeleteAudio,
  mockPreprocessAudio,
  mockLogAudit,
  mockRecordConsent,
} from "@/test/mocks/services"

import {
  processConsultation,
  getRecordingForReview,
  confirmConsultation,
} from "@/server/actions/consultation"

const WORKSPACE_ID = "ws_test_123"
const CLERK_ID = "clerk_test_user_123"
const mockUser = {
  id: "user_1",
  clerkId: CLERK_ID,
  workspace: {
    id: WORKSPACE_ID,
    procedures: [{ name: "Limpeza" }, { name: "Restauracao" }],
    customFields: [],
  },
}

function createAudioFile(sizeBytes: number = 1024, name: string = "consultation.webm"): File {
  const buffer = new ArrayBuffer(sizeBytes)
  return new File([buffer], name, { type: "audio/webm" })
}

describe("consultation actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ userId: CLERK_ID })
    mockDb.user.findUnique.mockResolvedValue(mockUser)
  })

  // ─── processConsultation ─────────────────────────────────────
  describe("processConsultation", () => {
    it("processes audio for existing patient: upload → preprocess → transcribe → summarize → save", async () => {
      const recording = { id: "rec_c1" }
      mockDb.recording.create.mockResolvedValue(recording)

      const formData = new FormData()
      formData.set("audio", createAudioFile(5000))

      const result = await processConsultation(formData, "p1")

      expect(result.recordingId).toBe("rec_c1")
      expect(result.transcript).toBeDefined()
      expect(result.summary).toBeDefined()
      expect(result.audioPath).toBe("audio/test-file.webm")

      // Verify pipeline
      expect(mockUploadAudio).toHaveBeenCalledTimes(1)
      expect(mockPreprocessAudio).toHaveBeenCalledTimes(1)
      expect(mockTranscribeAudio).toHaveBeenCalledTimes(1)
      expect(mockGenerateConsultationSummary).toHaveBeenCalledTimes(1)

      // Verify recording includes patientId
      expect(mockDb.recording.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workspaceId: WORKSPACE_ID,
          patientId: "p1",
          status: "processed",
        }),
      })

      // Verify consent recorded with patientId
      expect(mockRecordConsent).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: "p1",
          consentType: "audio_recording",
        })
      )
    })

    it("rejects files > 25MB", async () => {
      const formData = new FormData()
      formData.set("audio", createAudioFile(26 * 1024 * 1024))

      await expect(processConsultation(formData, "p1")).rejects.toThrow(
        "Arquivo de audio excede o limite de 25MB"
      )
    })

    it("throws when no audio file provided", async () => {
      const formData = new FormData()
      await expect(processConsultation(formData, "p1")).rejects.toThrow("No audio file provided")
    })

    it("cleans up audio on transcription failure", async () => {
      mockTranscribeAudio.mockRejectedValueOnce(new Error("Whisper timeout"))

      const formData = new FormData()
      formData.set("audio", createAudioFile(5000))

      await expect(processConsultation(formData, "p1")).rejects.toThrow("Whisper timeout")
      expect(mockDeleteAudio).toHaveBeenCalledWith("audio/test-file.webm")
    })

    it("cleans up audio on summary generation failure", async () => {
      mockGenerateConsultationSummary.mockRejectedValueOnce(new Error("Claude error"))

      const formData = new FormData()
      formData.set("audio", createAudioFile(5000))

      await expect(processConsultation(formData, "p1")).rejects.toThrow("Claude error")
      expect(mockDeleteAudio).toHaveBeenCalledWith("audio/test-file.webm")
    })

    it("throws Unauthorized when not authenticated", async () => {
      mockAuth.mockResolvedValue({ userId: null })
      const formData = new FormData()
      formData.set("audio", createAudioFile())

      await expect(processConsultation(formData, "p1")).rejects.toThrow("Unauthorized")
    })

    it("passes workspace procedure names to Whisper as hints", async () => {
      mockDb.recording.create.mockResolvedValue({ id: "rec_c1" })

      const formData = new FormData()
      formData.set("audio", createAudioFile(5000))

      await processConsultation(formData, "p1")

      expect(mockTranscribeAudio).toHaveBeenCalledWith(
        expect.any(Buffer),
        "processed.mp3",
        ["Limpeza", "Restauracao"]
      )
    })
  })

  // ─── getRecordingForReview ───────────────────────────────────
  describe("getRecordingForReview", () => {
    it("returns recording with extracted data scoped to workspace", async () => {
      const recording = {
        id: "rec_1",
        transcript: "Paciente veio para limpeza",
        aiExtractedData: { summary: "Limpeza realizada", procedures: ["Limpeza"] },
        audioUrl: "audio/test.webm",
        patientId: "p1",
      }
      mockDb.recording.findFirst.mockResolvedValue(recording)

      const result = await getRecordingForReview("rec_1")

      expect(result.recordingId).toBe("rec_1")
      expect(result.transcript).toBe("Paciente veio para limpeza")
      expect(result.summary).toEqual(recording.aiExtractedData)
      expect(result.patientId).toBe("p1")

      // Verify workspace scoping
      expect(mockDb.recording.findFirst).toHaveBeenCalledWith({
        where: { id: "rec_1", workspaceId: WORKSPACE_ID },
      })
    })

    it("throws when recording not found in workspace", async () => {
      mockDb.recording.findFirst.mockResolvedValue(null)

      await expect(getRecordingForReview("rec_missing")).rejects.toThrow("Recording not found")
    })

    it("returns empty transcript when null", async () => {
      mockDb.recording.findFirst.mockResolvedValue({
        id: "rec_1", transcript: null, aiExtractedData: null,
        audioUrl: "audio/test.webm", patientId: "p1",
      })

      const result = await getRecordingForReview("rec_1")
      expect(result.transcript).toBe("")
    })
  })

  // ─── confirmConsultation ─────────────────────────────────────
  describe("confirmConsultation", () => {
    const confirmData = {
      recordingId: "rec_1",
      patientId: "p1",
      summary: {
        summary: "Limpeza realizada",
        procedures: ["Limpeza"],
        observations: "Sem queixas",
        recommendations: "",
        medications: [],
      },
      audioPath: "audio/test.webm",
      transcript: "Paciente veio para limpeza",
    }

    it("creates appointment + updates recording in transaction", async () => {
      // Mock the FOR UPDATE query
      mockDb.$queryRawUnsafe.mockResolvedValue([{ id: "rec_1", appointmentId: null }])
      const createdAppointment = { id: "a_new" }
      mockDb.appointment.create.mockResolvedValue(createdAppointment)
      mockDb.recording.update.mockResolvedValue({ id: "rec_1" })

      const result = await confirmConsultation(confirmData)

      expect(result.appointmentId).toBe("a_new")
      expect(result.patientId).toBe("p1")

      // Verify transaction
      expect(mockDb.$transaction).toHaveBeenCalledTimes(1)

      // Verify appointment created with correct data
      expect(mockDb.appointment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          patientId: "p1",
          workspaceId: WORKSPACE_ID,
          procedures: ["Limpeza"],
          notes: "Sem queixas",
          transcript: "Paciente veio para limpeza",
          audioUrl: "audio/test.webm",
        }),
      })

      // Verify recording linked to appointment
      expect(mockDb.recording.update).toHaveBeenCalledWith({
        where: { id: "rec_1" },
        data: { appointmentId: "a_new" },
      })
    })

    it("double-confirm guard: rejects if recording already has appointmentId", async () => {
      mockDb.$queryRawUnsafe.mockResolvedValue([{ id: "rec_1", appointmentId: "a_existing" }])

      await expect(confirmConsultation(confirmData)).rejects.toThrow("Consulta ja confirmada")
    })

    it("throws when recording not found", async () => {
      mockDb.$queryRawUnsafe.mockResolvedValue([])

      await expect(confirmConsultation(confirmData)).rejects.toThrow("Recording not found")
    })

    it("logs audit after successful confirmation", async () => {
      mockDb.$queryRawUnsafe.mockResolvedValue([{ id: "rec_1", appointmentId: null }])
      mockDb.appointment.create.mockResolvedValue({ id: "a_new" })
      mockDb.recording.update.mockResolvedValue({ id: "rec_1" })

      await confirmConsultation(confirmData)

      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: WORKSPACE_ID,
          action: "appointment.created",
          entityType: "Appointment",
          entityId: "a_new",
        })
      )
    })

    it("passes optional price to appointment", async () => {
      mockDb.$queryRawUnsafe.mockResolvedValue([{ id: "rec_1", appointmentId: null }])
      mockDb.appointment.create.mockResolvedValue({ id: "a_new" })
      mockDb.recording.update.mockResolvedValue({ id: "rec_1" })

      await confirmConsultation({ ...confirmData, price: 250 })

      expect(mockDb.appointment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ price: 250 }),
      })
    })

    it("Unauthorized when not authenticated", async () => {
      mockAuth.mockResolvedValue({ userId: null })

      await expect(confirmConsultation(confirmData)).rejects.toThrow("Unauthorized")
    })
  })
})
