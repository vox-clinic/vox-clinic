"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"

async function requireSuperAdmin() {
  const { userId } = await auth()
  if (!userId) throw new Error("Nao autenticado")
  const user = await db.user.findUnique({ where: { clerkId: userId } })
  if (!user || user.role !== "superadmin") throw new Error("Acesso negado")
  return user
}

export async function getAdminDashboard() {
  await requireSuperAdmin()

  const [
    totalWorkspaces,
    activeWorkspaces,
    totalUsers,
    totalPatients,
    totalAppointments,
    totalRecordings,
  ] = await Promise.all([
    db.workspace.count(),
    db.workspace.count({ where: { planStatus: "active" } }),
    db.user.count(),
    db.patient.count({ where: { isActive: true } }),
    db.appointment.count(),
    db.recording.count(),
  ])

  const planCounts = await db.workspace.groupBy({
    by: ["plan"],
    _count: true,
    where: { planStatus: "active" },
  })

  const recentWorkspaces = await db.workspace.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
  })

  return {
    totalWorkspaces,
    activeWorkspaces,
    totalUsers,
    totalPatients,
    totalAppointments,
    totalRecordings,
    planCounts,
    recentWorkspaces,
  }
}

export async function getAdminWorkspaces() {
  await requireSuperAdmin()

  const workspaces = await db.workspace.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      _count: {
        select: {
          patients: true,
          appointments: true,
          recordings: true,
          members: true,
        },
      },
    },
  })

  return workspaces
}

export async function getAdminWorkspaceDetail(workspaceId: string) {
  await requireSuperAdmin()

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      user: true,
      _count: {
        select: {
          patients: true,
          appointments: true,
          recordings: true,
          members: true,
        },
      },
    },
  })

  if (!workspace) throw new Error("Workspace nao encontrado")

  const [prescriptions, certificates] = await Promise.all([
    db.prescription.count({ where: { workspaceId } }),
    db.medicalCertificate.count({ where: { workspaceId } }),
  ])

  const recentAppointments = await db.appointment.findMany({
    where: { workspaceId },
    take: 5,
    orderBy: { date: "desc" },
    include: { patient: { select: { name: true } } },
  })

  return { workspace, prescriptions, certificates, recentAppointments }
}

export async function toggleWorkspaceStatus(workspaceId: string) {
  await requireSuperAdmin()

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
  })
  if (!workspace) throw new Error("Workspace nao encontrado")

  const newStatus = workspace.planStatus === "active" ? "suspended" : "active"
  await db.workspace.update({
    where: { id: workspaceId },
    data: { planStatus: newStatus },
  })

  return { success: true, newStatus }
}
