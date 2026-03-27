// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockDb, mockHeadersMap, mockVerifyState } = vi.hoisted(() => {
  const mockDb = {
    user: {
      upsert: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      findUnique: vi.fn(),
    },
    workspace: {
      update: vi.fn(),
    },
    patient: {
      updateMany: vi.fn(),
    },
  }
  const mockHeadersMap = new Map<string, string>()
  const mockVerifyState = { result: null as any, shouldThrow: false }
  return { mockDb, mockHeadersMap, mockVerifyState }
})

vi.mock("@/lib/db", () => ({ db: mockDb }))

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({
    get: (key: string) => mockHeadersMap.get(key) ?? null,
  })),
}))

vi.mock("svix", () => ({
  Webhook: class {
    verify() {
      if (mockVerifyState.shouldThrow) throw new Error("Invalid signature")
      return mockVerifyState.result
    }
  },
}))

const WEBHOOK_SECRET = "whsec_test_secret"

import { POST } from "@/app/api/webhooks/clerk/route"

function makeRequest(body: any): Request {
  return new Request("https://example.com/api/webhooks/clerk", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

function setHeaders(id: string, timestamp: string, signature: string) {
  mockHeadersMap.clear()
  mockHeadersMap.set("svix-id", id)
  mockHeadersMap.set("svix-timestamp", timestamp)
  mockHeadersMap.set("svix-signature", signature)
}

describe("POST /api/webhooks/clerk", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockVerifyState.shouldThrow = false
    mockVerifyState.result = null
    process.env.CLERK_WEBHOOK_SECRET = WEBHOOK_SECRET
  })

  it("should return 400 when svix headers are missing", async () => {
    mockHeadersMap.clear()
    const response = await POST(makeRequest({}))
    expect(response.status).toBe(400)
    const text = await response.text()
    expect(text).toBe("Missing svix headers")
  })

  it("should return 400 on invalid webhook signature", async () => {
    setHeaders("msg_123", "1234567890", "v1,invalid")
    mockVerifyState.shouldThrow = true

    const response = await POST(makeRequest({ type: "user.created" }))
    expect(response.status).toBe(400)
    const text = await response.text()
    expect(text).toBe("Invalid signature")
  })

  it("should upsert user on user.created event", async () => {
    setHeaders("msg_123", "1234567890", "v1,valid")
    mockVerifyState.result = {
      type: "user.created",
      data: {
        id: "user_abc123",
        email_addresses: [{ email_address: "joao@example.com" }],
        first_name: "Joao",
        last_name: "Silva",
      },
    }
    mockDb.user.upsert.mockResolvedValueOnce({})

    const response = await POST(makeRequest({}))
    expect(response.status).toBe(200)
    expect(mockDb.user.upsert).toHaveBeenCalledWith({
      where: { clerkId: "user_abc123" },
      update: { email: "joao@example.com", name: "Joao Silva", role: "user" },
      create: { clerkId: "user_abc123", email: "joao@example.com", name: "Joao Silva", role: "user" },
    })
  })

  it("should use 'Usuario' as fallback name when names are empty", async () => {
    setHeaders("msg_123", "1234567890", "v1,valid")
    mockVerifyState.result = {
      type: "user.created",
      data: {
        id: "user_no_name",
        email_addresses: [{ email_address: "no@name.com" }],
        first_name: null,
        last_name: null,
      },
    }
    mockDb.user.upsert.mockResolvedValueOnce({})

    await POST(makeRequest({}))
    expect(mockDb.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ name: "Usuario" }),
      })
    )
  })

  it("should update user on user.updated event", async () => {
    setHeaders("msg_456", "1234567890", "v1,valid")
    mockVerifyState.result = {
      type: "user.updated",
      data: {
        id: "user_abc123",
        email_addresses: [{ email_address: "new@email.com" }],
        first_name: "Joao",
        last_name: "Santos",
      },
    }
    mockDb.user.updateMany.mockResolvedValueOnce({ count: 1 })

    const response = await POST(makeRequest({}))
    expect(response.status).toBe(200)
    expect(mockDb.user.updateMany).toHaveBeenCalledWith({
      where: { clerkId: "user_abc123" },
      data: { email: "new@email.com", name: "Joao Santos" },
    })
  })

  it("should soft-delete workspace on user.deleted event", async () => {
    setHeaders("msg_789", "1234567890", "v1,valid")
    mockVerifyState.result = {
      type: "user.deleted",
      data: { id: "user_abc123" },
    }
    mockDb.user.findUnique.mockResolvedValueOnce({
      id: "db_user_1",
      workspace: { id: "ws_1" },
    })
    mockDb.workspace.update.mockResolvedValueOnce({})
    mockDb.patient.updateMany.mockResolvedValueOnce({ count: 5 })

    const response = await POST(makeRequest({}))
    expect(response.status).toBe(200)
    expect(mockDb.user.findUnique).toHaveBeenCalledWith({
      where: { clerkId: "user_abc123" },
      include: { workspace: true },
    })
    expect(mockDb.workspace.update).toHaveBeenCalledWith({
      where: { id: "ws_1" },
      data: { planStatus: "canceled" },
    })
    expect(mockDb.patient.updateMany).toHaveBeenCalledWith({
      where: { workspaceId: "ws_1" },
      data: { isActive: false },
    })
  })

  it("should not delete when user.deleted has no id", async () => {
    setHeaders("msg_789", "1234567890", "v1,valid")
    mockVerifyState.result = {
      type: "user.deleted",
      data: { id: undefined },
    }

    const response = await POST(makeRequest({}))
    expect(response.status).toBe(200)
    expect(mockDb.user.findUnique).not.toHaveBeenCalled()
  })

  it("should handle user.deleted when user has no workspace", async () => {
    setHeaders("msg_789", "1234567890", "v1,valid")
    mockVerifyState.result = {
      type: "user.deleted",
      data: { id: "user_no_ws" },
    }
    mockDb.user.findUnique.mockResolvedValueOnce({ id: "db_user_2", workspace: null })

    const response = await POST(makeRequest({}))
    expect(response.status).toBe(200)
    expect(mockDb.workspace.update).not.toHaveBeenCalled()
    expect(mockDb.patient.updateMany).not.toHaveBeenCalled()
  })

  it("should return 200 for unknown event types (no-op)", async () => {
    setHeaders("msg_000", "1234567890", "v1,valid")
    mockVerifyState.result = {
      type: "session.created",
      data: { id: "sess_123" },
    }

    const response = await POST(makeRequest({}))
    expect(response.status).toBe(200)
    expect(mockDb.user.upsert).not.toHaveBeenCalled()
    expect(mockDb.user.updateMany).not.toHaveBeenCalled()
    expect(mockDb.user.deleteMany).not.toHaveBeenCalled()
  })

  it("should use empty string when email is missing", async () => {
    setHeaders("msg_123", "1234567890", "v1,valid")
    mockVerifyState.result = {
      type: "user.created",
      data: {
        id: "user_no_email",
        email_addresses: [],
        first_name: "Test",
        last_name: null,
      },
    }
    mockDb.user.upsert.mockResolvedValueOnce({})

    await POST(makeRequest({}))
    expect(mockDb.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ email: "" }),
      })
    )
  })
})
