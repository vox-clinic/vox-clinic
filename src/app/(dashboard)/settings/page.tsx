"use client"

import { useEffect, useState } from "react"
import {
  Check,
  Loader2,
  Users,
  Building2,
  ListChecks,
  FormInput,
  Save,
  ClipboardList,
  Stethoscope,
  Stethoscope as DefaultProfIcon,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getWorkspace, updateWorkspace } from "@/server/actions/workspace"
import { toast } from "sonner"
import { friendlyError } from "@/lib/error-messages"
import Link from "next/link"
import { CalendarDays } from "lucide-react"
import dynamic from "next/dynamic"
import type { Procedure, CustomField } from "@/types"

// Eagerly loaded sections (first visible tabs)
import { ClinicaSection } from "./sections/clinica-section"
import { ProcedimentosSection } from "./sections/procedimentos-section"
import { CamposSection } from "./sections/campos-section"

// Lazy-loaded sections (not immediately visible)
function SectionSkeleton() {
  return <Skeleton className="h-48 w-full rounded-2xl" />
}

const TeamSection = dynamic(
  () => import("./sections/team-section").then((m) => m.TeamSection),
  { ssr: false, loading: SectionSkeleton }
)
const AgendasSection = dynamic(
  () => import("./sections/agendas-section").then((m) => m.AgendasSection),
  { ssr: false, loading: SectionSkeleton }
)

const professionLabels: Record<string, string> = {
  dentista: "Dentista",
  medico: "Médico",
}

const professionIcons: Record<string, LucideIcon> = {
  dentista: Stethoscope,
  medico: Stethoscope,
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
        setError(friendlyError(err, "Erro ao carregar configurações"))
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
      toast.success("Configurações salvas com sucesso")
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      const msg = friendlyError(err, "Erro ao salvar configurações")
      setError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const [activeSection, setActiveSection] = useState("clinica")

  type SettingsNavItem = {
    key: string
    label: string
    icon: any
    href?: string
  }

  type SettingsNavGroup = {
    title: string
    items: SettingsNavItem[]
  }

  const settingsNav: SettingsNavGroup[] = [
    {
      title: "Clínica",
      items: [
        { key: "clinica", label: "Dados da Clínica", icon: Building2 },
        { key: "procedimentos", label: "Procedimentos", icon: ListChecks },
        { key: "campos", label: "Campos Customizados", icon: FormInput },
      ],
    },
    {
      title: "Equipe",
      items: [
        { key: "equipe", label: "Membros", icon: Users },
      ],
    },
    {
      title: "Agendamento",
      items: [
        { key: "agendas", label: "Agendas", icon: CalendarDays },
      ],
    },
    {
      title: "Sistema",
      items: [
        { key: "auditoria", label: "Auditoria", icon: ClipboardList, href: "/settings/audit" },
      ],
    },
  ]

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

  const ProfIcon = professionIcons[professionType?.toLowerCase()] ?? DefaultProfIcon
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
            <div className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-vox-primary to-vox-primary/70 shadow-lg shadow-vox-primary/20 animate-scale-in">
              <ProfIcon className="size-9 text-white" />
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
              Gerencie seu workspace, procedimentos e preferências
            </p>
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

      {/* ─── Settings Navigation + Content ─── */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Navigation */}
        <nav className="md:w-56 shrink-0">
          {/* Mobile: horizontal scroll with active indicator */}
          <div className="flex md:hidden overflow-x-auto gap-1 pb-2 scrollbar-hide">
            {settingsNav.flatMap(group => group.items).map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveSection(item.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  activeSection === item.key
                    ? "bg-vox-primary/10 text-vox-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <item.icon className="size-3.5" />
                {item.label}
              </button>
            ))}
          </div>
          {/* Desktop: grouped sidebar */}
          <div className="hidden md:flex flex-col gap-4">
            {settingsNav.map((group) => (
              <div key={group.title}>
                <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                  {group.title}
                </p>
                <div className="flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    if (item.href) {
                      return (
                        <Link
                          key={item.key}
                          href={item.href}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                        >
                          <item.icon className="size-4" />
                          {item.label}
                        </Link>
                      )
                    }
                    const isActive = activeSection === item.key
                    return (
                      <button
                        key={item.key}
                        onClick={() => setActiveSection(item.key)}
                        className={`group relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all ${
                          isActive
                            ? "bg-vox-primary/10 text-vox-primary font-semibold"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        }`}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-vox-primary" />
                        )}
                        <item.icon className="size-4" />
                        {item.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* Content Area */}
        <div className="flex-1 min-w-0 space-y-4">
          {activeSection === "clinica" && (
            <ClinicaSection clinicName={clinicName} onClinicNameChange={setClinicName} profLabel={profLabel} />
          )}
          {activeSection === "procedimentos" && (
            <ProcedimentosSection procedures={procedures} onProceduresChange={setProcedures} />
          )}
          {activeSection === "campos" && (
            <CamposSection customFields={customFields} onCustomFieldsChange={setCustomFields} />
          )}
          {activeSection === "equipe" && <TeamSection clinicName={clinicName} />}
          {activeSection === "agendas" && <AgendasSection />}
        </div>
      </div>

      {/* ─── Sticky Save Bar (mobile + unsaved changes) ─── */}
      {hasChanges && (
        <div className="fixed bottom-16 left-0 right-0 z-40 animate-fade-in md:bottom-0">
          <div className="mx-auto max-w-5xl px-4 py-3">
            <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-card/95 px-5 py-3 shadow-lg backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-vox-warning animate-pulse" />
                <span className="text-sm font-medium">Alterações não salvas</span>
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
                    Salvar Alterações
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

