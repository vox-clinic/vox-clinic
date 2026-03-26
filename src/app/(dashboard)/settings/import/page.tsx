"use client"

import { useState, useCallback, useRef } from "react"
import Papa from "papaparse"
import {
  Upload,
  FileSpreadsheet,
  Check,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { importPatients } from "@/server/actions/import"
import Link from "next/link"

type PatientField = "name" | "document" | "phone" | "email" | "birthDate"

const fieldLabels: Record<PatientField, string> = {
  name: "Nome",
  document: "CPF",
  phone: "Telefone",
  email: "Email",
  birthDate: "Data de Nascimento",
}

const fieldOrder: PatientField[] = ["name", "document", "phone", "email", "birthDate"]

type Step = "upload" | "mapping" | "preview" | "result"

export default function ImportPage() {
  const [step, setStep] = useState<Step>("upload")
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvData, setCsvData] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Record<PatientField, string>>({
    name: "",
    document: "",
    phone: "",
    email: "",
    birthDate: "",
  })
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{
    created: number
    skipped: number
    errors: { row: number; reason: string }[]
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    setError(null)
    setFileName(file.name)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "UTF-8",
      complete(results) {
        const headers = results.meta.fields ?? []
        const data = results.data as Record<string, string>[]

        if (headers.length === 0 || data.length === 0) {
          setError("Arquivo vazio ou sem dados validos.")
          return
        }

        setCsvHeaders(headers)
        setCsvData(data)

        // Auto-map columns by common names
        const autoMap: Record<PatientField, string> = {
          name: "",
          document: "",
          phone: "",
          email: "",
          birthDate: "",
        }

        for (const h of headers) {
          const lower = h.toLowerCase().trim()
          if (
            !autoMap.name &&
            (lower === "nome" ||
              lower === "name" ||
              lower === "paciente" ||
              lower === "nome completo" ||
              lower === "nome_completo")
          ) {
            autoMap.name = h
          } else if (
            !autoMap.document &&
            (lower === "cpf" || lower === "documento" || lower === "document" || lower === "cpf/cnpj")
          ) {
            autoMap.document = h
          } else if (
            !autoMap.phone &&
            (lower === "telefone" ||
              lower === "phone" ||
              lower === "celular" ||
              lower === "tel" ||
              lower === "whatsapp")
          ) {
            autoMap.phone = h
          } else if (!autoMap.email && (lower === "email" || lower === "e-mail")) {
            autoMap.email = h
          } else if (
            !autoMap.birthDate &&
            (lower === "data de nascimento" ||
              lower === "nascimento" ||
              lower === "birthdate" ||
              lower === "birth_date" ||
              lower === "data_nascimento" ||
              lower === "dt_nascimento")
          ) {
            autoMap.birthDate = h
          }
        }

        setMapping(autoMap)
        setStep("mapping")
      },
      error() {
        setError("Erro ao ler o arquivo. Verifique se e um CSV valido.")
      },
    })
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const mappedRows = csvData.map((row) => ({
    name: mapping.name ? row[mapping.name] ?? "" : "",
    document: mapping.document ? row[mapping.document] ?? "" : undefined,
    phone: mapping.phone ? row[mapping.phone] ?? "" : undefined,
    email: mapping.email ? row[mapping.email] ?? "" : undefined,
    birthDate: mapping.birthDate ? row[mapping.birthDate] ?? "" : undefined,
  }))

  const validCount = mappedRows.filter((r) => r.name.trim()).length

  async function handleImport() {
    setImporting(true)
    setError(null)
    try {
      const res = await importPatients(mappedRows)
      setResult(res)
      setStep("result")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao importar pacientes")
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/settings">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="size-4" />
            Configuracoes
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Importar Pacientes
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Importe pacientes a partir de um arquivo CSV
        </p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge
          variant={step === "upload" ? "default" : "secondary"}
          className={step === "upload" ? "bg-vox-primary text-white" : ""}
        >
          1. Upload
        </Badge>
        <ArrowRight className="size-3" />
        <Badge
          variant={step === "mapping" ? "default" : "secondary"}
          className={step === "mapping" ? "bg-vox-primary text-white" : ""}
        >
          2. Mapeamento
        </Badge>
        <ArrowRight className="size-3" />
        <Badge
          variant={step === "preview" ? "default" : "secondary"}
          className={step === "preview" ? "bg-vox-primary text-white" : ""}
        >
          3. Revisao
        </Badge>
        <ArrowRight className="size-3" />
        <Badge
          variant={step === "result" ? "default" : "secondary"}
          className={step === "result" ? "bg-vox-success text-white" : ""}
        >
          4. Resultado
        </Badge>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="animate-fade-in rounded-xl border border-vox-error/30 bg-vox-error/5 px-4 py-3 text-sm text-vox-error flex items-center gap-2">
          <AlertTriangle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="size-4 text-vox-primary" />
              Selecionar Arquivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="group cursor-pointer rounded-xl border-2 border-dashed border-border/50 bg-muted/20 px-6 py-16 text-center transition-all duration-200 hover:border-vox-primary/40 hover:bg-vox-primary/[0.02]"
            >
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-vox-primary/10 transition-transform group-hover:scale-105">
                <Upload className="size-7 text-vox-primary" />
              </div>
              <p className="text-sm font-medium">
                Arraste um arquivo CSV aqui ou clique para selecionar
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Formatos aceitos: .csv (separado por virgula ou ponto-e-virgula)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFile(file)
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Column Mapping */}
      {step === "mapping" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileSpreadsheet className="size-4 text-vox-primary" />
                Mapear Colunas
              </CardTitle>
              <Badge variant="secondary">{fileName}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Associe as colunas do seu CSV aos campos do paciente.
              O campo <strong>Nome</strong> e obrigatorio.
            </p>

            <div className="space-y-3">
              {fieldOrder.map((field) => (
                <div
                  key={field}
                  className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4"
                >
                  <label className="w-40 shrink-0 text-sm font-medium flex items-center gap-2">
                    {fieldLabels[field]}
                    {field === "name" && (
                      <span className="text-vox-error text-xs">*</span>
                    )}
                  </label>
                  <select
                    value={mapping[field]}
                    onChange={(e) =>
                      setMapping((prev) => ({ ...prev, [field]: e.target.value }))
                    }
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-vox-primary/40 focus:border-vox-primary"
                  >
                    <option value="">-- Nao mapear --</option>
                    {csvHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {!mapping.name && (
              <div className="flex items-center gap-2 rounded-xl border border-vox-warning/30 bg-vox-warning/5 px-4 py-3 text-sm text-vox-warning">
                <AlertTriangle className="size-4 shrink-0" />
                Selecione a coluna correspondente ao nome do paciente
              </div>
            )}

            <Separator />

            <div className="flex justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStep("upload")
                  setCsvHeaders([])
                  setCsvData([])
                  setFileName("")
                }}
              >
                <ArrowLeft className="size-4" />
                Voltar
              </Button>
              <Button
                onClick={() => setStep("preview")}
                disabled={!mapping.name}
                className="bg-vox-primary text-white hover:bg-vox-primary/90"
              >
                Revisar Dados
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview */}
      {step === "preview" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileSpreadsheet className="size-4 text-vox-primary" />
                Revisar Importacao
              </CardTitle>
              <Badge variant="secondary" className="tabular-nums">
                {validCount} de {csvData.length} validos
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Confira os primeiros registros antes de importar.
              Pacientes duplicados (mesmo CPF) serao ignorados automaticamente.
            </p>

            {/* Preview table */}
            <div className="overflow-x-auto rounded-xl border border-border/50">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">#</th>
                    {fieldOrder.map(
                      (f) =>
                        mapping[f] && (
                          <th
                            key={f}
                            className="px-3 py-2.5 text-left font-medium text-muted-foreground"
                          >
                            {fieldLabels[f]}
                          </th>
                        )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {mappedRows.slice(0, 10).map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-border/30 last:border-0"
                    >
                      <td className="px-3 py-2 text-muted-foreground tabular-nums">
                        {i + 1}
                      </td>
                      {mapping.name && (
                        <td className="px-3 py-2 font-medium">
                          {row.name || (
                            <span className="text-vox-error text-xs">Vazio</span>
                          )}
                        </td>
                      )}
                      {mapping.document && (
                        <td className="px-3 py-2 font-mono text-xs">
                          {row.document || "-"}
                        </td>
                      )}
                      {mapping.phone && (
                        <td className="px-3 py-2">{row.phone || "-"}</td>
                      )}
                      {mapping.email && (
                        <td className="px-3 py-2">{row.email || "-"}</td>
                      )}
                      {mapping.birthDate && (
                        <td className="px-3 py-2">{row.birthDate || "-"}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {csvData.length > 10 && (
              <p className="text-xs text-muted-foreground text-center">
                Mostrando 10 de {csvData.length} registros
              </p>
            )}

            <Separator />

            <div className="flex justify-between">
              <Button variant="ghost" size="sm" onClick={() => setStep("mapping")}>
                <ArrowLeft className="size-4" />
                Voltar
              </Button>
              <Button
                onClick={handleImport}
                disabled={importing || validCount === 0}
                className="bg-vox-primary text-white hover:bg-vox-primary/90"
              >
                {importing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="size-4" />
                    Importar {validCount} pacientes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Result */}
      {step === "result" && result && (
        <Card>
          <CardContent className="space-y-5 pt-6">
            <div className="text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-vox-success/10">
                <Check className="size-8 text-vox-success" />
              </div>
              <h2 className="text-lg font-semibold">Importacao Concluida</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Os pacientes foram processados com sucesso
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-vox-success/30 bg-vox-success/5 p-4 text-center">
                <p className="text-2xl font-bold text-vox-success tabular-nums">
                  {result.created}
                </p>
                <p className="text-xs text-muted-foreground">Criados</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/30 p-4 text-center">
                <p className="text-2xl font-bold text-muted-foreground tabular-nums">
                  {result.skipped}
                </p>
                <p className="text-xs text-muted-foreground">Ignorados</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="size-4 text-vox-warning" />
                  Erros de validacao ({result.errors.length})
                </p>
                <div className="max-h-40 overflow-y-auto rounded-xl border border-border/50 bg-muted/20 p-3 space-y-1">
                  {result.errors.slice(0, 20).map((err, i) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      <span className="font-mono">Linha {err.row}:</span>{" "}
                      {err.reason}
                    </p>
                  ))}
                  {result.errors.length > 20 && (
                    <p className="text-xs text-muted-foreground">
                      ... e mais {result.errors.length - 20} erros
                    </p>
                  )}
                </div>
              </div>
            )}

            <Separator />

            <div className="flex justify-center gap-3">
              <Link href="/patients">
                <Button className="bg-vox-primary text-white hover:bg-vox-primary/90">
                  Ver Pacientes
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                onClick={() => {
                  setStep("upload")
                  setCsvHeaders([])
                  setCsvData([])
                  setMapping({
                    name: "",
                    document: "",
                    phone: "",
                    email: "",
                    birthDate: "",
                  })
                  setResult(null)
                  setFileName("")
                }}
              >
                Nova Importacao
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
