"use client"

import { useState, useTransition, useRef, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, AlertTriangle } from "lucide-react"
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = useCallback((value: string, p: number = 1) => {
    startTransition(async () => {
      const data = await getPatients(value || undefined, p)
      setPatients(data.patients)
      setTotalPages(data.totalPages)
      setPage(data.page)
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

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar paciente por nome..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {isPending ? (
        <p className="text-sm text-muted-foreground">Buscando...</p>
      ) : patients.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum paciente encontrado.
        </p>
      ) : (
        <div className="space-y-2">
          {patients.map((patient) => (
            <Link key={patient.id} href={`/patients/${patient.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="flex items-center justify-between py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {patient.name}
                      </span>
                      {patient.alerts.length > 0 && (
                        <Badge variant="destructive" className="shrink-0">
                          <AlertTriangle className="size-3 mr-1" />
                          {patient.alerts.length}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {patient.phone || patient.email || "Sem contato"}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-4">
                    {formatDate(patient.lastAppointment)}
                  </span>
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
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages || isPending}
          >
            Proximo
          </Button>
        </div>
      )}
    </div>
  )
}
