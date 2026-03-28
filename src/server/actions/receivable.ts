"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { ERR_UNAUTHORIZED, ERR_WORKSPACE_NOT_CONFIGURED, ERR_PATIENT_NOT_FOUND, ERR_APPOINTMENT_NOT_FOUND, ERR_RECEIVABLE_NOT_FOUND, ERR_PAYMENT_NOT_FOUND, ERR_PAYMENT_ALREADY_REGISTERED, ERR_PAYMENT_CANCELLED, ActionError, safeAction } from "@/lib/error-messages"
import { requirePermission, normalizeRole, type WorkspaceRole } from "@/lib/permissions"
import { logAudit } from "@/lib/audit"

async function getWorkspaceContext() {
  const { userId } = await auth()
  if (!userId) throw new Error(ERR_UNAUTHORIZED)

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true, memberships: { select: { workspaceId: true, role: true }, take: 1 } },
  })

  const workspaceId = user?.workspace?.id ?? user?.memberships?.[0]?.workspaceId
  if (!workspaceId) throw new Error(ERR_WORKSPACE_NOT_CONFIGURED)

  const role: WorkspaceRole = user?.workspace ? "owner" : normalizeRole(user?.memberships?.[0]?.role ?? "doctor")

  return { workspaceId, clerkId: userId, role }
}

// ─── createCharge ────────────────────────────────────────────

interface CreateChargeInput {
  patientId: string
  appointmentId?: string
  treatmentPlanId?: string
  description: string
  totalAmount: number // centavos
  discount: number // centavos
  installments: number // 1-24
  firstDueDate: string // ISO date string
  notes?: string
}

export const createCharge = safeAction(async (input: CreateChargeInput) => {
  const { workspaceId, clerkId, role } = await getWorkspaceContext()
  requirePermission(role, "financial.edit")

  const {
    patientId,
    appointmentId,
    treatmentPlanId,
    description,
    totalAmount,
    discount,
    installments,
    firstDueDate,
    notes,
  } = input

  if (totalAmount <= 0) throw new ActionError("Valor total deve ser maior que zero")
  if (discount < 0) throw new ActionError("Desconto não pode ser negativo")
  if (discount > totalAmount) throw new ActionError("Desconto não pode ser maior que o valor total")
  if (installments < 1 || installments > 24) throw new ActionError("Parcelas devem ser entre 1 e 24")
  if (!description.trim()) throw new ActionError("Descrição é obrigatória")

  const netAmount = totalAmount - discount

  // Validate patient belongs to this workspace
  const patient = await db.patient.findUnique({ where: { id: patientId } })
  if (!patient || patient.workspaceId !== workspaceId) throw new ActionError(ERR_PATIENT_NOT_FOUND)

  // Validate appointment belongs to this workspace if provided
  if (appointmentId) {
    const appointment = await db.appointment.findUnique({ where: { id: appointmentId } })
    if (!appointment || appointment.workspaceId !== workspaceId) throw new ActionError(ERR_APPOINTMENT_NOT_FOUND)
  }

  // Split into installments — first absorbs remainder
  const baseAmount = Math.floor(netAmount / installments)
  const remainder = netAmount - baseAmount * installments
  const amounts: number[] = []
  for (let i = 0; i < installments; i++) {
    amounts.push(i === 0 ? baseAmount + remainder : baseAmount)
  }

  const firstDate = new Date(firstDueDate)

  return db.$transaction(async (tx) => {
    const charge = await tx.charge.create({
      data: {
        workspaceId,
        patientId,
        appointmentId: appointmentId || null,
        treatmentPlanId: treatmentPlanId || null,
        description: description.trim(),
        totalAmount,
        discount,
        netAmount,
        status: "pending",
        createdBy: clerkId,
        notes: notes?.trim() || null,
      },
    })

    for (let i = 0; i < installments; i++) {
      const dueDate = new Date(firstDate)
      const targetMonth = dueDate.getMonth() + i
      dueDate.setMonth(targetMonth)
      // Clamp to last day of target month if overflow occurred
      if (dueDate.getMonth() !== ((firstDate.getMonth() + i) % 12)) {
        dueDate.setDate(0) // goes to last day of previous month
      }

      await tx.payment.create({
        data: {
          chargeId: charge.id,
          workspaceId,
          installmentNumber: i + 1,
          totalInstallments: installments,
          amount: amounts[i],
          dueDate,
          status: "pending",
        },
      })
    }

    const created = await tx.charge.findUnique({
      where: { id: charge.id },
      include: { payments: { orderBy: { installmentNumber: "asc" } }, patient: { select: { id: true, name: true } } },
    })

    logAudit({
      workspaceId,
      userId: clerkId,
      action: "charge.created",
      entityType: "Charge",
      entityId: charge.id,
      details: { totalAmount, discount, installments, patientId },
    }).catch(() => {})

    return created!
  })
})

// ─── recordPayment ───────────────────────────────────────────

interface RecordPaymentInput {
  paidAmount: number // centavos
  paymentMethod: string
  paidAt?: string // ISO date string
  notes?: string
}

export const recordPayment = safeAction(async (paymentId: string, input: RecordPaymentInput) => {
  const { workspaceId, clerkId, role } = await getWorkspaceContext()
  requirePermission(role, "financial.edit")

  const { paidAmount, paymentMethod, paidAt, notes } = input

  if (paidAmount <= 0) throw new ActionError("Valor pago deve ser maior que zero")

  return db.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      include: { charge: true },
    })

    if (!payment) throw new ActionError(ERR_PAYMENT_NOT_FOUND)
    if (payment.workspaceId !== workspaceId) throw new ActionError(ERR_UNAUTHORIZED)
    if (payment.status === "paid") throw new ActionError(ERR_PAYMENT_ALREADY_REGISTERED)
    if (payment.status === "cancelled") throw new ActionError(ERR_PAYMENT_CANCELLED)

    await tx.payment.update({
      where: { id: paymentId },
      data: {
        paidAmount,
        paymentMethod,
        paidAt: paidAt ? new Date(paidAt) : new Date(),
        status: "paid",
        notes: notes?.trim() || null,
      },
    })

    // Check siblings to update charge status
    const siblings = await tx.payment.findMany({
      where: { chargeId: payment.chargeId },
    })

    const allPaid = siblings.every((s) => s.id === paymentId ? true : s.status === "paid")
    const somePaid = siblings.some((s) => s.id === paymentId ? true : s.status === "paid")

    let chargeStatus: string
    if (allPaid) {
      chargeStatus = "paid"
    } else if (somePaid) {
      chargeStatus = "partial"
    } else {
      chargeStatus = payment.charge.status
    }

    await tx.charge.update({
      where: { id: payment.chargeId },
      data: { status: chargeStatus },
    })

    logAudit({
      workspaceId,
      userId: clerkId,
      action: "payment.recorded",
      entityType: "Payment",
      entityId: paymentId,
      details: { paidAmount, paymentMethod, chargeId: payment.chargeId },
    }).catch(() => {})

    return { success: true }
  })
})

// ─── getCharges ──────────────────────────────────────────────

interface GetChargesInput {
  status?: string
  patientId?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

export async function getCharges(input: GetChargesInput = {}) {
  const { workspaceId, role } = await getWorkspaceContext()
  requirePermission(role, "financial.view")

  const { status, patientId, startDate, endDate, page = 1, pageSize = 20 } = input

  // Update overdue payments first
  const now = new Date()
  await db.payment.updateMany({
    where: {
      workspaceId,
      status: "pending",
      dueDate: { lt: now },
    },
    data: { status: "overdue" },
  })

  // Update charges that have overdue payments
  const chargesWithOverdue = await db.payment.findMany({
    where: {
      workspaceId,
      status: "overdue",
    },
    select: { chargeId: true },
    distinct: ["chargeId"],
  })

  if (chargesWithOverdue.length > 0) {
    await db.charge.updateMany({
      where: {
        id: { in: chargesWithOverdue.map((p) => p.chargeId) },
        status: { in: ["pending", "partial"] },
      },
      data: { status: "overdue" },
    })
  }

  // Build where clause
  const where: Record<string, unknown> = { workspaceId }
  if (status && status !== "all") {
    where.status = status
  }
  if (patientId) {
    where.patientId = patientId
  }
  if (startDate || endDate) {
    where.createdAt = {} as Record<string, Date>
    if (startDate) (where.createdAt as Record<string, Date>).gte = new Date(startDate)
    if (endDate) (where.createdAt as Record<string, Date>).lte = new Date(endDate)
  }

  const [charges, total] = await Promise.all([
    db.charge.findMany({
      where,
      include: {
        payments: { orderBy: { installmentNumber: "asc" } },
        patient: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.charge.count({ where }),
  ])

  return { charges, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

// ─── getCharge ───────────────────────────────────────────────

export async function getCharge(chargeId: string) {
  const { workspaceId, role } = await getWorkspaceContext()
  requirePermission(role, "financial.view")

  const charge = await db.charge.findUnique({
    where: { id: chargeId },
    include: {
      payments: { orderBy: { installmentNumber: "asc" } },
      patient: { select: { id: true, name: true, phone: true, email: true } },
    },
  })

  if (!charge || charge.workspaceId !== workspaceId) {
    throw new Error(ERR_RECEIVABLE_NOT_FOUND)
  }

  return charge
}

// ─── getPatientBalance ───────────────────────────────────────

export async function getPatientBalance(patientId: string) {
  const { workspaceId } = await getWorkspaceContext()

  const payments = await db.payment.findMany({
    where: {
      workspaceId,
      charge: { patientId },
      status: { in: ["pending", "overdue"] },
    },
    select: { amount: true, status: true },
  })

  let pending = 0
  let overdue = 0
  for (const p of payments) {
    if (p.status === "pending") pending += p.amount
    if (p.status === "overdue") overdue += p.amount
  }

  return { pending, overdue, total: pending + overdue }
}

// ─── getReceivablesSummary ───────────────────────────────────

export async function getReceivablesSummary() {
  const { workspaceId, role } = await getWorkspaceContext()
  requirePermission(role, "financial.view")

  // Update overdue first
  const now = new Date()
  await db.payment.updateMany({
    where: {
      workspaceId,
      status: "pending",
      dueDate: { lt: now },
    },
    data: { status: "overdue" },
  })

  // Update charges that have overdue payments
  const chargesWithOverdue = await db.payment.findMany({
    where: {
      workspaceId,
      status: "overdue",
    },
    select: { chargeId: true },
    distinct: ["chargeId"],
  })

  if (chargesWithOverdue.length > 0) {
    await db.charge.updateMany({
      where: {
        id: { in: chargesWithOverdue.map((p) => p.chargeId) },
        status: { in: ["pending", "partial"] },
      },
      data: { status: "overdue" },
    })
  }

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const [pendingPayments, overduePayments, paidThisMonth, paidTotal, overdueTotal] = await Promise.all([
    db.payment.aggregate({
      where: { workspaceId, status: "pending" },
      _sum: { amount: true },
    }),
    db.payment.aggregate({
      where: { workspaceId, status: "overdue" },
      _sum: { amount: true },
    }),
    db.payment.aggregate({
      where: {
        workspaceId,
        status: "paid",
        paidAt: { gte: monthStart, lte: monthEnd },
      },
      _sum: { paidAmount: true },
    }),
    db.payment.count({
      where: { workspaceId, status: "paid" },
    }),
    db.payment.count({
      where: { workspaceId, status: "overdue" },
    }),
  ])

  const totalPending = pendingPayments._sum.amount ?? 0
  const totalOverdue = overduePayments._sum.amount ?? 0
  const receivedThisMonth = paidThisMonth._sum.paidAmount ?? 0
  const inadimplenciaRate =
    paidTotal + overdueTotal > 0
      ? Math.round((overdueTotal / (paidTotal + overdueTotal)) * 10000) / 100
      : 0

  return { totalPending, totalOverdue, receivedThisMonth, inadimplenciaRate }
}

// ─── cancelCharge ────────────────────────────────────────────

export const cancelCharge = safeAction(async (chargeId: string) => {
  const { workspaceId, clerkId, role } = await getWorkspaceContext()
  requirePermission(role, "financial.edit")

  return db.$transaction(async (tx) => {
    const charge = await tx.charge.findUnique({
      where: { id: chargeId },
    })

    if (!charge || charge.workspaceId !== workspaceId) {
      throw new ActionError(ERR_RECEIVABLE_NOT_FOUND)
    }

    if (charge.status === "cancelled") {
      throw new ActionError("Cobrança já cancelada")
    }

    await tx.payment.updateMany({
      where: {
        chargeId,
        status: { in: ["pending", "overdue"] },
      },
      data: { status: "cancelled" },
    })

    await tx.charge.update({
      where: { id: chargeId },
      data: { status: "cancelled" },
    })

    logAudit({
      workspaceId,
      userId: clerkId,
      action: "charge.cancelled",
      entityType: "Charge",
      entityId: chargeId,
    }).catch(() => {})

    return { success: true }
  })
})
