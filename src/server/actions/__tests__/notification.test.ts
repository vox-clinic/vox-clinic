import { describe, it, expect, beforeEach, vi } from "vitest"

// Mocks must be imported before the modules under test
import { mockDb } from "@/test/mocks/db"
import { mockAuth } from "@/test/mocks/auth"
import "@/test/mocks/services"

import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "@/server/actions/notification"

// Standard user/workspace mock
const WORKSPACE_ID = "ws_test_123"
const CLERK_ID = "clerk_test_user_123"
const mockUser = {
  id: "user_1",
  clerkId: CLERK_ID,
  workspace: { id: WORKSPACE_ID },
  memberships: [{ workspaceId: WORKSPACE_ID }],
}

describe("notification actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ userId: CLERK_ID })
    mockDb.user.findUnique.mockResolvedValue(mockUser)
  })

  // ─── getNotifications ───────────────────────────────────────
  describe("getNotifications", () => {
    it("retorna notificações do usuário ordenadas por data", async () => {
      const notifications = [
        {
          id: "n1",
          type: "appointment_soon",
          title: "Consulta em breve",
          body: "Maria Silva as 14:00",
          entityType: "Appointment",
          entityId: "apt_1",
          read: false,
          createdAt: new Date("2026-01-20T14:00:00Z"),
        },
        {
          id: "n2",
          type: "appointment_missed",
          title: "Consulta nao realizada",
          body: "Joao Santos — consulta agendada nao foi concluida",
          entityType: "Appointment",
          entityId: "apt_2",
          read: true,
          createdAt: new Date("2026-01-19T10:00:00Z"),
        },
      ]
      mockDb.notification.findMany.mockResolvedValue(notifications)

      const result = await getNotifications()

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe("n1")
      expect(result[0].read).toBe(false)
      expect(result[1].id).toBe("n2")
      expect(result[1].createdAt).toBe("2026-01-19T10:00:00.000Z")

      const findManyCall = mockDb.notification.findMany.mock.calls[0][0]
      expect(findManyCall.where.workspaceId).toBe(WORKSPACE_ID)
      expect(findManyCall.where.userId).toBe(CLERK_ID)
      expect(findManyCall.orderBy).toEqual({ createdAt: "desc" })
      expect(findManyCall.take).toBe(20)
    })
  })

  // ─── getUnreadCount ─────────────────────────────────────────
  describe("getUnreadCount", () => {
    it("retorna contagem de notificações não lidas", async () => {
      mockDb.notification.count.mockResolvedValue(5)

      const result = await getUnreadCount()

      expect(result).toBe(5)

      const countCall = mockDb.notification.count.mock.calls[0][0]
      expect(countCall.where.workspaceId).toBe(WORKSPACE_ID)
      expect(countCall.where.userId).toBe(CLERK_ID)
      expect(countCall.where.read).toBe(false)
    })
  })

  // ─── markAsRead ─────────────────────────────────────────────
  describe("markAsRead", () => {
    it("marca notificação como lida", async () => {
      const notification = {
        id: "n1",
        workspaceId: WORKSPACE_ID,
        userId: CLERK_ID,
        read: false,
      }
      mockDb.notification.findFirst.mockResolvedValue(notification)
      mockDb.notification.update.mockResolvedValue({ ...notification, read: true })

      await markAsRead("n1")

      expect(mockDb.notification.update).toHaveBeenCalledWith({
        where: { id: "n1" },
        data: { read: true },
      })
    })

    it("não atualiza quando notificação não encontrada", async () => {
      mockDb.notification.findFirst.mockResolvedValue(null)

      await markAsRead("inexistente")

      expect(mockDb.notification.update).not.toHaveBeenCalled()
    })
  })

  // ─── markAllAsRead ──────────────────────────────────────────
  describe("markAllAsRead", () => {
    it("marca todas as notificações como lidas", async () => {
      mockDb.notification.updateMany.mockResolvedValue({ count: 3 })

      await markAllAsRead()

      expect(mockDb.notification.updateMany).toHaveBeenCalledWith({
        where: { workspaceId: WORKSPACE_ID, userId: CLERK_ID, read: false },
        data: { read: true },
      })
    })
  })
})
