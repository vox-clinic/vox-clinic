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
  Mail,
  Trash2,
  Clock,
  Upload,
  MessageSquare,
  Phone,
  CheckCircle,
  AlertCircle,
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
import { toast } from "sonner"
import Link from "next/link"
import {
  getTeamMembers,
  inviteTeamMember,
  cancelInvite,
  updateMemberRole,
  removeMember,
} from "@/server/actions/team"
import { getMessagingConfig, updateMessagingConfig } from "@/server/actions/messaging"
import {
  getAgendas,
  createAgenda,
  updateAgenda,
  deleteAgenda,
} from "@/server/actions/agenda"
import {
  getBookingConfig,
  toggleBooking,
  updateBookingConfig,
  regenerateBookingToken,
} from "@/server/actions/booking-config"
import { CalendarDays, Globe, Copy, RefreshCw, Link2, Receipt, CreditCard } from "lucide-react"
import { FiscalTab } from "./fiscal-tab"

import type { Procedure, CustomField } from "@/types"

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
      { id: `proc_${Date.now()}`, name: newProcedure.trim(), category: "Geral", duration: 30 },
    ])
    setNewProcedure("")
  }

  function updateProcedureDuration(id: string, duration: number) {
    setProcedures((prev) => prev.map((p) => p.id === id ? { ...p, duration } : p))
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
      toast.success("Configurações salvas com sucesso")
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar configurações"
      setError(msg)
      toast.error("Erro ao salvar configurações")
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
          <TabsTrigger value="agendas" className="gap-2 px-4 py-2.5 text-[13px]">
            <CalendarDays className="size-4" />
            Agendas
          </TabsTrigger>
          <TabsTrigger value="booking" className="gap-2 px-4 py-2.5 text-[13px]">
            <Globe className="size-4" />
            Online
          </TabsTrigger>
          <TabsTrigger value="mensagens" className="gap-2 px-4 py-2.5 text-[13px]">
            <MessageSquare className="size-4" />
            Mensagens
          </TabsTrigger>
          <TabsTrigger value="aparencia" className="gap-2 px-4 py-2.5 text-[13px]">
            <Palette className="size-4" />
            Aparencia
          </TabsTrigger>
          <TabsTrigger value="fiscal" className="gap-2 px-4 py-2.5 text-[13px]">
            <Receipt className="size-4" />
            Fiscal
          </TabsTrigger>
          <TabsTrigger value="plano" className="gap-2 px-4 py-2.5 text-[13px]">
            <CreditCard className="size-4" />
            Plano
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

              <Separator className="my-2" />

              <div className="rounded-xl border border-border/50 bg-card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-vox-primary/10">
                      <Upload className="size-4 text-vox-primary" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">Migrar Dados</p>
                      <p className="text-xs text-muted-foreground">
                        Importe pacientes de CSV, Excel ou outro sistema
                      </p>
                    </div>
                  </div>
                  <Link href="/settings/migration">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                    >
                      <Upload className="size-3.5" />
                      Migrar
                    </Button>
                  </Link>
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
                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="number"
                        min={5}
                        max={480}
                        step={5}
                        value={proc.duration ?? 30}
                        onChange={(e) => updateProcedureDuration(proc.id, parseInt(e.target.value) || 30)}
                        className="w-14 h-7 rounded-lg border border-input bg-transparent px-1.5 text-center text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                      />
                      <span className="text-[10px] text-muted-foreground">min</span>
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
          <TeamTab clinicName={clinicName} />
        </TabsContent>

        {/* ─── Tab: Agendas ─── */}
        <TabsContent value="agendas" className="animate-fade-in space-y-4 pt-4">
          <AgendasTab />
        </TabsContent>

        {/* ─── Tab: Booking Online ─── */}
        <TabsContent value="booking" className="animate-fade-in space-y-4 pt-4">
          <BookingTab />
        </TabsContent>

        {/* ─── Tab: Mensagens ─── */}
        <TabsContent value="mensagens" className="animate-fade-in space-y-4 pt-4">
          <MessagingTab />
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

        {/* ─── Tab: Fiscal (NFS-e) ─── */}
        <TabsContent value="fiscal" className="animate-fade-in space-y-4 pt-4">
          <FiscalTab />
        </TabsContent>

        {/* ─── Tab: Plano (Billing) ─── */}
        <TabsContent value="plano" className="animate-fade-in space-y-4 pt-4">
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <CreditCard className="size-10 text-vox-primary mx-auto" />
              <div>
                <h3 className="text-base font-semibold">Plano e Assinatura</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Gerencie seu plano, faca upgrade e veja seu historico de pagamentos.
                </p>
              </div>
              <Link href="/settings/billing">
                <Button className="bg-vox-primary hover:bg-vox-primary/90 text-white rounded-xl">
                  Gerenciar Plano
                </Button>
              </Link>
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

// ────────────────────── Team Tab ──────────────────────

type TeamMember = { id: string; userId?: string; name: string; email: string; role: string; invitedAt?: string }
type TeamInvite = { id: string; email: string; role: string; status: string; createdAt: string; expiresAt: string }

function TeamTab({ clinicName }: { clinicName: string }) {
  const [owner, setOwner] = useState<{ name: string; email: string } | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invites, setInvites] = useState<TeamInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("member")
  const [inviting, setInviting] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadTeam = useCallback(async () => {
    try {
      const data = await getTeamMembers()
      setOwner(data.owner)
      setMembers(data.members)
      setInvites(data.invites)
    } catch { /* silently handle */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadTeam() }, [loadTeam])

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    setInviting(true)
    try {
      await inviteTeamMember(inviteEmail.trim(), inviteRole)
      setInviteEmail(""); setInviteRole("member"); setShowInvite(false)
      loadTeam()
    } catch (err: any) {
      alert(err.message || "Erro ao convidar")
    } finally { setInviting(false) }
  }

  async function handleCancelInvite(inviteId: string) {
    setActionLoading(inviteId)
    try { await cancelInvite(inviteId); loadTeam() }
    catch (err: any) { alert(err.message || "Erro") }
    finally { setActionLoading(null) }
  }

  async function handleRoleChange(memberId: string, role: string) {
    setActionLoading(memberId)
    try { await updateMemberRole(memberId, role); loadTeam() }
    catch (err: any) { alert(err.message || "Erro") }
    finally { setActionLoading(null) }
  }

  async function handleRemove(memberId: string) {
    if (!confirm("Remover este membro da equipe?")) return
    setActionLoading(memberId)
    try { await removeMember(memberId); loadTeam() }
    catch (err: any) { alert(err.message || "Erro") }
    finally { setActionLoading(null) }
  }

  if (loading) {
    return <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
  }

  const ROLE_LABELS: Record<string, string> = { owner: "Proprietario", admin: "Administrador", member: "Membro" }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4 text-vox-primary" />
              Equipe
            </CardTitle>
            <Button size="sm" onClick={() => setShowInvite(!showInvite)} className="bg-vox-primary text-white hover:bg-vox-primary/90 gap-1.5">
              <Plus className="size-3.5" />
              Convidar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Invite form */}
          {showInvite && (
            <div className="rounded-xl border border-vox-primary/20 bg-vox-primary/[0.02] p-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleInvite() } }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Funcao</Label>
                  <div className="flex rounded-xl bg-muted/50 p-0.5 h-10">
                    {(["member", "admin"] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setInviteRole(r)}
                        className={`flex-1 rounded-lg px-3 text-xs font-medium transition-all ${
                          inviteRole === r ? "bg-background shadow-sm" : "text-muted-foreground"
                        }`}
                      >
                        {r === "admin" ? "Admin" : "Membro"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowInvite(false)}>Cancelar</Button>
                <Button size="sm" onClick={handleInvite} disabled={!inviteEmail.trim() || inviting} className="bg-vox-primary text-white hover:bg-vox-primary/90 gap-1.5">
                  {inviting ? <Loader2 className="size-3.5 animate-spin" /> : <Mail className="size-3.5" />}
                  Enviar Convite
                </Button>
              </div>
            </div>
          )}

          {/* Owner */}
          {owner && (
            <div className="flex items-center gap-3 rounded-xl border border-vox-primary/20 bg-vox-primary/[0.03] px-4 py-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-vox-primary to-vox-primary/70">
                <Crown className="size-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{owner.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{owner.email}</p>
              </div>
              <Badge className="bg-vox-primary/10 text-vox-primary border-vox-primary/20 text-[10px]">
                Proprietario
              </Badge>
            </div>
          )}

          {/* Members */}
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-xl border border-border/50 px-4 py-3 group">
              <div className="flex size-9 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                {m.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{m.email}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={m.role}
                  onChange={(e) => handleRoleChange(m.id, e.target.value)}
                  disabled={actionLoading === m.id}
                  className="rounded-lg border border-border/50 bg-background px-2 py-1 text-[11px] font-medium"
                >
                  <option value="member">Membro</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  onClick={() => handleRemove(m.id)}
                  disabled={actionLoading === m.id}
                  className="flex size-7 items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 hover:bg-vox-error/10 text-muted-foreground hover:text-vox-error transition-all"
                  title="Remover"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}

          {/* Pending invites */}
          {invites.length > 0 && (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 pt-2 px-1">
                Convites Pendentes
              </p>
              {invites.map((inv) => (
                <div key={inv.id} className="flex items-center gap-3 rounded-xl border border-dashed border-border/50 px-4 py-3">
                  <div className="flex size-9 items-center justify-center rounded-full bg-muted/40">
                    <Clock className="size-4 text-muted-foreground/50" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground truncate">{inv.email}</p>
                    <p className="text-[10px] text-muted-foreground/60">
                      {ROLE_LABELS[inv.role] ?? inv.role} — expira {new Date(inv.expiresAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCancelInvite(inv.id)}
                    disabled={actionLoading === inv.id}
                    className="flex size-7 items-center justify-center rounded-lg hover:bg-vox-error/10 text-muted-foreground hover:text-vox-error transition-colors"
                    title="Cancelar convite"
                  >
                    {actionLoading === inv.id ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
                  </button>
                </div>
              ))}
            </>
          )}

          {members.length === 0 && invites.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-4">
              Convide membros para colaborar no workspace
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ────────────────────── Agendas Tab ──────────────────────

const AGENDA_COLORS = [
  "#14B8A6", "#3B82F6", "#8B5CF6", "#EC4899",
  "#F59E0B", "#10B981", "#EF4444", "#6366F1",
]

function AgendasTab() {
  const [loading, setLoading] = useState(true)
  const [agendas, setAgendas] = useState<Array<{
    id: string; name: string; color: string; isDefault: boolean; isActive: boolean; appointmentCount: number
  }>>([])
  const [newName, setNewName] = useState("")
  const [newColor, setNewColor] = useState("#3B82F6")
  const [showNewForm, setShowNewForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editColor, setEditColor] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadAgendas = useCallback(async () => {
    try {
      const data = await getAgendas()
      setAgendas(data)
    } catch {
      toast.error("Erro ao carregar agendas")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAgendas() }, [loadAgendas])

  async function handleCreate() {
    if (!newName.trim()) return
    setActionLoading("create")
    try {
      await createAgenda({ name: newName.trim(), color: newColor })
      setNewName("")
      setNewColor("#3B82F6")
      setShowNewForm(false)
      await loadAgendas()
      toast.success("Agenda criada")
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar agenda")
    } finally {
      setActionLoading(null)
    }
  }

  async function handleUpdate(id: string) {
    setActionLoading(id)
    try {
      await updateAgenda(id, { name: editName.trim(), color: editColor })
      setEditingId(null)
      await loadAgendas()
      toast.success("Agenda atualizada")
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar")
    } finally {
      setActionLoading(null)
    }
  }

  async function handleToggleActive(id: string, isActive: boolean) {
    setActionLoading(id)
    try {
      await updateAgenda(id, { isActive: !isActive })
      await loadAgendas()
    } catch (err: any) {
      toast.error(err.message || "Erro ao alterar status")
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta agenda?")) return
    setActionLoading(id)
    try {
      await deleteAgenda(id)
      await loadAgendas()
      toast.success("Agenda excluida")
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir")
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="size-4 text-vox-primary" />
            Agendas
          </CardTitle>
          <Button
            size="sm"
            onClick={() => setShowNewForm(true)}
            className="bg-vox-primary hover:bg-vox-primary/90 text-white rounded-xl text-xs gap-1.5"
          >
            <Plus className="size-3.5" />
            Nova Agenda
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Gerencie as agendas do seu workspace. Cada profissional ou sala pode ter sua propria agenda.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* New agenda form */}
        {showNewForm && (
          <div className="rounded-xl border border-vox-primary/30 bg-vox-primary/5 p-4 space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Nome da agenda</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Dr. Silva, Sala 1..."
                className="rounded-xl text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Cor</Label>
              <div className="flex gap-2">
                {AGENDA_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={`size-7 rounded-full border-2 transition-all ${
                      newColor === c ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={!newName.trim() || actionLoading === "create"}
                className="bg-vox-primary hover:bg-vox-primary/90 text-white rounded-xl text-xs gap-1.5"
              >
                {actionLoading === "create" ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                Criar
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setShowNewForm(false); setNewName("") }} className="rounded-xl text-xs">
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Agenda list */}
        {agendas.map((agenda) => (
          <div
            key={agenda.id}
            className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${
              agenda.isActive ? "border-border/40" : "border-border/20 opacity-50"
            }`}
          >
            {editingId === agenda.id ? (
              /* Edit mode */
              <div className="flex-1 space-y-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="rounded-xl text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleUpdate(agenda.id)}
                />
                <div className="flex gap-2">
                  {AGENDA_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setEditColor(c)}
                      className={`size-6 rounded-full border-2 transition-all ${
                        editColor === c ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleUpdate(agenda.id)} disabled={actionLoading === agenda.id} className="bg-vox-primary hover:bg-vox-primary/90 text-white rounded-xl text-xs gap-1">
                    {actionLoading === agenda.id ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                    Salvar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="rounded-xl text-xs">Cancelar</Button>
                </div>
              </div>
            ) : (
              /* View mode */
              <>
                <span className="size-3 rounded-full shrink-0" style={{ backgroundColor: agenda.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{agenda.name}</span>
                    {agenda.isDefault && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Padrao</Badge>}
                  </div>
                  <span className="text-[11px] text-muted-foreground">{agenda.appointmentCount} consulta(s)</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {!agenda.isDefault && (
                    <Switch
                      checked={agenda.isActive}
                      onCheckedChange={() => handleToggleActive(agenda.id, agenda.isActive)}
                      disabled={actionLoading === agenda.id}
                    />
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setEditingId(agenda.id); setEditName(agenda.name); setEditColor(agenda.color) }}
                    className="size-8 p-0 rounded-lg"
                  >
                    <Palette className="size-3.5 text-muted-foreground" />
                  </Button>
                  {!agenda.isDefault && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(agenda.id)}
                      disabled={actionLoading === agenda.id}
                      className="size-8 p-0 rounded-lg text-muted-foreground hover:text-vox-error"
                    >
                      {actionLoading === agenda.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}

        {agendas.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <CalendarDays className="size-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhuma agenda encontrada</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ────────────────────── Booking Tab ──────────────────────

function BookingTab() {
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState<{
    token: string; isActive: boolean; maxDaysAhead: number; startHour: number; endHour: number; welcomeMessage: string | null
  } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const loadConfig = useCallback(async () => {
    try {
      const data = await getBookingConfig()
      setConfig(data)
    } catch {
      // No config yet
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadConfig() }, [loadConfig])

  async function handleToggle(enabled: boolean) {
    setActionLoading(true)
    try {
      const result = await toggleBooking(enabled)
      setConfig((prev) => prev ? { ...prev, ...result } : { ...result, maxDaysAhead: 30, startHour: 8, endHour: 18, welcomeMessage: null })
      toast.success(enabled ? "Agendamento online ativado" : "Agendamento online desativado")
    } catch (err: any) {
      toast.error(err.message || "Erro")
    } finally {
      setActionLoading(false)
    }
  }

  async function handleRegenerate() {
    if (!confirm("Regenerar o link? O link anterior deixara de funcionar.")) return
    setActionLoading(true)
    try {
      const result = await regenerateBookingToken()
      setConfig((prev) => prev ? { ...prev, token: result.token } : null)
      toast.success("Link regenerado")
    } catch (err: any) {
      toast.error(err.message || "Erro")
    } finally {
      setActionLoading(false)
    }
  }

  async function handleSaveConfig(data: { maxDaysAhead?: number; startHour?: number; endHour?: number; welcomeMessage?: string | null }) {
    setActionLoading(true)
    try {
      const result = await updateBookingConfig(data)
      setConfig((prev) => prev ? { ...prev, ...result } : null)
      toast.success("Configuracao salva")
    } catch (err: any) {
      toast.error(err.message || "Erro")
    } finally {
      setActionLoading(false)
    }
  }

  const bookingUrl = config?.token ? `${typeof window !== "undefined" ? window.location.origin : ""}/booking/${config.token}` : ""

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe className="size-4 text-vox-primary" />
          Agendamento Online
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Permita que pacientes agendem consultas diretamente pelo link. Compartilhe no Instagram, WhatsApp ou site.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Toggle */}
        <div className="flex items-center justify-between rounded-xl border border-border/40 p-4">
          <div>
            <div className="text-sm font-medium">Ativar agendamento online</div>
            <div className="text-xs text-muted-foreground mt-0.5">Pacientes poderao agendar pelo link</div>
          </div>
          <Switch
            checked={config?.isActive ?? false}
            onCheckedChange={handleToggle}
            disabled={actionLoading}
          />
        </div>

        {/* Booking URL */}
        {config?.isActive && (
          <>
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5">
                <Link2 className="size-3.5" />
                Link de agendamento
              </Label>
              <div className="flex gap-2">
                <Input value={bookingUrl} readOnly className="rounded-xl text-xs bg-muted/30" />
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl shrink-0 gap-1.5"
                  onClick={() => { navigator.clipboard.writeText(bookingUrl); toast.success("Link copiado!") }}
                >
                  <Copy className="size-3.5" />
                  Copiar
                </Button>
              </div>
              <button onClick={handleRegenerate} disabled={actionLoading} className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                <RefreshCw className="size-3" />
                Regenerar link
              </button>
            </div>

            <Separator />

            {/* Config */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Horario inicio</Label>
                <select
                  value={config.startHour}
                  onChange={(e) => handleSaveConfig({ startHour: parseInt(e.target.value) })}
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-vox-primary/30"
                >
                  {Array.from({ length: 14 }, (_, i) => i + 6).map((h) => (
                    <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Horario fim</Label>
                <select
                  value={config.endHour}
                  onChange={(e) => handleSaveConfig({ endHour: parseInt(e.target.value) })}
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-vox-primary/30"
                >
                  {Array.from({ length: 14 }, (_, i) => i + 8).map((h) => (
                    <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Dias no futuro (max)</Label>
                <Input
                  type="number"
                  min={7}
                  max={90}
                  value={config.maxDaysAhead}
                  onChange={(e) => handleSaveConfig({ maxDaysAhead: Math.min(90, Math.max(7, parseInt(e.target.value) || 30)) })}
                  className="rounded-xl text-sm"
                />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ────────────────────── Messaging Tab ──────────────────────

function MessagingTab() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState({ emailEnabled: false, whatsappEnabled: false, smsEnabled: false, whatsappPhone: "", twilioPhone: "" })
  const [whatsappKey, setWhatsappKey] = useState("")
  const [whatsappPhone, setWhatsappPhone] = useState("")
  const [twilioSid, setTwilioSid] = useState("")
  const [twilioToken, setTwilioToken] = useState("")
  const [twilioPhone, setTwilioPhone] = useState("")

  useEffect(() => {
    getMessagingConfig()
      .then((c) => {
        setConfig(c)
        setWhatsappPhone(c.whatsappPhone)
        setTwilioPhone(c.twilioPhone)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      await updateMessagingConfig({
        whatsappApiKey: whatsappKey || undefined,
        whatsappPhone: whatsappPhone || undefined,
        twilioAccountSid: twilioSid || undefined,
        twilioAuthToken: twilioToken || undefined,
        twilioPhone: twilioPhone || undefined,
      })
      const updated = await getMessagingConfig()
      setConfig(updated)
      setWhatsappKey("")
      setTwilioSid("")
      setTwilioToken("")
      toast.success("Configurações de mensageria salvas")
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar configurações de mensageria")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Skeleton className="h-48 rounded-2xl" />

  function StatusDot({ enabled }: { enabled: boolean }) {
    return (
      <div className={`flex items-center gap-1.5 text-[11px] ${enabled ? "text-vox-success" : "text-muted-foreground"}`}>
        {enabled ? <CheckCircle className="size-3.5" /> : <AlertCircle className="size-3.5" />}
        {enabled ? "Configurado" : "Nao configurado"}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Channel status overview */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-xl bg-vox-primary/10">
                  <Mail className="size-4 text-vox-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium">Email</p>
                  <StatusDot enabled={config.emailEnabled} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-xl bg-vox-success/10">
                  <MessageSquare className="size-4 text-vox-success" />
                </div>
                <div>
                  <p className="text-xs font-medium">WhatsApp</p>
                  <StatusDot enabled={config.whatsappEnabled} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-xl bg-vox-warning/10">
                  <Phone className="size-4 text-vox-warning" />
                </div>
                <div>
                  <p className="text-xs font-medium">SMS</p>
                  <StatusDot enabled={config.smsEnabled} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* WhatsApp config */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="size-4 text-vox-success" />
            WhatsApp Business API
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Configure a integracao com o WhatsApp Business para enviar lembretes e atender pacientes.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">API Key</Label>
              <Input
                type="password"
                value={whatsappKey}
                onChange={(e) => setWhatsappKey(e.target.value)}
                placeholder={config.whatsappEnabled ? "••••••••" : "Cole sua API key"}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Numero do WhatsApp</Label>
              <Input
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                placeholder="+55 11 99999-9999"
              />
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium">Configuracao Avancada</p>
              <p className="text-[11px] text-muted-foreground">
                Assistente completo de integracao com WhatsApp Business API, templates e webhook.
              </p>
            </div>
            <Link href="/settings/whatsapp">
              <Button variant="outline" size="sm" className="gap-1.5 rounded-xl">
                <MessageSquare className="size-3.5" />
                Configurar WhatsApp
                <ChevronRight className="size-3.5" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Twilio SMS config */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="size-4 text-vox-warning" />
            SMS via Twilio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Configure suas credenciais Twilio para enviar lembretes por SMS.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Account SID</Label>
              <Input
                type="password"
                value={twilioSid}
                onChange={(e) => setTwilioSid(e.target.value)}
                placeholder={config.smsEnabled ? "••••••••" : "AC..."}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Auth Token</Label>
              <Input
                type="password"
                value={twilioToken}
                onChange={(e) => setTwilioToken(e.target.value)}
                placeholder="Token"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Numero Twilio</Label>
              <Input
                value={twilioPhone}
                onChange={(e) => setTwilioPhone(e.target.value)}
                placeholder="+55..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-vox-primary text-white hover:bg-vox-primary/90 gap-1.5"
        >
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          Salvar Configuracoes
        </Button>
      </div>
    </div>
  )
}
