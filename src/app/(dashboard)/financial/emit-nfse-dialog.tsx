"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  Search,
  FileText,
  CheckCircle,
  Calendar,
  User,
} from "lucide-react"
import { emitNfse, searchAppointmentsForNfse } from "@/server/actions/nfse"
import { updateAppointmentPrice } from "@/server/actions/financial"
import { toast } from "sonner"

type AppointmentResult = Awaited<ReturnType<typeof searchAppointmentsForNfse>>[number]

interface EmitNfseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const formatBRL = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const formatDateBR = (date: Date | string) =>
  new Date(date).toLocaleDateString("pt-BR")

function getProcedureNames(procedures: unknown): string[] {
  if (!Array.isArray(procedures)) return []
  return procedures
    .map((p: { name?: string }) => (typeof p === "string" ? p : p?.name))
    .filter(Boolean) as string[]
}

const statusBadge: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "border-amber-300 bg-amber-50 text-amber-700" },
  processing: { label: "Processando", className: "border-blue-300 bg-blue-50 text-blue-700" },
  authorized: { label: "Autorizada", className: "border-emerald-300 bg-emerald-50 text-emerald-700" },
  error: { label: "Erro", className: "border-red-300 bg-red-50 text-red-700" },
  cancelled: { label: "Cancelada", className: "border-gray-300 bg-gray-50 text-gray-500" },
}

export function EmitNfseDialog({ open, onOpenChange, onSuccess }: EmitNfseDialogProps) {
  const [step, setStep] = useState<"search" | "confirm" | "success">("search")
  const [searchQuery, setSearchQuery] = useState("")
  const [appointments, setAppointments] = useState<AppointmentResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<AppointmentResult | null>(null)
  const [emitting, setEmitting] = useState(false)
  const [result, setResult] = useState<{ numero?: string | null; status: string } | null>(null)
  const [manualPrice, setManualPrice] = useState("")

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep("search")
      setSearchQuery("")
      setAppointments([])
      setSelected(null)
      setEmitting(false)
      setResult(null)
      setManualPrice("")
    }
  }, [open])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const results = await searchAppointmentsForNfse(searchQuery)
      setAppointments(results)
    } catch {
      toast.error("Erro ao buscar consultas")
    } finally {
      setSearching(false)
    }
  }

  const getEffectivePrice = () => {
    if (selected?.price != null && selected.price > 0) return selected.price
    const parsed = parseFloat(manualPrice.replace(/\./g, '').replace(',', '.'))
    return isNaN(parsed) ? 0 : parsed
  }

  const handleEmit = async () => {
    if (!selected) return
    const price = getEffectivePrice()
    if (price <= 0) {
      toast.error("Informe o valor da consulta para emitir a NFS-e")
      return
    }
    setEmitting(true)
    try {
      // Save price if it was manually entered
      if (!selected.price || selected.price <= 0) {
        await updateAppointmentPrice(selected.id, price)
      }
      const nfse = await emitNfse(selected.id)
      setResult({ numero: nfse.numero, status: nfse.status })
      setStep("success")
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao emitir NFS-e")
    } finally {
      setEmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-5 text-vox-primary" />
            Emitir NFS-e
          </DialogTitle>
          <DialogDescription>
            {step === "search" && "Busque um paciente para selecionar a consulta"}
            {step === "confirm" && "Confirme os dados para emitir a nota fiscal"}
            {step === "success" && "NFS-e emitida com sucesso"}
          </DialogDescription>
        </DialogHeader>

        {/* Search step */}
        {step === "search" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Nome do paciente..."
                  className="pl-9"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
              >
                {searching ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Buscar"
                )}
              </Button>
            </div>

            {/* Results */}
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {appointments.length === 0 && !searching && searchQuery && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Nenhuma consulta encontrada para este paciente
                </p>
              )}
              {appointments.map((appt) => {
                const procedures = getProcedureNames(appt.procedures)
                return (
                  <button
                    key={appt.id}
                    className={`w-full rounded-xl border p-3 text-left transition-colors hover:bg-muted/30 ${
                      appt.hasNfse
                        ? "cursor-not-allowed opacity-50"
                        : "cursor-pointer"
                    }`}
                    disabled={appt.hasNfse}
                    onClick={() => {
                      if (!appt.hasNfse) {
                        setSelected(appt)
                        setStep("confirm")
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="size-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{appt.patient.name}</span>
                      </div>
                      {appt.hasNfse && (
                        <Badge variant="outline" className="text-xs border-emerald-300 bg-emerald-50 text-emerald-700">
                          NFS-e emitida
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        {formatDateBR(appt.date)}
                      </span>
                      {procedures.length > 0 && (
                        <span>{procedures.join(", ")}</span>
                      )}
                      {appt.price != null && (
                        <span className="font-medium text-foreground">
                          {formatBRL(appt.price)}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Confirm step */}
        {step === "confirm" && selected && (
          <div className="space-y-4">
            <div className="rounded-xl border bg-muted/20 p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paciente</span>
                  <span className="font-medium">{selected.patient.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data da consulta</span>
                  <span>{formatDateBR(selected.date)}</span>
                </div>
                {getProcedureNames(selected.procedures).length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Procedimentos</span>
                    <span>{getProcedureNames(selected.procedures).join(", ")}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t pt-2">
                  <span className="text-muted-foreground">Valor</span>
                  {selected.price != null && selected.price > 0 ? (
                    <span className="text-base font-bold text-vox-primary">
                      {formatBRL(selected.price)}
                    </span>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">R$</span>
                      <Input
                        type="text"
                        value={manualPrice}
                        onChange={(e) => setManualPrice(e.target.value)}
                        placeholder="150,00"
                        className="w-28 text-right h-8 text-sm"
                      />
                    </div>
                  )}
                </div>
                {(!selected.price || selected.price <= 0) && !manualPrice && (
                  <p className="text-xs text-amber-600 mt-1">
                    Esta consulta nao tem valor definido. Informe o valor acima para emitir a NFS-e.
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("search")}>
                Voltar
              </Button>
              <Button
                onClick={handleEmit}
                disabled={emitting || getEffectivePrice() <= 0}
                className="bg-vox-primary hover:bg-vox-primary/90"
              >
                {emitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Emitindo...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 size-4" />
                    Emitir NFS-e
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Success step */}
        {step === "success" && result && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle className="size-6 text-emerald-600" />
              </div>
              <p className="text-center text-sm font-medium">
                NFS-e emitida com sucesso!
              </p>
              <div className="space-y-1 text-center text-sm text-muted-foreground">
                {result.numero && (
                  <p>
                    Numero: <span className="font-mono font-medium text-foreground">{result.numero}</span>
                  </p>
                )}
                <p>
                  Status:{" "}
                  <Badge
                    variant="outline"
                    className={
                      (statusBadge[result.status] ?? statusBadge.pending).className
                    }
                  >
                    {(statusBadge[result.status] ?? statusBadge.pending).label}
                  </Badge>
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Fechar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
