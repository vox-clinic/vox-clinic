"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"
import { signPrescription, cancelPrescription } from "@/server/actions/prescription"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
  signed: { label: "Assinada", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  sent: { label: "Enviada", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  cancelled: { label: "Cancelada", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  expired: { label: "Expirada", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
}

const typeConfig: Record<string, string> = {
  simple: "Simples",
  special_control: "Controle Especial",
  antimicrobial: "Antimicrobiano",
  manipulated: "Manipulado",
}

export function PrescriptionStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? statusConfig.draft
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  )
}

export function PrescriptionTypeBadge({ type }: { type: string }) {
  return (
    <Badge variant="secondary">
      {typeConfig[type] ?? type}
    </Badge>
  )
}

export function PrescriptionActions({
  prescriptionId,
  status,
  type,
  validUntil,
  signedAt,
  cancelledAt,
  cancelReason,
}: {
  prescriptionId: string
  status: string
  type: string
  validUntil: string | null
  signedAt: string | null
  cancelledAt: string | null
  cancelReason: string | null
}) {
  const router = useRouter()
  const [signing, setSigning] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelReasonText, setCancelReasonText] = useState("")
  const [cancelling, setCancelling] = useState(false)

  async function handleSign() {
    setSigning(true)
    try {
      const result = await signPrescription(prescriptionId)
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      toast.success("Prescrição assinada com sucesso")
      router.refresh()
    } catch {
      toast.error("Erro ao assinar prescrição.")
    } finally {
      setSigning(false)
    }
  }

  async function handleCancel() {
    if (!cancelReasonText.trim()) {
      toast.error("Informe o motivo do cancelamento.")
      return
    }
    setCancelling(true)
    try {
      const result = await cancelPrescription({
        prescriptionId,
        reason: cancelReasonText,
      })
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      toast.success("Prescrição cancelada")
      setCancelDialogOpen(false)
      setCancelReasonText("")
      router.refresh()
    } catch {
      toast.error("Erro ao cancelar prescrição.")
    } finally {
      setCancelling(false)
    }
  }

  const canSign = status === "draft"
  const canCancel = status === "draft" || status === "signed"

  return (
    <div className="space-y-4">
      {/* Status and type badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <PrescriptionStatusBadge status={status} />
        <PrescriptionTypeBadge type={type} />
        {validUntil && (
          <span className="text-xs text-muted-foreground">
            Valida ate {new Date(validUntil).toLocaleDateString("pt-BR")}
          </span>
        )}
        {signedAt && (
          <span className="text-xs text-muted-foreground">
            Assinada em {new Date(signedAt).toLocaleDateString("pt-BR")}
          </span>
        )}
      </div>

      {/* Cancelled info */}
      {status === "cancelled" && cancelledAt && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200/60 dark:border-red-800/40 px-4 py-3">
          <p className="text-sm text-red-700 dark:text-red-400">
            <span className="font-medium">Cancelada em {new Date(cancelledAt).toLocaleDateString("pt-BR")}</span>
            {cancelReason && <>: {cancelReason}</>}
          </p>
        </div>
      )}

      {/* Expired info */}
      {status === "expired" && validUntil && (
        <div className="rounded-xl bg-orange-50 dark:bg-orange-900/10 border border-orange-200/60 dark:border-orange-800/40 px-4 py-3">
          <p className="text-sm text-orange-700 dark:text-orange-400">
            Prescrição expirada em {new Date(validUntil).toLocaleDateString("pt-BR")}
          </p>
        </div>
      )}

      {/* Action buttons */}
      {(canSign || canCancel) && (
        <div className="flex items-center gap-2">
          {canSign && (
            <Button
              size="sm"
              onClick={handleSign}
              disabled={signing}
              className="gap-2"
            >
              {signing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle className="size-4" />
              )}
              Assinar
            </Button>
          )}
          {canCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancelDialogOpen(true)}
              className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <XCircle className="size-4" />
              Cancelar
            </Button>
          )}
        </div>
      )}

      {/* Cancel dialog */}
      {cancelDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-2xl border shadow-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-2">Cancelar prescrição</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Informe o motivo do cancelamento. Esta acao nao pode ser desfeita.
            </p>
            <textarea
              value={cancelReasonText}
              onChange={(e) => setCancelReasonText(e.target.value)}
              placeholder="Motivo do cancelamento..."
              className="w-full h-24 rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCancelDialogOpen(false)
                  setCancelReasonText("")
                }}
                disabled={cancelling}
              >
                Voltar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleCancel}
                disabled={cancelling || !cancelReasonText.trim()}
                className="gap-2"
              >
                {cancelling && <Loader2 className="size-4 animate-spin" />}
                Confirmar cancelamento
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
