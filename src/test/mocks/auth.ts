import { vi } from "vitest"

export const mockAuth = vi.fn().mockResolvedValue({ userId: "clerk_test_user_123" })

vi.mock("@clerk/nextjs/server", () => ({ auth: mockAuth }))
