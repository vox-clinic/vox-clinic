import { getPatient } from "@/server/actions/patient"
import { getMedicationFavorites } from "@/server/actions/medication"
import { PrescriptionEditor } from "./prescription-editor"

export default async function PrescricaoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [patient, favorites] = await Promise.all([
    getPatient(id),
    getMedicationFavorites(),
  ])

  return (
    <PrescriptionEditor
      patientId={patient.id}
      patientName={patient.name}
      patientDocument={patient.document}
      patientAlerts={patient.alerts}
      favorites={favorites}
    />
  )
}
