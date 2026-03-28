"use client"

import { useState, useTransition, useRef, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, AlertTriangle, ChevronLeft, ChevronRight, Users, Tag, Filter, X, Shield } from "lucide-react"
import Link from "next/link"
import { getPatients } from "@/server/actions/patient"

type PatientItem = {
  id: string
  name: string
  phone: string | null
  document: string | null
  email: string | null
  insurance: string | null
  source: string | null
  tags: string[]
  alerts: string[]
  lastAppointment: Date | null
}

export function PatientListSearch({
  initialPatients,
  totalPages: initialTotalPages,
  availableTags = [],
  availableInsurances = [],
}: {
  initialPatients: PatientItem[]
  totalPages: number
  availableTags?: string[]
  availableInsurances?: string[]
}) {
  const [query, setQuery] = useState("")
  const [patients, setPatients] = useState(initialPatients)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(initialTotalPages)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [activeInsurance, setActiveInsurance] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = useCallback((value: string, p: number = 1, tag?: string | null, ins?: string | null) => {
    setError(null)
    startTransition(async () => {
      try {
        const filters: { tag?: string; insurance?: string } = {
          ...(tag ? { tag } : {}),
          ...(ins ? { insurance: ins } : {}),
        }
        const data = await getPatients(value || undefined, p, 20, Object.keys(filters).length > 0 ? filters : undefined)
        setPatients(data.patients)
        setTotalPages(data.totalPages)
        setPage(data.page)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao buscar pacientes.")
      }
    })
  }, [])

  const handleSearch = useCallback((value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(value, 1, activeTag, activeInsurance), 300)
  }, [doSearch, activeTag, activeInsurance])

  const handleTagFilter = (tag: string | null) => {
    setActiveTag(tag)
    doSearch(query, 1, tag, activeInsurance)
  }

  const handleInsuranceFilter = (ins: string | null) => {
    setActiveInsurance(ins)
    doSearch(query, 1, activeTag, ins)
  }

  const handlePageChange = (newPage: number) => {
    doSearch(query, newPage, activeTag, activeInsurance)
  }

  const formatDate = (date: Date | null) => {
    if (!date) return "Sem atendimento"
    return new Date(date).toLocaleDateString("pt-BR")
  }

  function getInitials(name: string) {
    return name
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CPF, telefone, email, convenio..."
              aria-label="Buscar paciente"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              data-testid="input-patient-search"
              className="pl-9 h-10"
            />
          </div>
          {(availableTags.length > 0 || availableInsurances.length > 0) && (
            <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => setShowFilters(!showFilters)} aria-label="Filtros">
              <Filter className="size-4" />
            </Button>
          )}
        </div>
        {showFilters && (availableTags.length > 0 || availableInsurances.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {(activeTag || activeInsurance) && (
              <Button variant="ghost" size="sm" className="h-6 text-[11px] gap-1 text-muted-foreground" onClick={() => { setActiveTag(null); setActiveInsurance(null); doSearch(query, 1, null, null) }}>
                <X className="size-3" /> Limpar filtros
              </Button>
            )}
            {availableTags.map(tag => (
              <Badge
                key={`tag-${tag}`}
                variant={activeTag === tag ? "default" : "secondary"}
                className="cursor-pointer text-[11px] hover:opacity-80 transition-opacity"
                onClick={() => handleTagFilter(activeTag === tag ? null : tag)}
              >
                <Tag className="size-2.5 mr-0.5" />
                {tag}
              </Badge>
            ))}
            {availableInsurances.map(ins => (
              <Badge
                key={`ins-${ins}`}
                variant={activeInsurance === ins ? "default" : "secondary"}
                className="cursor-pointer text-[11px] hover:opacity-80 transition-opacity"
                onClick={() => handleInsuranceFilter(activeInsurance === ins ? null : ins)}
              >
                <Shield className="size-2.5 mr-0.5" />
                {ins}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div data-testid="error-fetch-patients" className="rounded-xl border border-vox-error/30 bg-vox-error/5 p-3 text-sm text-vox-error">
          {error}
        </div>
      )}

      {isPending ? (
        <div data-testid="loading-patients" className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[72px] rounded-2xl bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : patients.length === 0 ? (
        <div data-testid="empty-patients" className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted/60">
            <Users className="size-6 text-muted-foreground/50" />
          </div>
          <div>
            <p className="text-sm font-medium">
              {query ? "Nenhum paciente encontrado" : "Nenhum paciente cadastrado"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {query ? "Tente buscar por outro nome" : "Cadastre seu primeiro paciente para comecar"}
            </p>
          </div>
        </div>
      ) : (
        <div data-testid="patient-list" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {patients.map((patient) => (
            <Link key={patient.id} href={`/patients/${patient.id}`} aria-label={`Ver paciente ${patient.name}`} data-testid="patient-item" className="rounded-2xl focus-visible:ring-2 focus-visible:ring-vox-primary/50 focus-visible:ring-offset-2 outline-none">
              <Card className="group h-full hover:border-border hover:shadow-[0_2px_8px_0_rgb(0_0_0/0.04)] transition-all cursor-pointer border-border/50">
                <CardContent className="flex items-center gap-3 py-3">
                  {/* Avatar with initials */}
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-vox-primary/10 text-xs font-bold text-vox-primary transition-colors group-hover:bg-vox-primary group-hover:text-white">
                    {getInitials(patient.name)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate group-hover:text-vox-primary transition-colors">
                        {patient.name}
                      </span>
                      {patient.alerts.length > 0 && (
                        <Badge variant="destructive" className="shrink-0 text-[10px] h-5">
                          <AlertTriangle className="size-3 mr-0.5" />
                          {patient.alerts.length}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {patient.phone || patient.email || "Sem contato"}
                      {patient.insurance && <span className="ml-2 text-vox-primary">{patient.insurance}</span>}
                    </p>
                    {patient.tags.length > 0 && (
                      <div className="flex flex-wrap gap-0.5 mt-0.5">
                        {patient.tags.slice(0, 3).map((tag, i) => (
                          <span key={i} className="inline-block rounded bg-muted px-1.5 py-0 text-[9px] text-muted-foreground">{tag}</span>
                        ))}
                        {patient.tags.length > 3 && <span className="text-[9px] text-muted-foreground">+{patient.tags.length - 3}</span>}
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[11px] text-muted-foreground">
                      {formatDate(patient.lastAppointment)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1 || isPending}
            aria-label="Pagina anterior"
            className="gap-1"
          >
            <ChevronLeft className="size-3.5" />
            Anterior
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums px-2">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages || isPending}
            aria-label="Proxima pagina"
            className="gap-1"
          >
            Proximo
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}
