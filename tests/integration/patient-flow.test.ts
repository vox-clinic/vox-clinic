import { describe, it, expect, beforeEach, vi } from "vitest"

// Mocks must be imported before the modules under test
import { mockDb } from "@/test/mocks/db"
import { mockAuth } from "@/test/mocks/auth"
import "@/test/mocks/services"

import {
  createPatient,
  getPatient,
  getPatients,
  updatePatient,
  deactivatePatient,
  searchPatients,
} from "@/server/actions/patient"

// Standard workspace context
const WORKSPACE_ID = "ws_integration_123"
const CLERK_ID = "clerk_test_user_123"
const mockUser = {
  id: "user_1",
  clerkId: CLERK_ID,
  workspace: { id: WORKSPACE_ID, procedures: [{ name: "Limpeza" }], customFields: [] },
}

describe("Fluxo de paciente — ciclo de vida completo", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ userId: CLERK_ID })
    mockDb.user.findUnique.mockResolvedValue(mockUser)
  })

  it("deve completar fluxo de cadastro de paciente: criar -> consultar -> atualizar -> desativar", async () => {
    // ─── STEP 1: Criar paciente ──────────────────────────────
    const createdPatient = { id: "p_new_1", name: "Ana Costa", document: "52998224725", phone: "11999001122" }
    mockDb.patient.create.mockResolvedValue(createdPatient)
    // $transaction passes mockDb as tx, so tx.workspace.findUnique and tx.patient.create use the same mocks
    mockDb.workspace.findUnique.mockResolvedValue({ id: WORKSPACE_ID, plan: "pro" })

    const formData = new FormData()
    formData.set("name", "Ana Costa")
    formData.set("document", "52998224725")
    formData.set("phone", "11999001122")

    const createResult = await createPatient(formData)
    expect(createResult).toEqual({ patientId: "p_new_1" })
    expect(mockDb.patient.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: WORKSPACE_ID,
        name: "Ana Costa",
        document: "52998224725",
        phone: "11999001122",
      }),
    })

    // ─── STEP 2: Consultar paciente criado ───────────────────
    const fullPatient = {
      id: "p_new_1",
      name: "Ana Costa",
      document: "52998224725",
      rg: null,
      phone: "11999001122",
      email: null,
      birthDate: null,
      gender: null,
      address: null,
      insurance: null,
      insuranceData: null,
      guardian: null,
      source: null,
      tags: [],
      medicalHistory: {},
      customData: {},
      alerts: [],
      whatsappConsent: false,
      whatsappConsentAt: null,
      createdAt: new Date("2026-01-15"),
      appointments: [],
      recordings: [],
    }
    mockDb.patient.findFirst.mockResolvedValue(fullPatient)

    const fetchedPatient = await getPatient("p_new_1")
    expect(fetchedPatient.id).toBe("p_new_1")
    expect(fetchedPatient.name).toBe("Ana Costa")
    expect(fetchedPatient.document).toBe("52998224725")
    expect(fetchedPatient.appointments).toHaveLength(0)

    // ─── STEP 3: Atualizar paciente ──────────────────────────
    // findFirst is called again inside updatePatient to verify ownership
    mockDb.patient.findFirst.mockResolvedValue({ id: "p_new_1", workspaceId: WORKSPACE_ID })
    const updatedPatient = {
      id: "p_new_1",
      name: "Ana Costa Silva",
      email: "ana@email.com",
      phone: "11999001122",
    }
    mockDb.patient.update.mockResolvedValue(updatedPatient)

    const updateResult = await updatePatient("p_new_1", {
      name: "Ana Costa Silva",
      email: "ana@email.com",
    })
    expect("error" in updateResult).toBe(false)
    if (!("error" in updateResult)) {
      expect(updateResult.name).toBe("Ana Costa Silva")
      expect(updateResult.email).toBe("ana@email.com")
    }

    // ─── STEP 4: Desativar paciente (soft delete) ────────────
    mockDb.patient.findFirst.mockResolvedValue({ id: "p_new_1", workspaceId: WORKSPACE_ID })
    mockDb.patient.update.mockResolvedValue({ id: "p_new_1", isActive: false })

    const deactivateResult = await deactivatePatient("p_new_1")
    expect(deactivateResult).toEqual({ success: true })
    expect(mockDb.patient.update).toHaveBeenCalledWith({
      where: { id: "p_new_1" },
      data: { isActive: false },
    })
  })

  it("deve verificar que paciente desativado nao aparece na listagem", async () => {
    // ─── STEP 1: Criar paciente ──────────────────────────────
    mockDb.workspace.findUnique.mockResolvedValue({ id: WORKSPACE_ID, plan: "pro" })
    mockDb.patient.create.mockResolvedValue({ id: "p_deactivate_1", name: "Carlos Mendes" })

    const formData = new FormData()
    formData.set("name", "Carlos Mendes")

    const createResult = await createPatient(formData)
    expect(createResult).toEqual({ patientId: "p_deactivate_1" })

    // ─── STEP 2: Listar pacientes — paciente aparece ─────────
    mockDb.patient.findMany.mockResolvedValue([
      {
        id: "p_deactivate_1",
        name: "Carlos Mendes",
        phone: null,
        document: null,
        email: null,
        insurance: null,
        source: null,
        tags: [],
        alerts: [],
        appointments: [],
      },
    ])
    mockDb.patient.count.mockResolvedValue(1)

    const listBefore = await getPatients(undefined, 1, 20)
    expect(listBefore.patients).toHaveLength(1)
    expect(listBefore.patients[0].name).toBe("Carlos Mendes")

    // Verify listing always filters by isActive: true
    const findManyCall = mockDb.patient.findMany.mock.calls[0][0]
    expect(findManyCall.where.isActive).toBe(true)

    // ─── STEP 3: Desativar paciente ──────────────────────────
    mockDb.patient.findFirst.mockResolvedValue({ id: "p_deactivate_1", workspaceId: WORKSPACE_ID })
    mockDb.patient.update.mockResolvedValue({ id: "p_deactivate_1", isActive: false })

    await deactivatePatient("p_deactivate_1")

    // ─── STEP 4: Listar pacientes — paciente nao aparece ─────
    // Update mock to return empty (DB would filter out inactive)
    mockDb.patient.findMany.mockResolvedValue([])
    mockDb.patient.count.mockResolvedValue(0)

    const listAfter = await getPatients(undefined, 1, 20)
    expect(listAfter.patients).toHaveLength(0)
    expect(listAfter.total).toBe(0)

    // Verify the query still uses isActive: true
    const lastFindMany = mockDb.patient.findMany.mock.calls.at(-1)![0]
    expect(lastFindMany.where.isActive).toBe(true)
  })

  it("deve buscar paciente criado pelo nome via searchPatients", async () => {
    // ─── STEP 1: Criar paciente ──────────────────────────────
    mockDb.workspace.findUnique.mockResolvedValue({ id: WORKSPACE_ID, plan: "pro" })
    mockDb.patient.create.mockResolvedValue({ id: "p_search_1", name: "Fernanda Oliveira" })

    const formData = new FormData()
    formData.set("name", "Fernanda Oliveira")
    formData.set("phone", "11988887777")

    await createPatient(formData)

    // ─── STEP 2: Buscar por nome ─────────────────────────────
    mockDb.patient.findMany.mockResolvedValue([
      { id: "p_search_1", name: "Fernanda Oliveira", phone: "11988887777", document: null, updatedAt: new Date() },
    ])

    const results = await searchPatients("Fernanda")

    expect(results).toHaveLength(1)
    expect(results[0].name).toBe("Fernanda Oliveira")

    // Verify search uses workspace scoping
    const searchCall = mockDb.patient.findMany.mock.calls.at(-1)![0]
    expect(searchCall.where.workspaceId).toBe(WORKSPACE_ID)
    expect(searchCall.where.isActive).toBe(true)
  })

  it("deve criar paciente com dados customizados e atualizar historico medico", async () => {
    // ─── STEP 1: Criar com customData ────────────────────────
    mockDb.workspace.findUnique.mockResolvedValue({ id: WORKSPACE_ID, plan: "pro" })
    mockDb.patient.create.mockResolvedValue({ id: "p_custom_1", name: "Roberto Lima" })

    const formData = new FormData()
    formData.set("name", "Roberto Lima")
    formData.set("customData", JSON.stringify({ alergias: "penicilina", convenio: "Unimed" }))

    const createResult = await createPatient(formData)
    expect(createResult).toEqual({ patientId: "p_custom_1" })

    expect(mockDb.patient.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        customData: { alergias: "penicilina", convenio: "Unimed" },
      }),
    })

    // ─── STEP 2: Atualizar historico medico ──────────────────
    mockDb.patient.findFirst.mockResolvedValue({ id: "p_custom_1", workspaceId: WORKSPACE_ID })
    mockDb.patient.update.mockResolvedValue({
      id: "p_custom_1",
      name: "Roberto Lima",
      medicalHistory: { allergies: ["penicilina"], chronicDiseases: ["diabetes"] },
      alerts: ["Alergia a penicilina"],
    })

    const updateResult = await updatePatient("p_custom_1", {
      medicalHistory: { allergies: ["penicilina"], chronicDiseases: ["diabetes"] },
      alerts: ["Alergia a penicilina"],
    })

    expect("error" in updateResult).toBe(false)
    if (!("error" in updateResult)) {
      expect(updateResult.alerts).toContain("Alergia a penicilina")
    }
  })

  it("deve falhar ao atualizar paciente de outro workspace", async () => {
    // ─── STEP 1: Criar paciente normalmente ──────────────────
    mockDb.workspace.findUnique.mockResolvedValue({ id: WORKSPACE_ID, plan: "pro" })
    mockDb.patient.create.mockResolvedValue({ id: "p_other_ws", name: "Paciente Outro" })

    const formData = new FormData()
    formData.set("name", "Paciente Outro")

    await createPatient(formData)

    // ─── STEP 2: Tentar atualizar — findFirst retorna null (paciente de outro workspace)
    mockDb.patient.findFirst.mockResolvedValue(null)

    const updateResult = await updatePatient("p_other_ws", { name: "Hacker" })
    expect(updateResult).toHaveProperty("error")
  })
})
