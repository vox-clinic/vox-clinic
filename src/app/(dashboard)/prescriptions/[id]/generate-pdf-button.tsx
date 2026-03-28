"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FileDown, Loader2 } from "lucide-react"
import { generatePrescriptionPdfAction } from "@/server/actions/prescription"
import { toast } from "sonner"

export function GeneratePdfButton({ prescriptionId }: { prescriptionId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const result = await generatePrescriptionPdfAction(prescriptionId)
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      // Open PDF in new tab
      window.open(result.url, "_blank")
    } catch {
      toast.error("Erro ao gerar PDF. Tente novamente.")
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
      className="gap-2"
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <FileDown className="size-4" />
      )}
      Gerar PDF
    </Button>
  )
}
