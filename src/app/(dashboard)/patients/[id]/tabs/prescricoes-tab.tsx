"use client"

import React, { useState } from "react"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Card, CardContent } from "@/components/ui/card"
import {
  Loader2,
  Pill,
  FileCheck2,
  ExternalLink,
  Trash2,
  Download,
  ShieldCheck,
  MessageCircle,
  Mail,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

const statusBadgeConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
  signed: { label: "Assinada", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  sent: { label: "Enviada", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  cancelled: { label: "Cancelada", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  expired: { label: "Expirada", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
}

function PrescriptionStatusBadgeSmall({ status }: { status: string }) {
  const config = statusBadgeConfig[status] ?? statusBadgeConfig.draft
  return (
    <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 ${config.className}`}>
      {config.label}
    </Badge>
  )
}
import { getPatientPrescriptions, deletePrescription, sendPrescriptionWhatsApp, sendPrescriptionEmail } from "@/server/actions/prescription"
import { getPatientCertificates, deleteCertificate } from "@/server/actions/certificate"
import { toast } from "sonner"
import { friendlyError } from "@/lib/error-messages"
import Link from "next/link"
import type { PrescriptionItem, CertificateItem } from "./types"

const certificateTypeLabels: Record<string, string> = {
  atestado: "Atestado Medico",
  declaracao_comparecimento: "Declaracao de Comparecimento",
  encaminhamento: "Encaminhamento",
  laudo: "Laudo Medico",
}

export default function PrescricoesTab({ patientId }: { patientId: string }) {
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([])
  const [certificates, setCertificates] = useState<CertificateItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [sending, setSending] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; description: string; onConfirm: () => void }>({ open: false, title: "", description: "", onConfirm: () => {} })

  const showConfirm = (title: string, description: string, onConfirm: () => void) => {
    setConfirmDialog({ open: true, title, description, onConfirm })
  }

  const loadData = React.useCallback(async () => {
    try {
      const [presc, certs] = await Promise.all([
        getPatientPrescriptions(patientId),
        getPatientCertificates(patientId),
      ])
      setPrescriptions(presc)
      setCertificates(certs)
    } catch {
      setPrescriptions([])
      setCertificates([])
    } finally {
      setLoading(false)
    }
  }, [patientId])

  React.useEffect(() => { loadData() }, [loadData])

  async function handleDeletePrescription(id: string) {
    showConfirm("Excluir prescricao", "Tem certeza que deseja excluir esta prescricao? Esta acao nao pode ser desfeita.", async () => {
      setDeleting(id)
      try {
        const result = await deletePrescription(id)
        if ('error' in result) { toast.error(result.error); return }
        loadData()
        toast.success("Prescricao excluida")
      } catch (err) {
        toast.error(friendlyError(err, "Erro ao excluir prescricao"))
      } finally {
        setDeleting(null)
      }
    })
  }

  async function handleDeleteCertificate(id: string) {
    showConfirm("Excluir documento", "Tem certeza que deseja excluir este documento? Esta acao nao pode ser desfeita.", async () => {
      setDeleting(id)
      try {
        const result = await deleteCertificate(id)
        if ('error' in result) { toast.error(result.error); return }
        loadData()
        toast.success("Documento excluido")
      } catch (err) {
        toast.error(friendlyError(err, "Erro ao excluir documento"))
      } finally {
        setDeleting(null)
      }
    })
  }

  async function handleSendWhatsApp(id: string) {
    setSending(`wa-${id}`)
    try {
      const result = await sendPrescriptionWhatsApp(id)
      if ('error' in result) { toast.error(result.error); return }
      toast.success("Prescrição enviada via WhatsApp!")
      loadData()
    } catch (err) {
      toast.error(friendlyError(err, "Erro ao enviar via WhatsApp"))
    } finally {
      setSending(null)
    }
  }

  async function handleSendEmail(id: string) {
    setSending(`email-${id}`)
    try {
      const result = await sendPrescriptionEmail(id)
      if ('error' in result) { toast.error(result.error); return }
      toast.success("Prescrição enviada por email!")
      loadData()
    } catch (err) {
      toast.error(friendlyError(err, "Erro ao enviar por email"))
    } finally {
      setSending(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-2xl bg-muted/30 animate-pulse" />)}
      </div>
    )
  }

  const isEmpty = prescriptions.length === 0 && certificates.length === 0

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-muted/60">
          <Pill className="size-6 text-muted-foreground/50" />
        </div>
        <div>
          <p className="text-sm font-medium">Nenhuma prescricao ou atestado</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Crie prescricoes e atestados usando os botoes no topo da pagina
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Prescriptions */}
      {prescriptions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Pill className="size-3.5 text-vox-primary" />
            Prescricoes ({prescriptions.length})
          </h3>
          <div className="grid gap-2">
            {prescriptions.map((p) => (
              <Card key={p.id} className="group overflow-hidden">
                <CardContent className="flex items-center gap-3 py-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-vox-primary/10">
                    <Pill className="size-4 text-vox-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium">
                        {p.medications.length} medicamento{p.medications.length !== 1 ? "s" : ""}
                      </p>
                      <PrescriptionStatusBadgeSmall status={p.status} />
                      {p.signedPdfUrl && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] text-vox-success">
                          <ShieldCheck className="size-2.5" />
                          Assinada digitalmente
                        </span>
                      )}
                      {p.sentVia?.includes("whatsapp") && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                          <MessageCircle className="size-2.5" />
                          WhatsApp
                        </span>
                      )}
                      {p.sentVia?.includes("email") && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                          <Mail className="size-2.5" />
                          Email
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {new Date(p.createdAt).toLocaleDateString("pt-BR")}
                      {p.medications.length > 0 && ` — ${p.medications.map(m => m.name).join(", ")}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleSendWhatsApp(p.id)}
                      disabled={sending === `wa-${p.id}`}
                      className="flex size-7 items-center justify-center rounded-lg hover:bg-green-50 text-muted-foreground hover:text-green-600 transition-colors"
                      title="Enviar via WhatsApp"
                    >
                      {sending === `wa-${p.id}` ? <Loader2 className="size-3.5 animate-spin" /> : <MessageCircle className="size-3.5" />}
                    </button>
                    <button
                      onClick={() => handleSendEmail(p.id)}
                      disabled={sending === `email-${p.id}`}
                      className="flex size-7 items-center justify-center rounded-lg hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors"
                      title="Enviar por email"
                    >
                      {sending === `email-${p.id}` ? <Loader2 className="size-3.5 animate-spin" /> : <Mail className="size-3.5" />}
                    </button>
                    {p.signedPdfUrl && (
                      <a
                        href={p.signedPdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex size-7 items-center justify-center rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                        title="Baixar PDF assinado"
                      >
                        <Download className="size-3.5" />
                      </a>
                    )}
                    <Link
                      href={`/prescriptions/${p.id}`}
                      target="_blank"
                      className="flex size-7 items-center justify-center rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                      title="Ver prescricao"
                    >
                      <ExternalLink className="size-3.5" />
                    </Link>
                    <button
                      onClick={() => handleDeletePrescription(p.id)}
                      disabled={deleting === p.id}
                      className="flex size-7 items-center justify-center rounded-lg hover:bg-vox-error/10 text-muted-foreground hover:text-vox-error transition-colors"
                      title="Excluir"
                    >
                      {deleting === p.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Certificates */}
      {certificates.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <FileCheck2 className="size-3.5 text-vox-primary" />
            Atestados e Documentos ({certificates.length})
          </h3>
          <div className="grid gap-2">
            {certificates.map((c) => (
              <Card key={c.id} className="group overflow-hidden">
                <CardContent className="flex items-center gap-3 py-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-vox-primary/10">
                    <FileCheck2 className="size-4 text-vox-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">
                      {certificateTypeLabels[c.type] ?? c.type}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(c.createdAt).toLocaleDateString("pt-BR")}
                      {c.days != null && ` — ${c.days} dia${c.days !== 1 ? "s" : ""}`}
                      {c.cid && ` — CID: ${c.cid}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      href={`/certificates/${c.id}`}
                      target="_blank"
                      className="flex size-7 items-center justify-center rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                      title="Ver documento"
                    >
                      <ExternalLink className="size-3.5" />
                    </Link>
                    <button
                      onClick={() => handleDeleteCertificate(c.id)}
                      disabled={deleting === c.id}
                      className="flex size-7 items-center justify-center rounded-lg hover:bg-vox-error/10 text-muted-foreground hover:text-vox-error transition-colors"
                      title="Excluir"
                    >
                      {deleting === c.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={() => { confirmDialog.onConfirm(); setConfirmDialog(prev => ({ ...prev, open: false })) }}
      />
    </div>
  )
}
