"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  getAdminWorkspaceDetail,
  toggleWorkspaceStatus,
} from "@/server/actions/admin"

type DetailData = Awaited<ReturnType<typeof getAdminWorkspaceDetail>>

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  suspended: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-500",
}

const planColors: Record<string, string> = {
  free: "bg-slate-100 text-slate-600",
  pro: "bg-blue-100 text-blue-700",
  enterprise: "bg-purple-100 text-purple-700",
}

const appointmentStatusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-slate-100 text-slate-500",
  no_show: "bg-amber-100 text-amber-700",
}

export default function AdminWorkspaceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.id as string

  const [data, setData] = useState<DetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    getAdminWorkspaceDetail(workspaceId)
      .then(setData)
      .catch(() => router.push("/admin/workspaces"))
      .finally(() => setLoading(false))
  }, [workspaceId, router])

  async function handleToggle() {
    if (!data) return
    setToggling(true)
    try {
      const result = await toggleWorkspaceStatus(workspaceId)
      setData((prev) =>
        prev
          ? {
              ...prev,
              workspace: {
                ...prev.workspace,
                planStatus: result.newStatus,
              },
            }
          : prev
      )
    } finally {
      setToggling(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="flex h-64 items-center justify-center">
          <p className="text-sm text-slate-400">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { workspace, prescriptions, certificates, recentAppointments } = data
  const isActive = workspace.planStatus === "active"

  const stats = [
    { label: "Pacientes", value: workspace._count.patients },
    { label: "Consultas", value: workspace._count.appointments },
    { label: "Gravacoes", value: workspace._count.recordings },
    { label: "Membros", value: workspace._count.members },
    { label: "Prescricoes", value: prescriptions },
    { label: "Atestados", value: certificates },
  ]

  return (
    <div className="mx-auto max-w-5xl">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-slate-500">
        <Link href="/admin" className="hover:text-slate-700">
          Admin
        </Link>
        <span>/</span>
        <Link href="/admin/workspaces" className="hover:text-slate-700">
          Workspaces
        </Link>
        <span>/</span>
        <span className="text-slate-900">{workspace.user.name || workspace.user.email}</span>
      </nav>

      {/* Hero Card */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {workspace.user.name}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {workspace.user.email}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {workspace.professionType}
              </span>
              <span
                className={`rounded-lg px-2.5 py-1 text-xs font-medium ${planColors[workspace.plan] || "bg-slate-100 text-slate-600"}`}
              >
                {workspace.plan}
              </span>
              <span
                className={`rounded-lg px-2.5 py-1 text-xs font-medium ${statusColors[workspace.planStatus] || "bg-slate-100 text-slate-500"}`}
              >
                {workspace.planStatus}
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Criado em {formatDate(workspace.createdAt)}
            </p>
          </div>
          <button
            onClick={handleToggle}
            disabled={toggling}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
              isActive
                ? "bg-red-50 text-red-700 hover:bg-red-100"
                : "bg-green-50 text-green-700 hover:bg-green-100"
            }`}
          >
            {toggling
              ? "Processando..."
              : isActive
                ? "Suspender Workspace"
                : "Ativar Workspace"}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-medium text-slate-500">{stat.label}</p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Appointments */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">
          Consultas Recentes
        </h2>
        {recentAppointments.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhuma consulta encontrada</p>
        ) : (
          <div className="space-y-3">
            {recentAppointments.map((apt) => (
              <div
                key={apt.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {apt.patient.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDateTime(apt.date)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${appointmentStatusColors[apt.status] || "bg-slate-100 text-slate-500"}`}
                >
                  {apt.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
