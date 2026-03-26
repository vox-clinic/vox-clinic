"use client"

import { useEffect, useState, useCallback, useRef, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  Users,
  CalendarDays,
  Mic,
  LayoutDashboard,
  Settings,
  DollarSign,
  UserPlus,
  ArrowRight,
  FileText,
  Loader2,
  Command,
} from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { searchPatients } from "@/server/actions/patient"

type SearchResult = {
  id: string
  name: string
  phone: string | null
  document: string | null
}

const pages = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, keywords: "painel inicio home" },
  { id: "patients", label: "Pacientes", href: "/patients", icon: Users, keywords: "lista pacientes" },
  { id: "calendar", label: "Agenda", href: "/calendar", icon: CalendarDays, keywords: "calendario consultas agendamento" },
  { id: "financial", label: "Financeiro", href: "/financial", icon: DollarSign, keywords: "receita faturamento valor" },
  { id: "settings", label: "Configuracoes", href: "/settings", icon: Settings, keywords: "config preferencias workspace" },
]

const actions = [
  { id: "new-consultation", label: "Nova Consulta", href: "/appointments/new", icon: Mic, keywords: "gravar audio consulta" },
  { id: "new-patient-voice", label: "Cadastro por Voz", href: "/patients/new/voice", icon: Mic, keywords: "paciente voz audio cadastrar" },
  { id: "new-patient-manual", label: "Novo Paciente (Manual)", href: "/patients/new/manual", icon: UserPlus, keywords: "paciente cadastrar manual" },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [patients, setPatients] = useState<SearchResult[]>([])
  const [isPending, startTransition] = useTransition()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("")
      setPatients([])
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Search patients with debounce
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setPatients([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        try {
          const results = await searchPatients(query)
          setPatients(results.slice(0, 5))
        } catch {
          setPatients([])
        }
      })
    }, 200)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  // Filter pages and actions
  const q = query.toLowerCase()
  const filteredPages = q
    ? pages.filter((p) => p.label.toLowerCase().includes(q) || p.keywords.includes(q))
    : pages
  const filteredActions = q
    ? actions.filter((a) => a.label.toLowerCase().includes(q) || a.keywords.includes(q))
    : actions

  // Build flat list for keyboard navigation
  const allItems: { type: "patient" | "page" | "action"; id: string; href: string }[] = [
    ...patients.map((p) => ({ type: "patient" as const, id: p.id, href: `/patients/${p.id}` })),
    ...filteredPages.map((p) => ({ type: "page" as const, id: p.id, href: p.href })),
    ...filteredActions.map((a) => ({ type: "action" as const, id: a.id, href: a.href })),
  ]

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [query, patients.length])

  function navigate(href: string) {
    setOpen(false)
    router.push(href)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, allItems.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter" && allItems[selectedIndex]) {
      e.preventDefault()
      navigate(allItems[selectedIndex].href)
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  const showPatients = patients.length > 0
  const showPages = filteredPages.length > 0
  const showActions = filteredActions.length > 0
  let itemIndex = -1

  return (
    <>
      {/* Trigger button in header */}
      <button
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-2 rounded-xl border border-border/50 bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vox-primary/50"
      >
        <Search className="size-3.5" />
        <span>Buscar...</span>
        <kbd className="ml-2 inline-flex h-5 items-center gap-0.5 rounded border border-border/60 bg-background px-1.5 text-[10px] font-mono text-muted-foreground">
          <Command className="size-2.5" />K
        </kbd>
      </button>

      {/* Mobile trigger */}
      <button
        onClick={() => setOpen(true)}
        className="flex sm:hidden items-center justify-center size-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vox-primary/50"
        aria-label="Buscar"
      >
        <Search className="size-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="top-[20%] translate-y-0 max-w-[calc(100vw-2rem)] sm:max-w-lg p-0 gap-0 overflow-hidden"
        >
          <DialogTitle className="sr-only">Busca global</DialogTitle>

          {/* Search input */}
          <div className="flex items-center gap-3 border-b px-4 py-3">
            {isPending ? (
              <Loader2 className="size-4 shrink-0 text-vox-primary animate-spin" />
            ) : (
              <Search className="size-4 shrink-0 text-muted-foreground" />
            )}
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Buscar pacientes, paginas, acoes..."
              className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/60"
              autoComplete="off"
              spellCheck={false}
            />
            <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border/60 bg-muted/50 px-1.5 text-[10px] font-mono text-muted-foreground">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[300px] overflow-y-auto p-2">
            {allItems.length === 0 && query.length >= 2 && !isPending && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum resultado encontrado
              </p>
            )}

            {/* Patients */}
            {showPatients && (
              <div className="mb-1">
                <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                  Pacientes
                </p>
                {patients.map((patient) => {
                  itemIndex++
                  const idx = itemIndex
                  return (
                    <button
                      key={patient.id}
                      onClick={() => navigate(`/patients/${patient.id}`)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13px] transition-colors ${
                        selectedIndex === idx
                          ? "bg-vox-primary/10 text-vox-primary"
                          : "text-foreground hover:bg-accent"
                      }`}
                    >
                      <div className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        selectedIndex === idx
                          ? "bg-vox-primary text-white"
                          : "bg-vox-primary/[0.08] text-vox-primary"
                      }`}>
                        {patient.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{patient.name}</p>
                        {(patient.phone || patient.document) && (
                          <p className="text-[11px] text-muted-foreground truncate">
                            {patient.phone || patient.document}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground/50" />
                    </button>
                  )
                })}
              </div>
            )}

            {/* Pages */}
            {showPages && (
              <div className="mb-1">
                <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                  Paginas
                </p>
                {filteredPages.map((page) => {
                  itemIndex++
                  const idx = itemIndex
                  const Icon = page.icon
                  return (
                    <button
                      key={page.id}
                      onClick={() => navigate(page.href)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13px] transition-colors ${
                        selectedIndex === idx
                          ? "bg-vox-primary/10 text-vox-primary"
                          : "text-foreground hover:bg-accent"
                      }`}
                    >
                      <Icon className={`size-4 shrink-0 ${selectedIndex === idx ? "text-vox-primary" : "text-muted-foreground/50"}`} />
                      <span className="flex-1">{page.label}</span>
                      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground/50" />
                    </button>
                  )
                })}
              </div>
            )}

            {/* Actions */}
            {showActions && (
              <div>
                <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                  Acoes
                </p>
                {filteredActions.map((action) => {
                  itemIndex++
                  const idx = itemIndex
                  const Icon = action.icon
                  return (
                    <button
                      key={action.id}
                      onClick={() => navigate(action.href)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13px] transition-colors ${
                        selectedIndex === idx
                          ? "bg-vox-primary/10 text-vox-primary"
                          : "text-foreground hover:bg-accent"
                      }`}
                    >
                      <Icon className={`size-4 shrink-0 ${selectedIndex === idx ? "text-vox-primary" : "text-muted-foreground/50"}`} />
                      <span className="flex-1">{action.label}</span>
                      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground/50" />
                    </button>
                  )
                })}
              </div>
            )}

            {/* Empty state - no query */}
            {!query && (
              <p className="py-4 text-center text-xs text-muted-foreground/60">
                Digite para buscar pacientes, paginas ou acoes
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
