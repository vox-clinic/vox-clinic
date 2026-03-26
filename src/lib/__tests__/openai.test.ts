// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockTranscriptionsCreate } = vi.hoisted(() => {
  const mockTranscriptionsCreate = vi.fn()
  return { mockTranscriptionsCreate }
})

// Mock env before importing
vi.mock("@/lib/env", () => ({
  env: {
    OPENAI_API_KEY: "sk-test-openai-key",
  },
}))

vi.mock("openai", () => {
  return {
    default: class MockOpenAI {
      audio = { transcriptions: { create: mockTranscriptionsCreate } }
    },
  }
})

import { transcribeAudio } from "@/lib/openai"

describe("transcribeAudio", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should call Whisper with correct parameters", async () => {
    mockTranscriptionsCreate.mockResolvedValueOnce({
      text: "Paciente relatou dor de cabeca",
      duration: 45.2,
    })

    const buffer = Buffer.from("fake-audio-data")
    const result = await transcribeAudio(buffer, "recording.webm")

    expect(mockTranscriptionsCreate).toHaveBeenCalledOnce()
    const callArgs = mockTranscriptionsCreate.mock.calls[0][0]
    expect(callArgs.model).toBe("whisper-1")
    expect(callArgs.language).toBe("pt")
    expect(callArgs.response_format).toBe("verbose_json")

    expect(result.text).toBe("Paciente relatou dor de cabeca")
    expect(result.duration).toBe(45.2)
  })

  it("should include vocabulary hints in prompt", async () => {
    mockTranscriptionsCreate.mockResolvedValueOnce({
      text: "Realizei profilaxia",
      duration: 30,
    })

    const buffer = Buffer.from("fake-audio-data")
    await transcribeAudio(buffer, "recording.webm", ["Profilaxia", "Restauracao", "Endodontia"])

    const callArgs = mockTranscriptionsCreate.mock.calls[0][0]
    expect(callArgs.prompt).toContain("Profilaxia")
    expect(callArgs.prompt).toContain("Restauracao")
    expect(callArgs.prompt).toContain("Endodontia")
  })

  it("should detect MIME type from .mp3 extension", async () => {
    mockTranscriptionsCreate.mockResolvedValueOnce({ text: "test", duration: 10 })
    const buffer = Buffer.from("fake-audio")
    await transcribeAudio(buffer, "audio.mp3")

    const callArgs = mockTranscriptionsCreate.mock.calls[0][0]
    const file = callArgs.file as File
    expect(file.type).toBe("audio/mpeg")
    expect(file.name).toBe("audio.mp3")
  })

  it("should detect MIME type from .wav extension", async () => {
    mockTranscriptionsCreate.mockResolvedValueOnce({ text: "test", duration: 5 })
    const buffer = Buffer.from("fake-audio")
    await transcribeAudio(buffer, "audio.wav")

    const file = mockTranscriptionsCreate.mock.calls[0][0].file as File
    expect(file.type).toBe("audio/wav")
  })

  it("should detect MIME type from .m4a extension", async () => {
    mockTranscriptionsCreate.mockResolvedValueOnce({ text: "test", duration: 5 })
    const buffer = Buffer.from("fake-audio")
    await transcribeAudio(buffer, "audio.m4a")

    const file = mockTranscriptionsCreate.mock.calls[0][0].file as File
    expect(file.type).toBe("audio/mp4")
  })

  it("should default to audio/webm for unknown extension", async () => {
    mockTranscriptionsCreate.mockResolvedValueOnce({ text: "test", duration: 5 })
    const buffer = Buffer.from("fake-audio")
    await transcribeAudio(buffer, "audio.xyz")

    const file = mockTranscriptionsCreate.mock.calls[0][0].file as File
    expect(file.type).toBe("audio/webm")
  })

  it("should return null duration when API omits it", async () => {
    mockTranscriptionsCreate.mockResolvedValueOnce({
      text: "Transcricao sem duracao",
      duration: undefined,
    })

    const result = await transcribeAudio(Buffer.from("audio"), "test.webm")
    expect(result.duration).toBeNull()
  })

  it("should propagate API errors for whisper-1", async () => {
    mockTranscriptionsCreate.mockRejectedValueOnce(new Error("API rate limit exceeded"))

    await expect(
      transcribeAudio(Buffer.from("audio"), "test.webm")
    ).rejects.toThrow("API rate limit exceeded")
  })

  it("should fall back to whisper-1 when non-default model fails", async () => {
    mockTranscriptionsCreate
      .mockRejectedValueOnce(new Error("Model not supported"))
      .mockResolvedValueOnce({ text: "Fallback transcription", duration: 20 })

    const result = await transcribeAudio(
      Buffer.from("audio"),
      "test.webm",
      undefined,
      "gpt-4o-mini-transcribe"
    )

    expect(mockTranscriptionsCreate).toHaveBeenCalledTimes(2)
    expect(mockTranscriptionsCreate.mock.calls[0][0].model).toBe("gpt-4o-mini-transcribe")
    expect(mockTranscriptionsCreate.mock.calls[1][0].model).toBe("whisper-1")
    expect(result.text).toBe("Fallback transcription")
  })

  it("should limit vocabulary hints to 50", async () => {
    mockTranscriptionsCreate.mockResolvedValueOnce({ text: "test", duration: 5 })
    const hints = Array.from({ length: 60 }, (_, i) => `Procedure${i}`)
    await transcribeAudio(Buffer.from("audio"), "test.webm", hints)

    const prompt = mockTranscriptionsCreate.mock.calls[0][0].prompt as string
    // Should contain the 50th hint but not the 51st
    expect(prompt).toContain("Procedure49")
    expect(prompt).not.toContain("Procedure50")
  })
})
