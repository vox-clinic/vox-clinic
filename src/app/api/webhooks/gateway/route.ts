import { NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"
import { db } from "@/lib/db"
import { decrypt } from "@/lib/crypto"
import { logger } from "@/lib/logger"
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit"
import { recordGatewayPayment } from "@/server/actions/gateway"

/**
 * Timing-safe comparison of two strings.
 * Returns false if either value is empty or lengths differ.
 */
function safeCompare(a: string, b: string): boolean {
  if (!a || !b) return false
  try {
    const bufA = Buffer.from(a)
    const bufB = Buffer.from(b)
    if (bufA.length !== bufB.length) return false
    return timingSafeEqual(bufA, bufB)
  } catch {
    return false
  }
}

/**
 * POST /api/webhooks/gateway
 *
 * Handles incoming webhooks from payment gateways (Asaas).
 * Always returns 200 to prevent retries (even on processing errors),
 * EXCEPT for authentication failures (401/403/429).
 *
 * Asaas webhook docs: https://docs.asaas.com/docs/webhooks
 */
export async function POST(request: Request) {
  // ─── Rate limiting ──────────────────────────────────────────
  const clientIp = getClientIp(request)
  const rl = rateLimit(`webhook:gateway:${clientIp}`, 60_000, 60)
  if (!rl.allowed) {
    logger.warn("Webhook gateway rate limit excedido", {
      action: "webhook.gateway.rate_limit",
      clientIp,
    } as Record<string, unknown>)
    return rateLimitResponse(rl.resetAt)
  }

  // ─── Extract auth token ─────────────────────────────────────
  const webhookToken = request.headers.get("asaas-access-token")

  if (!webhookToken) {
    logger.warn("Webhook gateway sem token de autenticacao", {
      action: "webhook.gateway.missing_token",
      clientIp,
    } as Record<string, unknown>)
    return NextResponse.json(
      { error: "Token de autenticacao ausente" },
      { status: 401 }
    )
  }

  // ─── Parse body ─────────────────────────────────────────────
  let body: Record<string, unknown>

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const event = body.event as string | undefined
  const payment = body.payment as Record<string, unknown> | undefined

  if (!event || !payment) {
    return NextResponse.json({ error: "Missing event or payment" }, { status: 400 })
  }

  const gatewayChargeId = payment.id as string | undefined
  const externalReference = payment.externalReference as string | undefined

  // Find the VoxClinic Payment by gatewayChargeId or externalReference
  let localPayment = null

  if (gatewayChargeId) {
    localPayment = await db.payment.findFirst({
      where: { gatewayChargeId },
    })
  }

  if (!localPayment && externalReference) {
    localPayment = await db.payment.findUnique({
      where: { id: externalReference },
    })
  }

  // Determine workspaceId from the payment
  const workspaceId = localPayment?.workspaceId

  // ─── Verify webhook token against stored API key ────────────
  if (workspaceId) {
    const gatewayConfig = await db.gatewayConfig.findUnique({
      where: { workspaceId },
      select: { apiKey: true, isActive: true },
    })

    if (!gatewayConfig || !gatewayConfig.isActive) {
      logger.warn("Webhook gateway config nao encontrada ou inativa", {
        action: "webhook.gateway.config_not_found",
        workspaceId,
        clientIp,
      } as Record<string, unknown>)
      return NextResponse.json(
        { error: "Configuracao de gateway nao encontrada" },
        { status: 403 }
      )
    }

    const decryptedKey = decrypt(gatewayConfig.apiKey)

    if (!safeCompare(webhookToken, decryptedKey)) {
      logger.warn("Webhook gateway token invalido", {
        action: "webhook.gateway.invalid_token",
        workspaceId,
        clientIp,
      } as Record<string, unknown>)
      return NextResponse.json(
        { error: "Token de autenticacao invalido" },
        { status: 403 }
      )
    }

    logger.info("Webhook gateway autenticado com sucesso", {
      action: "webhook.gateway.authenticated",
      workspaceId,
      eventType: event,
    } as Record<string, unknown>)
  } else {
    // Payment not found — we can't verify the token against a specific workspace.
    // Log and return 200 without processing (same as before, but now logged with context).
    logger.warn("Webhook gateway pagamento nao encontrado para verificacao", {
      action: "webhook.gateway.payment_not_found",
      clientIp,
      eventType: event,
      gatewayChargeId,
    } as Record<string, unknown>)
  }

  // Log webhook (always, even if we can't find the payment)
  await db.gatewayWebhookLog.create({
    data: {
      workspaceId: workspaceId || "unknown",
      provider: "asaas",
      eventType: event,
      paymentId: localPayment?.id || null,
      rawPayload: body as Record<string, string | number | boolean | null>,
      processed: false,
    },
  })

  if (!localPayment) {
    // We logged it but can't process — return 200 to avoid retries
    return NextResponse.json({ received: true, processed: false })
  }

  // ─── Process events ─────────────────────────────────────────

  try {
    switch (event) {
      case "PAYMENT_RECEIVED":
      case "PAYMENT_CONFIRMED": {
        const value = payment.value as number | undefined
        const confirmedDate = payment.confirmedDate as string | undefined
        const billingType = payment.billingType as string | undefined

        await recordGatewayPayment(
          localPayment.id,
          value ? Math.round(value * 100) : localPayment.amount,
          billingType?.toLowerCase(),
          confirmedDate ? new Date(confirmedDate) : new Date()
        )

        // Mark webhook as processed
        await db.gatewayWebhookLog.updateMany({
          where: {
            paymentId: localPayment.id,
            eventType: event,
            processed: false,
          },
          data: { processed: true },
        })
        break
      }

      case "PAYMENT_OVERDUE": {
        await db.payment.update({
          where: { id: localPayment.id },
          data: {
            gatewayStatus: "overdue",
            status:
              localPayment.status === "pending" ? "overdue" : localPayment.status,
          },
        })

        // Update charge if needed
        if (localPayment.status === "pending") {
          const charge = await db.charge.findUnique({
            where: { id: localPayment.chargeId },
          })
          if (charge && charge.status === "pending") {
            await db.charge.update({
              where: { id: charge.id },
              data: { status: "overdue" },
            })
          }
        }

        await db.gatewayWebhookLog.updateMany({
          where: {
            paymentId: localPayment.id,
            eventType: event,
            processed: false,
          },
          data: { processed: true },
        })
        break
      }

      case "PAYMENT_REFUNDED":
      case "PAYMENT_REFUND_IN_PROGRESS": {
        await db.payment.update({
          where: { id: localPayment.id },
          data: {
            gatewayStatus: "refunded",
            status: "refunded",
          },
        })

        await db.gatewayWebhookLog.updateMany({
          where: {
            paymentId: localPayment.id,
            eventType: event,
            processed: false,
          },
          data: { processed: true },
        })
        break
      }

      case "PAYMENT_DELETED": {
        await db.payment.update({
          where: { id: localPayment.id },
          data: {
            gatewayStatus: "cancelled",
            gatewayChargeId: null,
            paymentLink: null,
            pixQrCode: null,
            pixCopiaECola: null,
            boletoUrl: null,
            boletoBarcode: null,
          },
        })

        await db.gatewayWebhookLog.updateMany({
          where: {
            paymentId: localPayment.id,
            eventType: event,
            processed: false,
          },
          data: { processed: true },
        })
        break
      }

      default:
        // Unknown event — logged but not processed
        break
    }
  } catch (err) {
    // Log error but still return 200 to prevent webhook retries
    logger.error("Erro ao processar webhook gateway", {
      action: "webhook.gateway.processing_error",
      workspaceId: workspaceId || undefined,
      eventType: event,
    }, err)
  }

  return NextResponse.json({ received: true, processed: true })
}
