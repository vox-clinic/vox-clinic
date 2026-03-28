import { describe, it, expect, beforeEach, vi } from "vitest"

// Mocks must be imported before the modules under test
import { mockDb } from "@/test/mocks/db"
import { mockAuth } from "@/test/mocks/auth"
import "@/test/mocks/services"

import {
  createCharge,
  recordPayment,
  getCharges,
  getCharge,
  getPatientBalance,
  getReceivablesSummary,
  cancelCharge,
} from "@/server/actions/receivable"
import {
  ERR_UNAUTHORIZED,
  ERR_WORKSPACE_NOT_CONFIGURED,
  ERR_PATIENT_NOT_FOUND,
  ERR_APPOINTMENT_NOT_FOUND,
  ERR_RECEIVABLE_NOT_FOUND,
  ERR_PAYMENT_NOT_FOUND,
  ERR_PAYMENT_ALREADY_REGISTERED,
  ERR_PAYMENT_CANCELLED,
} from "@/lib/error-messages"

// Standard user/workspace mock
const WORKSPACE_ID = "ws_test_123"
const CLERK_ID = "clerk_test_user_123"
const mockUser = {
  id: "user_1",
  clerkId: CLERK_ID,
  workspace: { id: WORKSPACE_ID },
}

describe("receivable actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ userId: CLERK_ID })
    mockDb.user.findUnique.mockResolvedValue(mockUser)
  })

  // ─── createCharge ─────────────────────────────────────────────
  describe("createCharge", () => {
    const validInput = {
      patientId: "p1",
      description: "Consulta odontológica",
      totalAmount: 10000, // R$100,00
      discount: 0,
      installments: 1,
      firstDueDate: "2026-04-15",
    }

    it("cria cobrança com sucesso e retorna dados completos", async () => {
      const createdCharge = {
        id: "charge_1",
        workspaceId: WORKSPACE_ID,
        patientId: "p1",
        description: "Consulta odontológica",
        totalAmount: 10000,
        discount: 0,
        netAmount: 10000,
        status: "pending",
        payments: [{ id: "pay_1", installmentNumber: 1, amount: 10000, status: "pending" }],
        patient: { id: "p1", name: "Maria Silva" },
      }

      mockDb.patient.findUnique.mockResolvedValue({ id: "p1", workspaceId: WORKSPACE_ID })
      mockDb.charge.create.mockResolvedValue({ id: "charge_1" })
      mockDb.payment.create.mockResolvedValue({})
      mockDb.charge.findUnique.mockResolvedValue(createdCharge)

      const result = await createCharge(validInput)

      expect(result).not.toHaveProperty("error")
      expect(result).toMatchObject({ id: "charge_1", netAmount: 10000 })
      expect(mockDb.charge.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workspaceId: WORKSPACE_ID,
          patientId: "p1",
          totalAmount: 10000,
          discount: 0,
          netAmount: 10000,
          status: "pending",
          createdBy: CLERK_ID,
        }),
      })
    })

    it("cria múltiplas parcelas corretamente", async () => {
      const input = { ...validInput, totalAmount: 10000, installments: 3 }

      mockDb.patient.findUnique.mockResolvedValue({ id: "p1", workspaceId: WORKSPACE_ID })
      mockDb.charge.create.mockResolvedValue({ id: "charge_1" })
      mockDb.payment.create.mockResolvedValue({})
      mockDb.charge.findUnique.mockResolvedValue({ id: "charge_1", payments: [] })

      await createCharge(input)

      // 10000 / 3 = 3333 base, remainder 1 → first gets 3334
      expect(mockDb.payment.create).toHaveBeenCalledTimes(3)
      const firstCall = mockDb.payment.create.mock.calls[0][0]
      expect(firstCall.data.installmentNumber).toBe(1)
      expect(firstCall.data.amount).toBe(3334)
      expect(firstCall.data.totalInstallments).toBe(3)

      const secondCall = mockDb.payment.create.mock.calls[1][0]
      expect(secondCall.data.installmentNumber).toBe(2)
      expect(secondCall.data.amount).toBe(3333)
    })

    it("retorna erro quando paciente não encontrado", async () => {
      mockDb.patient.findUnique.mockResolvedValue(null)

      const result = await createCharge(validInput)

      expect(result).toHaveProperty("error", ERR_PATIENT_NOT_FOUND)
    })

    it("retorna erro quando paciente pertence a outro workspace", async () => {
      mockDb.patient.findUnique.mockResolvedValue({ id: "p1", workspaceId: "ws_other" })

      const result = await createCharge(validInput)

      expect(result).toHaveProperty("error", ERR_PATIENT_NOT_FOUND)
    })

    it("retorna erro quando consulta não encontrada", async () => {
      mockDb.patient.findUnique.mockResolvedValue({ id: "p1", workspaceId: WORKSPACE_ID })
      mockDb.appointment.findUnique.mockResolvedValue(null)

      const result = await createCharge({ ...validInput, appointmentId: "apt_nonexistent" })

      expect(result).toHaveProperty("error", ERR_APPOINTMENT_NOT_FOUND)
    })

    it("retorna erro para valor total zero ou negativo", async () => {
      const result = await createCharge({ ...validInput, totalAmount: 0 })

      expect(result).toHaveProperty("error", "Valor total deve ser maior que zero")
    })

    it("retorna erro para desconto negativo", async () => {
      const result = await createCharge({ ...validInput, discount: -100 })

      expect(result).toHaveProperty("error", "Desconto não pode ser negativo")
    })

    it("retorna erro para desconto maior que valor total", async () => {
      const result = await createCharge({ ...validInput, discount: 20000 })

      expect(result).toHaveProperty("error", "Desconto não pode ser maior que o valor total")
    })

    it("retorna erro para parcelas fora do intervalo 1-24", async () => {
      const result0 = await createCharge({ ...validInput, installments: 0 })
      expect(result0).toHaveProperty("error", "Parcelas devem ser entre 1 e 24")

      const result25 = await createCharge({ ...validInput, installments: 25 })
      expect(result25).toHaveProperty("error", "Parcelas devem ser entre 1 e 24")
    })

    it("retorna erro para descrição vazia", async () => {
      const result = await createCharge({ ...validInput, description: "   " })

      expect(result).toHaveProperty("error", "Descrição é obrigatória")
    })
  })

  // ─── recordPayment ───────────────────────────────────────────
  describe("recordPayment", () => {
    const validPaymentInput = {
      paidAmount: 5000,
      paymentMethod: "pix",
    }

    it("registra pagamento com sucesso e atualiza status da cobrança", async () => {
      const payment = {
        id: "pay_1",
        chargeId: "charge_1",
        workspaceId: WORKSPACE_ID,
        status: "pending",
        charge: { id: "charge_1", status: "pending" },
      }

      mockDb.payment.findUnique.mockResolvedValue(payment)
      mockDb.payment.update.mockResolvedValue({})
      mockDb.payment.findMany.mockResolvedValue([
        { id: "pay_1", status: "paid" },
      ])
      mockDb.charge.update.mockResolvedValue({})

      const result = await recordPayment("pay_1", validPaymentInput)

      expect(result).toEqual({ success: true })
      expect(mockDb.payment.update).toHaveBeenCalledWith({
        where: { id: "pay_1" },
        data: expect.objectContaining({
          paidAmount: 5000,
          paymentMethod: "pix",
          status: "paid",
        }),
      })
    })

    it("atualiza cobrança para 'partial' quando apenas algumas parcelas pagas", async () => {
      const payment = {
        id: "pay_1",
        chargeId: "charge_1",
        workspaceId: WORKSPACE_ID,
        status: "pending",
        charge: { id: "charge_1", status: "pending" },
      }

      mockDb.payment.findUnique.mockResolvedValue(payment)
      mockDb.payment.update.mockResolvedValue({})
      mockDb.payment.findMany.mockResolvedValue([
        { id: "pay_1", status: "paid" },
        { id: "pay_2", status: "pending" },
      ])
      mockDb.charge.update.mockResolvedValue({})

      await recordPayment("pay_1", validPaymentInput)

      expect(mockDb.charge.update).toHaveBeenCalledWith({
        where: { id: "charge_1" },
        data: { status: "partial" },
      })
    })

    it("atualiza cobrança para 'paid' quando todas parcelas pagas", async () => {
      const payment = {
        id: "pay_2",
        chargeId: "charge_1",
        workspaceId: WORKSPACE_ID,
        status: "pending",
        charge: { id: "charge_1", status: "partial" },
      }

      mockDb.payment.findUnique.mockResolvedValue(payment)
      mockDb.payment.update.mockResolvedValue({})
      mockDb.payment.findMany.mockResolvedValue([
        { id: "pay_1", status: "paid" },
        { id: "pay_2", status: "pending" }, // will be treated as paid (current payment)
      ])
      mockDb.charge.update.mockResolvedValue({})

      await recordPayment("pay_2", validPaymentInput)

      expect(mockDb.charge.update).toHaveBeenCalledWith({
        where: { id: "charge_1" },
        data: { status: "paid" },
      })
    })

    it("retorna erro quando pagamento não encontrado", async () => {
      mockDb.payment.findUnique.mockResolvedValue(null)

      const result = await recordPayment("pay_nonexistent", validPaymentInput)

      expect(result).toHaveProperty("error", ERR_PAYMENT_NOT_FOUND)
    })

    it("retorna erro quando pagamento pertence a outro workspace", async () => {
      mockDb.payment.findUnique.mockResolvedValue({
        id: "pay_1",
        workspaceId: "ws_other",
        status: "pending",
        charge: {},
      })

      const result = await recordPayment("pay_1", validPaymentInput)

      expect(result).toHaveProperty("error", ERR_UNAUTHORIZED)
    })

    it("retorna erro quando pagamento já registrado", async () => {
      mockDb.payment.findUnique.mockResolvedValue({
        id: "pay_1",
        workspaceId: WORKSPACE_ID,
        status: "paid",
        charge: {},
      })

      const result = await recordPayment("pay_1", validPaymentInput)

      expect(result).toHaveProperty("error", ERR_PAYMENT_ALREADY_REGISTERED)
    })

    it("retorna erro quando pagamento cancelado", async () => {
      mockDb.payment.findUnique.mockResolvedValue({
        id: "pay_1",
        workspaceId: WORKSPACE_ID,
        status: "cancelled",
        charge: {},
      })

      const result = await recordPayment("pay_1", validPaymentInput)

      expect(result).toHaveProperty("error", ERR_PAYMENT_CANCELLED)
    })

    it("retorna erro para valor pago zero ou negativo", async () => {
      const result = await recordPayment("pay_1", { ...validPaymentInput, paidAmount: 0 })

      expect(result).toHaveProperty("error", "Valor pago deve ser maior que zero")
    })
  })

  // ─── getCharges ──────────────────────────────────────────────
  describe("getCharges", () => {
    it("retorna cobranças paginadas com filtro de workspace", async () => {
      const charges = [
        {
          id: "charge_1",
          description: "Consulta",
          totalAmount: 10000,
          status: "pending",
          payments: [],
          patient: { id: "p1", name: "Maria Silva" },
        },
      ]

      mockDb.payment.updateMany.mockResolvedValue({ count: 0 })
      mockDb.payment.findMany.mockResolvedValue([])
      mockDb.charge.findMany.mockResolvedValue(charges)
      mockDb.charge.count.mockResolvedValue(1)

      const result = await getCharges({})

      expect(result.charges).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(20)
      expect(result.totalPages).toBe(1)

      const findManyCall = mockDb.charge.findMany.mock.calls[0][0]
      expect(findManyCall.where.workspaceId).toBe(WORKSPACE_ID)
    })

    it("aplica filtros de status e paciente", async () => {
      mockDb.payment.updateMany.mockResolvedValue({ count: 0 })
      mockDb.payment.findMany.mockResolvedValue([])
      mockDb.charge.findMany.mockResolvedValue([])
      mockDb.charge.count.mockResolvedValue(0)

      await getCharges({ status: "overdue", patientId: "p1" })

      const findManyCall = mockDb.charge.findMany.mock.calls[0][0]
      expect(findManyCall.where.status).toBe("overdue")
      expect(findManyCall.where.patientId).toBe("p1")
    })

    it("aplica filtros de data", async () => {
      mockDb.payment.updateMany.mockResolvedValue({ count: 0 })
      mockDb.payment.findMany.mockResolvedValue([])
      mockDb.charge.findMany.mockResolvedValue([])
      mockDb.charge.count.mockResolvedValue(0)

      await getCharges({ startDate: "2026-01-01", endDate: "2026-12-31" })

      const findManyCall = mockDb.charge.findMany.mock.calls[0][0]
      expect(findManyCall.where.createdAt).toBeDefined()
      expect(findManyCall.where.createdAt.gte).toEqual(new Date("2026-01-01"))
      expect(findManyCall.where.createdAt.lte).toEqual(new Date("2026-12-31"))
    })

    it("ignora filtro de status quando 'all'", async () => {
      mockDb.payment.updateMany.mockResolvedValue({ count: 0 })
      mockDb.payment.findMany.mockResolvedValue([])
      mockDb.charge.findMany.mockResolvedValue([])
      mockDb.charge.count.mockResolvedValue(0)

      await getCharges({ status: "all" })

      const findManyCall = mockDb.charge.findMany.mock.calls[0][0]
      expect(findManyCall.where.status).toBeUndefined()
    })

    it("retorna resultado vazio corretamente", async () => {
      mockDb.payment.updateMany.mockResolvedValue({ count: 0 })
      mockDb.payment.findMany.mockResolvedValue([])
      mockDb.charge.findMany.mockResolvedValue([])
      mockDb.charge.count.mockResolvedValue(0)

      const result = await getCharges({})

      expect(result.charges).toHaveLength(0)
      expect(result.total).toBe(0)
      expect(result.totalPages).toBe(0)
    })

    it("atualiza pagamentos vencidos para 'overdue' antes de listar", async () => {
      mockDb.payment.updateMany.mockResolvedValue({ count: 2 })
      mockDb.payment.findMany.mockResolvedValue([{ chargeId: "charge_1" }])
      mockDb.charge.updateMany.mockResolvedValue({ count: 1 })
      mockDb.charge.findMany.mockResolvedValue([])
      mockDb.charge.count.mockResolvedValue(0)

      await getCharges({})

      expect(mockDb.payment.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          workspaceId: WORKSPACE_ID,
          status: "pending",
          dueDate: expect.objectContaining({ lt: expect.any(Date) }),
        }),
        data: { status: "overdue" },
      })

      expect(mockDb.charge.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ["charge_1"] },
          status: { in: ["pending", "partial"] },
        },
        data: { status: "overdue" },
      })
    })
  })

  // ─── getCharge ───────────────────────────────────────────────
  describe("getCharge", () => {
    it("retorna cobrança com parcelas e dados do paciente", async () => {
      const charge = {
        id: "charge_1",
        workspaceId: WORKSPACE_ID,
        description: "Consulta",
        totalAmount: 10000,
        payments: [{ id: "pay_1", installmentNumber: 1 }],
        patient: { id: "p1", name: "Maria Silva", phone: "11999990000", email: "maria@test.com" },
      }

      mockDb.charge.findUnique.mockResolvedValue(charge)

      const result = await getCharge("charge_1")

      expect(result.id).toBe("charge_1")
      expect(result.payments).toHaveLength(1)
      expect(result.patient.name).toBe("Maria Silva")
    })

    it("lança erro quando cobrança não encontrada", async () => {
      mockDb.charge.findUnique.mockResolvedValue(null)

      await expect(getCharge("charge_nonexistent")).rejects.toThrow(ERR_RECEIVABLE_NOT_FOUND)
    })

    it("lança erro quando cobrança pertence a outro workspace", async () => {
      mockDb.charge.findUnique.mockResolvedValue({
        id: "charge_1",
        workspaceId: "ws_other",
      })

      await expect(getCharge("charge_1")).rejects.toThrow(ERR_RECEIVABLE_NOT_FOUND)
    })
  })

  // ─── getPatientBalance ───────────────────────────────────────
  describe("getPatientBalance", () => {
    it("retorna saldo pendente e vencido do paciente", async () => {
      mockDb.payment.findMany.mockResolvedValue([
        { amount: 5000, status: "pending" },
        { amount: 3000, status: "pending" },
        { amount: 2000, status: "overdue" },
      ])

      const result = await getPatientBalance("p1")

      expect(result.pending).toBe(8000)
      expect(result.overdue).toBe(2000)
      expect(result.total).toBe(10000)
    })

    it("retorna zeros quando paciente não tem pagamentos pendentes", async () => {
      mockDb.payment.findMany.mockResolvedValue([])

      const result = await getPatientBalance("p1")

      expect(result.pending).toBe(0)
      expect(result.overdue).toBe(0)
      expect(result.total).toBe(0)
    })

    it("filtra por workspaceId e patientId", async () => {
      mockDb.payment.findMany.mockResolvedValue([])

      await getPatientBalance("p1")

      expect(mockDb.payment.findMany).toHaveBeenCalledWith({
        where: {
          workspaceId: WORKSPACE_ID,
          charge: { patientId: "p1" },
          status: { in: ["pending", "overdue"] },
        },
        select: { amount: true, status: true },
      })
    })
  })

  // ─── getReceivablesSummary ───────────────────────────────────
  describe("getReceivablesSummary", () => {
    it("retorna resumo financeiro com valores corretos", async () => {
      mockDb.payment.updateMany.mockResolvedValue({ count: 0 })
      mockDb.payment.findMany.mockResolvedValue([])
      mockDb.payment.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 50000 } })    // pending
        .mockResolvedValueOnce({ _sum: { amount: 20000 } })    // overdue
        .mockResolvedValueOnce({ _sum: { paidAmount: 80000 } }) // paid this month
      mockDb.payment.count
        .mockResolvedValueOnce(10) // paid total
        .mockResolvedValueOnce(3)  // overdue total

      const result = await getReceivablesSummary()

      expect(result.totalPending).toBe(50000)
      expect(result.totalOverdue).toBe(20000)
      expect(result.receivedThisMonth).toBe(80000)
      // inadimplencia: 3 / (10 + 3) * 100 = 23.08%
      expect(result.inadimplenciaRate).toBe(23.08)
    })

    it("retorna zeros quando não há dados", async () => {
      mockDb.payment.updateMany.mockResolvedValue({ count: 0 })
      mockDb.payment.findMany.mockResolvedValue([])
      mockDb.payment.aggregate
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { paidAmount: null } })
      mockDb.payment.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)

      const result = await getReceivablesSummary()

      expect(result.totalPending).toBe(0)
      expect(result.totalOverdue).toBe(0)
      expect(result.receivedThisMonth).toBe(0)
      expect(result.inadimplenciaRate).toBe(0)
    })

    it("atualiza pagamentos vencidos antes de calcular resumo", async () => {
      mockDb.payment.updateMany.mockResolvedValue({ count: 0 })
      mockDb.payment.findMany.mockResolvedValue([])
      mockDb.payment.aggregate.mockResolvedValue({ _sum: { amount: null, paidAmount: null } })
      mockDb.payment.count.mockResolvedValue(0)

      await getReceivablesSummary()

      expect(mockDb.payment.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          workspaceId: WORKSPACE_ID,
          status: "pending",
        }),
        data: { status: "overdue" },
      })
    })
  })

  // ─── cancelCharge ────────────────────────────────────────────
  describe("cancelCharge", () => {
    it("cancela cobrança e parcelas pendentes/vencidas com sucesso", async () => {
      mockDb.charge.findUnique.mockResolvedValue({
        id: "charge_1",
        workspaceId: WORKSPACE_ID,
        status: "pending",
      })
      mockDb.payment.updateMany.mockResolvedValue({ count: 2 })
      mockDb.charge.update.mockResolvedValue({})

      const result = await cancelCharge("charge_1")

      expect(result).toEqual({ success: true })
      expect(mockDb.payment.updateMany).toHaveBeenCalledWith({
        where: {
          chargeId: "charge_1",
          status: { in: ["pending", "overdue"] },
        },
        data: { status: "cancelled" },
      })
      expect(mockDb.charge.update).toHaveBeenCalledWith({
        where: { id: "charge_1" },
        data: { status: "cancelled" },
      })
    })

    it("retorna erro quando cobrança não encontrada", async () => {
      mockDb.charge.findUnique.mockResolvedValue(null)

      const result = await cancelCharge("charge_nonexistent")

      expect(result).toHaveProperty("error", ERR_RECEIVABLE_NOT_FOUND)
    })

    it("retorna erro quando cobrança pertence a outro workspace", async () => {
      mockDb.charge.findUnique.mockResolvedValue({
        id: "charge_1",
        workspaceId: "ws_other",
        status: "pending",
      })

      const result = await cancelCharge("charge_1")

      expect(result).toHaveProperty("error", ERR_RECEIVABLE_NOT_FOUND)
    })

    it("retorna erro quando cobrança já cancelada", async () => {
      mockDb.charge.findUnique.mockResolvedValue({
        id: "charge_1",
        workspaceId: WORKSPACE_ID,
        status: "cancelled",
      })

      const result = await cancelCharge("charge_1")

      expect(result).toHaveProperty("error", "Cobrança já cancelada")
    })
  })

  // ─── Auth/Workspace guards ───────────────────────────────────
  describe("autenticação e workspace", () => {
    it("lança erro quando não autenticado (getCharges)", async () => {
      mockAuth.mockResolvedValue({ userId: null })

      await expect(getCharges({})).rejects.toThrow(ERR_UNAUTHORIZED)
    })

    it("lança erro quando workspace não configurado (getCharge)", async () => {
      mockDb.user.findUnique.mockResolvedValue({ id: "u1", clerkId: CLERK_ID, workspace: null })

      await expect(getCharge("charge_1")).rejects.toThrow(ERR_WORKSPACE_NOT_CONFIGURED)
    })
  })
})
