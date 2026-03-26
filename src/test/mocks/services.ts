import { vi } from "vitest"

export const mockTranscribeAudio = vi.fn().mockResolvedValue({ text: "Paciente Maria Silva, 34 anos, veio para limpeza dental", duration: 120 })
export const mockExtractEntities = vi.fn().mockResolvedValue({ name: "Maria Silva", age: "34", procedures: ["Limpeza"] })
export const mockGenerateConsultationSummary = vi.fn().mockResolvedValue({ summary: "Paciente retorno para limpeza", procedures: ["Limpeza"], observations: "Sem queixas" })
export const mockUploadAudio = vi.fn().mockResolvedValue("audio/test-file.webm")
export const mockDeleteAudio = vi.fn().mockResolvedValue(undefined)
export const mockGetSignedAudioUrl = vi.fn().mockResolvedValue("https://signed-url.example.com/audio.webm")
export const mockPreprocessAudio = vi.fn().mockResolvedValue({ buffer: Buffer.from("processed") })
export const mockLogAudit = vi.fn().mockResolvedValue(undefined)
export const mockRecordConsent = vi.fn().mockResolvedValue(undefined)

vi.mock("@/lib/openai", () => ({ transcribeAudio: mockTranscribeAudio }))
vi.mock("@/lib/claude", () => ({
  extractEntities: mockExtractEntities,
  generateConsultationSummary: mockGenerateConsultationSummary,
  generateWorkspaceSuggestions: vi.fn(),
}))
vi.mock("@/lib/storage", () => ({
  uploadAudio: mockUploadAudio,
  deleteAudio: mockDeleteAudio,
  getSignedAudioUrl: mockGetSignedAudioUrl,
  getAudioBuffer: vi.fn(),
}))
vi.mock("@/lib/audio-preprocessing", () => ({
  preprocessAudio: mockPreprocessAudio,
}))
vi.mock("@/lib/audit", () => ({ logAudit: mockLogAudit }))
vi.mock("@/lib/consent", () => ({ recordConsent: mockRecordConsent }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn(), unstable_cache: vi.fn((fn: any) => fn) }))
vi.mock("next/navigation", () => ({ redirect: vi.fn((url: string) => { throw new RedirectError(url) }) }))

// Helper class to distinguish redirect "errors" from real errors in tests
export class RedirectError extends Error {
  public url: string
  constructor(url: string) {
    super(`NEXT_REDIRECT:${url}`)
    this.url = url
  }
}
