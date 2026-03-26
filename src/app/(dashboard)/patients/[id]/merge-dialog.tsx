"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Merge, Search, Loader2, AlertTriangle } from "lucide-react"
import { searchPatients, mergePatients } from "@/server/actions/patient"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function MergeDialog({ patientId, patientName }: { patientId: string; patientName: string }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<{ id: string; name: string; phone: string | null; document: string | null }[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [searching, startSearch] = useTransition()
  const [merging, startMerge] = useTransition()
  const router = useRouter()

  const handleSearch = (value: string) => {
    setQuery(value)
    if (value.trim().length < 2) { setResults([]); return }
    startSearch(async () => {
      const found = await searchPatients(value)
      setResults(found.filter(p => p.id !== patientId))
    })
  }

  const handleMerge = () => {
    if (!selected) return
    startMerge(async () => {
      try {
        await mergePatients(patientId, selected)
        toast.success("Pacientes mesclados com sucesso")
        setOpen(false)
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao mesclar pacientes")
      }
    })
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Merge className="size-3.5" />
        Mesclar
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setOpen(false)}>
      <div className="w-full max-w-md rounded-2xl bg-card border shadow-lg p-5 space-y-4 mx-4" onClick={(e) => e.stopPropagation()}>
        <div>
          <h3 className="text-base font-semibold">Mesclar Pacientes</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Mesclar outro paciente em <strong>{patientName}</strong>. Consultas, gravacoes e documentos serao transferidos. O paciente duplicado sera desativado.
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar paciente para mesclar..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        {searching ? (
          <div className="flex justify-center py-4"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
        ) : results.length > 0 ? (
          <div className="max-h-48 overflow-y-auto space-y-1">
            {results.map((p) => (
              <Card
                key={p.id}
                className={`cursor-pointer transition-colors ${selected === p.id ? "border-vox-primary bg-vox-primary/5" : "hover:bg-muted/50"}`}
                onClick={() => setSelected(p.id)}
              >
                <CardContent className="py-2 px-3">
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {p.document || "Sem CPF"} {p.phone && `· ${p.phone}`}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : query.length >= 2 ? (
          <p className="text-xs text-muted-foreground text-center py-3">Nenhum paciente encontrado</p>
        ) : null}

        {selected && (
          <div className="rounded-lg border border-vox-warning/30 bg-vox-warning/5 p-2.5 flex items-start gap-2">
            <AlertTriangle className="size-4 text-vox-warning shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Esta acao nao pode ser desfeita. Os dados do paciente selecionado serao mesclados em <strong>{patientName}</strong>.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            size="sm"
            disabled={!selected || merging}
            onClick={handleMerge}
            className="bg-vox-primary text-white hover:bg-vox-primary/90 gap-1.5"
          >
            {merging ? <Loader2 className="size-3.5 animate-spin" /> : <Merge className="size-3.5" />}
            Mesclar
          </Button>
        </div>
      </div>
    </div>
  )
}
