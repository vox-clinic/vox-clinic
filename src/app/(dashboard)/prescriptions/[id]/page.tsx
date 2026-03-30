import { getPrescription } from "@/server/actions/prescription"
import { PrintButton } from "./print-button"
import { GeneratePdfButton } from "./generate-pdf-button"
import { SendEmailButton } from "./send-email-button"
import { PrescriptionActions } from "./prescription-actions"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { notFound } from "next/navigation"

function formatDateLong(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

export default async function PrescriptionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  let prescription: Awaited<ReturnType<typeof getPrescription>>
  try {
    prescription = await getPrescription(id)
  } catch {
    notFound()
  }

  const createdDate = new Date(prescription.createdAt)
  const today = formatDateLong(createdDate)

  return (
    <>
      {/* Top bar - hidden on print */}
      <div className="print:hidden mb-6 flex items-center justify-between gap-4">
        <Link
          href="/patients"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Voltar
        </Link>
        <div className="flex items-center gap-2">
          {prescription.patientEmail && (
            <SendEmailButton prescriptionId={id} />
          )}
          <GeneratePdfButton prescriptionId={id} />
          <PrintButton />
        </div>
      </div>

      {/* Status / Actions bar - hidden on print */}
      <div className="print:hidden mb-6">
        <PrescriptionActions
          prescriptionId={id}
          status={prescription.status}
          type={prescription.type}
          validUntil={prescription.validUntil}
          signedAt={prescription.signedAt}
          cancelledAt={prescription.cancelledAt}
          cancelReason={prescription.cancelReason}
        />
      </div>

      {/* Prescription — A4 page simulation */}
      <div className="mx-auto max-w-[210mm] print:max-w-none print:mx-0">
        <div className="bg-white text-gray-900 shadow-lg print:shadow-none rounded-lg print:rounded-none border border-gray-200 print:border-0 min-h-[297mm] flex flex-col" style={{ fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif" }}>

          {/* ── Header with teal accent bar ── */}
          <header className="relative px-10 pt-8 pb-6">
            {/* Top accent bar */}
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-teal-500 to-teal-400 print:from-teal-600 print:to-teal-500 rounded-t-lg print:rounded-none" />

            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                  {prescription.clinicName}
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">{prescription.profession}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium uppercase tracking-widest text-teal-600">
                  Prescrição Médica
                </p>
                <p className="text-xs text-gray-400 mt-1">{today}</p>
              </div>
            </div>

            {/* Divider */}
            <div className="mt-5 border-b-2 border-gray-100 print:border-gray-200" />
          </header>

          {/* ── Patient info strip ── */}
          <section className="px-10 py-4 bg-gray-50 print:bg-gray-50 border-y border-gray-100 print:border-gray-200">
            <div className="flex flex-wrap gap-x-10 gap-y-2 text-sm">
              <div>
                <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Paciente</span>
                <p className="font-semibold text-gray-900">{prescription.patientName}</p>
              </div>
              {prescription.patientDocument && (
                <div>
                  <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">CPF</span>
                  <p className="font-semibold text-gray-900">{prescription.patientDocument}</p>
                </div>
              )}
              <div className="ml-auto text-right">
                <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Data</span>
                <p className="font-semibold text-gray-900">{createdDate.toLocaleDateString("pt-BR")}</p>
              </div>
            </div>
          </section>

          {/* ── Medications ── */}
          <section className="flex-1 px-10 py-8">
            <div className="space-y-0">
              {prescription.medications.map((med, index) => (
                <div
                  key={index}
                  className="flex gap-4 py-4 border-b border-dashed border-gray-200 last:border-b-0"
                >
                  {/* Number circle */}
                  <div className="flex-shrink-0 mt-0.5">
                    <span className="inline-flex items-center justify-center size-7 rounded-full bg-teal-50 text-teal-700 text-xs font-bold print:bg-teal-50 print:text-teal-700 border border-teal-200/60">
                      {index + 1}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-[15px]">
                      {med.name}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                      <span>
                        <span className="text-gray-400 text-xs uppercase tracking-wide mr-1">Dose:</span>
                        {med.dosage}
                      </span>
                      <span className="text-gray-300">|</span>
                      <span>
                        <span className="text-gray-400 text-xs uppercase tracking-wide mr-1">Freq:</span>
                        {med.frequency}
                      </span>
                      {med.duration && (
                        <>
                          <span className="text-gray-300">|</span>
                          <span>
                            <span className="text-gray-400 text-xs uppercase tracking-wide mr-1">Duracao:</span>
                            {med.duration}
                          </span>
                        </>
                      )}
                    </div>
                    {med.notes && (
                      <p className="mt-1.5 text-sm text-gray-500 italic">
                        {med.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* General Notes */}
            {prescription.notes && (
              <div className="mt-8 rounded-lg bg-amber-50/60 border border-amber-200/60 px-5 py-4 print:bg-amber-50">
                <p className="text-xs font-medium uppercase tracking-wide text-amber-600 mb-1.5">Observacoes</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{prescription.notes}</p>
              </div>
            )}
          </section>

          {/* ── Signature ── */}
          <section className="px-10 pb-4 pt-8">
            <div className="mx-auto max-w-xs text-center">
              <div className="border-b-2 border-gray-900 mb-2" />
              <p className="text-sm font-semibold text-gray-900">{prescription.doctorName}</p>
              <p className="text-xs text-gray-500 mt-0.5">{prescription.profession}</p>
            </div>
          </section>

          {/* ── Footer ── */}
          <footer className="px-10 py-4 mt-auto">
            <div className="border-t border-gray-100 print:border-gray-200 pt-4 flex items-center justify-between">
              <p className="text-[10px] text-gray-400">
                Documento gerado pelo VoxClinic em {today}
              </p>
              <p className="text-[10px] text-gray-400 font-medium tracking-wide">
                VOXCLINIC
              </p>
            </div>
          </footer>
        </div>
      </div>
    </>
  )
}
