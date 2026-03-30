"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { getAdminWorkspaces } from "@/server/actions/admin"

type AdminWorkspacesResult = Awaited<ReturnType<typeof getAdminWorkspaces>>
type Workspace = AdminWorkspacesResult["workspaces"][number]

const planBadge: Record<string, string> = {
  free: "bg-slate-100 text-slate-600",
  pro: "bg-blue-100 text-blue-700",
  enterprise: "bg-purple-100 text-purple-700",
}

const statusBadge: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  suspended: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-500",
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export default function AdminWorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchData = useCallback((p: number, q?: string) => {
    setLoading(true)
    getAdminWorkspaces(p, q || undefined)
      .then((result) => {
        setWorkspaces(result.workspaces)
        setTotalPages(result.totalPages)
        setTotal(result.total)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchData(page, search)
  }, [page, fetchData])

  // Debounced server-side search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      fetchData(1, search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search, fetchData])

  const filtered = workspaces

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Workspaces</h1>
          <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
            {total}
          </span>
        </div>
        <input
          type="text"
          placeholder="Buscar por nome, email ou profissao..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 sm:w-80"
        />
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-sm text-slate-400">Carregando...</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 font-semibold text-slate-600">
                    Clínica
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-600">
                    Profissao
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-600">
                    Plano
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-600">
                    Status
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-right">
                    Pacientes
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-right">
                    Consultas
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-600">
                    Criado em
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-600">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-12 text-center text-slate-400"
                    >
                      Nenhum workspace encontrado
                    </td>
                  </tr>
                ) : (
                  filtered.map((ws) => (
                    <tr
                      key={ws.id}
                      className="transition-colors hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-900">
                            {ws.user.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {ws.user.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {ws.professionType}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${planBadge[ws.plan] || "bg-slate-100 text-slate-600"}`}
                        >
                          {ws.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[ws.planStatus] || "bg-slate-100 text-slate-500"}`}
                        >
                          {ws.planStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {ws._count.patients}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {ws._count.appointments}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {formatDate(ws.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/workspaces/${ws.id}`}
                          className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-800"
                        >
                          Detalhes
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Pagina {page} de {totalPages} ({total} workspaces)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Proximo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
