import { getPatient } from "@/server/actions/patient"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, FileText, ChevronLeft, Phone, Mail, Calendar } from "lucide-react"
import Link from "next/link"
import { PatientTabs } from "./patient-tabs"
import { ExportButton } from "./export-button"
import { DeactivateButton } from "./deactivate-button"

export default async function PatientPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const patient = await getPatient(id)

  // Fetch workspace custom fields for display
  const { userId } = await auth()
  const user = userId
    ? await db.user.findUnique({
        where: { clerkId: userId },
        include: { workspace: { select: { customFields: true, anamnesisTemplate: true } } },
      })
    : null
  const customFields = (user?.workspace?.customFields as any[]) ?? []
  const anamnesisTemplate = (user?.workspace?.anamnesisTemplate as any[]) ?? []

  const initials = patient.name
    .split(" ")
    .slice(0, 2)
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()

  const formatDate = (date: Date | null) => {
    if (!date) return null
    return new Date(date).toLocaleDateString("pt-BR")
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <Link
        href="/patients"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="size-3.5" />
        Pacientes
      </Link>

      {/* ─── Patient Hero ─── */}
      <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-vox-primary/[0.06] via-card to-vox-primary/[0.03] p-5">
        <div className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-vox-primary/[0.05] blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-vox-primary to-vox-primary/70 text-lg font-bold text-white shadow-lg shadow-vox-primary/20">
              {initials}
            </div>

            <div className="space-y-1.5">
              <h1 className="text-xl font-semibold tracking-tight">
                {patient.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                {patient.document && (
                  <span className="font-mono">CPF: {patient.document}</span>
                )}
                {patient.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="size-3" />
                    {patient.phone}
                  </span>
                )}
                {patient.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="size-3" />
                    {patient.email}
                  </span>
                )}
                {patient.birthDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3" />
                    {formatDate(patient.birthDate)}
                  </span>
                )}
              </div>
              {patient.alerts.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {patient.alerts.map((alert: string, i: number) => (
                    <Badge key={i} variant="destructive" className="text-[10px]">
                      <AlertTriangle className="size-3 mr-0.5" />
                      {alert}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <ExportButton patientId={patient.id} patientName={patient.name} />
            <Link href={`/patients/${patient.id}/report`} target="_blank">
              <Button variant="outline" size="sm" className="gap-1.5">
                <FileText className="size-3.5" />
                Relatorio
              </Button>
            </Link>
            <DeactivateButton patientId={patient.id} />
          </div>
        </div>
      </div>

      <PatientTabs patient={patient} customFields={customFields} anamnesisTemplate={anamnesisTemplate} />
    </div>
  )
}
