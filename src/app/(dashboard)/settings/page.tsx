"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Check,
  Loader2,
  Plus,
  X,
  Users,
  Crown,
  Building2,
  Stethoscope,
  Palette,
  ListChecks,
  FormInput,
  Monitor,
  Moon,
  Sun,
  Sparkles,
  Shield,
  ChevronRight,
  Save,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { getWorkspace, updateWorkspace } from "@/server/actions/workspace"

type Procedure = { id: string; name: string; category: string }
type CustomField = { id: string; name: string; type: string; required: boolean }

const professionLabels: Record<string, string> = {
  dentista: "Dentista",
  nutricionista: "Nutricionista",
  esteticista: "Esteticista",
  medico: "Medico",
  advogado: "Advogado",
  psicologo: "Psicologo",
  fisioterapeuta: "Fisioterapeuta",
  veterinario: "Veterinario",
}

const professionIcons: Record<string, string> = {
  dentista: "🦷",
  nutricionista: "🥗",
  esteticista: "✨",
  medico: "🩺",
  advogado: "⚖️",
  psicologo: "🧠",
  fisioterapeuta: "💪",
  veterinario: "🐾",
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  const [clinicName, setClinicName] = useState("")
  const [profession, setProfession] = useState("")
  const [professionType, setProfessionType] = useState("")
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [newProcedure, setNewProcedure] = useState("")

  // Theme state
  const [theme, setTheme] = useState<"light" | "dark" | "system">("light")

  // Initial data for change detection
  const [initialData, setInitialData] = useState<{
    clinicName: string
    procedures: Procedure[]
    customFields: CustomField[]
  } | null>(null)

  useEffect(() => {
    // Detect current theme
    const stored = localStorage.getItem("theme")
    if (stored === "dark") setTheme("dark")
    else if (stored === "light") setTheme("light")
    else setTheme("system")

    getWorkspace()
      .then((ws) => {
        const data = {
          clinicName: ws.clinicName ?? "",
          procedures: ws.procedures,
          customFields: ws.customFields,
        }
        setClinicName(data.clinicName)
        setProfession(ws.profession ?? ws.professionType)
        setProfessionType(ws.professionType)
        setProcedures(data.procedures)
        setCustomFields(data.customFields)
        setInitialData(data)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Erro ao carregar configuracoes")
      })
      .finally(() => setLoading(false))
  }, [])

  // Change detection
  useEffect(() => {
    if (!initialData) return
    const changed =
      clinicName !== initialData.clinicName ||
      JSON.stringify(procedures) !== JSON.stringify(initialData.procedures) ||
      JSON.stringify(customFields) !== JSON.stringify(initialData.customFields)
    setHasChanges(changed)
  }, [clinicName, procedures, customFields, initialData])

  function applyTheme(mode: "light" | "dark" | "system") {
    setTheme(mode)
    if (mode === "system") {
      localStorage.removeItem("theme")
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      document.documentElement.classList.toggle("dark", prefersDark)
    } else {
      localStorage.setItem("theme", mode)
      document.documentElement.classList.toggle("dark", mode === "dark")
    }
  }

  function addProcedure() {
    if (!newProcedure.trim()) return
    setProcedures((prev) => [
      ...prev,
      { id: `proc_${Date.now()}`, name: newProcedure.trim(), category: "Geral" },
    ])
    setNewProcedure("")
  }

  function removeProcedure(id: string) {
    setProcedures((prev) => prev.filter((p) => p.id !== id))
  }

  function removeField(id: string) {
    setCustomFields((prev) => prev.filter((f) => f.id !== id))
  }

  function toggleFieldRequired(id: string) {
    setCustomFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, required: !f.required } : f))
    )
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      await updateWorkspace({ clinicName, procedures, customFields })
      setSaved(true)
      setInitialData({ clinicName, procedures, customFields })
      setHasChanges(false)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar configuracoes")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Hero skeleton */}
        <Skeleton className="h-44 w-full rounded-2xl" />
        {/* Tabs skeleton */}
        <Skeleton className="h-10 w-80" />
        {/* Content skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  const profEmoji = professionIcons[professionType?.toLowerCase()] ?? "💼"
  const profLabel = professionLabels[professionType?.toLowerCase()] ?? profession

  return (
    <div className="space-y-6 pb-20">
      {/* ─── Profile Hero Card ─── */}
      <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-vox-primary/[0.08] via-card to-vox-primary/[0.04] p-6 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)]">
        {/* Decorative background elements */}
        <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-vox-primary/[0.06] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 size-32 rounded-full bg-vox-primary/[0.04] blur-2xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
          {/* Avatar */}
          <div className="relative">
            <div className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-vox-primary to-vox-primary/70 text-3xl shadow-lg shadow-vox-primary/20 animate-scale-in">
              {profEmoji}
            </div>
            <div className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border-2 border-card bg-vox-success text-white shadow-sm">
              <Check className="size-3.5" strokeWidth={3} />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 space-y-1.5 animate-fade-in">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                {clinicName || "Minha Clinica"}
              </h1>
              <Badge className="bg-vox-primary/10 text-vox-primary border-vox-primary/20 hover:bg-vox-primary/15">
                {profLabel}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Gerencie seu workspace, procedimentos e preferencias
            </p>
            <div className="flex items-center gap-4 pt-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80">
                <Shield className="size-3.5 text-vox-success" />
                <span>LGPD Ativo</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80">
                <Sparkles className="size-3.5 text-vox-primary" />
                <span>IA Configurada</span>
              </div>
            </div>
          </div>

          {/* Save button (desktop) */}
          <div className="hidden sm:block">
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className={`transition-all duration-300 ${
                saved
                  ? "bg-vox-success text-white hover:bg-vox-success/90"
                  : hasChanges
                    ? "bg-vox-primary text-white hover:bg-vox-primary/90 shadow-lg shadow-vox-primary/25"
                    : "bg-muted text-muted-foreground cursor-default"
              }`}
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Salvando...
                </>
              ) : saved ? (
                <>
                  <Check className="size-4" />
                  Salvo!
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  Salvar
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Error Banner ─── */}
      {error && (
        <div className="animate-fade-in rounded-xl border border-vox-error/30 bg-vox-error/5 px-4 py-3 text-sm text-vox-error">
          {error}
        </div>
      )}

      {/* ─── Tabbed Sections ─── */}
      <Tabs defaultValue="clinica">
        <TabsList
          variant="line"
          className="flex w-full justify-start gap-0 border-b border-border/50 pb-px"
        >
          <TabsTrigger value="clinica" className="gap-2 px-4 py-2.5 text-[13px]">
            <Building2 className="size-4" />
            Clinica
          </TabsTrigger>
          <TabsTrigger value="procedimentos" className="gap-2 px-4 py-2.5 text-[13px]">
            <ListChecks className="size-4" />
            Procedimentos
          </TabsTrigger>
          <TabsTrigger value="campos" className="gap-2 px-4 py-2.5 text-[13px]">
            <FormInput className="size-4" />
            Campos
          </TabsTrigger>
          <TabsTrigger value="equipe" className="gap-2 px-4 py-2.5 text-[13px]">
            <Users className="size-4" />
            Equipe
          </TabsTrigger>
          <TabsTrigger value="aparencia" className="gap-2 px-4 py-2.5 text-[13px]">
            <Palette className="size-4" />
            Aparencia
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab: Clinica ─── */}
        <TabsContent value="clinica" className="animate-fade-in space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="size-4 text-vox-primary" />
                Dados da Clinica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Nome da Clinica
                  </Label>
                  <Input
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    placeholder="Ex: Clinica Sorriso"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Profissao
                  </Label>
                  <div className="flex h-10 items-center gap-2.5 rounded-xl border bg-muted/40 px-3">
                    <Stethoscope className="size-4 text-muted-foreground" />
                    <span className="text-sm">{profLabel}</span>
                    <Badge variant="secondary" className="ml-auto text-[10px] whitespace-nowrap">
                      Via onboarding
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator className="my-2" />

              <div className="rounded-xl bg-muted/30 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-vox-primary/10">
                    <Sparkles className="size-4 text-vox-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Workspace criado por IA</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Seus procedimentos e campos foram sugeridos pela inteligencia artificial
                      com base na sua profissao. Voce pode personaliza-los nas abas ao lado.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab: Procedimentos ─── */}
        <TabsContent value="procedimentos" className="animate-fade-in space-y-4 pt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ListChecks className="size-4 text-vox-primary" />
                  Procedimentos
                </CardTitle>
                <Badge variant="secondary" className="tabular-nums">
                  {procedures.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Add new */}
              <div className="flex gap-2">
                <Input
                  value={newProcedure}
                  onChange={(e) => setNewProcedure(e.target.value)}
                  placeholder="Nome do procedimento..."
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
                  className="shrink-0"
                >
                  <Plus className="size-4" />
                  Adicionar
                </Button>
              </div>

              <Separator />

              {/* Procedure list */}
              <div className="space-y-1.5">
                {procedures.length === 0 && (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <ListChecks className="size-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      Nenhum procedimento cadastrado
                    </p>
                  </div>
                )}
                {procedures.map((proc, i) => (
                  <div
                    key={proc.id}
                    className="group flex items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-3 transition-all duration-200 hover:border-border hover:shadow-[0_1px_3px_0_rgb(0_0_0/0.04)]"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-vox-primary/[0.07] text-xs font-semibold text-vox-primary">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate block">{proc.name}</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {proc.category}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => removeProcedure(proc.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-vox-error shrink-0"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab: Campos Customizados ─── */}
        <TabsContent value="campos" className="animate-fade-in space-y-4 pt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FormInput className="size-4 text-vox-primary" />
                  Campos Customizados
                </CardTitle>
                <Badge variant="secondary" className="tabular-nums">
                  {customFields.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {customFields.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <FormInput className="size-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum campo customizado configurado
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Campos sao criados automaticamente durante o onboarding pela IA
                  </p>
                </div>
              )}
              {customFields.map((field, i) => (
                <div
                  key={field.id}
                  className="group flex items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-3 transition-all duration-200 hover:border-border hover:shadow-[0_1px_3px_0_rgb(0_0_0/0.04)]"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <FormInput className="size-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium truncate block">{field.name}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0 font-mono">
                    {field.type}
                  </Badge>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={field.required}
                      onCheckedChange={() => toggleFieldRequired(field.id)}
                    />
                    <span className="text-[10px] text-muted-foreground w-16">
                      {field.required ? "Obrigatorio" : "Opcional"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeField(field.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-vox-error shrink-0"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab: Equipe ─── */}
        <TabsContent value="equipe" className="animate-fade-in space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="size-4 text-vox-primary" />
                Equipe
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Owner */}
              <div className="flex items-center gap-4 rounded-xl border border-vox-primary/20 bg-vox-primary/[0.03] px-4 py-4">
                <div className="relative">
                  <div className="flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-vox-primary to-vox-primary/70 shadow-md shadow-vox-primary/15">
                    <Crown className="size-5 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{clinicName || "Voce"}</p>
                  <p className="text-xs text-muted-foreground">Proprietario do workspace</p>
                </div>
                <Badge className="bg-vox-primary/10 text-vox-primary border-vox-primary/20">
                  Owner
                </Badge>
              </div>

              {/* Invite placeholder */}
              <div className="group relative overflow-hidden rounded-xl border-2 border-dashed border-border/50 bg-muted/20 px-6 py-8 text-center transition-all duration-300 hover:border-vox-primary/30 hover:bg-vox-primary/[0.02]">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-vox-primary/[0.03] to-transparent animate-shimmer-slide opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-muted/60">
                    <Users className="size-5 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Convide membros da equipe
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/60">
                    Em breve voce podera adicionar colaboradores ao seu workspace
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 pointer-events-none opacity-50"
                    disabled
                  >
                    <Plus className="size-3.5" />
                    Convidar Membro
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab: Aparencia ─── */}
        <TabsContent value="aparencia" className="animate-fade-in space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="size-4 text-vox-primary" />
                Aparencia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Tema
                </Label>
                <p className="mt-0.5 mb-3 text-xs text-muted-foreground/70">
                  Escolha como o VoxClinic aparece para voce
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {/* Light */}
                  <button
                    type="button"
                    onClick={() => applyTheme("light")}
                    className={`group relative flex flex-col items-center gap-3 rounded-xl border-2 p-4 transition-all duration-200 hover:shadow-md ${
                      theme === "light"
                        ? "border-vox-primary bg-vox-primary/[0.04] shadow-sm"
                        : "border-border/50 hover:border-border"
                    }`}
                  >
                    <div className="flex size-12 items-center justify-center rounded-xl bg-white border shadow-sm">
                      <Sun className="size-5 text-amber-400" />
                    </div>
                    <span className="text-xs font-medium">Claro</span>
                    {theme === "light" && (
                      <div className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-vox-primary text-white shadow-sm animate-scale-in">
                        <Check className="size-3" strokeWidth={3} />
                      </div>
                    )}
                  </button>

                  {/* Dark */}
                  <button
                    type="button"
                    onClick={() => applyTheme("dark")}
                    className={`group relative flex flex-col items-center gap-3 rounded-xl border-2 p-4 transition-all duration-200 hover:shadow-md ${
                      theme === "dark"
                        ? "border-vox-primary bg-vox-primary/[0.04] shadow-sm"
                        : "border-border/50 hover:border-border"
                    }`}
                  >
                    <div className="flex size-12 items-center justify-center rounded-xl bg-gray-900 border border-gray-700 shadow-sm">
                      <Moon className="size-5 text-teal-300" />
                    </div>
                    <span className="text-xs font-medium">Escuro</span>
                    {theme === "dark" && (
                      <div className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-vox-primary text-white shadow-sm animate-scale-in">
                        <Check className="size-3" strokeWidth={3} />
                      </div>
                    )}
                  </button>

                  {/* System */}
                  <button
                    type="button"
                    onClick={() => applyTheme("system")}
                    className={`group relative flex flex-col items-center gap-3 rounded-xl border-2 p-4 transition-all duration-200 hover:shadow-md ${
                      theme === "system"
                        ? "border-vox-primary bg-vox-primary/[0.04] shadow-sm"
                        : "border-border/50 hover:border-border"
                    }`}
                  >
                    <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-white to-gray-900 border shadow-sm">
                      <Monitor className="size-5 text-white mix-blend-difference" />
                    </div>
                    <span className="text-xs font-medium">Sistema</span>
                    {theme === "system" && (
                      <div className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-vox-primary text-white shadow-sm animate-scale-in">
                        <Check className="size-3" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                </div>
              </div>

              <Separator />

              {/* Brand color preview */}
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Cores do Sistema
                </Label>
                <p className="mt-0.5 mb-3 text-xs text-muted-foreground/70">
                  Paleta de cores utilizada no VoxClinic
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="flex items-center gap-2.5 rounded-xl border border-border/50 p-3">
                    <div className="size-8 rounded-lg bg-vox-primary shadow-sm shadow-vox-primary/20" />
                    <div>
                      <p className="text-xs font-medium">Primary</p>
                      <p className="text-[10px] text-muted-foreground font-mono">#14B8A6</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 rounded-xl border border-border/50 p-3">
                    <div className="size-8 rounded-lg bg-vox-success shadow-sm shadow-vox-success/20" />
                    <div>
                      <p className="text-xs font-medium">Sucesso</p>
                      <p className="text-[10px] text-muted-foreground font-mono">#10B981</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 rounded-xl border border-border/50 p-3">
                    <div className="size-8 rounded-lg bg-vox-warning shadow-sm shadow-vox-warning/20" />
                    <div>
                      <p className="text-xs font-medium">Alerta</p>
                      <p className="text-[10px] text-muted-foreground font-mono">#F59E0B</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 rounded-xl border border-border/50 p-3">
                    <div className="size-8 rounded-lg bg-vox-error shadow-sm shadow-vox-error/20" />
                    <div>
                      <p className="text-xs font-medium">Erro</p>
                      <p className="text-[10px] text-muted-foreground font-mono">#EF4444</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Sticky Save Bar (mobile + unsaved changes) ─── */}
      {hasChanges && (
        <div className="fixed bottom-16 left-0 right-0 z-40 animate-fade-in md:bottom-0">
          <div className="mx-auto max-w-5xl px-4 py-3">
            <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-card/95 px-5 py-3 shadow-lg backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-vox-warning animate-pulse" />
                <span className="text-sm font-medium">Alteracoes nao salvas</span>
              </div>
              <Button
                onClick={handleSave}
                disabled={saving}
                size="sm"
                className="bg-vox-primary text-white hover:bg-vox-primary/90 shadow-lg shadow-vox-primary/25"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="size-3.5" />
                    Salvar Alteracoes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
