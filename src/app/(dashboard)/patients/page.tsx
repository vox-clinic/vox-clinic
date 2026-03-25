import { getPatients } from "@/server/actions/patient"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Plus } from "lucide-react"
import Link from "next/link"
import { PatientListSearch } from "./patient-list-search"

export default async function PatientsPage() {
  const data = await getPatients()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Users className="size-5 text-vox-primary" />
          Pacientes
          <span className="text-sm font-normal text-muted-foreground">
            ({data.total})
          </span>
        </h1>
        <Link
          href="/patients/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-vox-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-vox-primary/90 transition-colors"
        >
          <Plus className="size-3.5" />
          Novo paciente
        </Link>
      </div>

      <PatientListSearch initialPatients={data.patients} totalPages={data.totalPages} />
    </div>
  )
}
