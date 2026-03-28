"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, X, Plus, RefreshCw, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"

import { professions, questionsByProfession } from "./professions"
import type { Question } from "./professions"
import type { WorkspaceConfig, Procedure, CustomField, AnamnesisQuestion } from "@/types"
import { getWorkspacePreview, generateWorkspace } from "@/server/actions/workspace"

const TOTAL_STEPS = 4

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [selectedProfession, setSelectedProfession] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [clinicName, setClinicName] = useState("")
  const [preview, setPreview] = useState<WorkspaceConfig | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [newProcedure, setNewProcedure] = useState("")

  const progressPercent = (step / TOTAL_STEPS) * 100
  const questions = selectedProfession
    ? questionsByProfession[selectedProfession] ?? []
    : []

  function setAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  function toggleMultiSelect(questionId: string, option: string) {
    setAnswers((prev) => {
      const current = prev[questionId] ? prev[questionId].split(",") : []
      const updated = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option]
      return { ...prev, [questionId]: updated.join(",") }
    })
  }

  async function handleGeneratePreview() {
    if (!selectedProfession) return
    setIsGenerating(true)
    try {
      const config = await getWorkspacePreview(selectedProfession, answers)
      setPreview(config)
      setStep(4)
    } catch {
      // If AI fails, generate a minimal fallback preview
      setPreview({
        procedures: [],
        customFields: [],
        anamnesisTemplate: [],
        categories: [],
      })
      setStep(4)
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleRegenerate() {
    if (!selectedProfession) return
    setIsGenerating(true)
    try {
      const config = await getWorkspacePreview(selectedProfession, answers)
      setPreview(config)
    } catch (err) {
      console.error("[Onboarding] preview generation failed", err)
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleConfirmAndSave() {
    if (!selectedProfession || !preview) return
    setIsSaving(true)
    setSaveError(null)
    try {
      await generateWorkspace(selectedProfession, clinicName, {
        procedures: preview.procedures,
        customFields: preview.customFields,
        anamnesisTemplate: preview.anamnesisTemplate,
        categories: preview.categories,
      })
      router.push("/dashboard")
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Erro ao salvar workspace. Tente novamente."
      )
      setIsSaving(false)
    }
  }

  function removeProcedure(id: string) {
    if (!preview) return
    setPreview({
      ...preview,
      procedures: preview.procedures.filter((p) => p.id !== id),
    })
  }

  function addProcedure() {
    if (!preview || !newProcedure.trim()) return
    const id = `proc_${Date.now()}`
    setPreview({
      ...preview,
      procedures: [
        ...preview.procedures,
        { id, name: newProcedure.trim(), category: "Geral" },
      ],
    })
    setNewProcedure("")
  }

  function removeCustomField(id: string) {
    if (!preview) return
    setPreview({
      ...preview,
      customFields: preview.customFields.filter((f) => f.id !== id),
    })
  }

  function toggleFieldRequired(id: string) {
    if (!preview) return
    setPreview({
      ...preview,
      customFields: preview.customFields.map((f) =>
        f.id === id ? { ...f, required: !f.required } : f
      ),
    })
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
            <span>Passo {step} de {TOTAL_STEPS}</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Step 1: Profession selection */}
        {step === 1 && (
          <div>
            <h1 className="mb-2 text-2xl font-bold tracking-tight">
              Qual e sua profissao?
            </h1>
            <p className="mb-8 text-muted-foreground">
              Selecione sua area de atuacao para personalizarmos seu workspace.
            </p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {professions.map((prof) => {
                const Icon = prof.icon
                const isSelected = selectedProfession === prof.id
                return (
                  <Card
                    key={prof.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedProfession(prof.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        setSelectedProfession(prof.id)
                      }
                    }}
                    className={`flex cursor-pointer flex-col items-center gap-3 p-6 transition-all hover:shadow-md ${
                      isSelected
                        ? "border-2 border-vox-primary bg-vox-primary/5 shadow-md"
                        : "border border-border hover:border-vox-primary/30"
                    }`}
                  >
                    <Icon
                      className={`size-8 ${
                        isSelected ? "text-vox-primary" : "text-muted-foreground"
                      }`}
                    />
                    <span
                      className={`text-sm font-medium ${
                        isSelected ? "text-vox-primary" : "text-foreground"
                      }`}
                    >
                      {prof.name}
                    </span>
                    {isSelected && (
                      <div className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-vox-primary">
                        <Check className="size-3 text-white" />
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>

            <div className="mt-8">
              <Button
                onClick={() => setStep(2)}
                disabled={!selectedProfession}
                className="w-full bg-vox-primary text-white hover:bg-vox-primary/90"
                size="lg"
              >
                Continuar
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Contextual questions */}
        {step === 2 && (
          <div>
            <h1 className="mb-2 text-2xl font-bold tracking-tight">
              Conte-nos mais sobre seu trabalho
            </h1>
            <p className="mb-8 text-muted-foreground">
              Essas informacoes nos ajudam a personalizar seu workspace.
            </p>

            <div className="space-y-6">
              {questions.map((q) => (
                <QuestionField
                  key={q.id}
                  question={q}
                  value={answers[q.id] ?? ""}
                  onChange={(val) => setAnswer(q.id, val)}
                  onToggleMulti={(opt) => toggleMultiSelect(q.id, opt)}
                />
              ))}
            </div>

            <div className="mt-8 flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                size="lg"
              >
                Voltar
              </Button>
              <Button
                onClick={() => setStep(3)}
                className="flex-1 bg-vox-primary text-white hover:bg-vox-primary/90"
                size="lg"
              >
                Continuar
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Business data */}
        {step === 3 && (
          <div>
            <h1 className="mb-2 text-2xl font-bold tracking-tight">
              Dados do seu negocio
            </h1>
            <p className="mb-8 text-muted-foreground">
              Informe o nome do seu consultorio ou clinica.
            </p>

            <div className="space-y-4">
              <div>
                <Label htmlFor="clinicName" className="mb-2 block text-sm font-medium">
                  Nome da clinica / consultorio
                </Label>
                <Input
                  id="clinicName"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  placeholder="Ex: Clinica Sorriso"
                  className="h-11"
                />
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                size="lg"
              >
                Voltar
              </Button>
              <Button
                onClick={handleGeneratePreview}
                disabled={!clinicName.trim() || isGenerating}
                className="flex-1 bg-vox-primary text-white hover:bg-vox-primary/90"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  "Gerar meu workspace"
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Workspace review (Task 7) */}
        {step === 4 && (
          <div>
            {isGenerating ? (
              <WorkspaceLoadingSkeleton />
            ) : preview ? (
              <div>
                <h1 className="mb-2 text-2xl font-bold tracking-tight">
                  Revise seu workspace
                </h1>
                <p className="mb-8 text-muted-foreground">
                  A IA gerou um workspace personalizado. Revise e ajuste conforme necessario.
                </p>

                {/* Procedures */}
                <section className="mb-6">
                  <h2 className="mb-3 text-lg font-semibold">Procedimentos</h2>
                  <div className="space-y-2">
                    {preview.procedures.map((proc) => (
                      <div
                        key={proc.id}
                        className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
                      >
                        <div>
                          <span className="text-sm font-medium">{proc.name}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {proc.category}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeProcedure(proc.id)}
                          className="text-muted-foreground hover:text-vox-error"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Input
                      value={newProcedure}
                      onChange={(e) => setNewProcedure(e.target.value)}
                      placeholder="Novo procedimento"
                      className="h-9"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          addProcedure()
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addProcedure}
                      disabled={!newProcedure.trim()}
                    >
                      <Plus className="size-4" />
                      Adicionar
                    </Button>
                  </div>
                </section>

                {/* Custom fields */}
                <section className="mb-6">
                  <h2 className="mb-3 text-lg font-semibold">Campos customizados</h2>
                  <div className="space-y-2">
                    {preview.customFields.map((field) => (
                      <div
                        key={field.id}
                        className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
                      >
                        <div className="flex-1">
                          <span className="text-sm font-medium">{field.name}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({field.type})
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <Switch
                              checked={field.required}
                              onCheckedChange={() => toggleFieldRequired(field.id)}
                            />
                            <span className="text-xs text-muted-foreground">
                              Obrigatorio
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeCustomField(field.id)}
                            className="text-muted-foreground hover:text-vox-error"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Anamnesis preview */}
                <section className="mb-8">
                  <h2 className="mb-3 text-lg font-semibold">Anamnese</h2>
                  <div className="space-y-2">
                    {preview.anamnesisTemplate.map((q, i) => (
                      <div
                        key={q.id}
                        className="rounded-xl border border-border px-4 py-3"
                      >
                        <span className="text-sm text-muted-foreground">
                          {i + 1}.{" "}
                        </span>
                        <span className="text-sm">{q.question}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({q.type})
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Error message */}
                {saveError && (
                  <div className="mb-4 rounded-xl border border-vox-error/30 bg-vox-error/5 px-4 py-3 text-sm text-vox-error">
                    {saveError}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep(3)}
                    size="lg"
                  >
                    Voltar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleRegenerate}
                    disabled={isGenerating}
                    size="lg"
                  >
                    <RefreshCw className={`size-4 ${isGenerating ? "animate-spin" : ""}`} />
                    Regenerar
                  </Button>
                  <Button
                    onClick={handleConfirmAndSave}
                    disabled={isSaving}
                    className="flex-1 bg-vox-primary text-white hover:bg-vox-primary/90"
                    size="lg"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Confirmar e Comecar"
                    )}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                     */
/* ------------------------------------------------------------------ */

function QuestionField({
  question,
  value,
  onChange,
  onToggleMulti,
}: {
  question: Question
  value: string
  onChange: (val: string) => void
  onToggleMulti: (option: string) => void
}) {
  const selectedMulti = value ? value.split(",") : []

  if (question.type === "boolean") {
    return (
      <div>
        <Label className="mb-3 block text-sm font-medium">{question.label}</Label>
        <div className="flex gap-3">
          {["Sim", "Nao"].map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`rounded-xl border px-6 py-2.5 text-sm font-medium transition-all ${
                value === opt
                  ? "border-vox-primary bg-vox-primary/5 text-vox-primary"
                  : "border-border text-foreground hover:border-vox-primary/30"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (question.type === "select") {
    return (
      <div>
        <Label className="mb-3 block text-sm font-medium">{question.label}</Label>
        <div className="flex flex-wrap gap-2">
          {question.options?.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`rounded-xl border px-4 py-2 text-sm transition-all ${
                value === opt
                  ? "border-vox-primary bg-vox-primary/5 text-vox-primary font-medium"
                  : "border-border text-foreground hover:border-vox-primary/30"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // multi-select
  return (
    <div>
      <Label className="mb-3 block text-sm font-medium">{question.label}</Label>
      <div className="flex flex-wrap gap-2">
        {question.options?.map((opt) => {
          const isActive = selectedMulti.includes(opt)
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggleMulti(opt)}
              className={`rounded-xl border px-4 py-2 text-sm transition-all ${
                isActive
                  ? "border-vox-primary bg-vox-primary/5 text-vox-primary font-medium"
                  : "border-border text-foreground hover:border-vox-primary/30"
              }`}
            >
              {isActive && <Check className="mr-1.5 inline size-3.5" />}
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function WorkspaceLoadingSkeleton() {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold tracking-tight">
        Gerando seu workspace personalizado...
      </h1>
      <p className="mb-8 text-muted-foreground">
        Nossa IA esta criando um workspace sob medida para voce. Isso pode levar alguns segundos.
      </p>
      <div className="space-y-6">
        <div>
          <Skeleton className="mb-3 h-6 w-40" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        </div>
        <div>
          <Skeleton className="mb-3 h-6 w-48" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        </div>
        <div>
          <Skeleton className="mb-3 h-6 w-32" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
