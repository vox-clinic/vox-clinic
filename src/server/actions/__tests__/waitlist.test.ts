import { describe, it, expect, beforeEach, vi } from "vitest"

// Mocks must be imported before the modules under test
import { mockDb } from "@/test/mocks/db"
import { mockAuth } from "@/test/mocks/auth"
import "@/test/mocks/services"

import {
  getWaitlistEntries,
  addToWaitlist,
  updateWaitlistEntry,
  cancelWaitlistEntry,
} from "@/server/actions/waitlist"
import {
  ERR_PATIENT_NOT_FOUND,
  ERR_WAITLIST_ENTRY_NOT_FOUND,
  ERR_WAITLIST_PATIENT_ALREADY_WAITING,
} from "@/lib/error-messages"

// Standard user/workspace mock
const WORKSPACE_ID = "ws_test_123"
const CLERK_ID = "clerk_test_user_123"
const mockUser = {
  id: "user_1",
  clerkId: CLERK_ID,
  workspace: { id: WORKSPACE_ID },
  memberships: [{ workspaceId: WORKSPACE_ID }],
}

describe("waitlist actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ userId: CLERK_ID })
    mockDb.user.findUnique.mockResolvedValue(mockUser)
  })

  // ─── getWaitlistEntries ─────────────────────────────────────
  describe("getWaitlistEntries", () => {
    it("retorna entradas da lista de espera com paciente e agenda", async () => {
      const now = new Date()
      const entries = [
        {
          id: "wl_1",
          patient: { id: "p1", name: "Maria Silva", phone: "11999990000", email: "maria@test.com" },
          agenda: { id: "ag_1", name: "Clinica Geral", color: "#14B8A6" },
          agendaId: "ag_1",
          procedureName: "Consulta",
          preferredDays: ["seg", "qua"],
          preferredTimeStart: "08:00",
          preferredTimeEnd: "12:00",
          priority: 1,
          status: "waiting",
          notes: "Paciente prefere manha",
          notifiedAt: null,
          notifiedVia: null,
          scheduledAppointmentId: null,
          createdAt: now,
          expiresAt: null,
        },
      ]
      mockDb.waitlistEntry.findMany.mockResolvedValue(entries)

      const result = await getWaitlistEntries()

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe("wl_1")
      expect(result[0].patient.name).toBe("Maria Silva")
      expect(result[0].agenda?.name).toBe("Clinica Geral")
      expect(result[0].preferredDays).toEqual(["seg", "qua"])
      expect(result[0].createdAt).toBe(now.toISOString())

      const findManyCall = mockDb.waitlistEntry.findMany.mock.calls[0][0]
      expect(findManyCall.where.workspaceId).toBe(WORKSPACE_ID)
      expect(findManyCall.orderBy).toEqual([{ priority: "desc" }, { createdAt: "asc" }])
    })

    it("aplica filtros de status, agendaId e priority", async () => {
      mockDb.waitlistEntry.findMany.mockResolvedValue([])

      await getWaitlistEntries({ status: "waiting", agendaId: "ag_1", priority: 2 })

      const findManyCall = mockDb.waitlistEntry.findMany.mock.calls[0][0]
      expect(findManyCall.where.status).toBe("waiting")
      expect(findManyCall.where.agendaId).toBe("ag_1")
      expect(findManyCall.where.priority).toBe(2)
    })
  })

  // ─── addToWaitlist ──────────────────────────────────────────
  describe("addToWaitlist", () => {
    it("adiciona paciente na lista de espera com sucesso", async () => {
      mockDb.patient.findFirst.mockResolvedValue({
        id: "p1",
        workspaceId: WORKSPACE_ID,
        isActive: true,
      })
      mockDb.waitlistEntry.findFirst.mockResolvedValue(null) // no duplicate
      mockDb.waitlistEntry.create.mockResolvedValue({ id: "wl_new" })

      const result = await addToWaitlist({
        patientId: "p1",
        agendaId: "ag_1",
        procedureName: "Consulta",
        preferredDays: ["seg", "qua"],
        preferredTimeStart: "08:00",
        preferredTimeEnd: "12:00",
        priority: 1,
        notes: "Paciente prefere manha",
      })

      expect("error" in result).toBe(false)
      if (!("error" in result)) expect(result.id).toBe("wl_new")

      const createCall = mockDb.waitlistEntry.create.mock.calls[0][0]
      expect(createCall.data.workspaceId).toBe(WORKSPACE_ID)
      expect(createCall.data.patientId).toBe("p1")
      expect(createCall.data.agendaId).toBe("ag_1")
      expect(createCall.data.preferredDays).toEqual(["seg", "qua"])
      expect(createCall.data.createdBy).toBe(CLERK_ID)
    })

    it("retorna erro quando paciente nao encontrado", async () => {
      mockDb.patient.findFirst.mockResolvedValue(null)

      const result = await addToWaitlist({ patientId: "p_inexistente" })

      expect(result).toHaveProperty("error")
      if ("error" in result) expect(result.error).toBe(ERR_PATIENT_NOT_FOUND)
    })

    it("retorna erro quando paciente ja esta na lista de espera", async () => {
      mockDb.patient.findFirst.mockResolvedValue({
        id: "p1",
        workspaceId: WORKSPACE_ID,
        isActive: true,
      })
      mockDb.waitlistEntry.findFirst.mockResolvedValue({ id: "wl_existing" }) // duplicate

      const result = await addToWaitlist({
        patientId: "p1",
        agendaId: "ag_1",
        procedureName: "Consulta",
      })

      expect(result).toHaveProperty("error")
      if ("error" in result) expect(result.error).toBe(ERR_WAITLIST_PATIENT_ALREADY_WAITING)
    })
  })

  // ─── updateWaitlistEntry ────────────────────────────────────
  describe("updateWaitlistEntry", () => {
    it("atualiza entrada da lista de espera com sucesso", async () => {
      mockDb.waitlistEntry.findFirst.mockResolvedValue({
        id: "wl_1",
        workspaceId: WORKSPACE_ID,
      })
      mockDb.waitlistEntry.update.mockResolvedValue({ id: "wl_1" })

      const result = await updateWaitlistEntry("wl_1", {
        priority: 2,
        preferredDays: ["ter", "qui"],
        notes: "Atualizado",
      })

      expect("error" in result).toBe(false)
      if (!("error" in result)) expect(result.id).toBe("wl_1")

      const updateCall = mockDb.waitlistEntry.update.mock.calls[0][0]
      expect(updateCall.where.id).toBe("wl_1")
      expect(updateCall.data.priority).toBe(2)
      expect(updateCall.data.preferredDays).toEqual(["ter", "qui"])
      expect(updateCall.data.notes).toBe("Atualizado")
    })

    it("retorna erro quando entrada nao encontrada", async () => {
      mockDb.waitlistEntry.findFirst.mockResolvedValue(null)

      const result = await updateWaitlistEntry("wl_inexistente", { priority: 1 })

      expect(result).toHaveProperty("error")
      if ("error" in result) expect(result.error).toBe(ERR_WAITLIST_ENTRY_NOT_FOUND)
    })
  })

  // ─── cancelWaitlistEntry ────────────────────────────────────
  describe("cancelWaitlistEntry", () => {
    it("cancela entrada da lista de espera com sucesso", async () => {
      mockDb.waitlistEntry.findFirst.mockResolvedValue({
        id: "wl_1",
        workspaceId: WORKSPACE_ID,
      })
      mockDb.waitlistEntry.update.mockResolvedValue({ id: "wl_1", status: "cancelled" })

      const result = await cancelWaitlistEntry("wl_1")

      expect("error" in result).toBe(false)
      if (!("error" in result)) expect(result.id).toBe("wl_1")

      const updateCall = mockDb.waitlistEntry.update.mock.calls[0][0]
      expect(updateCall.where.id).toBe("wl_1")
      expect(updateCall.data.status).toBe("cancelled")
    })

    it("retorna erro quando entrada nao encontrada", async () => {
      mockDb.waitlistEntry.findFirst.mockResolvedValue(null)

      const result = await cancelWaitlistEntry("wl_inexistente")

      expect(result).toHaveProperty("error")
      if ("error" in result) expect(result.error).toBe(ERR_WAITLIST_ENTRY_NOT_FOUND)
    })
  })
})
