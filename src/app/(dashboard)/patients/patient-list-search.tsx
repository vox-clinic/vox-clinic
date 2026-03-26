"use client"

import { useState, useTransition, useRef, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, AlertTriangle, ChevronLeft, ChevronRight, Users } from "lucide-react"
import Link from "next/link"
import { getPatients } from "@/server/actions/patient"

type PatientItem = {
  id: string
  name: string
  phone: string | null
  document: string | null
  email: string | null
  alerts: string[]
  lastAppointment: Date | null
}

export function PatientListSearch({
  initialPatients,
  totalPages: initialTotalPages,
}: {
  initialPatients: PatientItem[]
  totalPages: number
}) {
  const [query, setQuery] = useState("")
  const [patients, setPatients] = useState(initialPatients)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(initialTotalPages)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = useCallback((value: string, p: number = 1) => {
    setError(null)
    startTransition(async () => {
      try {
        const data = await getPatients(value || undefined, p)
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
    debounceRef.current = setTimeout(() => doSearch(value, 1), 300)
  }, [doSearch])

  const handlePageChange = (newPage: number) => {
    doSearch(query, newPage)
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
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar paciente por nome..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9 h-10"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-vox-error/30 bg-vox-error/5 p-3 text-sm text-vox-error">
          {error}
        </div>
      )}

      {isPending ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[72px] rounded-2xl bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : patients.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
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
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {patients.map((patient) => (
            <Link key={patient.id} href={`/patients/${patient.id}`}>
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
                    </p>
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
