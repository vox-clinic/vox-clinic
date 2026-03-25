"use client"

import { useEffect, useState, useTransition } from "react"
import { Check, Loader2, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { getWorkspace, updateWorkspace } from "@/server/actions/workspace"

type Procedure = { id: string; name: string; category: string }
type CustomField = { id: string; name: string; type: string; required: boolean }

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [clinicName, setClinicName] = useState("")
  const [profession, setProfession] = useState("")
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [newProcedure, setNewProcedure] = useState("")

  useEffect(() => {
    getWorkspace()
      .then((ws) => {
        setClinicName(ws.clinicName ?? "")
        setProfession(ws.profession ?? ws.professionType)
        setProcedures(ws.procedures)
        setCustomFields(ws.customFields)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function addProcedure() {
    if (!newProcedure.trim()) return
    setProcedures((prev) => [
      ...prev,
      { id: `proc_${Date.now()}`, name: newProcedure.trim(), category: "Geral" },
    ])
    setNewProcedure("")
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
    try {
      await updateWorkspace({
        clinicName,
        procedures,
        customFields,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Configuracoes</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie seu workspace e dados da clinica
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-vox-primary text-white hover:bg-vox-primary/90"
        >
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Salvando...
            </>
          ) : saved ? (
            <>
              <Check className="size-4" />
              Salvo
            </>
          ) : (
            "Salvar Alteracoes"
          )}
        </Button>
      </div>

      {/* Clinic info */}
      <Card>
        <CardHeader>
          <CardTitle>Dados da Clinica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Nome da Clinica</Label>
              <Input
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                placeholder="Ex: Clinica Sorriso"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Profissao</Label>
              <Input value={profession} disabled className="bg-muted" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Procedures */}
      <Card>
        <CardHeader>
          <CardTitle>Procedimentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {procedures.map((proc) => (
              <div
                key={proc.id}
                className="flex items-center justify-between rounded-xl border px-4 py-3"
              >
                <div>
                  <span className="text-sm font-medium">{proc.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {proc.category}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeProcedure(proc.id)}
                  className="text-muted-foreground hover:text-vox-error"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newProcedure}
              onChange={(e) => setNewProcedure(e.target.value)}
              placeholder="Novo procedimento"
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
            >
              <Plus className="size-4" />
              Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Custom fields */}
      <Card>
        <CardHeader>
          <CardTitle>Campos Customizados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {customFields.map((field) => (
            <div
              key={field.id}
              className="flex items-center justify-between rounded-xl border px-4 py-3"
            >
              <div className="flex-1">
                <span className="text-sm font-medium">{field.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  ({field.type})
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Switch
                    checked={field.required}
                    onCheckedChange={() => toggleFieldRequired(field.id)}
                  />
                  <span className="text-xs text-muted-foreground">Obrigatorio</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeField(field.id)}
                  className="text-muted-foreground hover:text-vox-error"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          ))}
          {customFields.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhum campo customizado configurado.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
