import { describe, it, expect, beforeEach, vi } from "vitest"

// Mocks must be imported before the modules under test
import { mockDb } from "@/test/mocks/db"
import { mockAuth } from "@/test/mocks/auth"
import "@/test/mocks/services"

import {
  getBlockedSlots,
  createBlockedSlot,
  updateBlockedSlot,
  deleteBlockedSlot,
} from "@/server/actions/blocked-slot"
import {
  ERR_AGENDA_NOT_FOUND,
  ERR_BLOCKED_SLOT_NOT_FOUND,
} from "@/lib/error-messages"

// Standard user/workspace mock
const WORKSPACE_ID = "ws_test_123"
const CLERK_ID = "clerk_test_user_123"
const mockUser = {
  id: "user_1",
  clerkId: CLERK_ID,
  workspace: { id: WORKSPACE_ID, procedures: [], customFields: [] },
}

describe("blocked-slot actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ userId: CLERK_ID })
    mockDb.user.findUnique.mockResolvedValue(mockUser)
  })

  // ─── getBlockedSlots ───────────────────────────────────────
  describe("getBlockedSlots", () => {
    it("retorna bloqueios unicos dentro do intervalo", async () => {
      const slots = [
        {
          id: "bs1",
          title: "Almoco",
          startDate: new Date("2026-04-01T12:00:00Z"),
          endDate: new Date("2026-04-01T13:00:00Z"),
          allDay: false,
          recurring: null,
          agendaId: "ag1",
        },
      ]
      // One-time slots query
      mockDb.blockedSlot.findMany
        .mockResolvedValueOnce(slots) // one-time
        .mockResolvedValueOnce([])    // recurring

      const result = await getBlockedSlots("2026-04-01T00:00:00Z", "2026-04-07T23:59:59Z")

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: "bs1",
        title: "Almoco",
        allDay: false,
        recurring: null,
        agendaId: "ag1",
      })

      // Verify workspaceId scoping on first call (one-time slots)
      const firstCall = mockDb.blockedSlot.findMany.mock.calls[0][0]
      expect(firstCall.where.workspaceId).toBe(WORKSPACE_ID)
    })
  })

  // ─── createBlockedSlot ─────────────────────────────────────
  describe("createBlockedSlot", () => {
    it("cria bloqueio de horario com dados validos", async () => {
      mockDb.agenda.findFirst.mockResolvedValue({ id: "ag1", workspaceId: WORKSPACE_ID })
      mockDb.blockedSlot.create.mockResolvedValue({
        id: "bs_new",
        title: "Ferias",
        startDate: new Date("2026-04-10T00:00:00Z"),
        endDate: new Date("2026-04-15T23:59:59Z"),
        allDay: true,
        recurring: null,
        agendaId: "ag1",
      })

      const result = await createBlockedSlot({
        title: "Ferias",
        startDate: "2026-04-10T00:00:00Z",
        endDate: "2026-04-15T23:59:59Z",
        agendaId: "ag1",
        allDay: true,
      })

      expect("error" in result).toBe(false)
      if (!("error" in result)) {
        expect(result.id).toBe("bs_new")
        expect(result.title).toBe("Ferias")
        expect(result.allDay).toBe(true)
      }

      expect(mockDb.blockedSlot.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workspaceId: WORKSPACE_ID,
          agendaId: "ag1",
          title: "Ferias",
          allDay: true,
        }),
      })
    })

    it("retorna erro quando titulo esta vazio", async () => {
      const result = await createBlockedSlot({
        title: "   ",
        startDate: "2026-04-10T00:00:00Z",
        endDate: "2026-04-15T23:59:59Z",
        agendaId: "ag1",
      })

      expect("error" in result).toBe(true)
      if ("error" in result) {
        expect(result.error).toBe("Titulo e obrigatorio")
      }
    })
  })

  // ─── updateBlockedSlot ─────────────────────────────────────
  describe("updateBlockedSlot", () => {
    it("atualiza campos do bloqueio", async () => {
      mockDb.blockedSlot.findFirst.mockResolvedValue({
        id: "bs1",
        workspaceId: WORKSPACE_ID,
        startDate: new Date("2026-04-01T12:00:00Z"),
        endDate: new Date("2026-04-01T13:00:00Z"),
      })
      mockDb.blockedSlot.update.mockResolvedValue({
        id: "bs1",
        title: "Almoco Atualizado",
        startDate: new Date("2026-04-01T12:00:00Z"),
        endDate: new Date("2026-04-01T14:00:00Z"),
        allDay: false,
        recurring: null,
        agendaId: "ag1",
      })

      const result = await updateBlockedSlot("bs1", {
        title: "Almoco Atualizado",
        endDate: "2026-04-01T14:00:00Z",
      })

      expect("error" in result).toBe(false)
      if (!("error" in result)) {
        expect(result.title).toBe("Almoco Atualizado")
      }
    })
  })

  // ─── deleteBlockedSlot ─────────────────────────────────────
  describe("deleteBlockedSlot", () => {
    it("exclui bloqueio existente", async () => {
      mockDb.blockedSlot.findFirst.mockResolvedValue({
        id: "bs1",
        workspaceId: WORKSPACE_ID,
      })
      mockDb.blockedSlot.delete.mockResolvedValue({ id: "bs1" })

      const result = await deleteBlockedSlot("bs1")

      expect("error" in result).toBe(false)
      if (!("error" in result)) {
        expect(result.success).toBe(true)
      }
      expect(mockDb.blockedSlot.delete).toHaveBeenCalledWith({ where: { id: "bs1" } })
    })
  })
})
