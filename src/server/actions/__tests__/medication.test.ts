import { describe, it, expect, beforeEach, vi } from "vitest"

// Mocks must be imported before the modules under test
import { mockDb } from "@/test/mocks/db"
import { mockAuth } from "@/test/mocks/auth"
import "@/test/mocks/services"

import {
  searchMedications,
  getMedicationFavorites,
  upsertMedicationFavorite,
  removeMedicationFavorite,
} from "@/server/actions/medication"

// Standard user/workspace mock
const WORKSPACE_ID = "ws_test_123"
const CLERK_ID = "clerk_test_user_123"
const mockUser = {
  id: "user_1",
  clerkId: CLERK_ID,
  workspace: { id: WORKSPACE_ID },
  memberships: [{ workspaceId: WORKSPACE_ID }],
}

describe("medication actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ userId: CLERK_ID })
    mockDb.user.findUnique.mockResolvedValue(mockUser)
  })

  // ─── searchMedications ──────────────────────────────────────
  describe("searchMedications", () => {
    it("retorna resultados do banco quando existem registros", async () => {
      mockDb.medicationDatabase.count.mockResolvedValue(100)
      mockDb.medicationDatabase.findMany.mockResolvedValue([
        {
          anvisaCode: "123456",
          name: "Amoxicilina 500mg",
          activeIngredient: "Amoxicilina",
          concentration: "500mg",
          pharmaceuticalForm: "Comprimido",
          manufacturer: "EMS",
          category: "Antibiotico",
          controlType: null,
        },
      ])

      const result = await searchMedications("Amox")

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe("Amoxicilina 500mg")
      expect(result[0].activeIngredient).toBe("Amoxicilina")

      const findManyCall = mockDb.medicationDatabase.findMany.mock.calls[0][0]
      expect(findManyCall.where.isActive).toBe(true)
      expect(findManyCall.where.OR).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: { contains: "Amox", mode: "insensitive" } }),
          expect.objectContaining({ activeIngredient: { contains: "Amox", mode: "insensitive" } }),
        ])
      )
    })

    it("retorna array vazio para query com menos de 2 caracteres", async () => {
      const result = await searchMedications("A")

      expect(result).toEqual([])
      expect(mockDb.medicationDatabase.count).not.toHaveBeenCalled()
    })

    it("retorna array vazio para query vazia", async () => {
      const result = await searchMedications("")

      expect(result).toEqual([])
      expect(mockDb.medicationDatabase.count).not.toHaveBeenCalled()
    })

    it("retorna array vazio para query com espacos", async () => {
      const result = await searchMedications("  ")

      expect(result).toEqual([])
      expect(mockDb.medicationDatabase.count).not.toHaveBeenCalled()
    })
  })

  // ─── getMedicationFavorites ──────────────────────────────────
  describe("getMedicationFavorites", () => {
    it("retorna favoritos do usuario ordenados por uso", async () => {
      const favorites = [
        {
          id: "fav_1",
          medicationName: "Amoxicilina 500mg",
          activeIngredient: "Amoxicilina",
          defaultDosage: "500mg",
          defaultFrequency: "8/8h",
          defaultQuantity: "21 comprimidos",
          usageCount: 10,
        },
        {
          id: "fav_2",
          medicationName: "Ibuprofeno 600mg",
          activeIngredient: "Ibuprofeno",
          defaultDosage: "600mg",
          defaultFrequency: "12/12h",
          defaultQuantity: "10 comprimidos",
          usageCount: 5,
        },
      ]
      mockDb.medicationFavorite.findMany.mockResolvedValue(favorites)

      const result = await getMedicationFavorites()

      expect(result).toHaveLength(2)
      expect(result[0].medicationName).toBe("Amoxicilina 500mg")
      expect(result[1].usageCount).toBe(5)

      const findManyCall = mockDb.medicationFavorite.findMany.mock.calls[0][0]
      expect(findManyCall.where.workspaceId).toBe(WORKSPACE_ID)
      expect(findManyCall.where.userId).toBe(CLERK_ID)
      expect(findManyCall.orderBy).toEqual([{ usageCount: "desc" }, { lastUsedAt: "desc" }])
    })
  })

  // ─── upsertMedicationFavorite ───────────────────────────────
  describe("upsertMedicationFavorite", () => {
    it("cria ou atualiza favorito com sucesso", async () => {
      mockDb.medicationFavorite.upsert.mockResolvedValue({ id: "fav_new" })

      const result = await upsertMedicationFavorite({
        medicationName: "Dipirona 500mg",
        activeIngredient: "Dipirona",
        defaultDosage: "500mg",
        defaultFrequency: "6/6h",
        defaultQuantity: "20 comprimidos",
      })

      expect("error" in result).toBe(false)
      if (!("error" in result)) expect(result.id).toBe("fav_new")

      const upsertCall = mockDb.medicationFavorite.upsert.mock.calls[0][0]
      expect(upsertCall.where.workspaceId_userId_medicationName).toEqual({
        workspaceId: WORKSPACE_ID,
        userId: CLERK_ID,
        medicationName: "Dipirona 500mg",
      })
      expect(upsertCall.create.workspaceId).toBe(WORKSPACE_ID)
      expect(upsertCall.create.medicationName).toBe("Dipirona 500mg")
    })

    it("retorna erro quando nome do medicamento esta vazio", async () => {
      const result = await upsertMedicationFavorite({
        medicationName: "  ",
      })

      expect(result).toHaveProperty("error")
      if ("error" in result) expect(result.error).toBe("Nome do medicamento e obrigatorio.")
    })
  })

  // ─── removeMedicationFavorite ───────────────────────────────
  describe("removeMedicationFavorite", () => {
    it("remove favorito com sucesso", async () => {
      mockDb.medicationFavorite.findFirst.mockResolvedValue({
        id: "fav_1",
        workspaceId: WORKSPACE_ID,
        userId: CLERK_ID,
      })
      mockDb.medicationFavorite.delete.mockResolvedValue({ id: "fav_1" })

      const result = await removeMedicationFavorite("fav_1")

      expect("error" in result).toBe(false)
      if (!("error" in result)) expect(result.success).toBe(true)
      expect(mockDb.medicationFavorite.delete).toHaveBeenCalledWith({ where: { id: "fav_1" } })
    })

    it("retorna erro quando favorito nao encontrado", async () => {
      mockDb.medicationFavorite.findFirst.mockResolvedValue(null)

      const result = await removeMedicationFavorite("fav_inexistente")

      expect(result).toHaveProperty("error")
      if ("error" in result) expect(result.error).toBe("Favorito nao encontrado.")
    })
  })
})
