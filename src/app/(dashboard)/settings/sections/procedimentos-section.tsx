"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { ListChecks, Plus, X, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Procedure } from "@/types"

interface ProcedimentosSectionProps {
  procedures: Procedure[]
  onProceduresChange: (procedures: Procedure[]) => void
}

function centavosToDisplay(centavos: number | undefined): string {
  if (!centavos) return ""
  return (centavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })
}

function parseCentavos(value: string): number | undefined {
  const digits = value.replace(/\D/g, "")
  const num = parseInt(digits || "0", 10)
  return num || undefined
}

export function ProcedimentosSection({ procedures, onProceduresChange }: ProcedimentosSectionProps) {
  const [newProcedure, setNewProcedure] = useState("")
  const [newCategory, setNewCategory] = useState("Geral")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const categories = [...new Set(procedures.map((p) => p.category).filter(Boolean))]

  function addProcedure() {
    if (!newProcedure.trim()) return
    onProceduresChange([
      ...procedures,
      { id: `proc_${Date.now()}`, name: newProcedure.trim(), category: newCategory || "Geral", duration: 30 },
    ])
    setNewProcedure("")
  }

  function updateProcedure(id: string, updates: Partial<Procedure>) {
    onProceduresChange(procedures.map((p) => p.id === id ? { ...p, ...updates } : p))
  }

  function removeProcedure(id: string) {
    onProceduresChange(procedures.filter((p) => p.id !== id))
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="size-4 text-vox-primary" />
            Procedimentos
          </CardTitle>
          <Badge variant="secondary" className="tabular-nums">{procedures.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={newProcedure}
            onChange={(e) => setNewProcedure(e.target.value)}
            placeholder="Nome do procedimento..."
            className="h-9 flex-1"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addProcedure() } }}
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-2 text-xs"
          >
            <option value="Geral">Geral</option>
            {categories.filter((c) => c !== "Geral").map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={addProcedure} disabled={!newProcedure.trim()} className="shrink-0">
            <Plus className="size-4" />Adicionar
          </Button>
        </div>

        <Separator />

        <div className="space-y-1.5">
          {procedures.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <ListChecks className="size-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Nenhum procedimento cadastrado</p>
            </div>
          )}
          {procedures.map((proc, i) => {
            const isExpanded = expandedId === proc.id
            return (
              <div
                key={proc.id}
                className="group rounded-xl border border-border/50 bg-card transition-all duration-200 hover:border-border hover:shadow-[0_1px_3px_0_rgb(0_0_0/0.04)]"
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-vox-primary/[0.07] text-xs font-semibold text-vox-primary">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium truncate block">{proc.name}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      {proc.price && (
                        <span className="text-[10px] font-medium text-vox-primary">
                          R$ {centavosToDisplay(proc.price)}
                        </span>
                      )}
                      {proc.internalCode && (
                        <span className="text-[10px] text-muted-foreground font-mono">{proc.internalCode}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      min={5}
                      max={480}
                      step={5}
                      value={proc.duration ?? 30}
                      onChange={(e) => updateProcedure(proc.id, { duration: parseInt(e.target.value) || 30 })}
                      className="w-14 h-7 rounded-lg border border-input bg-transparent px-1.5 text-center text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                    />
                    <span className="text-[10px] text-muted-foreground">min</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">{proc.category}</Badge>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : proc.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  >
                    {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeProcedure(proc.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-vox-error shrink-0"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {isExpanded && (
                  <div className="border-t border-border/30 px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Preço (R$)</Label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">R$</span>
                        <Input
                          value={centavosToDisplay(proc.price)}
                          onChange={(e) => updateProcedure(proc.id, { price: parseCentavos(e.target.value) })}
                          inputMode="numeric"
                          placeholder="0,00"
                          className="h-8 pl-7 text-xs rounded-lg"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Custo clínica (R$)</Label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">R$</span>
                        <Input
                          value={centavosToDisplay(proc.cost)}
                          onChange={(e) => updateProcedure(proc.id, { cost: parseCentavos(e.target.value) })}
                          inputMode="numeric"
                          placeholder="0,00"
                          className="h-8 pl-7 text-xs rounded-lg"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Comissão (%)</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={proc.commission ?? ""}
                          onChange={(e) => updateProcedure(proc.id, { commission: parseInt(e.target.value) || undefined })}
                          placeholder="0"
                          className="h-8 text-xs rounded-lg pr-6"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">%</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Código interno</Label>
                      <Input
                        value={proc.internalCode ?? ""}
                        onChange={(e) => updateProcedure(proc.id, { internalCode: e.target.value || undefined })}
                        placeholder="Ex: PROC-001"
                        className="h-8 text-xs rounded-lg font-mono"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-[10px] text-muted-foreground">Especialidade</Label>
                      <Input
                        value={proc.specialty ?? ""}
                        onChange={(e) => updateProcedure(proc.id, { specialty: e.target.value || undefined })}
                        placeholder="Ex: Endodontia"
                        className="h-8 text-xs rounded-lg"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-[10px] text-muted-foreground">Categoria</Label>
                      <Input
                        value={proc.category}
                        onChange={(e) => updateProcedure(proc.id, { category: e.target.value || "Geral" })}
                        placeholder="Geral"
                        className="h-8 text-xs rounded-lg"
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
