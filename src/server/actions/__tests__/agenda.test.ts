import { describe, it, expect, beforeEach, vi } from "vitest"

// Mocks must be imported before the modules under test
import { mockDb } from "@/test/mocks/db"
import { mockAuth } from "@/test/mocks/auth"
import "@/test/mocks/services"

import {
  getAgendas,
  createAgenda,
  updateAgenda,
  deleteAgenda,
} from "@/server/actions/agenda"
import {
  ERR_AGENDA_NOT_FOUND,
} from "@/lib/error-messages"

// Standard user/workspace mock
const WORKSPACE_ID = "ws_test_123"
const CLERK_ID = "clerk_test_user_123"
const mockUser = {
  id: "user_1",
  clerkId: CLERK_ID,
  workspace: { id: WORKSPACE_ID, procedures: [], customFields: [] },
}

describe("agenda actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ userId: CLERK_ID })
    mockDb.user.findUnique.mockResolvedValue(mockUser)
  })

  // ─── getAgendas ─────────────────────────────────────────────
  describe("getAgendas", () => {
    it("retorna lista de agendas com contagem de consultas", async () => {
      const agendas = [
        {
          id: "ag1",
          name: "Agenda Principal",
          color: "#14B8A6",
          isDefault: true,
          isActive: true,
          _count: { appointments: 5 },
        },
        {
          id: "ag2",
          name: "Agenda Tarde",
          color: "#FF5733",
          isDefault: false,
          isActive: true,
          _count: { appointments: 2 },
        },
      ]
      mockDb.agenda.findMany.mockResolvedValue(agendas)

      const result = await getAgendas()

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        id: "ag1",
        name: "Agenda Principal",
        color: "#14B8A6",
        isDefault: true,
        isActive: true,
        appointmentCount: 5,
      })
      expect(result[1].appointmentCount).toBe(2)

      // Verify workspaceId scoping
      const findManyCall = mockDb.agenda.findMany.mock.calls[0][0]
      expect(findManyCall.where.workspaceId).toBe(WORKSPACE_ID)
    })
  })

  // ─── createAgenda ───────────────────────────────────────────
  describe("createAgenda", () => {
    it("cria agenda com workspaceId e cor padrao", async () => {
      mockDb.workspace.findUnique.mockResolvedValue({ id: WORKSPACE_ID, plan: "free" })
      mockDb.agenda.create.mockResolvedValue({
        id: "ag_new",
        name: "Agenda Nova",
        color: "#14B8A6",
        isDefault: false,
        isActive: true,
      })

      const result = await createAgenda({ name: "Agenda Nova" })

      expect("error" in result).toBe(false)
      if (!("error" in result)) {
        expect(result.id).toBe("ag_new")
        expect(result.name).toBe("Agenda Nova")
        expect(result.appointmentCount).toBe(0)
      }

      expect(mockDb.agenda.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workspaceId: WORKSPACE_ID,
          name: "Agenda Nova",
          color: "#14B8A6",
        }),
      })
    })

    it("retorna erro quando nome esta vazio", async () => {
      const result = await createAgenda({ name: "   " })

      expect("error" in result).toBe(true)
      if ("error" in result) {
        expect(result.error).toBe("Nome da agenda é obrigatório")
      }
    })
  })

  // ─── updateAgenda ───────────────────────────────────────────
  describe("updateAgenda", () => {
    it("atualiza campos da agenda", async () => {
      mockDb.agenda.findFirst.mockResolvedValue({
        id: "ag1",
        workspaceId: WORKSPACE_ID,
        isDefault: false,
      })
      mockDb.agenda.update.mockResolvedValue({
        id: "ag1",
        name: "Agenda Atualizada",
        color: "#FF0000",
        isDefault: false,
        isActive: true,
      })

      const result = await updateAgenda("ag1", { name: "Agenda Atualizada", color: "#FF0000" })

      expect("error" in result).toBe(false)
      if (!("error" in result)) {
        expect(result.name).toBe("Agenda Atualizada")
        expect(result.color).toBe("#FF0000")
      }
    })
  })

  // ─── deleteAgenda ───────────────────────────────────────────
  describe("deleteAgenda", () => {
    it("exclui agenda sem consultas", async () => {
      mockDb.agenda.findFirst.mockResolvedValue({
        id: "ag2",
        workspaceId: WORKSPACE_ID,
        isDefault: false,
        _count: { appointments: 0, blockedSlots: 0 },
      })
      mockDb.agenda.delete.mockResolvedValue({ id: "ag2" })

      const result = await deleteAgenda("ag2")

      expect("error" in result).toBe(false)
      if (!("error" in result)) {
        expect(result.success).toBe(true)
      }
      expect(mockDb.agenda.delete).toHaveBeenCalledWith({ where: { id: "ag2" } })
    })

    it("retorna erro quando agenda nao encontrada", async () => {
      mockDb.agenda.findFirst.mockResolvedValue(null)

      const result = await deleteAgenda("nonexistent")

      expect("error" in result).toBe(true)
      if ("error" in result) {
        expect(result.error).toBe(ERR_AGENDA_NOT_FOUND)
      }
    })
  })
})
