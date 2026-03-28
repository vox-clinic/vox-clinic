import { getCertificate } from "@/server/actions/certificate"
import { PrintButton } from "./print-button"
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

const typeLabels: Record<string, string> = {
  atestado: "Atestado Medico",
  declaracao_comparecimento: "Declaracao de Comparecimento",
  encaminhamento: "Encaminhamento",
  laudo: "Laudo Medico",
}

const typeColors: Record<string, string> = {
  atestado: "from-teal-500 to-teal-400 print:from-teal-600 print:to-teal-500",
  declaracao_comparecimento: "from-blue-500 to-blue-400 print:from-blue-600 print:to-blue-500",
  encaminhamento: "from-violet-500 to-violet-400 print:from-violet-600 print:to-violet-500",
  laudo: "from-amber-500 to-amber-400 print:from-amber-600 print:to-amber-500",
}

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  let certificate: Awaited<ReturnType<typeof getCertificate>>
  try {
    certificate = await getCertificate(id)
  } catch {
    notFound()
  }

  const today = formatDateLong(new Date())
  const title = typeLabels[certificate.type] ?? "Documento"
  const accentColor = typeColors[certificate.type] ?? typeColors.atestado

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
        <PrintButton />
      </div>

      {/* Certificate — A4 page simulation */}
      <div className="mx-auto max-w-[210mm] print:max-w-none print:mx-0">
        <div className="bg-white text-gray-900 shadow-lg print:shadow-none rounded-lg print:rounded-none border border-gray-200 print:border-0 min-h-[297mm] flex flex-col" style={{ fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif" }}>

          {/* ── Header with colored accent bar ── */}
          <header className="relative px-10 pt-8 pb-6">
            {/* Top accent bar */}
            <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${accentColor} rounded-t-lg print:rounded-none`} />

            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                  {certificate.clinicName}
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">{certificate.profession}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium uppercase tracking-widest text-teal-600">
                  {title}
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
                <p className="font-semibold text-gray-900">{certificate.patientName}</p>
              </div>
              {certificate.patientDocument && (
                <div>
                  <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">CPF</span>
                  <p className="font-semibold text-gray-900">{certificate.patientDocument}</p>
                </div>
              )}
            </div>
          </section>

          {/* ── Content ── */}
          <section className="flex-1 px-10 py-10">
            <p className="text-[15px] leading-8 whitespace-pre-wrap text-justify text-gray-800">
              {certificate.content}
            </p>

            {/* CID / Days info for atestado */}
            {certificate.type === "atestado" && (certificate.cid || certificate.days) && (
              <div className="mt-8 rounded-lg bg-gray-50 border border-gray-200 px-5 py-4 print:bg-gray-50">
                <div className="flex flex-wrap gap-x-10 gap-y-2 text-sm">
                  {certificate.days && (
                    <div>
                      <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Dias de afastamento</span>
                      <p className="font-semibold text-gray-900">{certificate.days} {certificate.days === 1 ? "dia" : "dias"}</p>
                    </div>
                  )}
                  {certificate.cid && (
                    <div>
                      <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">CID-10</span>
                      <p className="font-semibold text-gray-900">
                        {certificate.cid}{certificate.cidDescription ? ` — ${certificate.cidDescription}` : ""}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* ── Signature ── */}
          <section className="px-10 pb-4 pt-8">
            <div className="mx-auto max-w-xs text-center">
              <div className="border-b-2 border-gray-900 mb-2" />
              <p className="text-sm font-semibold text-gray-900">{certificate.doctorName}</p>
              <p className="text-xs text-gray-500 mt-0.5">{certificate.profession}</p>
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
