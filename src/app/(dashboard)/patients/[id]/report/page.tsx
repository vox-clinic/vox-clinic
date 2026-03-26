import { getPatient } from "@/server/actions/patient"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { PrintButton } from "./print-button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

function calculateAge(birthDate: Date): number {
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatDateLong(date: Date): string {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

export default async function PatientReportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const patient = await getPatient(id)

  const { userId } = await auth()
  const user = userId
    ? await db.user.findUnique({
        where: { clerkId: userId },
        include: { workspace: { select: { customFields: true, professionType: true } } },
      })
    : null

  const customFields = (user?.workspace?.customFields as any[]) ?? []
  const clinicName = user?.clinicName ?? "Clinica"
  const professionalName = user?.name ?? "Profissional"
  const today = formatDateLong(new Date())

  return (
    <>
      {/* Top bar - hidden on print */}
      <div className="print:hidden mb-8 flex items-center justify-between gap-4">
        <Link
          href={`/patients/${patient.id}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Voltar
        </Link>
        <PrintButton />
      </div>

      {/* Report content */}
      <div className="mx-auto max-w-3xl bg-white print:bg-white print:max-w-none print:mx-0">
        <div className="rounded-xl border border-border print:border-0 print:shadow-none p-8 print:p-0 space-y-8">

          {/* Header */}
          <header className="border-b border-border pb-6 print:border-b-gray-300">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-sm font-medium text-vox-primary uppercase tracking-wider">
                  {clinicName}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {professionalName}
                </p>
              </div>
              <p className="text-xs text-muted-foreground text-right">
                {today}
              </p>
            </div>
            <h1 className="text-2xl font-semibold mt-4 tracking-tight print:text-3xl">
              Relatorio do Paciente
            </h1>
          </header>

          {/* Patient Info */}
          <section>
            <h2 className="text-lg font-semibold mb-4 text-slate-900 print:text-black">
              Dados do Paciente
            </h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div>
                <span className="text-slate-500 print:text-gray-600">Nome</span>
                <p className="font-medium text-slate-900 print:text-black">{patient.name}</p>
              </div>
              {patient.document && (
                <div>
                  <span className="text-slate-500 print:text-gray-600">CPF</span>
                  <p className="font-medium text-slate-900 print:text-black">{patient.document}</p>
                </div>
              )}
              {patient.rg && (
                <div>
                  <span className="text-slate-500 print:text-gray-600">RG</span>
                  <p className="font-medium text-slate-900 print:text-black">{patient.rg}</p>
                </div>
              )}
              {patient.phone && (
                <div>
                  <span className="text-slate-500 print:text-gray-600">Telefone</span>
                  <p className="font-medium text-slate-900 print:text-black">{patient.phone}</p>
                </div>
              )}
              {patient.email && (
                <div>
                  <span className="text-slate-500 print:text-gray-600">Email</span>
                  <p className="font-medium text-slate-900 print:text-black">{patient.email}</p>
                </div>
              )}
              {patient.birthDate && (
                <div>
                  <span className="text-slate-500 print:text-gray-600">Data de Nascimento</span>
                  <p className="font-medium text-slate-900 print:text-black">
                    {formatDate(patient.birthDate)} ({calculateAge(patient.birthDate)} anos)
                  </p>
                </div>
              )}
              {patient.gender && (
                <div>
                  <span className="text-slate-500 print:text-gray-600">Sexo</span>
                  <p className="font-medium text-slate-900 print:text-black capitalize">{patient.gender}</p>
                </div>
              )}
              {patient.insurance && (
                <div>
                  <span className="text-slate-500 print:text-gray-600">Convenio</span>
                  <p className="font-medium text-slate-900 print:text-black">{patient.insurance}</p>
                </div>
              )}
              {patient.guardian && (
                <div>
                  <span className="text-slate-500 print:text-gray-600">Responsavel</span>
                  <p className="font-medium text-slate-900 print:text-black">{patient.guardian}</p>
                </div>
              )}

              {/* Custom fields from workspace definition */}
              {customFields.map((field: any) => {
                const value = patient.customData?.[field.key ?? field.name ?? field.id]
                if (!value) return null
                return (
                  <div key={field.key ?? field.name ?? field.id}>
                    <span className="text-slate-500 print:text-gray-600">
                      {field.label ?? field.name}
                    </span>
                    <p className="font-medium text-slate-900 print:text-black">{String(value)}</p>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Medical History */}
          {patient.medicalHistory && Object.values(patient.medicalHistory).some(v => v && (Array.isArray(v) ? v.length > 0 : true)) && (
            <section>
              <h2 className="text-lg font-semibold mb-3 text-slate-900 print:text-black">
                Historico Medico
              </h2>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                {(patient.medicalHistory.allergies as string[] ?? []).length > 0 && (
                  <div>
                    <span className="text-slate-500 print:text-gray-600">Alergias</span>
                    <p className="font-medium text-slate-900 print:text-black">{(patient.medicalHistory.allergies as string[]).join(", ")}</p>
                  </div>
                )}
                {(patient.medicalHistory.chronicDiseases as string[] ?? []).length > 0 && (
                  <div>
                    <span className="text-slate-500 print:text-gray-600">Doencas Cronicas</span>
                    <p className="font-medium text-slate-900 print:text-black">{(patient.medicalHistory.chronicDiseases as string[]).join(", ")}</p>
                  </div>
                )}
                {(patient.medicalHistory.medications as string[] ?? []).length > 0 && (
                  <div>
                    <span className="text-slate-500 print:text-gray-600">Medicacoes</span>
                    <p className="font-medium text-slate-900 print:text-black">{(patient.medicalHistory.medications as string[]).join(", ")}</p>
                  </div>
                )}
                {(patient.medicalHistory.bloodType as string) && (
                  <div>
                    <span className="text-slate-500 print:text-gray-600">Tipo Sanguineo</span>
                    <p className="font-medium text-slate-900 print:text-black">{String(patient.medicalHistory.bloodType)}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Address */}
          {patient.address && Object.values(patient.address).some(v => v) && (
            <section>
              <h2 className="text-lg font-semibold mb-3 text-slate-900 print:text-black">
                Endereco
              </h2>
              <p className="text-sm text-slate-900 print:text-black">
                {[patient.address.street, patient.address.number, patient.address.complement, patient.address.neighborhood, patient.address.city, patient.address.state, patient.address.zipCode].filter(Boolean).join(", ")}
              </p>
            </section>
          )}

          {/* Tags */}
          {patient.tags.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3 text-slate-900 print:text-black">Tags</h2>
              <div className="flex flex-wrap gap-1.5">
                {patient.tags.map((tag, i) => (
                  <span key={i} className="inline-block rounded-full bg-teal-50 border border-teal-200 px-2.5 py-0.5 text-xs font-medium text-teal-700 print:border-teal-400">{tag}</span>
                ))}
              </div>
            </section>
          )}

          {/* Alerts */}
          {patient.alerts.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3 text-slate-900 print:text-black">
                Alertas
              </h2>
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 print:bg-white print:border-red-400">
                <ul className="space-y-1.5">
                  {patient.alerts.map((alert, i) => (
                    <li
                      key={i}
                      className="text-sm text-red-800 print:text-red-900 flex items-start gap-2"
                    >
                      <span className="text-red-500 mt-0.5 shrink-0">&#9888;</span>
                      {alert}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* Appointment History */}
          <section className="print:break-before-auto">
            <h2 className="text-lg font-semibold mb-4 text-slate-900 print:text-black">
              Historico de Consultas
            </h2>
            {patient.appointments.length === 0 ? (
              <p className="text-sm text-slate-500 italic">
                Nenhuma consulta registrada.
              </p>
            ) : (
              <div className="border border-border rounded-xl overflow-hidden print:border-gray-300 overflow-x-auto print:overflow-visible">
                <table className="w-full text-sm min-w-[500px] print:min-w-0">
                  <thead>
                    <tr className="bg-muted/50 print:bg-gray-100">
                      <th className="text-left px-4 py-2.5 font-medium text-slate-500 print:text-gray-600">
                        Data
                      </th>
                      <th className="text-left px-4 py-2.5 font-medium text-slate-500 print:text-gray-600">
                        Procedimentos
                      </th>
                      <th className="text-left px-4 py-2.5 font-medium text-slate-500 print:text-gray-600">
                        Observacoes
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {patient.appointments.map((apt, index) => (
                      <tr
                        key={apt.id}
                        className={
                          index % 2 === 0
                            ? "bg-white print:bg-white"
                            : "bg-muted/30 print:bg-gray-50"
                        }
                      >
                        <td className="px-4 py-3 align-top whitespace-nowrap font-medium">
                          {formatDate(apt.date)}
                        </td>
                        <td className="px-4 py-3 align-top">
                          {apt.procedures.length > 0
                            ? apt.procedures.join(", ")
                            : <span className="text-muted-foreground">-</span>}
                        </td>
                        <td className="px-4 py-3 align-top">
                          {apt.notes || (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* AI Summaries */}
          {patient.appointments.some((a) => a.aiSummary) && (
            <section className="print:break-before-auto">
              <h2 className="text-lg font-semibold mb-4 text-slate-900 print:text-black">
                Resumos de Consultas (IA)
              </h2>
              <div className="space-y-4">
                {patient.appointments
                  .filter((a) => a.aiSummary)
                  .map((apt) => (
                    <div
                      key={apt.id}
                      className="border border-border rounded-xl p-4 print:border-gray-300"
                    >
                      <p className="text-xs font-medium text-slate-500 print:text-gray-600 mb-2">
                        {formatDate(apt.date)}
                        {apt.procedures.length > 0 &&
                          ` - ${apt.procedures.join(", ")}`}
                      </p>
                      <p className="text-sm leading-relaxed whitespace-pre-line text-slate-800 print:text-black">
                        {apt.aiSummary}
                      </p>
                    </div>
                  ))}
              </div>
            </section>
          )}

          {/* Footer */}
          <footer className="border-t border-slate-200 pt-6 print:border-t-gray-300 mt-8">
            <p className="text-xs text-slate-500 print:text-gray-600">
              Documento gerado por VoxClinic em {today}
            </p>
            <p className="text-xs text-slate-500 print:text-gray-600 mt-1">
              Confidencial - Dados protegidos pela LGPD (Lei 13.709/2018)
            </p>
          </footer>
        </div>
      </div>
    </>
  )
}
