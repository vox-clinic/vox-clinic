"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, MessageCircle } from "lucide-react"
import { sendPrescriptionWhatsApp } from "@/server/actions/prescription"
import { toast } from "sonner"

export function SendWhatsAppButton({ prescriptionId }: { prescriptionId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const result = await sendPrescriptionWhatsApp(prescriptionId)
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      toast.success("Prescrição enviada via WhatsApp!")
    } catch {
      toast.error("Erro ao enviar via WhatsApp. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={loading}
      className="gap-2 border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <MessageCircle className="size-4" />
      )}
      Enviar WhatsApp
    </Button>
  )
}
