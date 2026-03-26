"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { exportPatientData } from "@/server/actions/export"

export function ExportButton({
  patientId,
  patientName,
}: {
  patientId: string
  patientName: string
}) {
  const [isExporting, setIsExporting] = useState(false)

  async function handleExport() {
    setIsExporting(true)
    try {
      const data = await exportPatientData(patientId)

      // Build CSV
      const rows: string[][] = []

      // Patient header
      rows.push(["=== DADOS DO PACIENTE ==="])
      rows.push(["Campo", "Valor"])
      rows.push(["Nome", data.patient.name])
      if (data.patient.document) rows.push(["CPF", data.patient.document])
      if (data.patient.phone) rows.push(["Telefone", data.patient.phone])
      if (data.patient.email) rows.push(["Email", data.patient.email])
      if (data.patient.birthDate) rows.push(["Data Nascimento", new Date(data.patient.birthDate).toLocaleDateString("pt-BR")])
      rows.push(["Ativo", data.patient.isActive ? "Sim" : "Nao"])
      rows.push(["Cadastrado em", new Date(data.patient.createdAt).toLocaleDateString("pt-BR")])
      rows.push([])

      // Appointments
      rows.push(["=== CONSULTAS ==="])
      rows.push(["Data", "Procedimentos", "Observacoes", "Status"])
      for (const apt of data.appointments) {
        rows.push([
          new Date(apt.date).toLocaleDateString("pt-BR"),
          (apt.procedures as string[]).join("; "),
          apt.notes || "",
          apt.status,
        ])
      }
      rows.push([])

      // Export info
      rows.push(["=== EXPORTACAO ==="])
      rows.push(["Data exportacao", new Date(data.exportDate).toLocaleDateString("pt-BR")])
      rows.push(["LGPD", data.lgpdNotice])

      const csvContent = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n")
      const bom = "\uFEFF" // UTF-8 BOM for Excel compatibility
      const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8" })
      const url = URL.createObjectURL(blob)

      const safeName = patientName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")

      const a = document.createElement("a")
      a.href = url
      a.download = `paciente-${safeName}-dados.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Erro ao exportar dados:", error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isExporting}
    >
      {isExporting ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Download className="size-4" />
      )}
      Exportar Dados
    </Button>
  )
}
