"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { logAudit } from "@/lib/audit"
import { checkTeamMemberLimit } from "@/lib/plan-enforcement"
import { sendEmail } from "@/lib/email"
import { logger } from "@/lib/logger"
import { ERR_UNAUTHORIZED, ERR_USER_NOT_FOUND, ERR_WORKSPACE_NOT_CONFIGURED, ERR_WORKSPACE_NOT_FOUND, ERR_TEAM_PERMISSION, ERR_ALREADY_MEMBER, ERR_IS_OWNER, ERR_INVITE_PENDING, ERR_INVITE_NOT_FOUND, ERR_MEMBER_NOT_FOUND, ERR_ALREADY_IN_WORKSPACE, ERR_INVITE_USED, ERR_INVITE_EXPIRED, ERR_INVITE_WRONG_EMAIL, ActionError } from "@/lib/error-messages"

async function getAuthContext() {
  const { userId } = await auth()
  if (!userId) throw new Error(ERR_UNAUTHORIZED)
  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true, memberships: { select: { workspaceId: true }, take: 1 } },
  })
  if (!user) throw new Error(ERR_USER_NOT_FOUND)
  const workspaceId = user.workspace?.id ?? user.memberships?.[0]?.workspaceId
  if (!workspaceId) throw new Error(ERR_WORKSPACE_NOT_CONFIGURED)
  return { userId, user, workspaceId }
}

async function requireOwnerOrAdmin(workspaceId: string, userId: string) {
  // Check if user is workspace owner
  const workspace = await db.workspace.findUnique({ where: { id: workspaceId } })
  const owner = workspace ? await db.user.findUnique({ where: { id: workspace.userId } }) : null
  if (owner?.clerkId === userId) return "owner"

  // Check membership role
  const member = await db.workspaceMember.findFirst({
    where: { workspaceId, user: { clerkId: userId } },
  })
  if (member?.role === "admin" || member?.role === "owner") return member.role
  throw new Error(ERR_TEAM_PERMISSION)
}

export async function getTeamMembers() {
  const { workspaceId } = await getAuthContext()

  // Get workspace owner
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    include: { user: { select: { id: true, clerkId: true, name: true, email: true } } },
  })
  if (!workspace) throw new Error(ERR_WORKSPACE_NOT_FOUND)

  // Get all members
  const members = await db.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: { select: { id: true, clerkId: true, name: true, email: true } } },
    orderBy: { invitedAt: "asc" },
  })

  // Get pending invites
  const invites = await db.workspaceInvite.findMany({
    where: { workspaceId, status: "pending" },
    orderBy: { createdAt: "desc" },
  })

  return {
    owner: {
      id: workspace.user.id,
      name: workspace.user.name,
      email: workspace.user.email,
      role: "owner" as const,
    },
    members: members.map((m) => ({
      id: m.id,
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      invitedAt: m.invitedAt.toISOString(),
    })),
    invites: invites.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      status: inv.status,
      createdAt: inv.createdAt.toISOString(),
      expiresAt: inv.expiresAt.toISOString(),
    })),
  }
}

export async function inviteTeamMember(email: string, role: string = "member") {
  const { userId, user, workspaceId } = await getAuthContext()
  await requireOwnerOrAdmin(workspaceId, userId)

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.trim())) throw new ActionError("Formato de email invalido.")

  const validRoles = ["admin", "member"]
  if (!validRoles.includes(role)) throw new ActionError("Role invalido")

  // Plan enforcement: check team member limit
  const workspace = await db.workspace.findUnique({ where: { id: workspaceId }, select: { plan: true } })
  const planCheck = await checkTeamMemberLimit(workspaceId, workspace?.plan ?? "free")
  if (!planCheck.allowed) throw new ActionError(planCheck.reason!)

  // Check if already a member
  const existingUser = await db.user.findUnique({ where: { email } })
  if (existingUser) {
    const existingMember = await db.workspaceMember.findFirst({
      where: { workspaceId, userId: existingUser.id },
    })
    if (existingMember) throw new ActionError(ERR_ALREADY_MEMBER)

    // Also check if they're the owner
    const workspace = await db.workspace.findUnique({ where: { id: workspaceId } })
    if (workspace?.userId === existingUser.id) throw new ActionError(ERR_IS_OWNER)
  }

  // Check for existing pending invite
  const existingInvite = await db.workspaceInvite.findFirst({
    where: { workspaceId, email, status: "pending" },
  })
  if (existingInvite) throw new ActionError(ERR_INVITE_PENDING)

  // Create invite (7 day expiry)
  const invite = await db.workspaceInvite.create({
    data: {
      workspaceId,
      email,
      role,
      invitedBy: userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })

  // Send invite email
  try {
    await sendEmail({
      to: email,
      subject: `Convite para ${user.clinicName ?? "VoxClinic"}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #14B8A6;">VoxClinic</h2>
          <p><strong>${user.name}</strong> convidou voce para participar do workspace <strong>${user.clinicName ?? "VoxClinic"}</strong> como <strong>${role === "admin" ? "Administrador" : "Membro"}</strong>.</p>
          <p>Para aceitar o convite, crie uma conta ou faca login no VoxClinic usando este email (<strong>${email}</strong>).</p>
          <p style="color: #666; font-size: 12px;">Este convite expira em 7 dias.</p>
        </div>
      `,
    })
  } catch (err) {
    logger.error("Failed to send team invite email", { action: "inviteTeamMember", entityType: "WorkspaceInvite", workspaceId }, err)
  }

  await logAudit({
    workspaceId,
    userId,
    action: "team.invited",
    entityType: "WorkspaceInvite",
    entityId: invite.id,
    details: { email, role },
  })

  return { id: invite.id }
}

export async function cancelInvite(inviteId: string) {
  const { userId, workspaceId } = await getAuthContext()
  await requireOwnerOrAdmin(workspaceId, userId)

  const invite = await db.workspaceInvite.findFirst({
    where: { id: inviteId, workspaceId, status: "pending" },
  })
  if (!invite) throw new Error(ERR_INVITE_NOT_FOUND)

  await db.workspaceInvite.update({
    where: { id: inviteId },
    data: { status: "expired" },
  })

  return { success: true }
}

export async function updateMemberRole(memberId: string, role: string) {
  const { userId, workspaceId } = await getAuthContext()
  await requireOwnerOrAdmin(workspaceId, userId)

  const validRoles = ["admin", "member"]
  if (!validRoles.includes(role)) throw new ActionError("Role invalido")

  const member = await db.workspaceMember.findFirst({
    where: { id: memberId, workspaceId },
  })
  if (!member) throw new Error(ERR_MEMBER_NOT_FOUND)

  await db.workspaceMember.update({
    where: { id: memberId },
    data: { role },
  })

  await logAudit({
    workspaceId,
    userId,
    action: "team.roleChanged",
    entityType: "WorkspaceMember",
    entityId: memberId,
    details: { newRole: role },
  })

  return { success: true }
}

export async function removeMember(memberId: string) {
  const { userId, workspaceId } = await getAuthContext()
  await requireOwnerOrAdmin(workspaceId, userId)

  const member = await db.workspaceMember.findFirst({
    where: { id: memberId, workspaceId },
  })
  if (!member) throw new Error(ERR_MEMBER_NOT_FOUND)

  await db.workspaceMember.delete({ where: { id: memberId } })

  await logAudit({
    workspaceId,
    userId,
    action: "team.removed",
    entityType: "WorkspaceMember",
    entityId: memberId,
  })

  return { success: true }
}

export async function acceptInvite(token: string) {
  const { userId } = await getAuthContext()

  const user = await db.user.findUnique({ where: { clerkId: userId } })
  if (!user) throw new Error(ERR_UNAUTHORIZED)

  const result = await db.$transaction(async (tx) => {
    const invite = await tx.workspaceInvite.findUnique({ where: { token } })
    if (!invite) throw new ActionError(ERR_INVITE_NOT_FOUND)
    if (invite.status !== "pending") throw new ActionError(ERR_INVITE_USED)
    if (invite.expiresAt < new Date()) throw new ActionError(ERR_INVITE_EXPIRED)
    if (invite.email !== user.email) throw new ActionError(ERR_INVITE_WRONG_EMAIL)

    // Check if already a member (handle race condition)
    const existing = await tx.workspaceMember.findFirst({
      where: { workspaceId: invite.workspaceId, userId: user.id },
    })
    if (existing) throw new ActionError(ERR_ALREADY_IN_WORKSPACE)

    await tx.workspaceMember.create({
      data: {
        workspaceId: invite.workspaceId,
        userId: user.id,
        role: invite.role,
      },
    })

    await tx.workspaceInvite.update({
      where: { id: invite.id },
      data: { status: "accepted" },
    })

    return { workspaceId: invite.workspaceId }
  })

  return result
}
