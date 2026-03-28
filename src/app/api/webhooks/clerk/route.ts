import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { Webhook } from 'svix'
import { db } from '@/lib/db'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET to .env.local')
  }

  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing svix headers', { status: 400 })
  }

  const payload = await req.json()
  const body = JSON.stringify(payload)

  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    logger.warn("Clerk webhook signature verification failed", { action: "POST /api/webhooks/clerk" })
    return new Response('Invalid signature', { status: 400 })
  }

  try {
    if (evt.type === 'user.created') {
      const { id, email_addresses, first_name, last_name, public_metadata } = evt.data
      const email = email_addresses[0]?.email_address ?? ''
      const name = [first_name, last_name].filter(Boolean).join(' ') || 'Usuario'

      // Determine role: from Clerk metadata or from SUPERADMIN_EMAILS env
      const superadminEmails = (env.SUPERADMIN_EMAILS).split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
      const clerkRole = (public_metadata as Record<string, string>)?.role
      const role = clerkRole === 'superadmin' || superadminEmails.includes(email.toLowerCase())
        ? 'superadmin'
        : 'user'

      await db.user.upsert({
        where: { clerkId: id },
        update: { email, name, role },
        create: { clerkId: id, email, name, role },
      })
    }

    if (evt.type === 'user.updated') {
      const { id, email_addresses, first_name, last_name, public_metadata } = evt.data
      const email = email_addresses[0]?.email_address ?? ''
      const name = [first_name, last_name].filter(Boolean).join(' ') || 'Usuario'

      const clerkRole = (public_metadata as Record<string, string>)?.role
      const updateData: Record<string, string> = { email, name }
      if (clerkRole === 'superadmin') updateData.role = 'superadmin'

      await db.user.updateMany({
        where: { clerkId: id },
        data: updateData,
      })
    }

    if (evt.type === 'user.deleted') {
      const { id } = evt.data
      if (id) {
        // Soft-delete: deactivate workspace instead of cascade-deleting all data.
        // Medical records must be retained for 20 years per CFM regulations.
        const user = await db.user.findUnique({
          where: { clerkId: id },
          include: { workspace: true },
        })
        if (user?.workspace) {
          await db.workspace.update({
            where: { id: user.workspace.id },
            data: { planStatus: 'canceled' },
          })
        }
        // Deactivate all patients in the workspace to prevent data access
        if (user?.workspace) {
          await db.patient.updateMany({
            where: { workspaceId: user.workspace.id },
            data: { isActive: false },
          })
        }
      }
    }
  } catch (err) {
    logger.error("Clerk webhook event processing failed", { action: `POST /api/webhooks/clerk [${evt.type}]` }, err)
    return new Response('Webhook processing error', { status: 500 })
  }

  return new Response('OK', { status: 200 })
}
