"use server"

import { db } from "@/lib/db"
import { revalidateTag } from "next/cache"
import { logAudit } from "@/lib/audit"
import { requireWorkspaceRole } from "@/lib/auth-context"
import { requirePermission } from "@/lib/permissions"
import {
  ERR_QUOTE_NOT_FOUND,
  ERR_QUOTE_NOT_DRAFT,
  ERR_QUOTE_NO_ITEMS,
  ERR_QUOTE_ALREADY_APPROVED,
  ERR_QUOTE_ITEM_NOT_FOUND,
  ERR_QUOTE_ITEM_ALREADY_EXECUTED,
  ERR_PATIENT_NOT_FOUND,
  ActionError,
  safeAction,
} from "@/lib/error-messages"

export async function getQuotesForPatient(patientId: string) {
  const ctx = await requireWorkspaceRole()
  requirePermission(ctx.role, "quotes.view")

  const quotes = await db.quote.findMany({
    where: { workspaceId: ctx.workspaceId, patientId },
    include: {
      items: { select: { id: true, executionStatus: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return quotes.map((q) => ({
    id: q.id,
    status: q.status,
    totalAmount: q.totalAmount,
    discountAmount: q.discountAmount,
    finalAmount: q.finalAmount,
    paymentMethod: q.paymentMethod,
    notes: q.notes,
    itemCount: q.items.length,
    pendingItemCount: q.items.filter((i) => i.executionStatus === "pending").length,
    executedItemCount: q.items.filter((i) => i.executionStatus === "executed").length,
    createdAt: q.createdAt.toISOString(),
    approvedAt: q.approvedAt?.toISOString() ?? null,
  }))
}

export async function getClinicalProcedures(patientId: string) {
  const ctx = await requireWorkspaceRole()
  requirePermission(ctx.role, "quotes.view")

  const items = await db.quoteItem.findMany({
    where: {
      quote: {
        workspaceId: ctx.workspaceId,
        patientId,
        status: "approved",
      },
    },
    include: {
      quote: {
        select: { id: true, createdAt: true, approvedAt: true },
      },
    },
    orderBy: [{ executionStatus: "asc" }, { createdAt: "asc" }],
  })

  return items.map((i) => ({
    id: i.id,
    quoteId: i.quoteId,
    procedureName: i.procedureName,
    tooth: i.tooth,
    unitPrice: i.unitPrice,
    discount: i.discount,
    finalPrice: i.finalPrice,
    executionStatus: i.executionStatus,
    executedAt: i.executedAt?.toISOString() ?? null,
    executedBy: i.executedBy,
    executionNotes: i.executionNotes,
    quoteDate: i.quote.approvedAt?.toISOString() ?? i.quote.createdAt.toISOString(),
  }))
}

export async function getPatientFinancials(patientId: string) {
  const ctx = await requireWorkspaceRole()
  requirePermission(ctx.role, "quotes.view")

  const charges = await db.charge.findMany({
    where: { workspaceId: ctx.workspaceId, patientId, status: { not: "cancelled" } },
    include: {
      payments: { orderBy: { createdAt: "asc" } },
      quote: { select: { id: true, status: true, items: { select: { id: true, executionStatus: true } } } },
      appointment: { select: { id: true, date: true, procedures: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return charges.map((c) => {
    const totalPaid = c.payments
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + (p.paidAmount ?? p.amount), 0)

    return {
      id: c.id,
      description: c.description,
      totalAmount: c.totalAmount,
      discount: c.discount,
      netAmount: c.netAmount,
      status: c.status,
      totalPaid,
      remaining: c.netAmount - totalPaid,
      createdAt: c.createdAt.toISOString(),
      quoteId: c.quote?.id ?? null,
      quoteItemCount: c.quote?.items.length ?? null,
      quoteExecutedCount: c.quote?.items.filter((i) => i.executionStatus === "executed").length ?? null,
      appointmentId: c.appointment?.id ?? null,
      appointmentDate: c.appointment?.date.toISOString() ?? null,
      payments: c.payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        paidAmount: p.paidAmount,
        paidAt: p.paidAt?.toISOString() ?? null,
        paymentMethod: p.paymentMethod,
        status: p.status,
        createdAt: p.createdAt.toISOString(),
      })),
    }
  })
}

export const registerPayment = safeAction(async (data: {
  chargeId: string
  amount: number
  paymentMethod: string
}) => {
  const ctx = await requireWorkspaceRole()
  requirePermission(ctx.role, "financial.edit")

  const charge = await db.charge.findFirst({
    where: { id: data.chargeId, workspaceId: ctx.workspaceId },
    include: { payments: true },
  })
  if (!charge) throw new ActionError("Cobrança não encontrada.")

  const totalPaid = charge.payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + (p.paidAmount ?? p.amount), 0)

  const remaining = charge.netAmount - totalPaid
  if (data.amount > remaining) {
    throw new ActionError(`Valor excede o saldo restante de R$ ${(remaining / 100).toFixed(2)}.`)
  }

  const isFullyPaid = (totalPaid + data.amount) >= charge.netAmount

  await db.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        chargeId: data.chargeId,
        workspaceId: ctx.workspaceId,
        amount: data.amount,
        paidAmount: data.amount,
        paidAt: new Date(),
        paymentMethod: data.paymentMethod,
        status: "paid",
        dueDate: new Date(),
      },
    })
    await tx.charge.update({
      where: { id: data.chargeId },
      data: { status: isFullyPaid ? "paid" : "partial" },
    })
  })

  await logAudit({
    workspaceId: ctx.workspaceId,
    userId: ctx.clerkId,
    action: "payment.created",
    entityType: "Payment",
    entityId: data.chargeId,
  })

  revalidateTag("dashboard", "max")
  return { success: true }
})

export async function getPatientQuoteFinancials(patientId: string) {
  const ctx = await requireWorkspaceRole()
  requirePermission(ctx.role, "quotes.view")

  const quotes = await db.quote.findMany({
    where: {
      workspaceId: ctx.workspaceId,
      patientId,
      status: "approved",
    },
    include: {
      charge: {
        include: {
          payments: { orderBy: { createdAt: "asc" } },
        },
      },
      items: { select: { id: true, executionStatus: true } },
    },
    orderBy: { approvedAt: "desc" },
  })

  return quotes.map((q) => {
    const totalPaid = q.charge?.payments
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + (p.paidAmount ?? p.amount), 0) ?? 0

    return {
      id: q.id,
      finalAmount: q.finalAmount,
      totalPaid,
      remaining: q.finalAmount - totalPaid,
      paymentMethod: q.paymentMethod,
      approvedAt: q.approvedAt?.toISOString() ?? null,
      chargeId: q.chargeId,
      itemCount: q.items.length,
      executedCount: q.items.filter((i) => i.executionStatus === "executed").length,
      payments: q.charge?.payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        paidAmount: p.paidAmount,
        paidAt: p.paidAt?.toISOString() ?? null,
        paymentMethod: p.paymentMethod,
        status: p.status,
        createdAt: p.createdAt.toISOString(),
      })) ?? [],
    }
  })
}

export const registerQuotePayment = safeAction(async (data: {
  quoteId: string
  amount: number
  paymentMethod: string
}) => {
  const ctx = await requireWorkspaceRole()
  requirePermission(ctx.role, "financial.edit")

  const quote = await db.quote.findFirst({
    where: { id: data.quoteId, workspaceId: ctx.workspaceId, status: "approved" },
    include: { charge: { include: { payments: true } } },
  })
  if (!quote) throw new ActionError(ERR_QUOTE_NOT_FOUND)
  if (!quote.chargeId || !quote.charge) throw new ActionError("Orçamento sem cobrança vinculada.")

  const totalPaid = quote.charge.payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + (p.paidAmount ?? p.amount), 0)

  const remaining = quote.finalAmount - totalPaid
  if (data.amount > remaining) {
    throw new ActionError(`Valor excede o saldo restante de ${(remaining / 100).toFixed(2)}.`)
  }

  const newTotalPaid = totalPaid + data.amount
  const isFullyPaid = newTotalPaid >= quote.finalAmount

  await db.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        chargeId: quote.chargeId!,
        workspaceId: ctx.workspaceId,
        amount: data.amount,
        paidAmount: data.amount,
        paidAt: new Date(),
        paymentMethod: data.paymentMethod,
        status: "paid",
        dueDate: new Date(),
      },
    })

    await tx.charge.update({
      where: { id: quote.chargeId! },
      data: { status: isFullyPaid ? "paid" : "partial" },
    })
  })

  await logAudit({
    workspaceId: ctx.workspaceId,
    userId: ctx.clerkId,
    action: "payment.created",
    entityType: "Payment",
    entityId: quote.chargeId!,
  })

  revalidateTag("dashboard", "max")

  return { success: true }
})

export async function getPendingProcedures(patientId: string) {
  const ctx = await requireWorkspaceRole()
  requirePermission(ctx.role, "quotes.view")

  const items = await db.quoteItem.findMany({
    where: {
      quote: {
        workspaceId: ctx.workspaceId,
        patientId,
        status: "approved",
      },
      executionStatus: "pending",
    },
    include: {
      quote: {
        select: { id: true, createdAt: true, approvedAt: true, finalAmount: true },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  return items.map((i) => ({
    id: i.id,
    quoteId: i.quoteId,
    procedureName: i.procedureName,
    tooth: i.tooth,
    unitPrice: i.unitPrice,
    discount: i.discount,
    finalPrice: i.finalPrice,
    executionStatus: i.executionStatus,
    quoteDate: i.quote.approvedAt?.toISOString() ?? i.quote.createdAt.toISOString(),
  }))
}

export async function getQuote(quoteId: string) {
  const ctx = await requireWorkspaceRole()
  requirePermission(ctx.role, "quotes.view")

  const quote = await db.quote.findFirst({
    where: { id: quoteId, workspaceId: ctx.workspaceId },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      patient: { select: { id: true, name: true } },
    },
  })

  if (!quote) throw new ActionError(ERR_QUOTE_NOT_FOUND)

  return {
    ...quote,
    createdAt: quote.createdAt.toISOString(),
    updatedAt: quote.updatedAt.toISOString(),
    approvedAt: quote.approvedAt?.toISOString() ?? null,
    rejectedAt: quote.rejectedAt?.toISOString() ?? null,
    cancelledAt: quote.cancelledAt?.toISOString() ?? null,
    items: quote.items.map((i) => ({
      ...i,
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
      executedAt: i.executedAt?.toISOString() ?? null,
    })),
  }
}

interface CreateQuoteData {
  patientId: string
  items: Array<{
    procedureId?: string
    procedureName: string
    tooth?: string
    unitPrice: number
    discount?: number
  }>
  discountAmount?: number
  paymentMethod?: string
  notes?: string
}

export const createQuote = safeAction(async (data: CreateQuoteData) => {
  const ctx = await requireWorkspaceRole()
  requirePermission(ctx.role, "quotes.create")

  if (!data.items.length) throw new ActionError(ERR_QUOTE_NO_ITEMS)

  const patient = await db.patient.findFirst({
    where: { id: data.patientId, workspaceId: ctx.workspaceId },
  })
  if (!patient) throw new ActionError(ERR_PATIENT_NOT_FOUND)

  const itemsData = data.items.map((item, i) => {
    const discount = item.discount ?? 0
    return {
      procedureId: item.procedureId ?? null,
      procedureName: item.procedureName,
      tooth: item.tooth ?? null,
      unitPrice: item.unitPrice,
      discount,
      finalPrice: item.unitPrice - discount,
      sortOrder: i,
    }
  })

  const totalAmount = itemsData.reduce((sum, i) => sum + i.finalPrice, 0)
  const discountAmount = data.discountAmount ?? 0
  const finalAmount = totalAmount - discountAmount

  const quote = await db.$transaction(async (tx) => {
    const q = await tx.quote.create({
      data: {
        workspaceId: ctx.workspaceId,
        patientId: data.patientId,
        status: "draft",
        totalAmount,
        discountAmount,
        finalAmount,
        paymentMethod: data.paymentMethod ?? null,
        notes: data.notes ?? null,
        createdBy: ctx.clerkId,
        items: { create: itemsData },
      },
    })
    return q
  })

  await logAudit({
    workspaceId: ctx.workspaceId,
    userId: ctx.clerkId,
    action: "quote.created",
    entityType: "Quote",
    entityId: quote.id,
  })

  revalidateTag("patient-search", "max")

  return { quoteId: quote.id }
})

export const updateQuote = safeAction(async (quoteId: string, data: Omit<CreateQuoteData, "patientId">) => {
  const ctx = await requireWorkspaceRole()
  requirePermission(ctx.role, "quotes.create")

  if (!data.items.length) throw new ActionError(ERR_QUOTE_NO_ITEMS)

  const existing = await db.quote.findFirst({
    where: { id: quoteId, workspaceId: ctx.workspaceId },
  })
  if (!existing) throw new ActionError(ERR_QUOTE_NOT_FOUND)
  if (existing.status !== "draft") throw new ActionError(ERR_QUOTE_NOT_DRAFT)

  const itemsData = data.items.map((item, i) => {
    const discount = item.discount ?? 0
    return {
      procedureId: item.procedureId ?? null,
      procedureName: item.procedureName,
      tooth: item.tooth ?? null,
      unitPrice: item.unitPrice,
      discount,
      finalPrice: item.unitPrice - discount,
      sortOrder: i,
    }
  })

  const totalAmount = itemsData.reduce((sum, i) => sum + i.finalPrice, 0)
  const discountAmount = data.discountAmount ?? 0
  const finalAmount = totalAmount - discountAmount

  await db.$transaction(async (tx) => {
    await tx.quoteItem.deleteMany({ where: { quoteId } })
    await tx.quote.update({
      where: { id: quoteId },
      data: {
        totalAmount,
        discountAmount,
        finalAmount,
        paymentMethod: data.paymentMethod ?? null,
        notes: data.notes ?? null,
        items: { create: itemsData },
      },
    })
  })

  await logAudit({
    workspaceId: ctx.workspaceId,
    userId: ctx.clerkId,
    action: "quote.updated",
    entityType: "Quote",
    entityId: quoteId,
  })

  return { quoteId }
})

export const approveQuote = safeAction(async (data: { quoteId: string; recordingId?: string }) => {
  const ctx = await requireWorkspaceRole()
  requirePermission(ctx.role, "quotes.approve")

  const quote = await db.quote.findFirst({
    where: { id: data.quoteId, workspaceId: ctx.workspaceId },
    include: { items: true },
  })
  if (!quote) throw new ActionError(ERR_QUOTE_NOT_FOUND)
  if (quote.status !== "draft") throw new ActionError(ERR_QUOTE_ALREADY_APPROVED)

  const description = quote.items
    .map((i) => i.tooth ? `${i.procedureName} (dente ${i.tooth})` : i.procedureName)
    .join(", ")

  await db.$transaction(async (tx) => {
    const charge = await tx.charge.create({
      data: {
        workspaceId: ctx.workspaceId,
        patientId: quote.patientId,
        description,
        totalAmount: quote.totalAmount,
        discount: quote.discountAmount,
        netAmount: quote.finalAmount,
        status: "pending",
        createdBy: ctx.clerkId,
      },
    })

    await tx.quote.update({
      where: { id: data.quoteId },
      data: {
        status: "approved",
        approvedBy: ctx.clerkId,
        approvedAt: new Date(),
        chargeId: charge.id,
        recordingId: data.recordingId ?? null,
      },
    })
  })

  await logAudit({
    workspaceId: ctx.workspaceId,
    userId: ctx.clerkId,
    action: "quote.approved",
    entityType: "Quote",
    entityId: data.quoteId,
  })

  revalidateTag("patient-search", "max")
  revalidateTag("dashboard", "max")

  return { quoteId: data.quoteId }
})

export const rejectQuote = safeAction(async (quoteId: string) => {
  const ctx = await requireWorkspaceRole()
  requirePermission(ctx.role, "quotes.approve")

  const quote = await db.quote.findFirst({
    where: { id: quoteId, workspaceId: ctx.workspaceId },
  })
  if (!quote) throw new ActionError(ERR_QUOTE_NOT_FOUND)
  if (quote.status !== "draft") throw new ActionError(ERR_QUOTE_NOT_DRAFT)

  await db.quote.update({
    where: { id: quoteId },
    data: { status: "rejected", rejectedAt: new Date() },
  })

  await logAudit({
    workspaceId: ctx.workspaceId,
    userId: ctx.clerkId,
    action: "quote.rejected",
    entityType: "Quote",
    entityId: quoteId,
  })

  return { quoteId }
})

export const cancelQuote = safeAction(async (quoteId: string) => {
  const ctx = await requireWorkspaceRole()
  requirePermission(ctx.role, "quotes.approve")

  const quote = await db.quote.findFirst({
    where: { id: quoteId, workspaceId: ctx.workspaceId },
  })
  if (!quote) throw new ActionError(ERR_QUOTE_NOT_FOUND)
  if (quote.status !== "draft" && quote.status !== "approved") {
    throw new ActionError("Apenas orçamentos em rascunho ou aprovados podem ser cancelados.")
  }

  await db.$transaction(async (tx) => {
    if (quote.chargeId) {
      await tx.charge.update({
        where: { id: quote.chargeId },
        data: { status: "cancelled" },
      })
    }
    await tx.quote.update({
      where: { id: quoteId },
      data: { status: "cancelled", cancelledAt: new Date() },
    })
  })

  await logAudit({
    workspaceId: ctx.workspaceId,
    userId: ctx.clerkId,
    action: "quote.cancelled",
    entityType: "Quote",
    entityId: quoteId,
  })

  revalidateTag("patient-search", "max")
  revalidateTag("dashboard", "max")

  return { quoteId }
})

export const executeQuoteItem = safeAction(async (data: { quoteItemId: string; executionNotes?: string }) => {
  const ctx = await requireWorkspaceRole()
  requirePermission(ctx.role, "quotes.execute")

  const item = await db.quoteItem.findUnique({
    where: { id: data.quoteItemId },
    include: { quote: { select: { workspaceId: true, status: true, patientId: true } } },
  })
  if (!item) throw new ActionError(ERR_QUOTE_ITEM_NOT_FOUND)
  if (item.quote.workspaceId !== ctx.workspaceId) throw new ActionError(ERR_QUOTE_ITEM_NOT_FOUND)
  if (item.quote.status !== "approved") throw new ActionError("Orçamento precisa estar aprovado para executar procedimentos.")
  if (item.executionStatus === "executed") throw new ActionError(ERR_QUOTE_ITEM_ALREADY_EXECUTED)

  await db.quoteItem.update({
    where: { id: data.quoteItemId },
    data: {
      executionStatus: "executed",
      executedAt: new Date(),
      executedBy: ctx.clerkId,
      executionNotes: data.executionNotes ?? null,
    },
  })

  await logAudit({
    workspaceId: ctx.workspaceId,
    userId: ctx.clerkId,
    action: "quote.item.executed",
    entityType: "QuoteItem",
    entityId: data.quoteItemId,
  })

  return { quoteItemId: data.quoteItemId }
})

export const cancelQuoteItem = safeAction(async (quoteItemId: string) => {
  const ctx = await requireWorkspaceRole()
  requirePermission(ctx.role, "quotes.execute")

  const item = await db.quoteItem.findUnique({
    where: { id: quoteItemId },
    include: { quote: { select: { workspaceId: true } } },
  })
  if (!item) throw new ActionError(ERR_QUOTE_ITEM_NOT_FOUND)
  if (item.quote.workspaceId !== ctx.workspaceId) throw new ActionError(ERR_QUOTE_ITEM_NOT_FOUND)
  if (item.executionStatus !== "pending") throw new ActionError("Apenas itens pendentes podem ser cancelados.")

  await db.quoteItem.update({
    where: { id: quoteItemId },
    data: { executionStatus: "cancelled" },
  })

  await logAudit({
    workspaceId: ctx.workspaceId,
    userId: ctx.clerkId,
    action: "quote.item.cancelled",
    entityType: "QuoteItem",
    entityId: quoteItemId,
  })

  return { quoteItemId }
})
