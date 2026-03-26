// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const { mockDb } = vi.hoisted(() => {
  const mockDb = {
    whatsAppConfig: { findFirst: vi.fn() },
    whatsAppConversation: { upsert: vi.fn() },
    whatsAppMessage: { upsert: vi.fn(), updateMany: vi.fn() },
  }
  return { mockDb }
})

vi.mock("@/lib/db", () => ({ db: mockDb }))

import { GET, POST } from "@/app/api/whatsapp/webhook/route"

const VERIFY_TOKEN = "my-verify-token"

describe("GET /api/whatsapp/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = VERIFY_TOKEN
  })

  it("should return challenge on valid verification request", async () => {
    const url = `https://example.com/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=challenge_123`
    const request = new NextRequest(url)

    const response = await GET(request)
    expect(response.status).toBe(200)
    const text = await response.text()
    expect(text).toBe("challenge_123")
  })

  it("should return 403 on invalid verify token", async () => {
    const url = `https://example.com/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=challenge_123`
    const request = new NextRequest(url)

    const response = await GET(request)
    expect(response.status).toBe(403)
  })

  it("should return 403 when mode is not subscribe", async () => {
    const url = `https://example.com/api/whatsapp/webhook?hub.mode=unsubscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=challenge_123`
    const request = new NextRequest(url)

    const response = await GET(request)
    expect(response.status).toBe(403)
  })

  it("should return 403 when token is missing", async () => {
    const url = `https://example.com/api/whatsapp/webhook?hub.mode=subscribe&hub.challenge=challenge_123`
    const request = new NextRequest(url)

    const response = await GET(request)
    expect(response.status).toBe(403)
  })
})

describe("POST /api/whatsapp/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return 200 for valid incoming message payload", async () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              field: "messages",
              value: {
                metadata: { phone_number_id: "phone_123" },
                contacts: [{ wa_id: "5511999998888", profile: { name: "Maria" } }],
                messages: [
                  {
                    id: "wamid_abc",
                    from: "5511999998888",
                    timestamp: "1700000000",
                    type: "text",
                    text: { body: "Ola, gostaria de agendar" },
                  },
                ],
              },
            },
          ],
        },
      ],
    }

    mockDb.whatsAppConfig.findFirst.mockResolvedValueOnce({
      id: "config_1",
      workspaceId: "ws_1",
      phoneNumberId: "phone_123",
      isActive: true,
    })
    mockDb.whatsAppConversation.upsert.mockResolvedValueOnce({ id: "conv_1" })
    mockDb.whatsAppMessage.upsert.mockResolvedValueOnce({})

    const request = new NextRequest("https://example.com/api/whatsapp/webhook", {
      method: "POST",
      body: JSON.stringify(payload),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    // Wait for async processing
    await vi.waitFor(() => {
      expect(mockDb.whatsAppConfig.findFirst).toHaveBeenCalledWith({
        where: { phoneNumberId: "phone_123", isActive: true },
      })
    })

    await vi.waitFor(() => {
      expect(mockDb.whatsAppConversation.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            workspaceId_contactPhone_configId: {
              workspaceId: "ws_1",
              contactPhone: "5511999998888",
              configId: "config_1",
            },
          },
          create: expect.objectContaining({
            workspaceId: "ws_1",
            contactPhone: "5511999998888",
            contactName: "Maria",
            status: "open",
          }),
        })
      )
    })

    await vi.waitFor(() => {
      expect(mockDb.whatsAppMessage.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { waMessageId: "wamid_abc" },
          create: expect.objectContaining({
            direction: "inbound",
            type: "text",
            content: "Ola, gostaria de agendar",
            status: "delivered",
          }),
        })
      )
    })
  })

  it("should return 200 for status update payload", async () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              field: "messages",
              value: {
                metadata: { phone_number_id: "phone_123" },
                statuses: [
                  {
                    id: "wamid_xyz",
                    status: "delivered",
                    timestamp: "1700000100",
                    recipient_id: "5511999998888",
                  },
                ],
              },
            },
          ],
        },
      ],
    }

    mockDb.whatsAppConfig.findFirst.mockResolvedValueOnce({
      id: "config_1",
      workspaceId: "ws_1",
      phoneNumberId: "phone_123",
      isActive: true,
    })
    mockDb.whatsAppMessage.updateMany.mockResolvedValueOnce({ count: 1 })

    const request = new NextRequest("https://example.com/api/whatsapp/webhook", {
      method: "POST",
      body: JSON.stringify(payload),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    await vi.waitFor(() => {
      expect(mockDb.whatsAppMessage.updateMany).toHaveBeenCalledWith({
        where: { waMessageId: "wamid_xyz" },
        data: { status: "delivered" },
      })
    })
  })

  it("should return 200 for non-whatsapp payload (no crash)", async () => {
    const payload = { object: "other_account", entry: [] }
    const request = new NextRequest("https://example.com/api/whatsapp/webhook", {
      method: "POST",
      body: JSON.stringify(payload),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
  })

  it("should return 200 for unknown field changes", async () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [{ field: "account_update", value: {} }],
        },
      ],
    }

    const request = new NextRequest("https://example.com/api/whatsapp/webhook", {
      method: "POST",
      body: JSON.stringify(payload),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    // Give async processing time to complete (should be a no-op)
    await new Promise((r) => setTimeout(r, 50))
    expect(mockDb.whatsAppConfig.findFirst).not.toHaveBeenCalled()
  })

  it("should return 200 even when JSON parsing fails", async () => {
    const request = new NextRequest("https://example.com/api/whatsapp/webhook", {
      method: "POST",
      body: "not-json",
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
  })

  it("should skip processing when config not found for phone number", async () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              field: "messages",
              value: {
                metadata: { phone_number_id: "unknown_phone" },
                messages: [
                  { id: "msg1", from: "5511999", timestamp: "1700000000", type: "text", text: { body: "Hi" } },
                ],
              },
            },
          ],
        },
      ],
    }

    mockDb.whatsAppConfig.findFirst.mockResolvedValueOnce(null)

    const request = new NextRequest("https://example.com/api/whatsapp/webhook", {
      method: "POST",
      body: JSON.stringify(payload),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    await vi.waitFor(() => {
      expect(mockDb.whatsAppConfig.findFirst).toHaveBeenCalled()
    })

    // Give extra time for any async processing
    await new Promise((r) => setTimeout(r, 50))

    // Should not attempt to create conversation or message
    expect(mockDb.whatsAppConversation.upsert).not.toHaveBeenCalled()
    expect(mockDb.whatsAppMessage.upsert).not.toHaveBeenCalled()
  })
})
