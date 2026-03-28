import { getPatients, getAllPatientTags, getDistinctInsurances } from "@/server/actions/patient"
import { Badge } from "@/components/ui/badge"
import { Users, Plus, Mic, Download } from "lucide-react"
import Link from "next/link"
import { PatientListSearch } from "./patient-list-search"

export default async function PatientsPage() {
  const [data, availableTags, availableInsurances] = await Promise.all([
    getPatients(),
    getAllPatientTags(),
    getDistinctInsurances(),
  ])

  return (
    <div data-testid="page-patients" className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2.5">
            Pacientes
            <Badge variant="secondary" className="text-[11px] tabular-nums font-semibold">
              {data.total}
            </Badge>
          </h1>
          <p className="text-[13px] text-muted-foreground/70 mt-1">
            Gerencie seus pacientes e registros
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/export/patients"
            download
            className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-border/50 bg-card px-3.5 py-2 text-sm font-medium transition-all hover:bg-accent hover:border-border/70 active:scale-[0.98]"
          >
            <Download className="size-3.5 text-muted-foreground" />
            Exportar Excel
          </a>
          <Link
            href="/patients/new/voice"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-border/50 bg-card px-3.5 py-2 text-sm font-medium transition-all hover:bg-accent hover:border-border/70 active:scale-[0.98]"
          >
            <Mic className="size-3.5 text-vox-primary" />
            Voz
          </Link>
          <Link
            href="/patients/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-vox-primary px-4 py-2 text-sm font-semibold text-white shadow-md shadow-vox-primary/20 transition-all hover:bg-vox-primary/90 hover:shadow-lg hover:-translate-y-px active:translate-y-0 active:shadow-sm"
          >
            <Plus className="size-3.5" />
            Novo paciente
          </Link>
        </div>
      </div>

      <PatientListSearch initialPatients={data.patients} totalPages={data.totalPages} availableTags={availableTags} availableInsurances={availableInsurances} />
    </div>
  )
}
