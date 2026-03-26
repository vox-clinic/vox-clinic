import { getAdminDashboard } from "@/server/actions/admin"

function formatNumber(n: number): string {
  return n.toLocaleString("pt-BR")
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export default async function AdminDashboardPage() {
  const data = await getAdminDashboard()

  const kpis = [
    { label: "Total Workspaces", value: data.totalWorkspaces, color: "bg-slate-100 text-slate-700" },
    { label: "Workspaces Ativos", value: data.activeWorkspaces, color: "bg-green-50 text-green-700" },
    { label: "Total Usuarios", value: data.totalUsers, color: "bg-blue-50 text-blue-700" },
    { label: "Total Pacientes", value: data.totalPatients, color: "bg-indigo-50 text-indigo-700" },
    { label: "Total Consultas", value: data.totalAppointments, color: "bg-amber-50 text-amber-700" },
    { label: "Total Gravacoes", value: data.totalRecordings, color: "bg-purple-50 text-purple-700" },
  ]

  const planLabels: Record<string, string> = {
    free: "Free",
    pro: "Pro",
    enterprise: "Enterprise",
  }

  const planColors: Record<string, string> = {
    free: "bg-slate-200",
    pro: "bg-blue-500",
    enterprise: "bg-purple-500",
  }

  const totalActivePlans = data.planCounts.reduce((sum, p) => sum + p._count, 0)

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Painel Administrativo
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Visao geral da plataforma
        </p>
      </div>

      {/* KPI Cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-medium text-slate-500">{kpi.label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {formatNumber(kpi.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Second Row */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        {/* Plan Distribution */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">
            Distribuicao por Plano
          </h2>
          {totalActivePlans > 0 ? (
            <>
              <div className="mb-4 flex h-4 overflow-hidden rounded-full">
                {data.planCounts.map((p) => (
                  <div
                    key={p.plan}
                    className={`${planColors[p.plan] || "bg-slate-300"}`}
                    style={{
                      width: `${(p._count / totalActivePlans) * 100}%`,
                    }}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-4">
                {data.planCounts.map((p) => (
                  <div key={p.plan} className="flex items-center gap-2">
                    <div
                      className={`size-3 rounded-full ${planColors[p.plan] || "bg-slate-300"}`}
                    />
                    <span className="text-sm text-slate-600">
                      {planLabels[p.plan] || p.plan}: {p._count}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400">Nenhum workspace ativo</p>
          )}
        </div>

        {/* Recent Workspaces */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">
            Workspaces Recentes
          </h2>
          {data.recentWorkspaces.length > 0 ? (
            <div className="space-y-3">
              {data.recentWorkspaces.map((ws) => (
                <div
                  key={ws.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {ws.user.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {ws.professionType} &middot; {ws.user.email}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">
                    {formatDate(ws.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Nenhum workspace criado</p>
          )}
        </div>
      </div>

      {/* Third Row */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">
          Grafico de Crescimento
        </h2>
        <div className="flex h-48 items-center justify-center rounded-lg bg-slate-50">
          <p className="text-sm text-slate-400">Em breve</p>
        </div>
      </div>
    </div>
  )
}
