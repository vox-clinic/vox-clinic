import { describe, it, expect, beforeEach, vi } from "vitest"

// Mocks must be imported before the modules under test
import { mockDb } from "@/test/mocks/db"
import { mockAuth } from "@/test/mocks/auth"
import "@/test/mocks/services"

vi.mock("@/lib/cache", () => ({ cached: vi.fn((_k: string, _t: number, fn: () => unknown) => fn()), invalidate: vi.fn() }))

import {
  getWorkspace,
  updateWorkspace,
  generateWorkspace,
  getWorkspacePreview,
} from "@/server/actions/workspace"
import {
  ERR_UNAUTHORIZED,
  ERR_USER_NOT_FOUND,
  ERR_WORKSPACE_NOT_CONFIGURED,
} from "@/lib/error-messages"

const WORKSPACE_ID = "ws_test_123"
const CLERK_ID = "clerk_test_user_123"
const mockWorkspace = {
  id: WORKSPACE_ID,
  professionType: "Odontologia",
  procedures: [{ name: "Limpeza", price: 15000 }],
  customFields: [{ name: "Alergias", type: "text" }],
  anamnesisTemplate: [{ question: "Tem alergias?", type: "boolean" }],
  categories: [{ name: "Consulta", color: "#14B8A6" }],
}
const mockUser = {
  id: "user_1",
  clerkId: CLERK_ID,
  clinicName: "Clinica Teste",
  profession: "Dentista",
  workspace: mockWorkspace,
  memberships: [],
}

describe("workspace actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ userId: CLERK_ID })
    mockDb.user.findUnique.mockResolvedValue(mockUser)
  })

  // ─── getWorkspace ──────────────────────────────────────────────
  describe("getWorkspace", () => {
    it("retorna configuracao do workspace com sucesso", async () => {
      const result = await getWorkspace()

      expect(result.id).toBe(WORKSPACE_ID)
      expect(result.professionType).toBe("Odontologia")
      expect(result.clinicName).toBe("Clinica Teste")
      expect(result.profession).toBe("Dentista")
      expect(result.procedures).toBeDefined()
      expect(result.customFields).toBeDefined()
      expect(result.anamnesisTemplate).toBeDefined()
      expect(result.categories).toBeDefined()
    })

    it("lanca erro quando workspace nao configurado", async () => {
      mockDb.user.findUnique.mockResolvedValue({
        id: "user_1",
        clerkId: CLERK_ID,
        workspace: null,
        memberships: [],
      })

      await expect(getWorkspace()).rejects.toThrow(ERR_WORKSPACE_NOT_CONFIGURED)
    })

    it("lanca erro quando usuario nao autenticado", async () => {
      mockAuth.mockResolvedValue({ userId: null })

      await expect(getWorkspace()).rejects.toThrow(ERR_UNAUTHORIZED)
    })

    it("lanca erro quando usuario nao encontrado", async () => {
      mockDb.user.findUnique.mockResolvedValue(null)

      await expect(getWorkspace()).rejects.toThrow(ERR_USER_NOT_FOUND)
    })

    it("busca workspace via membership quando usuario nao e dono", async () => {
      mockDb.user.findUnique.mockResolvedValue({
        id: "user_1",
        clerkId: CLERK_ID,
        clinicName: "Clinica Membro",
        profession: "Fisioterapeuta",
        workspace: null,
        memberships: [{ workspaceId: "ws_member_456" }],
      })
      mockDb.workspace.findUnique.mockResolvedValue(mockWorkspace)

      const result = await getWorkspace()

      expect(result.id).toBe(WORKSPACE_ID)
      expect(result.clinicName).toBe("Clinica Membro")
      expect(mockDb.workspace.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "ws_member_456" } })
      )
    })
  })

  // ─── updateWorkspace ───────────────────────────────────────────
  describe("updateWorkspace", () => {
    it("atualiza procedures do workspace com sucesso", async () => {
      mockDb.workspace.update.mockResolvedValue({ id: WORKSPACE_ID })

      const result = await updateWorkspace({
        procedures: [{ id: "p1", name: "Limpeza", category: "Geral", price: 15000 }, { id: "p2", name: "Consulta", category: "Geral", price: 20000 }],
      })

      expect(result).toEqual({ success: true })
      expect(mockDb.workspace.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: WORKSPACE_ID },
          data: expect.objectContaining({ procedures: expect.anything() }),
        })
      )
    })

    it("atualiza clinicName no user com sucesso", async () => {
      mockDb.user.update.mockResolvedValue({ id: "user_1", clinicName: "Nova Clinica" })

      const result = await updateWorkspace({ clinicName: "Nova Clinica" })

      expect(result).toEqual({ success: true })
      expect(mockDb.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user_1" },
          data: { clinicName: "Nova Clinica" },
        })
      )
    })

    it("atualiza workspace e clinicName juntos", async () => {
      mockDb.workspace.update.mockResolvedValue({ id: WORKSPACE_ID })
      mockDb.user.update.mockResolvedValue({ id: "user_1" })

      const result = await updateWorkspace({
        procedures: [{ id: "p3", name: "Exame", category: "Geral", price: 10000 }],
        clinicName: "Clinica Atualizada",
      })

      expect(result).toEqual({ success: true })
      expect(mockDb.workspace.update).toHaveBeenCalled()
      expect(mockDb.user.update).toHaveBeenCalled()
    })

    it("retorna erro quando usuario nao autenticado", async () => {
      mockAuth.mockResolvedValue({ userId: null })

      const result = await updateWorkspace({ clinicName: "Test" })

      expect(result).toHaveProperty("error")
    })

    it("retorna erro quando workspace nao configurado", async () => {
      mockDb.user.findUnique.mockResolvedValue({
        id: "user_1",
        clerkId: CLERK_ID,
        workspace: null,
        memberships: [],
      })

      const result = await updateWorkspace({ clinicName: "Test" })

      expect(result).toHaveProperty("error")
    })

    it("nao atualiza workspace se nao houver campos de workspace", async () => {
      mockDb.user.update.mockResolvedValue({ id: "user_1" })

      const result = await updateWorkspace({ clinicName: "Apenas Nome" })

      expect(result).toEqual({ success: true })
      expect(mockDb.workspace.update).not.toHaveBeenCalled()
      expect(mockDb.user.update).toHaveBeenCalled()
    })
  })

  // ─── generateWorkspace ─────────────────────────────────────────
  describe("generateWorkspace", () => {
    it("retorna erro quando usuario nao autenticado", async () => {
      mockAuth.mockResolvedValue({ userId: null })

      const result = await generateWorkspace("Dentista", "Clinica X", {
        procedures: [],
        customFields: [],
        anamnesisTemplate: [],
        categories: [],
      })

      expect(result).toHaveProperty("error")
    })
  })

  // ─── getWorkspacePreview ───────────────────────────────────────
  describe("getWorkspacePreview", () => {
    it("lanca erro quando usuario nao autenticado", async () => {
      mockAuth.mockResolvedValue({ userId: null })

      await expect(
        getWorkspacePreview("Dentista", { especialidade: "Ortodontia" })
      ).rejects.toThrow(ERR_UNAUTHORIZED)
    })
  })
})
