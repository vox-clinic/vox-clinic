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
// workspace-cache: bypass in-memory cache, always query the mock DB directly
export const mockGetWorkspaceIdCached = vi.fn(async (clerkId: string) => {
  // Delegate to mockDb so tests can control the result via mockDb.user.findUnique
  const { mockDb } = await import("@/test/mocks/db")
  const user = await mockDb.user.findUnique({ where: { clerkId }, include: { workspace: true, memberships: { select: { workspaceId: true }, take: 1 } } })
  return user?.workspace?.id ?? user?.memberships?.[0]?.workspaceId ?? null
})
vi.mock("@/lib/workspace-cache", () => ({
  getWorkspaceIdCached: mockGetWorkspaceIdCached,
  invalidateWorkspaceCache: vi.fn(),
}))
vi.mock("@/lib/plan-enforcement", () => ({
  checkPatientLimit: vi.fn().mockResolvedValue({ allowed: true }),
  checkAppointmentLimit: vi.fn().mockResolvedValue({ allowed: true }),
  checkAgendaLimit: vi.fn().mockResolvedValue({ allowed: true }),
  checkTeamMemberLimit: vi.fn().mockResolvedValue({ allowed: true }),
  checkRecordingLimit: vi.fn().mockResolvedValue({ allowed: true }),
}))
export const mockSendEmail = vi.fn().mockResolvedValue(undefined)
vi.mock("@/lib/email", () => ({ sendEmail: mockSendEmail }))
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }))
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn().mockReturnValue({ allowed: true, remaining: 4, resetAt: Date.now() + 60_000 }),
}))
export const mockRequireWorkspaceRole = vi.fn().mockResolvedValue({
  userId: "user_1",
  clerkId: "clerk_test_user_123",
  workspaceId: "ws_test_123",
  role: "owner",
})
vi.mock("@/lib/auth-context", () => ({
  resolveWorkspaceRole: vi.fn(),
  requireWorkspaceRole: mockRequireWorkspaceRole,
}))
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
