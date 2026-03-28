"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { getStripe, PLAN_PRICE_IDS } from "@/lib/stripe"
import { logger } from "@/lib/logger"

async function getWorkspaceWithUser() {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true, memberships: { select: { workspaceId: true }, take: 1 } },
  })

  const workspace = user?.workspace
  const workspaceId = workspace?.id ?? user?.memberships?.[0]?.workspaceId
  if (!workspaceId) throw new Error("Workspace not configured")

  // If workspace came from membership, fetch it
  const ws = workspace ?? await db.workspace.findUnique({ where: { id: workspaceId } })
  if (!ws) throw new Error("Workspace not found")

  return { user: user!, workspace: ws }
}

export async function createCheckoutSession(planKey: "pro" | "enterprise") {
  const { user, workspace } = await getWorkspaceWithUser()

  const priceId = PLAN_PRICE_IDS[planKey]
  if (!priceId) {
    throw new Error(`Preco nao configurado para o plano ${planKey}. Configure STRIPE_PRICE_${planKey.toUpperCase()} no ambiente.`)
  }

  // Get or create Stripe Customer
  let stripeCustomerId = workspace.stripeCustomerId

  if (!stripeCustomerId) {
    const customer = await getStripe().customers.create({
      email: user.email ?? undefined,
      name: user.name ?? undefined,
      metadata: {
        workspaceId: workspace.id,
        clerkUserId: user.clerkId,
      },
    })
    stripeCustomerId = customer.id

    await db.workspace.update({
      where: { id: workspace.id },
      data: { stripeCustomerId },
    })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.voxclinic.com"

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/settings/billing?success=true`,
    cancel_url: `${baseUrl}/settings/billing?cancelled=true`,
    metadata: {
      workspaceId: workspace.id,
      planKey,
    },
  })

  return { url: session.url }
}

export async function createPortalSession() {
  const { workspace } = await getWorkspaceWithUser()

  if (!workspace.stripeCustomerId) {
    throw new Error("Nenhuma assinatura encontrada. Assine um plano primeiro.")
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.voxclinic.com"

  const session = await getStripe().billingPortal.sessions.create({
    customer: workspace.stripeCustomerId,
    return_url: `${baseUrl}/settings/billing`,
  })

  return { url: session.url }
}

export async function getBillingInfo() {
  const { workspace } = await getWorkspaceWithUser()

  const result: {
    plan: string
    planStatus: string
    trialEndsAt: Date | null
    currentPeriodEnd: Date | null
    cancelAtPeriodEnd: boolean
  } = {
    plan: workspace.plan,
    planStatus: workspace.planStatus,
    trialEndsAt: workspace.trialEndsAt,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  }

  if (workspace.stripeSubId) {
    try {
      const subscription = await getStripe().subscriptions.retrieve(workspace.stripeSubId)
      result.cancelAtPeriodEnd = subscription.cancel_at_period_end
      // In Stripe v21+, current_period_end moved to SubscriptionItem
      const firstItem = subscription.items?.data?.[0]
      if (firstItem?.current_period_end) {
        result.currentPeriodEnd = new Date(firstItem.current_period_end * 1000)
      }
    } catch (err) {
      logger.error("Failed to retrieve Stripe subscription", { action: "getBillingInfo", entityType: "Workspace", entityId: workspace.id }, err)
    }
  }

  return result
}
