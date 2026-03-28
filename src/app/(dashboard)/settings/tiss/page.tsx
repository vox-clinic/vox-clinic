"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Loader2,
  Save,
  CheckCircle,
  AlertCircle,
  FileText,
  Building2,
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  Stethoscope,
} from "lucide-react"
import { getTissConfig, saveTissConfig } from "@/server/actions/tiss-config"
import {
  getOperadoras,
  createOperadora,
  updateOperadora,
  deleteOperadora,
} from "@/server/actions/operadora"
import { toast } from "sonner"
import { friendlyError } from "@/lib/error-messages"
import Link from "next/link"

const BRAZILIAN_STATES = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA",
  "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN",
  "RO", "RR", "RS", "SC", "SE", "SP", "TO",
]

const CONSELHOS = [
  { value: "CRM", label: "CRM - Conselho Regional de Medicina" },
  { value: "CRO", label: "CRO - Conselho Regional de Odontologia" },
  { value: "CRN", label: "CRN - Conselho Regional de Nutricao" },
  { value: "CRP", label: "CRP - Conselho Regional de Psicologia" },
  { value: "CREFITO", label: "CREFITO - Conselho Regional de Fisioterapia" },
  { value: "COREN", label: "COREN - Conselho Regional de Enfermagem" },
  { value: "CRF", label: "CRF - Conselho Regional de Farmacia" },
  { value: "CRMV", label: "CRMV - Conselho Regional de Medicina Veterinaria" },
  { value: "CRFa", label: "CRFa - Conselho Regional de Fonoaudiologia" },
]

const CBOS_CODES = [
  { value: "225120", label: "225120 - Medico clinico geral" },
  { value: "225125", label: "225125 - Medico de familia" },
  { value: "225142", label: "225142 - Medico ginecologista" },
  { value: "225133", label: "225133 - Medico dermatologista" },
  { value: "223208", label: "223208 - Cirurgiao-dentista clinico geral" },
  { value: "223604", label: "223604 - Fisioterapeuta" },
  { value: "223505", label: "223505 - Nutricionista" },
  { value: "251510", label: "251510 - Psicologo clinico" },
]

function formatCnpj(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14)
  if (digits.length <= 2) return digits
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}

interface TissFormData {
  cnes: string
  codigoPrestador: string
  cbos: string
  conselhoProfissional: string
  numeroConselho: string
  ufConselho: string
}

const defaultForm: TissFormData = {
  cnes: "",
  codigoPrestador: "",
  cbos: "",
  conselhoProfissional: "",
  numeroConselho: "",
  ufConselho: "",
}

type OperadoraRow = {
  id: string
  registroAns: string
  nome: string
  cnpj: string | null
  isActive: boolean
  guidesCount: number
  createdAt: string
}

interface OperadoraFormData {
  registroAns: string
  nome: string
  cnpj: string
}

const defaultOperadoraForm: OperadoraFormData = {
  registroAns: "",
  nome: "",
  cnpj: "",
}

export default function TissSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isConfigured, setIsConfigured] = useState(false)
  const [form, setForm] = useState<TissFormData>(defaultForm)

  // Operadoras state
  const [operadoras, setOperadoras] = useState<OperadoraRow[]>([])
  const [operadoraDialogOpen, setOperadoraDialogOpen] = useState(false)
  const [editingOperadora, setEditingOperadora] = useState<OperadoraRow | null>(null)
  const [operadoraForm, setOperadoraForm] = useState<OperadoraFormData>(defaultOperadoraForm)
  const [savingOperadora, setSavingOperadora] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      const [configResult, operadorasResult] = await Promise.all([
        getTissConfig(),
        getOperadoras(),
      ])

      if (configResult && !("error" in configResult) && configResult !== null) {
        setForm({
          cnes: configResult.cnes ?? "",
          codigoPrestador: configResult.codigoPrestador ?? "",
          cbos: configResult.cbos ?? "",
          conselhoProfissional: configResult.conselhoProfissional ?? "",
          numeroConselho: configResult.numeroConselho ?? "",
          ufConselho: configResult.ufConselho ?? "",
        })
        setIsConfigured(true)
      }

      if (operadorasResult && !("error" in operadorasResult)) {
        setOperadoras(operadorasResult as OperadoraRow[])
      }
    } catch {
      toast.error("Erro ao carregar configuracoes TISS")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const updateField = (field: keyof TissFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await saveTissConfig({
        cnes: form.cnes,
        codigoPrestador: form.codigoPrestador,
        cbos: form.cbos,
        conselhoProfissional: form.conselhoProfissional,
        numeroConselho: form.numeroConselho,
        ufConselho: form.ufConselho,
      })
      if (result && "error" in result) {
        toast.error(result.error)
        return
      }
      setIsConfigured(true)
      toast.success("Configuracao TISS salva com sucesso!")
    } catch (err) {
      toast.error(friendlyError(err, "Erro ao salvar configuracao"))
    } finally {
      setSaving(false)
    }
  }

  // Operadora handlers
  const openNewOperadora = () => {
    setEditingOperadora(null)
    setOperadoraForm(defaultOperadoraForm)
    setOperadoraDialogOpen(true)
  }

  const openEditOperadora = (op: OperadoraRow) => {
    setEditingOperadora(op)
    setOperadoraForm({
      registroAns: op.registroAns,
      nome: op.nome,
      cnpj: op.cnpj ? formatCnpj(op.cnpj) : "",
    })
    setOperadoraDialogOpen(true)
  }

  const handleSaveOperadora = async () => {
    setSavingOperadora(true)
    try {
      if (editingOperadora) {
        const result = await updateOperadora(editingOperadora.id, {
          nome: operadoraForm.nome,
          cnpj: operadoraForm.cnpj || null,
        })
        if (result && "error" in result) { toast.error(result.error); return }
        toast.success("Operadora atualizada")
      } else {
        const result = await createOperadora({
          registroAns: operadoraForm.registroAns,
          nome: operadoraForm.nome,
          cnpj: operadoraForm.cnpj || undefined,
        })
        if (result && "error" in result) { toast.error(result.error); return }
        toast.success("Operadora adicionada")
      }
      setOperadoraDialogOpen(false)
      loadData()
    } catch (err) {
      toast.error(friendlyError(err, "Erro ao salvar operadora"))
    } finally {
      setSavingOperadora(false)
    }
  }

  const handleDeleteOperadora = async (id: string) => {
    setDeletingId(id)
    try {
      const result = await deleteOperadora(id)
      if (result && "error" in result) { toast.error(result.error); return }
      toast.success("Operadora removida")
      loadData()
    } catch (err) {
      toast.error(friendlyError(err, "Erro ao remover operadora"))
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleOperadora = async (id: string, isActive: boolean) => {
    try {
      const result = await updateOperadora(id, { isActive })
      if (result && "error" in result) { toast.error(result.error); return }
      setOperadoras((prev) =>
        prev.map((op) => (op.id === id ? { ...op, isActive } : op))
      )
    } catch {
      toast.error("Erro ao alterar status")
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="flex size-8 items-center justify-center rounded-xl hover:bg-muted transition-colors"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <Stethoscope className="size-5 text-vox-primary" />
        <div className="flex-1">
          <h1 className="text-xl font-semibold tracking-tight">Configuracao TISS</h1>
          <p className="text-sm text-muted-foreground">
            Faturamento de convenios (TISS/ANS)
          </p>
        </div>
        {isConfigured && (
          <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">
            <CheckCircle className="mr-1 size-3" />
            Configurado
          </Badge>
        )}
      </div>

      {/* Section A: Configuracao TISS */}
      <Card className="rounded-2xl border-border/40">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <FileText className="size-4 text-vox-primary" />
            Dados do Prestador
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs">CNES (7 digitos)</Label>
              <Input
                value={form.cnes}
                onChange={(e) => updateField("cnes", e.target.value.replace(/\D/g, "").slice(0, 7))}
                placeholder="0000000"
                maxLength={7}
              />
              <p className="text-xs text-muted-foreground">
                Cadastro Nacional de Estabelecimentos de Saude
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Codigo do Prestador</Label>
              <Input
                value={form.codigoPrestador}
                onChange={(e) => updateField("codigoPrestador", e.target.value)}
                placeholder="Codigo do prestador na operadora"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs">CBO (6 digitos)</Label>
              <Select
                value={form.cbos || ""}
                onValueChange={(v) => { if (v) updateField("cbos", v) }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o CBO" />
                </SelectTrigger>
                <SelectContent>
                  {CBOS_CODES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Classificacao Brasileira de Ocupacoes
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Conselho Profissional</Label>
              <Select
                value={form.conselhoProfissional || ""}
                onValueChange={(v) => { if (v) updateField("conselhoProfissional", v) }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o conselho" />
                </SelectTrigger>
                <SelectContent>
                  {CONSELHOS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs">Numero do Conselho</Label>
              <Input
                value={form.numeroConselho}
                onChange={(e) => updateField("numeroConselho", e.target.value)}
                placeholder="Ex: 123456"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">UF do Conselho</Label>
              <Select
                value={form.ufConselho || ""}
                onValueChange={(v) => { if (v) updateField("ufConselho", v) }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  {BRAZILIAN_STATES.map((uf) => (
                    <SelectItem key={uf} value={uf}>
                      {uf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* TISS Version (read-only) */}
          <div className="space-y-2">
            <Label className="text-xs">Versao TISS</Label>
            <div className="flex items-center gap-2">
              <Input
                value="4.01.00"
                readOnly
                disabled
                className="w-32 bg-muted/50"
              />
              <Badge variant="secondary" className="text-xs">Padrao ANS</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Config */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="bg-vox-primary hover:bg-vox-primary/90"
      >
        {saving ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <Save className="mr-2 size-4" />
        )}
        Salvar Configuracao
      </Button>

      {/* Section B: Operadoras */}
      <Card className="rounded-2xl border-border/40">
        <CardHeader className="flex-row items-center justify-between pb-4">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Building2 className="size-4 text-vox-primary" />
            Operadoras (Convenios)
          </CardTitle>
          <Button size="sm" onClick={openNewOperadora} className="bg-vox-primary hover:bg-vox-primary/90">
            <Plus className="mr-1.5 size-3.5" />
            Nova Operadora
          </Button>
        </CardHeader>
        <CardContent>
          {operadoras.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Building2 className="mb-3 size-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">
                Nenhuma operadora cadastrada
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Adicione os convenios aceitos pela clinica
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Nome</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Registro ANS</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">CNPJ</th>
                    <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">Ativo</th>
                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {operadoras.map((op) => (
                    <tr key={op.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2.5">
                        <p className="font-medium">{op.nome}</p>
                        {op.guidesCount > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {op.guidesCount} guia{op.guidesCount !== 1 ? "s" : ""}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs">{op.registroAns}</td>
                      <td className="px-3 py-2.5 font-mono text-xs">
                        {op.cnpj ? formatCnpj(op.cnpj) : "-"}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <Switch
                          checked={op.isActive}
                          onCheckedChange={(checked) => handleToggleOperadora(op.id, checked)}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => openEditOperadora(op)}
                            title="Editar"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteOperadora(op.id)}
                            disabled={deletingId === op.id}
                            title="Excluir"
                          >
                            {deletingId === op.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="size-3.5" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {!isConfigured && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Configuracao necessaria</p>
            <p className="mt-1 text-amber-700">
              Preencha os dados do prestador acima e salve para habilitar o faturamento TISS.
              Em seguida, adicione as operadoras (convenios) aceitas pela clinica.
            </p>
          </div>
        </div>
      )}

      {/* Operadora Dialog */}
      <Dialog open={operadoraDialogOpen} onOpenChange={setOperadoraDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="size-5 text-vox-primary" />
              {editingOperadora ? "Editar Operadora" : "Nova Operadora"}
            </DialogTitle>
            <DialogDescription>
              {editingOperadora
                ? "Atualize os dados da operadora"
                : "Cadastre uma nova operadora (convenio)"
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Registro ANS (6 digitos)</Label>
              <Input
                value={operadoraForm.registroAns}
                onChange={(e) =>
                  setOperadoraForm((prev) => ({
                    ...prev,
                    registroAns: e.target.value.replace(/\D/g, "").slice(0, 6),
                  }))
                }
                placeholder="000000"
                maxLength={6}
                disabled={!!editingOperadora}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Nome da Operadora</Label>
              <Input
                value={operadoraForm.nome}
                onChange={(e) =>
                  setOperadoraForm((prev) => ({ ...prev, nome: e.target.value }))
                }
                placeholder="Ex: Unimed, Amil, SulAmerica..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">CNPJ (opcional)</Label>
              <Input
                value={operadoraForm.cnpj}
                onChange={(e) =>
                  setOperadoraForm((prev) => ({
                    ...prev,
                    cnpj: formatCnpj(e.target.value),
                  }))
                }
                placeholder="00.000.000/0000-00"
                maxLength={18}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOperadoraDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveOperadora}
              disabled={savingOperadora}
              className="bg-vox-primary hover:bg-vox-primary/90"
            >
              {savingOperadora ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Save className="mr-2 size-4" />
              )}
              {editingOperadora ? "Atualizar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
