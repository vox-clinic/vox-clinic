import { describe, it, expect, beforeEach, vi } from "vitest"

// Mocks must be imported before the modules under test
import { mockDb } from "@/test/mocks/db"
import { mockAuth } from "@/test/mocks/auth"
import "@/test/mocks/services"

import {
  createCharge,
  recordPayment,
  getReceivablesSummary,
  getCharges,
  cancelCharge,
  getPatientBalance,
} from "@/server/actions/receivable"

// Standard workspace context
const WORKSPACE_ID = "ws_integration_123"
const CLERK_ID = "clerk_test_user_123"
const PATIENT_ID = "patient_1"
const APPOINTMENT_ID = "apt_1"

const mockUser = {
  id: "user_1",
  clerkId: CLERK_ID,
  workspace: { id: WORKSPACE_ID },
  memberships: [{ workspaceId: WORKSPACE_ID }],
}

describe("Fluxo de cobranca — ciclo de vida completo", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ userId: CLERK_ID })
    mockDb.user.findUnique.mockResolvedValue(mockUser)
    // Patient and appointment belong to workspace
    mockDb.patient.findUnique.mockResolvedValue({ id: PATIENT_ID, workspaceId: WORKSPACE_ID, name: "Maria Silva" })
    mockDb.appointment.findUnique.mockResolvedValue({ id: APPOINTMENT_ID, workspaceId: WORKSPACE_ID })
  })

  it("deve completar fluxo: criar cobranca -> registrar pagamento -> verificar resumo", async () => {
    const chargeId = "charge_1"
    const paymentId = "pay_1"

    // ─── STEP 1: Criar cobranca para consulta ────────────────
    mockDb.charge.create.mockResolvedValue({
      id: chargeId,
      workspaceId: WORKSPACE_ID,
      patientId: PATIENT_ID,
      appointmentId: APPOINTMENT_ID,
      description: "Consulta odontologica",
      totalAmount: 15000, // R$ 150,00 in centavos
      discount: 0,
      netAmount: 15000,
      status: "pending",
      createdBy: CLERK_ID,
    })
    mockDb.payment.create.mockResolvedValue({
      id: paymentId,
      chargeId,
      workspaceId: WORKSPACE_ID,
      installmentNumber: 1,
      totalInstallments: 1,
      amount: 15000,
      status: "pending",
    })
    mockDb.charge.findUnique.mockResolvedValue({
      id: chargeId,
      workspaceId: WORKSPACE_ID,
      patientId: PATIENT_ID,
      description: "Consulta odontologica",
      totalAmount: 15000,
      discount: 0,
      netAmount: 15000,
      status: "pending",
      payments: [
        { id: paymentId, installmentNumber: 1, totalInstallments: 1, amount: 15000, status: "pending" },
      ],
      patient: { id: PATIENT_ID, name: "Maria Silva" },
    })

    const chargeResult = await createCharge({
      patientId: PATIENT_ID,
      appointmentId: APPOINTMENT_ID,
      description: "Consulta odontologica",
      totalAmount: 15000,
      discount: 0,
      installments: 1,
      firstDueDate: "2026-04-30",
    })

    expect("error" in chargeResult).toBe(false)
    if (!("error" in chargeResult)) {
      expect(chargeResult.id).toBe(chargeId)
      expect(chargeResult.totalAmount).toBe(15000)
      expect(chargeResult.payments).toHaveLength(1)
      expect(chargeResult.patient.name).toBe("Maria Silva")
    }

    // ─── STEP 2: Registrar pagamento ─────────────────────────
    mockDb.payment.findUnique.mockResolvedValue({
      id: paymentId,
      chargeId,
      workspaceId: WORKSPACE_ID,
      amount: 15000,
      status: "pending",
      charge: { id: chargeId, status: "pending" },
    })
    mockDb.payment.update.mockResolvedValue({
      id: paymentId,
      status: "paid",
      paidAmount: 15000,
      paymentMethod: "pix",
    })
    // After recording payment, all sibling payments are checked
    mockDb.payment.findMany.mockResolvedValue([
      { id: paymentId, chargeId, status: "paid", amount: 15000 },
    ])
    mockDb.charge.update.mockResolvedValue({ id: chargeId, status: "paid" })

    const payResult = await recordPayment(paymentId, {
      paidAmount: 15000,
      paymentMethod: "pix",
      paidAt: "2026-04-15T10:00:00.000Z",
    })

    expect("error" in payResult).toBe(false)
    if (!("error" in payResult)) {
      expect(payResult.success).toBe(true)
    }

    // Verify charge status was updated to "paid" (all installments paid)
    expect(mockDb.charge.update).toHaveBeenCalledWith({
      where: { id: chargeId },
      data: { status: "paid" },
    })

    // ─── STEP 3: Verificar resumo financeiro ─────────────────
    // Update overdue mock (no overdue payments)
    mockDb.payment.updateMany.mockResolvedValue({ count: 0 })
    mockDb.payment.findMany.mockResolvedValue([]) // no overdue charges
    mockDb.charge.updateMany.mockResolvedValue({ count: 0 })

    mockDb.payment.aggregate
      .mockResolvedValueOnce({ _sum: { amount: 0 } })         // pending
      .mockResolvedValueOnce({ _sum: { amount: 0 } })         // overdue
      .mockResolvedValueOnce({ _sum: { paidAmount: 15000 } }) // paid this month
    mockDb.payment.count
      .mockResolvedValueOnce(1)  // total paid
      .mockResolvedValueOnce(0)  // total overdue

    const summary = await getReceivablesSummary()

    expect(summary.totalPending).toBe(0)
    expect(summary.totalOverdue).toBe(0)
    expect(summary.receivedThisMonth).toBe(15000)
    expect(summary.inadimplenciaRate).toBe(0)
  })

  it("deve criar cobranca parcelada e registrar pagamentos parciais", async () => {
    const chargeId = "charge_parceled"
    const paymentIds = ["pay_p1", "pay_p2", "pay_p3"]

    // ─── STEP 1: Criar cobranca em 3 parcelas ───────────────
    mockDb.charge.create.mockResolvedValue({
      id: chargeId,
      totalAmount: 30000, // R$ 300
      discount: 0,
      netAmount: 30000,
      status: "pending",
    })
    // Payment.create called 3 times
    mockDb.payment.create
      .mockResolvedValueOnce({ id: paymentIds[0], amount: 10000, installmentNumber: 1 })
      .mockResolvedValueOnce({ id: paymentIds[1], amount: 10000, installmentNumber: 2 })
      .mockResolvedValueOnce({ id: paymentIds[2], amount: 10000, installmentNumber: 3 })

    mockDb.charge.findUnique.mockResolvedValue({
      id: chargeId,
      workspaceId: WORKSPACE_ID,
      patientId: PATIENT_ID,
      description: "Tratamento ortodontico",
      totalAmount: 30000,
      discount: 0,
      netAmount: 30000,
      status: "pending",
      payments: [
        { id: paymentIds[0], installmentNumber: 1, totalInstallments: 3, amount: 10000, status: "pending" },
        { id: paymentIds[1], installmentNumber: 2, totalInstallments: 3, amount: 10000, status: "pending" },
        { id: paymentIds[2], installmentNumber: 3, totalInstallments: 3, amount: 10000, status: "pending" },
      ],
      patient: { id: PATIENT_ID, name: "Maria Silva" },
    })

    const chargeResult = await createCharge({
      patientId: PATIENT_ID,
      description: "Tratamento ortodontico",
      totalAmount: 30000,
      discount: 0,
      installments: 3,
      firstDueDate: "2026-05-01",
    })

    expect("error" in chargeResult).toBe(false)
    if (!("error" in chargeResult)) {
      expect(chargeResult.payments).toHaveLength(3)
    }

    // Verify 3 payments were created
    expect(mockDb.payment.create).toHaveBeenCalledTimes(3)

    // ─── STEP 2: Pagar primeira parcela ──────────────────────
    mockDb.payment.findUnique.mockResolvedValue({
      id: paymentIds[0],
      chargeId,
      workspaceId: WORKSPACE_ID,
      amount: 10000,
      status: "pending",
      charge: { id: chargeId, status: "pending" },
    })
    mockDb.payment.update.mockResolvedValue({ id: paymentIds[0], status: "paid" })
    // Siblings: first paid, second and third still pending
    mockDb.payment.findMany.mockResolvedValue([
      { id: paymentIds[0], chargeId, status: "paid", amount: 10000 },
      { id: paymentIds[1], chargeId, status: "pending", amount: 10000 },
      { id: paymentIds[2], chargeId, status: "pending", amount: 10000 },
    ])
    mockDb.charge.update.mockResolvedValue({ id: chargeId, status: "partial" })

    await recordPayment(paymentIds[0], {
      paidAmount: 10000,
      paymentMethod: "cartao",
    })

    // Charge should be "partial" — some paid, some pending
    expect(mockDb.charge.update).toHaveBeenCalledWith({
      where: { id: chargeId },
      data: { status: "partial" },
    })

    // ─── STEP 3: Verificar saldo do paciente ─────────────────
    mockDb.payment.findMany.mockResolvedValue([
      { amount: 10000, status: "pending" },
      { amount: 10000, status: "pending" },
    ])

    const balance = await getPatientBalance(PATIENT_ID)
    expect(balance.pending).toBe(20000) // 2 remaining installments
    expect(balance.overdue).toBe(0)
    expect(balance.total).toBe(20000)
  })

  it("deve aplicar desconto corretamente na cobranca", async () => {
    const chargeId = "charge_discount"

    mockDb.charge.create.mockResolvedValue({
      id: chargeId,
      totalAmount: 20000,
      discount: 5000,
      netAmount: 15000,
      status: "pending",
    })
    mockDb.payment.create.mockResolvedValue({
      id: "pay_discount",
      amount: 15000, // netAmount after discount
      installmentNumber: 1,
    })
    mockDb.charge.findUnique.mockResolvedValue({
      id: chargeId,
      workspaceId: WORKSPACE_ID,
      patientId: PATIENT_ID,
      description: "Limpeza com desconto",
      totalAmount: 20000,
      discount: 5000,
      netAmount: 15000,
      status: "pending",
      payments: [{ id: "pay_discount", amount: 15000, installmentNumber: 1, status: "pending" }],
      patient: { id: PATIENT_ID, name: "Maria Silva" },
    })

    const result = await createCharge({
      patientId: PATIENT_ID,
      description: "Limpeza com desconto",
      totalAmount: 20000,
      discount: 5000,
      installments: 1,
      firstDueDate: "2026-05-15",
    })

    expect("error" in result).toBe(false)
    if (!("error" in result)) {
      expect(result.netAmount).toBe(15000)
      expect(result.discount).toBe(5000)
    }

    // Verify charge was created with correct netAmount
    expect(mockDb.charge.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        totalAmount: 20000,
        discount: 5000,
        netAmount: 15000,
      }),
    })
  })

  it("deve impedir pagamento duplicado", async () => {
    const paymentId = "pay_already_paid"

    // Payment already marked as paid
    mockDb.payment.findUnique.mockResolvedValue({
      id: paymentId,
      chargeId: "charge_x",
      workspaceId: WORKSPACE_ID,
      amount: 10000,
      status: "paid",
      charge: { id: "charge_x", status: "paid" },
    })

    const result = await recordPayment(paymentId, {
      paidAmount: 10000,
      paymentMethod: "pix",
    })

    expect("error" in result).toBe(true)
    if ("error" in result) {
      expect(result.error).toContain("já foi registrado")
    }
  })

  it("deve cancelar cobranca e atualizar parcelas pendentes", async () => {
    const chargeId = "charge_cancel"

    // ─── STEP 1: Criar cobranca ──────────────────────────────
    mockDb.charge.create.mockResolvedValue({ id: chargeId, status: "pending" })
    mockDb.payment.create.mockResolvedValue({ id: "pay_c1", amount: 10000 })
    mockDb.charge.findUnique.mockResolvedValue({
      id: chargeId,
      workspaceId: WORKSPACE_ID,
      patientId: PATIENT_ID,
      description: "Consulta cancelada",
      totalAmount: 10000,
      discount: 0,
      netAmount: 10000,
      status: "pending",
      payments: [{ id: "pay_c1", amount: 10000, installmentNumber: 1, status: "pending" }],
      patient: { id: PATIENT_ID, name: "Maria Silva" },
    })

    await createCharge({
      patientId: PATIENT_ID,
      description: "Consulta cancelada",
      totalAmount: 10000,
      discount: 0,
      installments: 1,
      firstDueDate: "2026-06-01",
    })

    // ─── STEP 2: Cancelar cobranca ──────────────────────────
    // Reset findUnique mock for cancelCharge (uses $transaction → tx.charge.findUnique)
    mockDb.charge.findUnique.mockResolvedValue({
      id: chargeId,
      workspaceId: WORKSPACE_ID,
      status: "pending",
    })
    mockDb.payment.updateMany.mockResolvedValue({ count: 1 })
    mockDb.charge.update.mockResolvedValue({ id: chargeId, status: "cancelled" })

    const cancelResult = await cancelCharge(chargeId)
    expect("error" in cancelResult).toBe(false)
    if (!("error" in cancelResult)) {
      expect(cancelResult.success).toBe(true)
    }

    // Verify payments were cancelled
    expect(mockDb.payment.updateMany).toHaveBeenCalledWith({
      where: {
        chargeId,
        status: { in: ["pending", "overdue"] },
      },
      data: { status: "cancelled" },
    })

    // Verify charge was cancelled
    expect(mockDb.charge.update).toHaveBeenCalledWith({
      where: { id: chargeId },
      data: { status: "cancelled" },
    })
  })

  it("deve rejeitar cobranca com valor zero ou negativo", async () => {
    const zeroResult = await createCharge({
      patientId: PATIENT_ID,
      description: "Cobranca invalida",
      totalAmount: 0,
      discount: 0,
      installments: 1,
      firstDueDate: "2026-05-01",
    })

    expect("error" in zeroResult).toBe(true)
    if ("error" in zeroResult) {
      expect(zeroResult.error).toContain("maior que zero")
    }

    const negativeResult = await createCharge({
      patientId: PATIENT_ID,
      description: "Cobranca invalida",
      totalAmount: -1000,
      discount: 0,
      installments: 1,
      firstDueDate: "2026-05-01",
    })

    expect("error" in negativeResult).toBe(true)
  })

  it("deve listar cobrancas filtradas por status", async () => {
    // Mock overdue update operations
    mockDb.payment.updateMany.mockResolvedValue({ count: 0 })
    mockDb.payment.findMany.mockResolvedValue([])
    mockDb.charge.updateMany.mockResolvedValue({ count: 0 })

    // Mock the charges query
    mockDb.charge.findMany.mockResolvedValue([
      {
        id: "charge_a",
        status: "pending",
        totalAmount: 10000,
        patient: { id: PATIENT_ID, name: "Maria Silva" },
        payments: [{ id: "pay_a", amount: 10000, status: "pending", installmentNumber: 1 }],
        createdAt: new Date("2026-04-01"),
      },
    ])
    mockDb.charge.count.mockResolvedValue(1)

    const result = await getCharges({ status: "pending", page: 1, pageSize: 20 })

    expect(result.charges).toHaveLength(1)
    expect(result.charges[0].status).toBe("pending")
    expect(result.total).toBe(1)
  })
})
