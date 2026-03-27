"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { generateWorkspaceSuggestions } from "@/lib/claude"
import { logAudit } from "@/lib/audit"
import type { Prisma } from "@prisma/client"
import { readProcedures, readCustomFields, readAnamnesisTemplate, readCategories, toJsonValue } from "@/lib/json-helpers"
import type { WorkspaceConfig, Procedure, CustomField, AnamnesisQuestion, Category } from "@/types"

async function getAuthenticatedUser() {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")
  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true, memberships: { select: { workspaceId: true }, take: 1 } },
  })
  if (!user) throw new Error("User not found")
  return user
}

export async function getWorkspace() {
  const user = await getAuthenticatedUser()
  const workspaceId = user.workspace?.id ?? user.memberships?.[0]?.workspaceId
  if (!workspaceId) throw new Error("Workspace not configured")

  // Load workspace if not available via ownership (member fallback)
  const workspace = user.workspace ?? await db.workspace.findUnique({ where: { id: workspaceId } })
  if (!workspace) throw new Error("Workspace not configured")

  return {
    id: workspace.id,
    professionType: workspace.professionType,
    procedures: readProcedures(workspace.procedures),
    customFields: readCustomFields(workspace.customFields),
    anamnesisTemplate: readAnamnesisTemplate(workspace.anamnesisTemplate),
    categories: readCategories(workspace.categories),
    clinicName: user.clinicName,
    profession: user.profession,
  }
}

export async function updateWorkspace(data: {
  procedures?: Procedure[]
  customFields?: CustomField[]
  anamnesisTemplate?: AnamnesisQuestion[]
  categories?: Category[]
  clinicName?: string
}) {
  const user = await getAuthenticatedUser()
  const workspaceId = user.workspace?.id ?? user.memberships?.[0]?.workspaceId
  if (!workspaceId) throw new Error("Workspace not configured")

  const { clinicName, ...workspaceFields } = data

  // Convert typed arrays to Prisma-compatible JSON values
  const workspaceData: Record<string, Prisma.InputJsonValue> = {}
  if (workspaceFields.procedures) workspaceData.procedures = toJsonValue(workspaceFields.procedures)
  if (workspaceFields.customFields) workspaceData.customFields = toJsonValue(workspaceFields.customFields)
  if (workspaceFields.anamnesisTemplate) workspaceData.anamnesisTemplate = toJsonValue(workspaceFields.anamnesisTemplate)
  if (workspaceFields.categories) workspaceData.categories = toJsonValue(workspaceFields.categories)

  await db.$transaction(async (tx) => {
    if (Object.keys(workspaceData).length > 0) {
      await tx.workspace.update({
        where: { id: workspaceId },
        data: workspaceData,
      })
    }

    if (clinicName !== undefined) {
      await tx.user.update({
        where: { id: user.id },
        data: { clinicName },
      })
    }
  })

  return { success: true }
}

export async function generateWorkspace(
  profession: string,
  clinicName: string,
  config: {
    procedures: Procedure[]
    customFields: CustomField[]
    anamnesisTemplate: AnamnesisQuestion[]
    categories: Category[]
  }
) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  // Upsert user — in local dev the Clerk webhook may not reach localhost,
  // so we ensure the user record exists before creating the workspace.
  const clerkClient = await import("@clerk/nextjs/server").then((m) => m.clerkClient())
  const clerkUser = await clerkClient.users.getUser(userId)

  const jsonData = {
    procedures: toJsonValue(config.procedures ?? []),
    customFields: toJsonValue(config.customFields ?? []),
    anamnesisTemplate: toJsonValue(config.anamnesisTemplate ?? []),
    categories: toJsonValue(config.categories ?? []),
  }

  // Atomic: upsert User + Workspace + mark onboarding complete
  const workspace = await db.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { clerkId: userId },
      update: {},
      create: {
        clerkId: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
        name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || "Usuario",
      },
    })

    const ws = await tx.workspace.upsert({
      where: { userId: user.id },
      update: { professionType: profession, ...jsonData },
      create: { userId: user.id, professionType: profession, ...jsonData },
    })

    // Create default agenda for the workspace (idempotent)
    const existingAgenda = await tx.agenda.findFirst({
      where: { workspaceId: ws.id, isDefault: true },
    })
    if (!existingAgenda) {
      await tx.agenda.create({
        data: {
          workspaceId: ws.id,
          name: "Agenda Principal",
          color: "#14B8A6",
          isDefault: true,
        },
      })
    }

    await tx.user.update({
      where: { id: user.id },
      data: {
        profession,
        clinicName,
        onboardingComplete: true,
      },
    })

    return ws
  })

  // Log audit for workspace creation
  await logAudit({
    workspaceId: workspace.id,
    userId,
    action: "workspace.created",
    entityType: "Workspace",
    entityId: workspace.id,
  })

  return workspace
}

export async function getWorkspacePreview(
  profession: string,
  answers: Record<string, string>
): Promise<WorkspaceConfig> {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const config = await generateWorkspaceSuggestions(profession, answers)
  return {
    procedures: config.procedures ?? [],
    customFields: config.customFields ?? [],
    anamnesisTemplate: config.anamnesisTemplate ?? [],
    categories: config.categories ?? [],
  }
}
