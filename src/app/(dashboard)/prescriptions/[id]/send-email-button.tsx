"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Mail } from "lucide-react"
import { sendPrescriptionEmail } from "@/server/actions/prescription"
import { toast } from "sonner"

export function SendEmailButton({ prescriptionId }: { prescriptionId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const result = await sendPrescriptionEmail(prescriptionId)
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      toast.success("Prescrição enviada por email!")
    } catch {
      toast.error("Erro ao enviar por email. Tente novamente.")
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
      className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Mail className="size-4" />
      )}
      Enviar Email
    </Button>
  )
}
