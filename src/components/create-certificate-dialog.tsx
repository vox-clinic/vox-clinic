"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, Loader2 } from "lucide-react"
import { createCertificate } from "@/server/actions/certificate"
import { toast } from "sonner"
import { friendlyError } from "@/lib/error-messages"
import { useRouter } from "next/navigation"
import { CidAutocomplete } from "@/components/cid-autocomplete"
import type { CidCode } from "@/types"

const typeOptions = [
  { value: "atestado", label: "Atestado Médico" },
  { value: "declaracao_comparecimento", label: "Declaracao de Comparecimento" },
  { value: "encaminhamento", label: "Encaminhamento" },
  { value: "laudo", label: "Laudo Médico" },
]

export function CreateCertificateButton({
  patientId,
  patientName,
}: {
  patientId: string
  patientName: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="outline" size="sm" className="gap-1.5" />}
      >
        <FileText className="size-3.5" />
        Atestado
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Documento</DialogTitle>
          <DialogDescription>
            Paciente: <strong>{patientName}</strong>
          </DialogDescription>
        </DialogHeader>
        <CreateCertificateForm
          patientId={patientId}
          patientName={patientName}
          onClose={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function CreateCertificateForm({
  patientId,
  patientName,
  onClose,
}: {
  patientId: string
  patientName: string
  onClose: () => void
}) {
  const [type, setType] = useState("atestado")
  const [days, setDays] = useState("1")
  const [cid, setCid] = useState("")
  const [cidDescription, setCidDescription] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [content, setContent] = useState("")
  const [saving, startSave] = useTransition()
  const router = useRouter()

  const handleSubmit = () => {
    if ((type === "encaminhamento" || type === "laudo") && !content.trim()) {
      toast.error("Preencha o conteudo do documento")
      return
    }
    if (type === "atestado" && (!days || parseInt(days) < 1)) {
      toast.error("Informe o numero de dias de afastamento")
      return
    }

    startSave(async () => {
      try {
        const result = await createCertificate({
          patientId,
          type,
          days: type === "atestado" ? parseInt(days) : undefined,
          cid: cid.trim() || undefined,
          cidDescription: cidDescription.trim() || undefined,
          startTime: type === "declaracao_comparecimento" ? startTime : undefined,
          endTime: type === "declaracao_comparecimento" ? endTime : undefined,
          content: type === "encaminhamento" || type === "laudo" ? content : undefined,
        })
        if ('error' in result) { toast.error(result.error); return }
        toast.success("Documento criado com sucesso")
        onClose()
        window.open(`/certificates/${result.id}`, "_blank")
        router.refresh()
      } catch (e) {
        toast.error(friendlyError(e, "Erro ao criar documento"))
      }
    })
  }

  return (
    <div className="space-y-4">
        {/* Type selector */}
        <div className="space-y-1.5">
          <Label htmlFor="cert-type">Tipo de documento</Label>
          <Select value={type} onValueChange={(val) => { if (val) setType(val) }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Atestado fields */}
        {type === "atestado" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cert-days">Dias de afastamento</Label>
              <Input
                id="cert-days"
                type="number"
                min={1}
                value={days}
                onChange={(e) => setDays(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>CID (opcional)</Label>
              <CidAutocomplete
                mode="single"
                value={cid ? { code: cid, description: cidDescription } : null}
                onChange={(selected: CidCode | null) => {
                  if (selected) {
                    setCid(selected.code)
                    setCidDescription(selected.description)
                  } else {
                    setCid("")
                    setCidDescription("")
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Declaracao fields */}
        {type === "declaracao_comparecimento" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cert-start">Horário de entrada</Label>
              <Input
                id="cert-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cert-end">Horário de saída</Label>
              <Input
                id="cert-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Free text for encaminhamento/laudo */}
        {(type === "encaminhamento" || type === "laudo") && (
          <div className="space-y-1.5">
            <Label htmlFor="cert-content">Conteudo</Label>
            <Textarea
              id="cert-content"
              placeholder={
                type === "encaminhamento"
                  ? "Descreva o encaminhamento..."
                  : "Descreva o laudo médico..."
              }
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={saving}
            onClick={handleSubmit}
            className="bg-vox-primary text-white hover:bg-vox-primary/90 gap-1.5"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <FileText className="size-3.5" />}
            Criar e imprimir
          </Button>
        </div>
    </div>
  )
}
