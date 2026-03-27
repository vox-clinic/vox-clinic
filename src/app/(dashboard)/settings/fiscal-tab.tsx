"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Loader2,
  Save,
  CheckCircle,
  AlertCircle,
  FileText,
  Wifi,
} from "lucide-react"
import { getNfseConfig, saveNfseConfig, testNfseConnection } from "@/server/actions/nfse-config"
import { toast } from "sonner"

const BRAZILIAN_STATES = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA",
  "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN",
  "RO", "RR", "RS", "SC", "SE", "SP", "TO",
]

const REGIME_OPTIONS = [
  { value: "simples_nacional", label: "Simples Nacional" },
  { value: "lucro_presumido", label: "Lucro Presumido" },
  { value: "lucro_real", label: "Lucro Real" },
  { value: "mei", label: "MEI" },
]

const PROVIDER_OPTIONS = [
  { value: "nuvem_fiscal", label: "Nuvem Fiscal" },
  { value: "focus_nfe", label: "Focus NFe" },
]

function formatCpfCnpj(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14)
  // CPF: 000.000.000-00
  if (digits.length <= 11) {
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
  }
  // CNPJ: 00.000.000/0000-00
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}

function formatCep(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

interface FormData {
  cnpj: string
  inscricaoMunicipal: string
  codigoServico: string
  descricaoServico: string
  aliquotaISS: string
  regimeTributario: string
  provider: string
  apiKey: string
  clinicCity: string
  clinicState: string
  clinicCep: string
}

const defaultForm: FormData = {
  cnpj: "",
  inscricaoMunicipal: "",
  codigoServico: "",
  descricaoServico: "",
  aliquotaISS: "",
  regimeTributario: "simples_nacional",
  provider: "nuvem_fiscal",
  apiKey: "",
  clinicCity: "",
  clinicState: "",
  clinicCep: "",
}

export function FiscalTab() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [form, setForm] = useState<FormData>(defaultForm)
  const [isConfigured, setIsConfigured] = useState(false)

  const loadConfig = useCallback(async () => {
    try {
      const config = await getNfseConfig()
      if (config) {
        setForm({
          cnpj: formatCpfCnpj(config.cnpj),
          inscricaoMunicipal: config.inscricaoMunicipal,
          codigoServico: config.codigoServico,
          descricaoServico: config.descricaoServico,
          aliquotaISS: (config.aliquotaISS * 100).toFixed(2).replace(/\.?0+$/, ''), // Convert decimal to %
          regimeTributario: config.regimeTributario,
          provider: config.provider,
          apiKey: config.apiKey,
          clinicCity: config.clinicCity,
          clinicState: config.clinicState,
          clinicCep: formatCep(config.clinicCep),
        })
        setIsConfigured(true)
      }
    } catch {
      toast.error("Erro ao carregar configuracao fiscal")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  const updateField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const aliquotaPercent = parseFloat(form.aliquotaISS)
      if (isNaN(aliquotaPercent) || aliquotaPercent < 0 || aliquotaPercent > 100) {
        toast.error("Aliquota ISS invalida (0-100%)")
        return
      }

      await saveNfseConfig({
        cnpj: form.cnpj,
        inscricaoMunicipal: form.inscricaoMunicipal,
        codigoServico: form.codigoServico,
        descricaoServico: form.descricaoServico,
        aliquotaISS: aliquotaPercent / 100, // Convert % to decimal
        regimeTributario: form.regimeTributario,
        provider: form.provider,
        apiKey: form.apiKey,
        clinicCity: form.clinicCity,
        clinicState: form.clinicState,
        clinicCep: form.clinicCep,
      })

      setIsConfigured(true)
      toast.success("Configuracao fiscal salva com sucesso!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar configuracao")
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      const result = await testNfseConnection()
      toast.success(result.message)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao testar conexao")
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="size-5 text-vox-primary" />
        <div>
          <h3 className="text-base font-medium">Nota Fiscal de Servico Eletronica (NFS-e)</h3>
          <p className="text-sm text-muted-foreground">
            Configure a emissao automatica de NFS-e para suas consultas
          </p>
        </div>
        {isConfigured && (
          <Badge variant="outline" className="ml-auto border-emerald-300 bg-emerald-50 text-emerald-700">
            <CheckCircle className="mr-1 size-3" />
            Configurado
          </Badge>
        )}
      </div>

      {/* Dados da Empresa */}
      <Card className="rounded-2xl border-border/40">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-medium">Dados da Empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs">CPF / CNPJ</Label>
              <Input
                value={form.cnpj}
                onChange={(e) => updateField("cnpj", formatCpfCnpj(e.target.value))}
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                maxLength={18}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Inscricao Municipal</Label>
              <Input
                value={form.inscricaoMunicipal}
                onChange={(e) => updateField("inscricaoMunicipal", e.target.value)}
                placeholder="Ex: 12345678"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Regime Tributario</Label>
            <Select value={form.regimeTributario || undefined} onValueChange={(v) => { if (v) updateField("regimeTributario", v) }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o regime" />
              </SelectTrigger>
              <SelectContent>
                {REGIME_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Dados do Servico */}
      <Card className="rounded-2xl border-border/40">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-medium">Dados do Servico</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs">Codigo de Servico (LC 116)</Label>
              <Input
                value={form.codigoServico}
                onChange={(e) => updateField("codigoServico", e.target.value)}
                placeholder="Ex: 4.17"
              />
              <p className="text-xs text-muted-foreground">
                Codigos comuns: 4.17 (Recrutamento), 4.01 (Medicina), 4.02 (Odontologia), 4.03 (Psicologia)
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Aliquota ISS (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.aliquotaISS}
                onChange={(e) => updateField("aliquotaISS", e.target.value)}
                placeholder="Ex: 5"
              />
              <p className="text-xs text-muted-foreground">
                Geralmente entre 2% e 5%
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Descricao Padrao do Servico</Label>
            <Input
              value={form.descricaoServico}
              onChange={(e) => updateField("descricaoServico", e.target.value)}
              placeholder="Ex: Consulta odontologica"
            />
          </div>
        </CardContent>
      </Card>

      {/* Endereco */}
      <Card className="rounded-2xl border-border/40">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-medium">Endereco do Prestador</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-xs">Cidade</Label>
              <Input
                value={form.clinicCity}
                onChange={(e) => updateField("clinicCity", e.target.value)}
                placeholder="Ex: Sao Paulo"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Estado</Label>
              <Select value={form.clinicState || undefined} onValueChange={(v) => { if (v) updateField("clinicState", v) }}>
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
            <div className="space-y-2">
              <Label className="text-xs">CEP</Label>
              <Input
                value={form.clinicCep}
                onChange={(e) => updateField("clinicCep", formatCep(e.target.value))}
                placeholder="XXXXX-XXX"
                maxLength={9}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Provedor e API */}
      <Card className="rounded-2xl border-border/40">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-medium">Provedor NFS-e</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Provedor</Label>
            <Select value={form.provider || undefined} onValueChange={(v) => { if (v) updateField("provider", v) }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o provedor" />
              </SelectTrigger>
              <SelectContent>
                {PROVIDER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">API Key</Label>
            <Input
              type="password"
              value={form.apiKey}
              onChange={(e) => updateField("apiKey", e.target.value)}
              placeholder="Sua chave de API do provedor"
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
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
        <Button
          variant="outline"
          onClick={handleTest}
          disabled={testing || !isConfigured}
        >
          {testing ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Wifi className="mr-2 size-4" />
          )}
          Testar Conexao
        </Button>
      </div>

      {!isConfigured && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Configuracao necessaria</p>
            <p className="mt-1 text-amber-700">
              Preencha todos os campos acima e salve para habilitar a emissao de NFS-e.
              Voce precisara de uma conta em um dos provedores de emissao (Nuvem Fiscal ou Focus NFe).
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
