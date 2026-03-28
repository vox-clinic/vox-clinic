"use client"

import { useEffect, useState } from "react"
import {
  Check,
  Loader2,
  Users,
  Building2,
  Palette,
  ListChecks,
  FormInput,
  Sparkles,
  Shield,
  Save,
  MessageSquare,
  Receipt,
  CreditCard,
  ClipboardList,
  Stethoscope,
  FileText,
  Percent,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { getWorkspace, updateWorkspace } from "@/server/actions/workspace"
import { toast } from "sonner"
import { friendlyError } from "@/lib/error-messages"
import { useTourOptional } from "@/components/tour/tour-provider"
import Link from "next/link"
import { CalendarDays, Globe, Zap } from "lucide-react"
import dynamic from "next/dynamic"
import type { Procedure, CustomField } from "@/types"

// Eagerly loaded sections (first visible tabs)
import { ClinicaSection } from "./sections/clinica-section"
import { ProcedimentosSection } from "./sections/procedimentos-section"
import { CamposSection } from "./sections/campos-section"

// Lazy-loaded sections (not immediately visible)
const TeamSection = dynamic(
  () => import("./sections/team-section").then((m) => m.TeamSection),
  { ssr: false }
)
const AgendasSection = dynamic(
  () => import("./sections/agendas-section").then((m) => m.AgendasSection),
  { ssr: false }
)
const BookingSection = dynamic(
  () => import("./sections/booking-section").then((m) => m.BookingSection),
  { ssr: false }
)
const MessagingSection = dynamic(
  () => import("./sections/messaging-section").then((m) => m.MessagingSection),
  { ssr: false }
)
const AparenciaSection = dynamic(
  () => import("./sections/aparencia-section").then((m) => m.AparenciaSection),
  { ssr: false }
)
const PlanoSection = dynamic(
  () => import("./sections/plano-section").then((m) => m.PlanoSection),
  { ssr: false }
)
const FiscalTab = dynamic(
  () => import("./fiscal-tab").then((m) => m.FiscalTab),
  { ssr: false }
)
const FormulariosSection = dynamic(
  () => import("./sections/formularios-section").then((m) => m.FormulariosSection),
  { ssr: false }
)
const ComissoesSection = dynamic(
  () => import("./sections/comissoes-section").then((m) => m.ComissoesSection),
  { ssr: false }
)
const GatewaySection = dynamic(
  () => import("./sections/gateway-section").then((m) => m.GatewaySection),
  { ssr: false }
)

const professionLabels: Record<string, string> = {
  dentista: "Dentista",
  nutricionista: "Nutricionista",
  esteticista: "Esteticista",
  medico: "Médico",
  advogado: "Advogado",
  psicologo: "Psicólogo",
  fisioterapeuta: "Fisioterapeuta",
  veterinario: "Veterinário",
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
  const tour = useTourOptional()
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

  // Initial data for change detection
  const [initialData, setInitialData] = useState<{
    clinicName: string
    procedures: Procedure[]
    customFields: CustomField[]
  } | null>(null)

  useEffect(() => {
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
        setError(friendlyError(err, "Erro ao carregar configuracoes"))
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

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      await updateWorkspace({ clinicName, procedures, customFields })
      setSaved(true)
      setInitialData({ clinicName, procedures, customFields })
      setHasChanges(false)
      toast.success("Configuracoes salvas com sucesso")
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      const msg = friendlyError(err, "Erro ao salvar configuracoes")
      setError(msg)
      toast.error(msg)
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
                {clinicName || "Minha Clínica"}
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
              {tour && (
                <button
                  onClick={async () => {
                    await tour.resetTour()
                    toast.success("Tour reiniciado! Volte ao Dashboard para comecar.")
                  }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground/80 hover:text-vox-primary transition-colors"
                >
                  <RotateCcw className="size-3.5" />
                  <span>Refazer tour guiado</span>
                </button>
              )}
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
            Clínica
          </TabsTrigger>
          <TabsTrigger value="procedimentos" className="gap-2 px-4 py-2.5 text-[13px]">
            <ListChecks className="size-4" />
            Procedimentos
          </TabsTrigger>
          <TabsTrigger value="campos" className="gap-2 px-4 py-2.5 text-[13px]">
            <FormInput className="size-4" />
            Campos
          </TabsTrigger>
          <TabsTrigger value="formularios" className="gap-2 px-4 py-2.5 text-[13px]">
            <FileText className="size-4" />
            Formularios
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
          <TabsTrigger value="comissoes" className="gap-2 px-4 py-2.5 text-[13px]">
            <Percent className="size-4" />
            Comissoes
          </TabsTrigger>
          <TabsTrigger value="gateway" className="gap-2 px-4 py-2.5 text-[13px]">
            <Zap className="size-4" />
            Pagamento
          </TabsTrigger>
          <TabsTrigger value="fiscal" className="gap-2 px-4 py-2.5 text-[13px]">
            <Receipt className="size-4" />
            Fiscal
          </TabsTrigger>
          <TabsTrigger value="plano" className="gap-2 px-4 py-2.5 text-[13px]">
            <CreditCard className="size-4" />
            Plano
          </TabsTrigger>
          <Link
            href="/settings/tiss"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <Stethoscope className="size-4" />
            TISS
          </Link>
          <Link
            href="/settings/audit"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <ClipboardList className="size-4" />
            Auditoria
          </Link>
        </TabsList>

        {/* ─── Tab: Clinica ─── */}
        <TabsContent value="clinica" className="animate-fade-in space-y-4 pt-4">
          <ClinicaSection
            clinicName={clinicName}
            onClinicNameChange={setClinicName}
            profLabel={profLabel}
          />
        </TabsContent>

        {/* ─── Tab: Procedimentos ─── */}
        <TabsContent value="procedimentos" className="animate-fade-in space-y-4 pt-4">
          <ProcedimentosSection
            procedures={procedures}
            onProceduresChange={setProcedures}
          />
        </TabsContent>

        {/* ─── Tab: Campos Customizados ─── */}
        <TabsContent value="campos" className="animate-fade-in space-y-4 pt-4">
          <CamposSection
            customFields={customFields}
            onCustomFieldsChange={setCustomFields}
          />
        </TabsContent>

        {/* ─── Tab: Formularios ─── */}
        <TabsContent value="formularios" className="animate-fade-in space-y-4 pt-4">
          <FormulariosSection />
        </TabsContent>

        {/* ─── Tab: Equipe ─── */}
        <TabsContent value="equipe" className="animate-fade-in space-y-4 pt-4">
          <TeamSection clinicName={clinicName} />
        </TabsContent>

        {/* ─── Tab: Agendas ─── */}
        <TabsContent value="agendas" className="animate-fade-in space-y-4 pt-4">
          <AgendasSection />
        </TabsContent>

        {/* ─── Tab: Booking Online ─── */}
        <TabsContent value="booking" className="animate-fade-in space-y-4 pt-4">
          <BookingSection />
        </TabsContent>

        {/* ─── Tab: Mensagens ─── */}
        <TabsContent value="mensagens" className="animate-fade-in space-y-4 pt-4">
          <MessagingSection />
        </TabsContent>

        {/* ─── Tab: Aparencia ─── */}
        <TabsContent value="aparencia" className="animate-fade-in space-y-4 pt-4">
          <AparenciaSection />
        </TabsContent>

        {/* ─── Tab: Comissoes ─── */}
        <TabsContent value="comissoes" className="animate-fade-in space-y-4 pt-4">
          <ComissoesSection />
        </TabsContent>

        {/* ─── Tab: Gateway de Pagamento ─── */}
        <TabsContent value="gateway" className="animate-fade-in space-y-4 pt-4">
          <GatewaySection />
        </TabsContent>

        {/* ─── Tab: Fiscal (NFS-e) ─── */}
        <TabsContent value="fiscal" className="animate-fade-in space-y-4 pt-4">
          <FiscalTab />
        </TabsContent>

        {/* ─── Tab: Plano (Billing) ─── */}
        <TabsContent value="plano" className="animate-fade-in space-y-4 pt-4">
          <PlanoSection />
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

