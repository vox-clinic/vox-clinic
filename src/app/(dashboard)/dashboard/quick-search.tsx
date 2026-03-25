"use client"

import { useState, useTransition, useRef, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import Link from "next/link"
import { searchPatients } from "@/server/actions/patient"

export function QuickSearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<
    { id: string; name: string; phone: string | null }[]
  >([])
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearch = useCallback((value: string) => {
    setQuery(value)
    if (!value.trim()) {
      setResults([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const patients = await searchPatients(value)
        setResults(patients)
      })
    }, 300)
  }, [])

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar paciente por nome..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-8"
        />
      </div>
      {query.trim() && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border bg-popover p-1 shadow-md">
          {isPending ? (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">
              Buscando...
            </p>
          ) : results.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">
              Nenhum paciente encontrado.
            </p>
          ) : (
            results.map((patient) => (
              <Link
                key={patient.id}
                href={`/patients/${patient.id}`}
                className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted transition-colors"
              >
                <span className="font-medium">{patient.name}</span>
                {patient.phone && (
                  <span className="text-xs text-muted-foreground">
                    {patient.phone}
                  </span>
                )}
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  )
}
