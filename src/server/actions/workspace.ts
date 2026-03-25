"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { generateWorkspaceSuggestions } from "@/lib/claude"
import type { WorkspaceConfig, Procedure, CustomField, AnamnesisQuestion, Category } from "@/types"

async function getAuthenticatedUser() {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")
  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true },
  })
  if (!user) throw new Error("User not found")
  return user
}

export async function getWorkspace() {
  const user = await getAuthenticatedUser()
  if (!user.workspace) throw new Error("Workspace not configured")
  return {
    id: user.workspace.id,
    professionType: user.workspace.professionType,
    procedures: user.workspace.procedures as any[],
    customFields: user.workspace.customFields as any[],
    anamnesisTemplate: user.workspace.anamnesisTemplate as any[],
    categories: user.workspace.categories as any[],
    clinicName: user.clinicName,
    profession: user.profession,
  }
}

export async function updateWorkspace(data: {
  procedures?: any[]
  customFields?: any[]
  anamnesisTemplate?: any[]
  categories?: any[]
  clinicName?: string
}) {
  const user = await getAuthenticatedUser()
  if (!user.workspace) throw new Error("Workspace not configured")

  const { clinicName, ...workspaceData } = data

  if (Object.keys(workspaceData).length > 0) {
    await db.workspace.update({
      where: { id: user.workspace.id },
      data: workspaceData,
    })
  }

  if (clinicName !== undefined) {
    await db.user.update({
      where: { id: user.id },
      data: { clinicName },
    })
  }

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
    procedures: (config.procedures ?? []) as any,
    customFields: (config.customFields ?? []) as any,
    anamnesisTemplate: (config.anamnesisTemplate ?? []) as any,
    categories: (config.categories ?? []) as any,
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
