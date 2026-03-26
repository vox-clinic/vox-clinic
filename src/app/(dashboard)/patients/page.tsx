import { getPatients } from "@/server/actions/patient"
import { Badge } from "@/components/ui/badge"
import { Users, Plus, Mic } from "lucide-react"
import Link from "next/link"
import { PatientListSearch } from "./patient-list-search"

export default async function PatientsPage() {
  const data = await getPatients()

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            Pacientes
            <Badge variant="secondary" className="text-[11px] tabular-nums">
              {data.total}
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie seus pacientes e registros
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/patients/new/voice"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-card px-3 py-2 text-sm font-medium transition-all hover:bg-muted/50 hover:border-border active:scale-[0.98]"
          >
            <Mic className="size-3.5 text-vox-primary" />
            Voz
          </Link>
          <Link
            href="/patients/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-vox-primary px-3.5 py-2 text-sm font-medium text-white shadow-sm shadow-vox-primary/15 transition-all hover:bg-vox-primary/90 active:scale-[0.98]"
          >
            <Plus className="size-3.5" />
            Novo paciente
          </Link>
        </div>
      </div>

      <PatientListSearch initialPatients={data.patients} totalPages={data.totalPages} />
    </div>
  )
}
