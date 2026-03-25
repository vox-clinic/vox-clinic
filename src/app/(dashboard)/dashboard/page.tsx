import { getDashboardData } from "@/server/actions/dashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, CalendarDays, Mic, Search, Stethoscope } from "lucide-react"
import Link from "next/link"
import { QuickSearch } from "./quick-search"

export default async function DashboardPage() {
  const data = await getDashboardData()

  const formatDate = (date: Date | null) => {
    if (!date) return "Sem atendimento"
    return new Date(date).toLocaleDateString("pt-BR")
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Painel</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Metricas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4 text-vox-primary" />
              Metricas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold">{data.totalPatients}</p>
                <p className="text-xs text-muted-foreground">
                  Total de pacientes
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {data.monthlyAppointments}
                </p>
                <p className="text-xs text-muted-foreground">
                  Atendimentos no mes
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Nova Gravacao */}
        <Card className="border-vox-primary/20 bg-vox-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="size-4 text-vox-primary" />
              Nova Gravacao
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Registre um novo atendimento por voz ou cadastre um paciente.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/appointments/new"
                className="inline-flex items-center gap-1.5 rounded-lg bg-vox-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-vox-primary/90 transition-colors"
              >
                <Stethoscope className="size-3.5" />
                Nova Consulta
              </Link>
              <Link
                href="/patients/new"
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
              >
                Novo paciente
              </Link>
              <Link
                href="/patients/new/voice"
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
              >
                <Mic className="size-3.5" />
                Cadastro por Voz
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Busca Rapida */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="size-4 text-vox-primary" />
              Busca Rapida
            </CardTitle>
          </CardHeader>
          <CardContent>
            <QuickSearch />
          </CardContent>
        </Card>

        {/* Pacientes Recentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="size-4 text-vox-primary" />
              Pacientes Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentPatients.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum paciente cadastrado ainda.
              </p>
            ) : (
              <ul className="space-y-2">
                {data.recentPatients.map((patient) => (
                  <li key={patient.id}>
                    <Link
                      href={`/patients/${patient.id}`}
                      className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-muted transition-colors"
                    >
                      <span className="font-medium">{patient.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(patient.lastAppointment)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/patients"
              className="mt-3 block text-center text-xs text-vox-primary hover:underline"
            >
              Ver todos os pacientes
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
