"use client"

import { useState, useCallback, useRef, useMemo } from "react"
import {
  FileSpreadsheet,
  RefreshCw,
  Sparkles,
  Upload,
  Check,
  AlertTriangle,
  X,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Info,
  ChevronDown,
  ChevronUp,
  FileText,
  Users,
  AlertCircle,
  CheckCircle2,
  PartyPopper,
  GripVertical,
  HelpCircle,
  Eye,
  Download,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb } from "@/components/breadcrumb"
import {
  startMigrationAction,
  confirmMigrationAction,
  getAutoColumnMapping,
} from "@/server/actions/migration"
import type {
  MigrationPreview,
  MigrationResult,
  MigrationSource,
  MigrationAdapterConfig,
  DeduplicationResult,
  MigrationError,
} from "@/lib/migration"
import { toast } from "sonner"
import Link from "next/link"

// ── Types ──

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6

interface StepInfo {
  number: WizardStep
  label: string
}

const STEPS: StepInfo[] = [
  { number: 1, label: "Origem" },
  { number: 2, label: "Upload" },
  { number: 3, label: "Colunas" },
  { number: 4, label: "Revisao" },
  { number: 5, label: "Conflitos" },
  { number: 6, label: "Resultado" },
]

// VoxClinic field definitions for column mapping
interface FieldGroup {
  label: string
  fields: { value: string; label: string }[]
}

const FIELD_GROUPS: FieldGroup[] = [
  {
    label: "Dados do Paciente",
    fields: [
      { value: "name", label: "Nome do Paciente *" },
      { value: "document", label: "CPF" },
      { value: "rg", label: "RG" },
      { value: "phone", label: "Telefone" },
      { value: "email", label: "Email" },
      { value: "birthDate", label: "Data de Nascimento" },
      { value: "gender", label: "Sexo" },
    ],
  },
  {
    label: "Endereco",
    fields: [
      { value: "address.street", label: "Rua" },
      { value: "address.number", label: "Numero" },
      { value: "address.complement", label: "Complemento" },
      { value: "address.neighborhood", label: "Bairro" },
      { value: "address.city", label: "Cidade" },
      { value: "address.state", label: "Estado" },
      { value: "address.zipCode", label: "CEP" },
    ],
  },
  {
    label: "Consultas / Agendamentos",
    fields: [
      { value: "appt.patientName", label: "Nome do Paciente (consulta)" },
      { value: "appt.patientDocument", label: "CPF do Paciente (consulta)" },
      { value: "appt.patientPhone", label: "Telefone do Paciente (consulta)" },
      { value: "appt.patientEmail", label: "Email do Paciente (consulta)" },
      { value: "appt.date", label: "Data da Consulta" },
      { value: "appt.endDate", label: "Data/Hora Fim" },
      { value: "appt.procedures", label: "Procedimento" },
      { value: "appt.notes", label: "Observacoes da Consulta" },
      { value: "appt.status", label: "Status da Consulta" },
      { value: "appt.price", label: "Valor" },
      { value: "appt.cancelled", label: "Cancelado (Sim/Nao)" },
      { value: "appt.cancelReason", label: "Motivo Cancelamento" },
      { value: "appt.provider", label: "Profissional" },
      { value: "appt.duration", label: "Duracao (minutos)" },
    ],
  },
  {
    label: "Outros",
    fields: [
      { value: "insurance", label: "Convenio" },
      { value: "guardian", label: "Responsavel" },
      { value: "source", label: "Origem" },
      { value: "tags", label: "Tags" },
    ],
  },
]

const ALL_FIELDS = FIELD_GROUPS.flatMap((g) => g.fields)

// ── Tutorial Tip Component ──

function TutorialTip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border border-vox-primary/20 bg-vox-primary/5 p-4">
      <Info className="mt-0.5 size-5 shrink-0 text-vox-primary" />
      <div className="text-sm text-muted-foreground leading-relaxed">
        {children}
      </div>
    </div>
  )
}

// ── Progress Bar ──

function ProgressBar({
  currentStep,
  completedSteps,
  hasConflicts,
}: {
  currentStep: WizardStep
  completedSteps: Set<WizardStep>
  hasConflicts: boolean
}) {
  const visibleSteps = hasConflicts ? STEPS : STEPS.filter((s) => s.number !== 5)

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {visibleSteps.map((step, index) => {
          const isActive = step.number === currentStep
          const isCompleted = completedSteps.has(step.number)
          const isLast = index === visibleSteps.length - 1

          return (
            <div key={step.number} className="flex items-center flex-1 last:flex-initial">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`
                    flex size-9 items-center justify-center rounded-full text-sm font-semibold transition-all
                    ${isCompleted
                      ? "bg-vox-primary text-white"
                      : isActive
                        ? "bg-vox-primary text-white ring-4 ring-vox-primary/20"
                        : "bg-muted text-muted-foreground"
                    }
                  `}
                >
                  {isCompleted ? <Check className="size-4" /> : step.number}
                </div>
                <span
                  className={`text-xs font-medium whitespace-nowrap ${
                    isActive ? "text-vox-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className={`mx-2 h-0.5 flex-1 rounded-full transition-all ${
                    isCompleted ? "bg-vox-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Stat Card ──

function StatCard({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string
  value: number
  color: "green" | "amber" | "red" | "blue"
  icon: React.ElementType
}) {
  const colorMap = {
    green: "bg-vox-success/10 text-vox-success border-vox-success/20",
    amber: "bg-vox-warning/10 text-vox-warning border-vox-warning/20",
    red: "bg-vox-error/10 text-vox-error border-vox-error/20",
    blue: "bg-vox-primary/10 text-vox-primary border-vox-primary/20",
  }

  return (
    <div className={`flex items-center gap-3 rounded-xl border p-4 ${colorMap[color]}`}>
      <Icon className="size-8" />
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs font-medium opacity-80">{label}</p>
      </div>
    </div>
  )
}

// ── Main Page ──

export default function MigrationPage() {
  // Wizard state
  const [step, setStep] = useState<WizardStep>(1)
  const [completedSteps, setCompletedSteps] = useState<Set<WizardStep>>(new Set())

  // Step 1: Source
  const [selectedSource, setSelectedSource] = useState<"csv" | "other" | "manual" | null>(null)

  // Step 2: Upload
  const [file, setFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState("")
  const [fileSize, setFileSize] = useState("")
  const [headers, setHeaders] = useState<string[]>([])
  const [parsedData, setParsedData] = useState<Record<string, string>[]>([])
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Step 3: Column mapping
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
  const [isAutoMapping, setIsAutoMapping] = useState(false)

  // Step 4: Preview / Validation
  const [migrationPreview, setMigrationPreview] = useState<MigrationPreview | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processError, setProcessError] = useState<string | null>(null)

  // Step 5: Conflict resolution
  const [resolutions, setResolutions] = useState<Record<string, "keep" | "overwrite" | "merge">>({})

  // Step 6: Result
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)

  // Tutorial collapsible
  const [showExportTutorial, setShowExportTutorial] = useState(false)

  // Error preview expansion
  const [showAllErrors, setShowAllErrors] = useState(false)

  // ── Derived state ──

  const hasConflicts = useMemo(() => {
    return (migrationPreview?.sampleConflicts?.length ?? 0) > 0
  }, [migrationPreview])

  const nameIsMapped = useMemo(() => {
    const values = Object.values(columnMapping)
    return values.includes("name") || values.includes("appt.patientName")
  }, [columnMapping])

  const mappedCount = useMemo(() => {
    return Object.values(columnMapping).filter((v) => v && v !== "_ignore").length
  }, [columnMapping])

  const unmappedCount = useMemo(() => {
    return headers.filter((h) => !columnMapping[h] || columnMapping[h] === "_ignore").length
  }, [headers, columnMapping])

  // Summary counts for step 6
  const summaryStats = useMemo(() => {
    if (!migrationPreview) return { create: 0, update: 0, skip: 0 }
    const conflicts = migrationPreview.sampleConflicts || []
    let create = migrationPreview.stats.valid - conflicts.length
    let update = 0
    let skip = 0

    for (const c of conflicts) {
      const res = resolutions[c.existingPatientId ?? ""] ?? "keep"
      if (res === "keep") skip++
      else update++
    }

    return { create: Math.max(0, create), update, skip: skip + migrationPreview.stats.errors }
  }, [migrationPreview, resolutions])

  // ── Helpers ──

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function markCompleted(s: WizardStep) {
    setCompletedSteps((prev) => {
      const next = new Set(prev)
      next.add(s)
      return next
    })
  }

  function goToStep(s: WizardStep) {
    setStep(s)
  }

  // ── Step 2: File Parsing ──

  const handleFile = useCallback(async (f: File) => {
    setParseError(null)
    setIsParsing(true)

    if (f.size > 10 * 1024 * 1024) {
      setParseError("Arquivo muito grande. O tamanho maximo e 10MB.")
      setIsParsing(false)
      return
    }

    const ext = f.name.split(".").pop()?.toLowerCase()
    setFile(f)
    setFileName(f.name)
    setFileSize(formatFileSize(f.size))

    try {
      if (ext === "csv" || ext === "txt") {
        const Papa = (await import("papaparse")).default
        Papa.parse(f, {
          header: true,
          skipEmptyLines: true,
          encoding: "UTF-8",
          complete(results) {
            const h = results.meta.fields ?? []
            const data = results.data as Record<string, string>[]

            if (h.length === 0 || data.length === 0) {
              setParseError("Arquivo vazio ou sem dados validos.")
              setIsParsing(false)
              return
            }

            setHeaders(h)
            setParsedData(data)
            setPreviewRows(data.slice(0, 3))
            setIsParsing(false)
          },
          error() {
            setParseError("Erro ao ler o arquivo. Verifique se e um CSV valido.")
            setIsParsing(false)
          },
        })
      } else if (ext === "xlsx" || ext === "xls") {
        const XLSX = await import("xlsx")
        const buffer = await f.arrayBuffer()
        const wb = XLSX.read(buffer, { type: "array" })
        const sheetName = wb.SheetNames[0]
        if (!sheetName) {
          setParseError("Arquivo Excel vazio.")
          setIsParsing(false)
          return
        }
        const data = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets[sheetName], {
          defval: "",
          raw: false,
        })
        const h = data.length > 0 ? Object.keys(data[0]) : []

        if (h.length === 0 || data.length === 0) {
          setParseError("Planilha vazia ou sem dados validos.")
          setIsParsing(false)
          return
        }

        setHeaders(h)
        setParsedData(data)
        setPreviewRows(data.slice(0, 3))
        setIsParsing(false)
      } else {
        setParseError("Formato nao suportado. Use CSV, TXT ou Excel (.xlsx, .xls).")
        setIsParsing(false)
      }
    } catch {
      setParseError("Erro inesperado ao processar o arquivo.")
      setIsParsing(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const f = e.dataTransfer.files[0]
      if (f) handleFile(f)
    },
    [handleFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  // ── Step 3: Auto-mapping ──

  async function runAutoMapping() {
    if (headers.length === 0) return
    setIsAutoMapping(true)
    try {
      const { mapping, dataType } = await getAutoColumnMapping(headers)
      setColumnMapping(mapping)
      const mappedCount = Object.keys(mapping).length
      if (dataType === "appointments") {
        toast.success(`${mappedCount} colunas detectadas (arquivo de agendamentos)`)
      } else if (dataType === "mixed") {
        toast.success(`${mappedCount} colunas detectadas (dados mistos)`)
      } else {
        toast.success(`${mappedCount} colunas mapeadas automaticamente`)
      }
    } catch {
      toast.error("Erro ao detectar colunas automaticamente")
    } finally {
      setIsAutoMapping(false)
    }
  }

  function updateMapping(csvHeader: string, voxField: string) {
    setColumnMapping((prev) => {
      const next = { ...prev }
      // If this voxField is already mapped to another header, unmap it
      if (voxField && voxField !== "_ignore") {
        for (const key of Object.keys(next)) {
          if (next[key] === voxField && key !== csvHeader) {
            delete next[key]
          }
        }
      }
      if (voxField) {
        next[csvHeader] = voxField
      } else {
        delete next[csvHeader]
      }
      return next
    })
  }

  // ── Step 4: Process migration ──

  async function processMigration() {
    setIsProcessing(true)
    setProcessError(null)
    try {
      const source: MigrationSource = file?.name.endsWith(".csv") || file?.name.endsWith(".txt") ? "csv" : "csv"
      const config: MigrationAdapterConfig = {
        source,
        columnMapping,
      }
      // Send raw parsed data rows to server
      const result = await startMigrationAction(source, config, parsedData, fileName)
      setMigrationPreview(result)

      // Initialize conflict resolutions
      if (result.sampleConflicts?.length > 0) {
        const initial: Record<string, "keep" | "overwrite" | "merge"> = {}
        for (const conflict of result.sampleConflicts) {
          if (conflict.existingPatientId) {
            initial[conflict.existingPatientId] = "keep"
          }
        }
        setResolutions(initial)
      }
    } catch (err) {
      setProcessError(err instanceof Error ? err.message : "Erro ao processar dados")
      toast.error("Erro ao processar dados")
    } finally {
      setIsProcessing(false)
    }
  }

  // ── Step 6: Confirm migration ──

  async function handleConfirm() {
    if (!migrationPreview) return
    setIsConfirming(true)
    try {
      const result = await confirmMigrationAction(migrationPreview.sessionId, resolutions)
      setMigrationResult(result)
      markCompleted(6)
      toast.success("Importacao concluida com sucesso!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao confirmar importacao")
    } finally {
      setIsConfirming(false)
    }
  }

  // ── Navigation ──

  function handleNextFromStep1() {
    if (selectedSource === "csv") {
      markCompleted(1)
      goToStep(2)
    }
  }

  async function handleNextFromStep2() {
    if (parsedData.length > 0 && headers.length > 0) {
      markCompleted(2)
      goToStep(3)
      await runAutoMapping()
    }
  }

  async function handleNextFromStep3() {
    if (!nameIsMapped) {
      toast.error("O campo Nome e obrigatorio. Mapeie uma coluna para ele.")
      return
    }
    markCompleted(3)
    goToStep(4)
    await processMigration()
  }

  function handleNextFromStep4() {
    markCompleted(4)
    if (hasConflicts) {
      goToStep(5)
    } else {
      goToStep(6)
    }
  }

  function handleNextFromStep5() {
    markCompleted(5)
    goToStep(6)
  }

  function resetWizard() {
    setStep(1)
    setCompletedSteps(new Set())
    setSelectedSource(null)
    setFile(null)
    setFileName("")
    setFileSize("")
    setHeaders([])
    setParsedData([])
    setPreviewRows([])
    setParseError(null)
    setColumnMapping({})
    setMigrationPreview(null)
    setProcessError(null)
    setResolutions({})
    setMigrationResult(null)
  }

  // ── Render ──

  return (
    <div className="space-y-6 pb-20">
      <Breadcrumb
        items={[
          { label: "Configuracoes", href: "/settings" },
          { label: "Migrar Dados" },
        ]}
      />

      {/* Progress Bar - hide on step 6 if result is done */}
      {!(step === 6 && migrationResult) && (
        <ProgressBar
          currentStep={step}
          completedSteps={completedSteps}
          hasConflicts={hasConflicts}
        />
      )}

      {/* ════════════════════════════════════════════════════
          STEP 1: Escolha a Origem
         ════════════════════════════════════════════════════ */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Importar Dados para o VoxClinic
            </h1>
            <p className="mt-2 text-muted-foreground">
              Migre seus pacientes de qualquer sistema em poucos minutos
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {/* CSV/Excel Card */}
            <button
              onClick={() => setSelectedSource("csv")}
              className={`
                group relative flex flex-col items-center gap-4 rounded-2xl border p-6 text-left transition-all
                hover:border-vox-primary/40 hover:shadow-md active:scale-[0.98]
                ${selectedSource === "csv"
                  ? "border-vox-primary bg-vox-primary/5 ring-2 ring-vox-primary/20 shadow-md"
                  : "border-border/40 bg-card"
                }
              `}
            >
              <Badge className="absolute right-3 top-3 bg-vox-primary/10 text-vox-primary border-vox-primary/20 text-[10px]">
                Mais comum
              </Badge>
              <div className={`rounded-xl p-3 ${selectedSource === "csv" ? "bg-vox-primary/10" : "bg-muted"}`}>
                <FileSpreadsheet className={`size-8 ${selectedSource === "csv" ? "text-vox-primary" : "text-muted-foreground"}`} />
              </div>
              <div className="text-center">
                <h3 className="font-semibold">Arquivo CSV ou Excel</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Exporte seus dados do sistema atual como planilha e importe aqui
                </p>
              </div>
            </button>

            {/* Outro Sistema Card */}
            <div
              className="relative flex flex-col items-center gap-4 rounded-2xl border border-border/40 bg-card p-6 opacity-60 cursor-not-allowed"
            >
              <Badge className="absolute right-3 top-3 bg-muted text-muted-foreground border-border/40 text-[10px]">
                Em breve
              </Badge>
              <div className="rounded-xl bg-muted p-3">
                <RefreshCw className="size-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-muted-foreground">Migrar de outro software</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  iClinic, Feegow, Clinicorp e outros
                </p>
              </div>
            </div>

            {/* Comecar do Zero Card */}
            <Link
              href="/patients/new/manual"
              className="group relative flex flex-col items-center gap-4 rounded-2xl border border-border/40 bg-card p-6 transition-all hover:border-vox-primary/40 hover:shadow-md active:scale-[0.98]"
            >
              <div className="rounded-xl bg-muted p-3 group-hover:bg-vox-primary/10 transition-colors">
                <Sparkles className="size-8 text-muted-foreground group-hover:text-vox-primary transition-colors" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold">Comecar do zero</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Para clinicas novas sem dados para migrar
                </p>
              </div>
            </Link>
          </div>

          {/* Export tutorial collapsible */}
          <Card className="rounded-2xl border-border/40">
            <button
              onClick={() => setShowExportTutorial(!showExportTutorial)}
              className="flex w-full items-center justify-between p-4 text-left"
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="size-4 text-vox-primary" />
                <span className="text-sm font-medium">
                  Como exportar meus dados?
                </span>
              </div>
              {showExportTutorial ? (
                <ChevronUp className="size-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground" />
              )}
            </button>
            {showExportTutorial && (
              <CardContent className="border-t pt-4 space-y-4">
                <div className="flex gap-3 items-start">
                  <div className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-vox-primary/10 text-vox-primary text-xs font-bold">1</div>
                  <p className="text-sm text-muted-foreground">
                    A maioria dos sistemas permite exportar dados como CSV ou Excel. Procure em <strong>Configuracoes &gt; Exportar</strong> ou <strong>Relatorios &gt; Exportar</strong>
                  </p>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-vox-primary/10 text-vox-primary text-xs font-bold">2</div>
                  <p className="text-sm text-muted-foreground">
                    Exporte cada tipo de dado separadamente (pacientes, agendamentos, etc.) — <strong>voce pode importar cada arquivo individualmente</strong>
                  </p>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-vox-primary/10 text-vox-primary text-xs font-bold">3</div>
                  <p className="text-sm text-muted-foreground">
                    O sistema detecta automaticamente se o arquivo contem pacientes ou agendamentos e sugere o mapeamento correto
                  </p>
                </div>
                <div className="rounded-xl bg-muted/30 p-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Guia por sistema:</p>
                  <ul className="text-xs text-muted-foreground space-y-1.5">
                    <li><strong>Clinicorp:</strong> Exporte cada secao (Pacientes - Cadastro, Agendamentos) como arquivo separado e importe um por vez</li>
                    <li><strong>iClinic:</strong> Va em Configuracoes &gt; Exportar Dados, selecione Pacientes ou Consultas</li>
                    <li><strong>Feegow:</strong> Va em Relatorios &gt; Exportar, escolha o tipo de dado</li>
                    <li><strong>Excel/Planilha:</strong> Qualquer planilha com cabecalho na primeira linha funciona</li>
                  </ul>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Next Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleNextFromStep1}
              disabled={selectedSource !== "csv"}
              className="rounded-xl bg-vox-primary text-white hover:bg-vox-primary/90 active:scale-[0.98]"
            >
              Continuar
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          STEP 2: Upload
         ════════════════════════════════════════════════════ */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              Envie seu arquivo
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Faca upload do arquivo exportado do seu sistema anterior
            </p>
          </div>

          <TutorialTip>
            Formatos aceitos: CSV, Excel (.xlsx). O arquivo deve ter uma linha de cabecalho
            com os nomes das colunas. Tamanho maximo: 10MB.
          </TutorialTip>

          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className={`
              flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-12
              cursor-pointer transition-all hover:border-vox-primary/40 hover:bg-vox-primary/5
              ${parseError ? "border-vox-error/40 bg-vox-error/5" : "border-border/40 bg-card"}
              ${isParsing ? "pointer-events-none opacity-60" : ""}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.txt"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
            />
            {isParsing ? (
              <>
                <Loader2 className="size-12 text-vox-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Processando arquivo...</p>
              </>
            ) : file && !parseError ? (
              <>
                <div className="rounded-xl bg-vox-success/10 p-3">
                  <FileText className="size-8 text-vox-success" />
                </div>
                <div className="text-center">
                  <p className="font-semibold">{fileName}</p>
                  <p className="text-sm text-muted-foreground">
                    {fileSize} &middot; {parsedData.length} registros encontrados
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={(e) => {
                    e.stopPropagation()
                    setFile(null)
                    setFileName("")
                    setFileSize("")
                    setParsedData([])
                    setPreviewRows([])
                    setHeaders([])
                    setParseError(null)
                    if (fileInputRef.current) fileInputRef.current.value = ""
                  }}
                >
                  <X className="mr-1 size-3" />
                  Trocar arquivo
                </Button>
              </>
            ) : (
              <>
                <div className="rounded-xl bg-muted p-4">
                  <Upload className="size-10 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="font-semibold">
                    Arraste o arquivo aqui ou clique para selecionar
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    CSV, Excel (.xlsx, .xls) ou TXT — ate 10MB
                  </p>
                </div>
              </>
            )}
          </div>

          {parseError && (
            <div className="flex items-center gap-2 rounded-xl border border-vox-error/20 bg-vox-error/5 p-4 text-sm text-vox-error">
              <AlertCircle className="size-4 shrink-0" />
              {parseError}
            </div>
          )}

          {/* Preview Table */}
          {previewRows.length > 0 && (
            <Card className="rounded-2xl border-border/40 overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Eye className="size-4 text-vox-primary" />
                  Pre-visualizacao ({Math.min(3, parsedData.length)} de {parsedData.length} registros)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        {headers.slice(0, 8).map((h) => (
                          <th key={h} className="whitespace-nowrap px-4 py-2 text-left font-medium text-muted-foreground">
                            {h}
                          </th>
                        ))}
                        {headers.length > 8 && (
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                            +{headers.length - 8} colunas
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr key={i} className="border-b last:border-0">
                          {headers.slice(0, 8).map((h) => (
                            <td key={h} className="whitespace-nowrap px-4 py-2 text-muted-foreground max-w-[200px] truncate">
                              {row[h] || <span className="text-muted-foreground/40 italic">vazio</span>}
                            </td>
                          ))}
                          {headers.length > 8 && (
                            <td className="px-4 py-2 text-muted-foreground/40">...</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => goToStep(1)}
              className="rounded-xl active:scale-[0.98]"
            >
              <ArrowLeft className="mr-2 size-4" />
              Voltar
            </Button>
            <Button
              onClick={handleNextFromStep2}
              disabled={parsedData.length === 0 || isParsing}
              className="rounded-xl bg-vox-primary text-white hover:bg-vox-primary/90 active:scale-[0.98]"
            >
              Continuar
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          STEP 3: Mapeamento de Colunas
         ════════════════════════════════════════════════════ */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              Associe as colunas
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Conecte cada coluna do seu arquivo ao campo correspondente no VoxClinic
            </p>
          </div>

          <TutorialTip>
            Campos com <CheckCircle2 className="inline size-3.5 text-vox-success" /> verde foram
            detectados automaticamente. Ajuste os demais conforme necessario. Apenas o <strong>Nome</strong> e obrigatorio.
          </TutorialTip>

          {/* Auto-map status */}
          {isAutoMapping && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-vox-primary" />
              Detectando colunas automaticamente...
            </div>
          )}

          {/* Stats bar */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-vox-success" />
              <span className="text-muted-foreground">{mappedCount} mapeadas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="size-4 text-vox-warning" />
              <span className="text-muted-foreground">{unmappedCount} sem mapeamento</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={runAutoMapping}
              disabled={isAutoMapping}
              className="rounded-xl ml-auto"
            >
              <RefreshCw className={`mr-1 size-3 ${isAutoMapping ? "animate-spin" : ""}`} />
              Re-detectar
            </Button>
          </div>

          {/* Mapping grid */}
          <Card className="rounded-2xl border-border/40">
            <CardContent className="divide-y p-0">
              {headers.map((header) => {
                const mappedTo = columnMapping[header]
                const isMapped = mappedTo && mappedTo !== "_ignore"
                const isIgnored = mappedTo === "_ignore"
                const fieldLabel = ALL_FIELDS.find((f) => f.value === mappedTo)?.label

                return (
                  <div
                    key={header}
                    className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:gap-4"
                  >
                    {/* Source column */}
                    <div className="flex items-center gap-2 sm:w-1/3">
                      {isMapped ? (
                        <CheckCircle2 className="size-4 shrink-0 text-vox-success" />
                      ) : isIgnored ? (
                        <X className="size-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <AlertTriangle className="size-4 shrink-0 text-vox-warning" />
                      )}
                      <span className="font-medium text-sm truncate">{header}</span>
                      {/* Sample value */}
                      {previewRows[0]?.[header] && (
                        <span className="ml-auto text-xs text-muted-foreground/60 truncate max-w-[120px] hidden sm:inline">
                          ex: {previewRows[0][header]}
                        </span>
                      )}
                    </div>

                    {/* Arrow */}
                    <ArrowRight className="hidden sm:block size-4 text-muted-foreground/40 shrink-0" />

                    {/* Target dropdown */}
                    <div className="sm:flex-1">
                      <select
                        value={mappedTo || ""}
                        onChange={(e) => updateMapping(header, e.target.value)}
                        className={`
                          w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none
                          transition-colors focus:ring-2 focus:ring-vox-primary/30 focus:border-vox-primary
                          ${isMapped
                            ? "border-vox-success/30"
                            : isIgnored
                              ? "border-border/40 text-muted-foreground"
                              : "border-vox-warning/30"
                          }
                        `}
                      >
                        <option value="">-- Selecione --</option>
                        <option value="_ignore">Ignorar esta coluna</option>
                        {FIELD_GROUPS.map((group) => (
                          <optgroup key={group.label} label={group.label}>
                            {group.fields.map((field) => {
                              const alreadyUsed = Object.entries(columnMapping).some(
                                ([key, val]) => val === field.value && key !== header
                              )
                              return (
                                <option
                                  key={field.value}
                                  value={field.value}
                                  disabled={alreadyUsed}
                                >
                                  {field.label}{alreadyUsed ? " (ja mapeado)" : ""}
                                </option>
                              )
                            })}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => goToStep(2)}
              className="rounded-xl active:scale-[0.98]"
            >
              <ArrowLeft className="mr-2 size-4" />
              Voltar
            </Button>
            <Button
              onClick={handleNextFromStep3}
              disabled={!nameIsMapped || isAutoMapping}
              className="rounded-xl bg-vox-primary text-white hover:bg-vox-primary/90 active:scale-[0.98]"
            >
              {!nameIsMapped ? (
                <>Mapeie o campo Nome para continuar</>
              ) : (
                <>
                  Processar Dados
                  <ArrowRight className="ml-2 size-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          STEP 4: Visualizacao e Validacao
         ════════════════════════════════════════════════════ */}
      {step === 4 && (
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              Revise os dados
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Confira o resultado da validacao antes de importar
            </p>
          </div>

          {isProcessing && (
            <Card className="rounded-2xl border-border/40">
              <CardContent className="flex flex-col items-center gap-4 py-16">
                <Loader2 className="size-12 text-vox-primary animate-spin" />
                <div className="text-center">
                  <p className="font-semibold">Processando dados...</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Validando {parsedData.length} registros e verificando duplicatas
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {processError && !isProcessing && (
            <div className="flex items-center gap-2 rounded-xl border border-vox-error/20 bg-vox-error/5 p-4 text-sm text-vox-error">
              <AlertCircle className="size-4 shrink-0" />
              {processError}
              <Button
                variant="outline"
                size="sm"
                className="ml-auto rounded-xl"
                onClick={processMigration}
              >
                Tentar novamente
              </Button>
            </div>
          )}

          {migrationPreview && !isProcessing && (
            <>
              <TutorialTip>
                Verifique se os dados estao corretos. Registros com erros serao ignorados
                durante a importacao. Duplicatas por CPF sao detectadas automaticamente.
              </TutorialTip>

              {/* Stats cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard
                  label="Total de registros"
                  value={migrationPreview.stats.totalRows}
                  color="blue"
                  icon={FileSpreadsheet}
                />
                <StatCard
                  label="Validos"
                  value={migrationPreview.stats.valid}
                  color="green"
                  icon={CheckCircle2}
                />
                <StatCard
                  label="Com erros"
                  value={migrationPreview.stats.errors}
                  color="red"
                  icon={AlertCircle}
                />
                <StatCard
                  label="Duplicatas"
                  value={migrationPreview.sampleConflicts?.length ?? 0}
                  color="amber"
                  icon={Users}
                />
              </div>

              {/* Validation results table */}
              <Card className="rounded-2xl border-border/40 overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Pre-visualizacao dos registros
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground w-10">
                            #
                          </th>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground w-10">
                            Status
                          </th>
                          {Object.entries(columnMapping)
                            .filter(([, v]) => v && v !== "_ignore")
                            .slice(0, 6)
                            .map(([csvHeader, field]) => (
                              <th
                                key={csvHeader}
                                className="whitespace-nowrap px-4 py-2 text-left font-medium text-muted-foreground"
                              >
                                {ALL_FIELDS.find((f) => f.value === field)?.label ?? field}
                              </th>
                            ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.slice(0, 20).map((row, i) => {
                          // Determine if this row has errors
                          const rowErrors = migrationPreview.errors.filter(
                            (e) => e.sourceRow === i + 1
                          )
                          const hasError = rowErrors.some((e) => e.severity === "error" || e.severity === "fatal")
                          const hasWarning = rowErrors.some((e) => e.severity === "warning")

                          return (
                            <tr
                              key={i}
                              className={`border-b last:border-0 ${
                                hasError
                                  ? "bg-vox-error/5"
                                  : hasWarning
                                    ? "bg-vox-warning/5"
                                    : ""
                              }`}
                            >
                              <td className="px-4 py-2 text-muted-foreground text-xs">
                                {i + 1}
                              </td>
                              <td className="px-4 py-2">
                                {hasError ? (
                                  <X className="size-4 text-vox-error" />
                                ) : hasWarning ? (
                                  <AlertTriangle className="size-4 text-vox-warning" />
                                ) : (
                                  <Check className="size-4 text-vox-success" />
                                )}
                              </td>
                              {Object.entries(columnMapping)
                                .filter(([, v]) => v && v !== "_ignore")
                                .slice(0, 6)
                                .map(([csvHeader]) => (
                                  <td
                                    key={csvHeader}
                                    className="whitespace-nowrap px-4 py-2 text-muted-foreground max-w-[180px] truncate"
                                  >
                                    {row[csvHeader] || (
                                      <span className="text-muted-foreground/40 italic">
                                        vazio
                                      </span>
                                    )}
                                  </td>
                                ))}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  {parsedData.length > 20 && (
                    <div className="border-t px-4 py-2 text-center text-xs text-muted-foreground">
                      Mostrando 20 de {parsedData.length} registros
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Errors detail */}
              {migrationPreview.errors.length > 0 && (
                <Card className="rounded-2xl border-border/40">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <AlertCircle className="size-4 text-vox-error" />
                        Erros e avisos ({migrationPreview.errors.length})
                      </CardTitle>
                      {migrationPreview.errors.length > 5 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-xl text-xs"
                          onClick={() => setShowAllErrors(!showAllErrors)}
                        >
                          {showAllErrors ? "Ver menos" : "Ver todos"}
                          {showAllErrors ? (
                            <ChevronUp className="ml-1 size-3" />
                          ) : (
                            <ChevronDown className="ml-1 size-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(showAllErrors ? migrationPreview.errors : migrationPreview.errors.slice(0, 5)).map(
                      (err, i) => (
                        <div
                          key={i}
                          className={`flex items-start gap-2 rounded-lg p-3 text-sm ${
                            err.severity === "error" || err.severity === "fatal"
                              ? "bg-vox-error/5 text-vox-error"
                              : "bg-vox-warning/5 text-vox-warning"
                          }`}
                        >
                          {err.severity === "warning" ? (
                            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                          ) : (
                            <X className="mt-0.5 size-3.5 shrink-0" />
                          )}
                          <div>
                            {err.sourceRow && (
                              <span className="font-medium">Linha {err.sourceRow}: </span>
                            )}
                            {err.field && (
                              <span className="font-medium">[{err.field}] </span>
                            )}
                            {err.message}
                          </div>
                        </div>
                      )
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Navigation */}
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => goToStep(3)}
                  className="rounded-xl active:scale-[0.98]"
                >
                  <ArrowLeft className="mr-2 size-4" />
                  Voltar
                </Button>
                <Button
                  onClick={handleNextFromStep4}
                  disabled={!migrationPreview.canProceed}
                  className="rounded-xl bg-vox-primary text-white hover:bg-vox-primary/90 active:scale-[0.98]"
                >
                  {migrationPreview.canProceed ? (
                    <>
                      {hasConflicts ? "Resolver Duplicatas" : "Confirmar Importacao"}
                      <ArrowRight className="ml-2 size-4" />
                    </>
                  ) : (
                    "Corrija os erros para continuar"
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          STEP 5: Conflitos (Duplicatas)
         ════════════════════════════════════════════════════ */}
      {step === 5 && migrationPreview && (
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              Resolver Duplicatas
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Encontramos pacientes que ja existem no sistema
            </p>
          </div>

          <TutorialTip>
            Quando um CPF ja existe no sistema, voce pode escolher o que fazer com cada registro.
            <strong> Manter existente</strong> ignora o novo dado,
            <strong> Sobrescrever</strong> substitui os campos, e
            <strong> Mesclar</strong> preenche apenas campos vazios.
          </TutorialTip>

          {/* Bulk actions */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              Aplicar para todos:
            </span>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => {
                const bulk: Record<string, "keep" | "overwrite" | "merge"> = {}
                migrationPreview.sampleConflicts.forEach((c) => {
                  if (c.existingPatientId) bulk[c.existingPatientId] = "keep"
                })
                setResolutions(bulk)
              }}
            >
              Manter todos
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => {
                const bulk: Record<string, "keep" | "overwrite" | "merge"> = {}
                migrationPreview.sampleConflicts.forEach((c) => {
                  if (c.existingPatientId) bulk[c.existingPatientId] = "overwrite"
                })
                setResolutions(bulk)
              }}
            >
              Sobrescrever todos
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => {
                const bulk: Record<string, "keep" | "overwrite" | "merge"> = {}
                migrationPreview.sampleConflicts.forEach((c) => {
                  if (c.existingPatientId) bulk[c.existingPatientId] = "merge"
                })
                setResolutions(bulk)
              }}
            >
              Mesclar todos
            </Button>
          </div>

          {/* Conflict cards */}
          <div className="space-y-4">
            {migrationPreview.sampleConflicts.map((conflict, index) => {
              const patientId = conflict.existingPatientId ?? `conflict-${index}`
              const resolution = resolutions[patientId] ?? "keep"

              return (
                <Card key={patientId} className="rounded-2xl border-border/40">
                  <CardContent className="p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      {/* Patient info */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Users className="size-4 text-vox-warning" />
                          <span className="font-semibold">{conflict.patient.name}</span>
                          {conflict.patient.document && (
                            <Badge
                              variant="outline"
                              className="text-xs"
                            >
                              CPF: {conflict.patient.document}
                            </Badge>
                          )}
                        </div>

                        {/* Conflicting fields */}
                        {conflict.conflictFields.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">
                              Campos com diferenca:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {conflict.conflictFields.map((field) => (
                                <Badge
                                  key={field}
                                  variant="outline"
                                  className="bg-vox-warning/10 text-vox-warning border-vox-warning/20 text-[10px]"
                                >
                                  {ALL_FIELDS.find((f) => f.value === field)?.label ?? field}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Resolution buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setResolutions((prev) => ({ ...prev, [patientId]: "keep" }))
                          }
                          className={`
                            flex flex-col items-center gap-1 rounded-xl border px-4 py-3 text-xs transition-all
                            active:scale-[0.98]
                            ${resolution === "keep"
                              ? "border-vox-primary bg-vox-primary/10 text-vox-primary"
                              : "border-border/40 hover:border-vox-primary/30"
                            }
                          `}
                        >
                          <Check className="size-4" />
                          Manter
                        </button>
                        <button
                          onClick={() =>
                            setResolutions((prev) => ({
                              ...prev,
                              [patientId]: "overwrite",
                            }))
                          }
                          className={`
                            flex flex-col items-center gap-1 rounded-xl border px-4 py-3 text-xs transition-all
                            active:scale-[0.98]
                            ${resolution === "overwrite"
                              ? "border-vox-warning bg-vox-warning/10 text-vox-warning"
                              : "border-border/40 hover:border-vox-warning/30"
                            }
                          `}
                        >
                          <RefreshCw className="size-4" />
                          Sobrescrever
                        </button>
                        <button
                          onClick={() =>
                            setResolutions((prev) => ({
                              ...prev,
                              [patientId]: "merge",
                            }))
                          }
                          className={`
                            flex flex-col items-center gap-1 rounded-xl border px-4 py-3 text-xs transition-all
                            active:scale-[0.98]
                            ${resolution === "merge"
                              ? "border-vox-success bg-vox-success/10 text-vox-success"
                              : "border-border/40 hover:border-vox-success/30"
                            }
                          `}
                        >
                          <GripVertical className="size-4" />
                          Mesclar
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => goToStep(4)}
              className="rounded-xl active:scale-[0.98]"
            >
              <ArrowLeft className="mr-2 size-4" />
              Voltar
            </Button>
            <Button
              onClick={handleNextFromStep5}
              className="rounded-xl bg-vox-primary text-white hover:bg-vox-primary/90 active:scale-[0.98]"
            >
              Continuar
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          STEP 6: Confirmacao e Resultado
         ════════════════════════════════════════════════════ */}
      {step === 6 && (
        <div className="space-y-6">
          {/* Before confirming: summary */}
          {!migrationResult && (
            <>
              <div>
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                  Confirmar Importacao
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Revise o resumo e confirme para importar os dados
                </p>
              </div>

              {/* Summary card */}
              <Card className="rounded-2xl border-border/40">
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {/* File info */}
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-vox-primary/10 p-2.5">
                        <FileText className="size-5 text-vox-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {fileSize} &middot; {parsedData.length} registros no arquivo
                        </p>
                      </div>
                    </div>

                    <Separator />

                    {/* Action breakdown */}
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="flex items-center gap-3 rounded-xl border border-vox-success/20 bg-vox-success/5 p-4">
                        <CheckCircle2 className="size-8 text-vox-success" />
                        <div>
                          <p className="text-2xl font-bold text-vox-success">
                            {summaryStats.create}
                          </p>
                          <p className="text-xs font-medium text-vox-success/80">
                            Pacientes a criar
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-xl border border-vox-warning/20 bg-vox-warning/5 p-4">
                        <RefreshCw className="size-8 text-vox-warning" />
                        <div>
                          <p className="text-2xl font-bold text-vox-warning">
                            {summaryStats.update}
                          </p>
                          <p className="text-xs font-medium text-vox-warning/80">
                            Pacientes a atualizar
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-muted/50 p-4">
                        <X className="size-8 text-muted-foreground" />
                        <div>
                          <p className="text-2xl font-bold text-muted-foreground">
                            {summaryStats.skip}
                          </p>
                          <p className="text-xs font-medium text-muted-foreground/80">
                            Registros a ignorar
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Column mapping summary */}
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Campos mapeados:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(columnMapping)
                          .filter(([, v]) => v && v !== "_ignore")
                          .map(([csvH, field]) => (
                            <Badge
                              key={csvH}
                              variant="outline"
                              className="bg-vox-primary/5 text-vox-primary border-vox-primary/20 text-xs"
                            >
                              {ALL_FIELDS.find((f) => f.value === field)?.label ?? field}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Confirm / Back */}
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => goToStep(hasConflicts ? 5 : 4)}
                  className="rounded-xl active:scale-[0.98]"
                >
                  <ArrowLeft className="mr-2 size-4" />
                  Voltar
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={isConfirming}
                  className="rounded-xl bg-vox-primary text-white hover:bg-vox-primary/90 active:scale-[0.98] px-8"
                >
                  {isConfirming ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 size-4" />
                      Confirmar Importacao
                    </>
                  )}
                </Button>
              </div>

              {/* Loading overlay */}
              {isConfirming && (
                <Card className="rounded-2xl border-vox-primary/20 bg-vox-primary/5">
                  <CardContent className="flex flex-col items-center gap-4 py-12">
                    <Loader2 className="size-10 text-vox-primary animate-spin" />
                    <div className="text-center">
                      <p className="font-semibold text-vox-primary">
                        Importando pacientes...
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Isso pode levar alguns segundos. Nao feche esta pagina.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* After success: celebration */}
          {migrationResult && (
            <div className="space-y-6">
              {/* Celebration card */}
              <Card className="relative rounded-2xl border-vox-success/30 overflow-hidden">
                {/* Animated gradient border */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-vox-primary/20 via-vox-success/20 to-vox-primary/20 animate-pulse pointer-events-none" />
                <CardContent className="relative flex flex-col items-center gap-6 py-12 text-center">
                  <div className="rounded-full bg-vox-success/10 p-5">
                    <PartyPopper className="size-12 text-vox-success" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Importacao Concluida!</h2>
                    <p className="mt-2 text-muted-foreground">
                      Seus dados foram importados com sucesso para o VoxClinic
                    </p>
                  </div>

                  {/* Result stats */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 w-full max-w-lg">
                    <div className="rounded-xl bg-vox-success/10 p-3 text-center">
                      <p className="text-xl font-bold text-vox-success">
                        {migrationResult.stats.created}
                      </p>
                      <p className="text-[10px] text-vox-success/80 font-medium">Criados</p>
                    </div>
                    <div className="rounded-xl bg-vox-warning/10 p-3 text-center">
                      <p className="text-xl font-bold text-vox-warning">
                        {migrationResult.stats.updated}
                      </p>
                      <p className="text-[10px] text-vox-warning/80 font-medium">Atualizados</p>
                    </div>
                    <div className="rounded-xl bg-muted p-3 text-center">
                      <p className="text-xl font-bold text-muted-foreground">
                        {migrationResult.stats.skipped}
                      </p>
                      <p className="text-[10px] text-muted-foreground/80 font-medium">Ignorados</p>
                    </div>
                    <div className="rounded-xl bg-vox-primary/10 p-3 text-center">
                      <p className="text-xl font-bold text-vox-primary">
                        {(migrationResult.duration / 1000).toFixed(1)}s
                      </p>
                      <p className="text-[10px] text-vox-primary/80 font-medium">Duracao</p>
                    </div>
                  </div>

                  {/* Errors in result */}
                  {migrationResult.errors.length > 0 && (
                    <div className="w-full max-w-lg rounded-xl border border-vox-warning/20 bg-vox-warning/5 p-4 text-left">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="size-4 text-vox-warning" />
                        <span className="text-sm font-medium text-vox-warning">
                          {migrationResult.errors.length} registro(s) com problemas
                        </span>
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {migrationResult.errors.slice(0, 10).map((err, i) => (
                          <p key={i} className="text-xs text-muted-foreground">
                            {err.sourceRow ? `Linha ${err.sourceRow}: ` : ""}
                            {err.message}
                          </p>
                        ))}
                        {migrationResult.errors.length > 10 && (
                          <p className="text-xs text-muted-foreground italic">
                            e mais {migrationResult.errors.length - 10} erros...
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Link href="/patients">
                      <Button className="rounded-xl bg-vox-primary text-white hover:bg-vox-primary/90 active:scale-[0.98] px-8">
                        <Users className="mr-2 size-4" />
                        Ver Pacientes Importados
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      className="rounded-xl active:scale-[0.98]"
                      onClick={resetWizard}
                    >
                      <RefreshCw className="mr-2 size-4" />
                      Fazer outra importacao
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
