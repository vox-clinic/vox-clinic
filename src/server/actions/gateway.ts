"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { createGatewayClient } from "@/lib/gateway"
import type { GatewayPaymentMethod } from "@/lib/gateway"
import {
  ERR_UNAUTHORIZED,
  ERR_WORKSPACE_NOT_CONFIGURED,
  ERR_PAYMENT_NOT_FOUND,
  ERR_PAYMENT_CANCELLED,
  ERR_GATEWAY_NOT_CONFIGURED,
  ERR_GATEWAY_CHARGE_FAILED,
  ERR_GATEWAY_PAYMENT_NOT_FOUND,
  ActionError,
  safeAction,
} from "@/lib/error-messages"
import { logAudit } from "@/lib/audit"

async function getWorkspaceContext() {
  const { userId } = await auth()
  if (!userId) throw new Error(ERR_UNAUTHORIZED)

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: {
      workspace: true,
      memberships: { select: { workspaceId: true }, take: 1 },
    },
  })

  const workspaceId = user?.workspace?.id ?? user?.memberships?.[0]?.workspaceId
  if (!workspaceId) throw new Error(ERR_WORKSPACE_NOT_CONFIGURED)

  return { workspaceId, clerkId: userId }
}

// ─── createGatewayCharge ──────────────────────────────────────

export const createGatewayCharge = safeAction(
  async (paymentId: string, method: GatewayPaymentMethod, installmentCount?: number) => {
    const { workspaceId, clerkId } = await getWorkspaceContext()

    // 1. Load gateway config
    const config = await db.gatewayConfig.findUnique({
      where: { workspaceId },
    })

    if (!config || !config.isActive) {
      throw new ActionError(ERR_GATEWAY_NOT_CONFIGURED)
    }

    // 2. Load payment with charge and patient
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: {
        charge: {
          include: {
            patient: true,
          },
        },
      },
    })

    if (!payment) throw new ActionError(ERR_PAYMENT_NOT_FOUND)
    if (payment.workspaceId !== workspaceId) throw new ActionError(ERR_UNAUTHORIZED)
    if (payment.status === "paid") throw new ActionError("Este pagamento ja foi confirmado.")
    if (payment.status === "cancelled") throw new ActionError(ERR_PAYMENT_CANCELLED)

    // 3. If there's already a gateway charge, return existing data
    if (payment.gatewayChargeId) {
      return {
        chargeId: payment.gatewayChargeId,
        paymentLink: payment.paymentLink,
        pixQrCode: payment.pixQrCode,
        pixCopiaECola: payment.pixCopiaECola,
        boletoUrl: payment.boletoUrl,
        boletoBarcode: payment.boletoBarcode,
        status: payment.gatewayStatus,
        alreadyExists: true,
      }
    }

    // 4. Create charge in gateway
    const client = createGatewayClient({
      provider: config.provider,
      apiKey: config.apiKey,
      sandboxMode: config.sandboxMode,
    })

    const patient = payment.charge.patient

    let result
    try {
      result = await client.createCharge({
        customerName: patient.name,
        customerDocument: patient.document || undefined,
        customerEmail: patient.email || undefined,
        customerPhone: patient.phone || undefined,
        amount: payment.amount,
        dueDate: payment.dueDate.toISOString(),
        description: payment.charge.description,
        method,
        installmentCount: method === "credit_card" && installmentCount && installmentCount > 1 ? installmentCount : undefined,
        externalReference: payment.id,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : ERR_GATEWAY_CHARGE_FAILED
      throw new ActionError(msg)
    }

    // 5. Save gateway data to payment
    await db.payment.update({
      where: { id: paymentId },
      data: {
        gatewayProvider: config.provider,
        gatewayChargeId: result.chargeId,
        gatewayStatus: result.status,
        paymentLink: result.paymentLink || null,
        pixQrCode: result.pixQrCode || null,
        pixCopiaECola: result.pixCopiaECola || null,
        boletoUrl: result.boletoUrl || null,
        boletoBarcode: result.boletoBarcode || null,
      },
    })

    // 6. Audit log
    logAudit({
      workspaceId,
      userId: clerkId,
      action: "gateway.charge_created",
      entityType: "Payment",
      entityId: paymentId,
      details: {
        provider: config.provider,
        method,
        chargeId: result.chargeId,
        amount: payment.amount,
      },
    }).catch(() => {})

    return {
      chargeId: result.chargeId,
      paymentLink: result.paymentLink,
      pixQrCode: result.pixQrCode,
      pixCopiaECola: result.pixCopiaECola,
      boletoUrl: result.boletoUrl,
      boletoBarcode: result.boletoBarcode,
      status: result.status,
      alreadyExists: false,
    }
  }
)

// ─── checkGatewayStatus ───────────────────────────────────────

export const checkGatewayStatus = safeAction(async (paymentId: string) => {
  const { workspaceId } = await getWorkspaceContext()

  const payment = await db.payment.findUnique({
    where: { id: paymentId },
  })

  if (!payment) throw new ActionError(ERR_PAYMENT_NOT_FOUND)
  if (payment.workspaceId !== workspaceId) throw new ActionError(ERR_UNAUTHORIZED)
  if (!payment.gatewayChargeId) throw new ActionError(ERR_GATEWAY_PAYMENT_NOT_FOUND)

  const config = await db.gatewayConfig.findUnique({
    where: { workspaceId },
  })

  if (!config) throw new ActionError(ERR_GATEWAY_NOT_CONFIGURED)

  const client = createGatewayClient({
    provider: config.provider,
    apiKey: config.apiKey,
    sandboxMode: config.sandboxMode,
  })

  const result = await client.getChargeStatus(payment.gatewayChargeId)

  // Update local status
  await db.payment.update({
    where: { id: paymentId },
    data: {
      gatewayStatus: result.status,
    },
  })

  // If paid at gateway, record the payment locally
  if (result.status === "paid" && payment.status !== "paid") {
    await recordGatewayPayment(
      paymentId,
      result.paidAmount ?? payment.amount,
      result.paymentMethod,
      result.paidAt ? new Date(result.paidAt) : new Date()
    )
  }

  return {
    status: result.status,
    paidAt: result.paidAt,
    paidAmount: result.paidAmount,
  }
})

// ─── cancelGatewayCharge ──────────────────────────────────────

export const cancelGatewayCharge = safeAction(async (paymentId: string) => {
  const { workspaceId, clerkId } = await getWorkspaceContext()

  const payment = await db.payment.findUnique({
    where: { id: paymentId },
  })

  if (!payment) throw new ActionError(ERR_PAYMENT_NOT_FOUND)
  if (payment.workspaceId !== workspaceId) throw new ActionError(ERR_UNAUTHORIZED)
  if (!payment.gatewayChargeId) throw new ActionError(ERR_GATEWAY_PAYMENT_NOT_FOUND)
  if (payment.status === "paid") throw new ActionError("Pagamento ja confirmado. Nao e possivel cancelar.")

  const config = await db.gatewayConfig.findUnique({
    where: { workspaceId },
  })

  if (!config) throw new ActionError(ERR_GATEWAY_NOT_CONFIGURED)

  const client = createGatewayClient({
    provider: config.provider,
    apiKey: config.apiKey,
    sandboxMode: config.sandboxMode,
  })

  try {
    await client.cancelCharge(payment.gatewayChargeId)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao cancelar cobranca no gateway"
    throw new ActionError(msg)
  }

  // Clear gateway data from payment
  await db.payment.update({
    where: { id: paymentId },
    data: {
      gatewayStatus: "cancelled",
      paymentLink: null,
      pixQrCode: null,
      pixCopiaECola: null,
      boletoUrl: null,
      boletoBarcode: null,
    },
  })

  // Audit log
  logAudit({
    workspaceId,
    userId: clerkId,
    action: "gateway.charge_cancelled",
    entityType: "Payment",
    entityId: paymentId,
    details: {
      provider: config.provider,
      chargeId: payment.gatewayChargeId,
    },
  }).catch(() => {})

  return { success: true }
})

// ─── Helper: Record a gateway-confirmed payment ─────────────

/**
 * Records payment from gateway webhook/status check.
 * Reuses the same logic as manual recordPayment for updating Charge status.
 */
export async function recordGatewayPayment(
  paymentId: string,
  paidAmount: number,
  paymentMethod?: string,
  paidAt?: Date
) {
  return db.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      include: { charge: true },
    })

    if (!payment || payment.status === "paid") return

    // Map gateway method to our method names
    const methodMap: Record<string, string> = {
      pix: "pix",
      boleto: "boleto",
      credit_card: "credito",
      debit_card: "debito",
    }
    const method = paymentMethod
      ? methodMap[paymentMethod] || paymentMethod
      : payment.paymentMethod

    await tx.payment.update({
      where: { id: paymentId },
      data: {
        paidAmount,
        paymentMethod: method,
        paidAt: paidAt || new Date(),
        status: "paid",
        webhookReceivedAt: new Date(),
      },
    })

    // Update charge status based on sibling payments
    const siblings = await tx.payment.findMany({
      where: { chargeId: payment.chargeId },
    })

    const allPaid = siblings.every((s) =>
      s.id === paymentId ? true : s.status === "paid"
    )
    const somePaid = siblings.some((s) =>
      s.id === paymentId ? true : s.status === "paid"
    )

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

    // Audit log for gateway payment
    if (payment.workspaceId) {
      logAudit({
        workspaceId: payment.workspaceId,
        userId: "system",
        action: "gateway.payment_received",
        entityType: "Payment",
        entityId: paymentId,
        details: { paidAmount, paymentMethod, method },
      }).catch(() => {})
    }

    // Create notification for the professional
    if (payment.workspaceId) {
      const workspace = await tx.workspace.findUnique({
        where: { id: payment.workspaceId },
        select: { userId: true, user: { select: { clerkId: true } } },
      })

      if (workspace) {
        await tx.notification.create({
          data: {
            workspaceId: payment.workspaceId,
            userId: workspace.user.clerkId,
            type: "payment_confirmed",
            title: "Pagamento confirmado",
            body: `Pagamento de ${(paidAmount / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} foi confirmado via ${method || "gateway"}.`,
            entityType: "Payment",
            entityId: paymentId,
          },
        })
      }
    }
  })
}
