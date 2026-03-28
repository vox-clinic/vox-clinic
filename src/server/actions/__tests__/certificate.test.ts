import { describe, it, expect, beforeEach, vi } from "vitest"

// Mocks must be imported before the modules under test
import { mockDb } from "@/test/mocks/db"
import { mockAuth } from "@/test/mocks/auth"
import "@/test/mocks/services"

import {
  createCertificate,
  getCertificate,
  getPatientCertificates,
  deleteCertificate,
} from "@/server/actions/certificate"
import {
  ERR_CERTIFICATE_NOT_FOUND,
  ERR_PATIENT_NOT_FOUND,
} from "@/lib/error-messages"

// Standard user/workspace mock
const WORKSPACE_ID = "ws_test_123"
const CLERK_ID = "clerk_test_user_123"
const mockUser = {
  id: "user_1",
  clerkId: CLERK_ID,
  name: "Dr. Teste",
  clinicName: "Clínica Teste",
  profession: "Médico",
  workspace: { id: WORKSPACE_ID },
  memberships: [{ workspaceId: WORKSPACE_ID }],
}

const mockPatient = {
  id: "p1",
  name: "Maria Silva",
  document: "12345678900",
  workspaceId: WORKSPACE_ID,
}

describe("certificate actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ userId: CLERK_ID })
    mockDb.user.findUnique.mockResolvedValue(mockUser)
  })

  // ─── createCertificate ──────────────────────────────────────
  describe("createCertificate", () => {
    it("cria atestado com sucesso e retorna id", async () => {
      mockDb.patient.findFirst.mockResolvedValue(mockPatient)
      mockDb.medicalCertificate.create.mockResolvedValue({ id: "cert_1" })

      const result = await createCertificate({
        patientId: "p1",
        type: "atestado",
        days: 3,
      })

      expect(result).toEqual({ id: "cert_1" })
      expect(mockDb.medicalCertificate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          patientId: "p1",
          workspaceId: WORKSPACE_ID,
          type: "atestado",
          days: 3,
        }),
      })
    })

    it("retorna erro para tipo de documento inválido", async () => {
      const result = await createCertificate({
        patientId: "p1",
        type: "invalido",
      })

      expect(result).toHaveProperty("error", "Tipo de documento inválido")
    })

    it("retorna erro quando paciente não encontrado", async () => {
      mockDb.patient.findFirst.mockResolvedValue(null)

      const result = await createCertificate({
        patientId: "p_inexistente",
        type: "atestado",
        days: 1,
      })

      expect(result).toHaveProperty("error", ERR_PATIENT_NOT_FOUND)
    })

    it("retorna erro quando dias menor que 1", async () => {
      const result = await createCertificate({
        patientId: "p1",
        type: "atestado",
        days: 0,
      })

      expect(result).toHaveProperty("error", "Número de dias deve ser maior que zero.")
    })

    it("retorna erro quando dias maior que 365", async () => {
      const result = await createCertificate({
        patientId: "p1",
        type: "atestado",
        days: 400,
      })

      expect(result).toHaveProperty("error", "Máximo de 365 dias permitido.")
    })

    it("retorna erro quando conteúdo vazio para encaminhamento sem content", async () => {
      mockDb.patient.findFirst.mockResolvedValue(mockPatient)

      const result = await createCertificate({
        patientId: "p1",
        type: "encaminhamento",
      })

      expect(result).toHaveProperty("error", "O conteúdo do documento não pode ser vazio")
    })
  })

  // ─── getCertificate ─────────────────────────────────────────
  describe("getCertificate", () => {
    it("retorna certificado com dados do paciente e profissional", async () => {
      const cert = {
        id: "cert_1",
        type: "atestado",
        content: "Atesto que...",
        days: 2,
        cid: "J06",
        cidDescription: "Infecção aguda",
        createdAt: new Date("2026-01-15"),
        patient: { name: "Maria Silva", document: "12345678900" },
      }
      mockDb.medicalCertificate.findFirst.mockResolvedValue(cert)

      const result = await getCertificate("cert_1")

      expect(result.id).toBe("cert_1")
      expect(result.patientName).toBe("Maria Silva")
      expect(result.doctorName).toBe("Dr. Teste")
      expect(result.clinicName).toBe("Clínica Teste")
      expect(result.createdAt).toBe("2026-01-15T00:00:00.000Z")

      expect(mockDb.medicalCertificate.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "cert_1", workspaceId: WORKSPACE_ID },
        })
      )
    })

    it("lança erro quando certificado não encontrado", async () => {
      mockDb.medicalCertificate.findFirst.mockResolvedValue(null)

      await expect(getCertificate("inexistente")).rejects.toThrow(ERR_CERTIFICATE_NOT_FOUND)
    })
  })

  // ─── getPatientCertificates ─────────────────────────────────
  describe("getPatientCertificates", () => {
    it("retorna lista de certificados do paciente ordenados por data", async () => {
      mockDb.patient.findFirst.mockResolvedValue(mockPatient)
      const certs = [
        {
          id: "cert_2",
          type: "atestado",
          content: "Atesto...",
          days: 1,
          cid: null,
          cidDescription: null,
          createdAt: new Date("2026-01-20"),
        },
        {
          id: "cert_1",
          type: "declaracao_comparecimento",
          content: "Declaro...",
          days: null,
          cid: null,
          cidDescription: null,
          createdAt: new Date("2026-01-15"),
        },
      ]
      mockDb.medicalCertificate.findMany.mockResolvedValue(certs)

      const result = await getPatientCertificates("p1")

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe("cert_2")
      expect(result[1].id).toBe("cert_1")

      const findManyCall = mockDb.medicalCertificate.findMany.mock.calls[0][0]
      expect(findManyCall.where.workspaceId).toBe(WORKSPACE_ID)
      expect(findManyCall.where.patientId).toBe("p1")
      expect(findManyCall.orderBy).toEqual({ createdAt: "desc" })
    })

    it("lança erro quando paciente não encontrado", async () => {
      mockDb.patient.findFirst.mockResolvedValue(null)

      await expect(getPatientCertificates("p_inexistente")).rejects.toThrow(ERR_PATIENT_NOT_FOUND)
    })
  })

  // ─── deleteCertificate ──────────────────────────────────────
  describe("deleteCertificate", () => {
    it("exclui certificado com sucesso e registra auditoria", async () => {
      mockDb.medicalCertificate.findFirst.mockResolvedValue({
        id: "cert_1",
        workspaceId: WORKSPACE_ID,
      })
      mockDb.medicalCertificate.delete.mockResolvedValue({ id: "cert_1" })

      const result = await deleteCertificate("cert_1")

      expect(result).toEqual({ success: true })
      expect(mockDb.medicalCertificate.delete).toHaveBeenCalledWith({
        where: { id: "cert_1" },
      })
    })

    it("retorna erro quando certificado não encontrado", async () => {
      mockDb.medicalCertificate.findFirst.mockResolvedValue(null)

      const result = await deleteCertificate("inexistente")

      expect(result).toHaveProperty("error", ERR_CERTIFICATE_NOT_FOUND)
    })
  })
})
