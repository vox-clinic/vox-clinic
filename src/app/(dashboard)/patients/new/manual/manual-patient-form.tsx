"use client"

import { useActionState, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { createPatient } from "@/server/actions/patient"
import { formatCep, fetchAddressByCep } from "@/lib/viacep"
import type { CustomField } from "@/types"

function validarCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, "")
  if (cleaned.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cleaned)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * (10 - i)
  }
  let remainder = (sum * 10) % 11
  if (remainder === 10) remainder = 0
  if (remainder !== parseInt(cleaned[9])) return false

  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned[i]) * (11 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10) remainder = 0
  if (remainder !== parseInt(cleaned[10])) return false

  return true
}

function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 13)
  if (digits.length <= 2) return digits.length ? `+${digits}` : ""
  if (digits.length <= 4) return `+${digits.slice(0, 2)} (${digits.slice(2)}`
  if (digits.length <= 9)
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4)}`
  return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`
}

type FormState = { error?: string } | undefined

export function ManualPatientForm({
  customFields,
}: {
  customFields: CustomField[]
}) {
  const router = useRouter()

  const [state, formAction, isPending] = useActionState(
    async (_prevState: FormState, formData: FormData): Promise<FormState> => {
      try {
        const result = await createPatient(formData)
        toast.success("Paciente cadastrado com sucesso!")
        router.push(`/patients/${result.patientId}`)
        return undefined
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Erro ao cadastrar paciente" }
      }
    },
    undefined
  )

  const [cpf, setCPF] = useState("")
  const [cpfError, setCPFError] = useState("")
  const [phone, setPhone] = useState("+55 ")
  const [phoneError, setPhoneError] = useState("")
  const [customData, setCustomData] = useState<Record<string, unknown>>({})
  const [birthDateDisplay, setBirthDateDisplay] = useState("")
  const [birthDateError, setBirthDateError] = useState("")
  const [address, setAddress] = useState({ street: "", number: "", complement: "", neighborhood: "", city: "", state: "", zipCode: "" })
  const [cepLoading, setCepLoading] = useState(false)

  useEffect(() => {
    const digits = address.zipCode.replace(/\D/g, "")
    if (digits.length === 8) {
      setCepLoading(true)
      fetchAddressByCep(digits).then((data) => {
        if (data) {
          setAddress(prev => ({
            ...prev,
            street: data.logradouro || prev.street,
            neighborhood: data.bairro || prev.neighborhood,
            city: data.localidade || prev.city,
            state: data.uf || prev.state,
          }))
        }
        setCepLoading(false)
      })
    }
  }, [address.zipCode])

  const handleCPFChange = (value: string) => {
    const formatted = formatCPF(value)
    setCPF(formatted)
    const cleaned = value.replace(/\D/g, "")
    if (cleaned.length === 11) {
      setCPFError(validarCPF(cleaned) ? "" : "CPF invalido")
    } else {
      setCPFError("")
    }
  }

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value)
    setPhone(formatted)
    const digits = value.replace(/\D/g, "")
    if (digits.length > 0 && digits.length < 10) {
      setPhoneError("Telefone deve ter pelo menos 10 digitos")
    } else {
      setPhoneError("")
    }
  }

  const handleBirthDateChange = (value: string) => {
    // Mask DD/MM/AAAA
    const digits = value.replace(/\D/g, "").slice(0, 8)
    let display = digits
    if (digits.length > 2) display = `${digits.slice(0, 2)}/${digits.slice(2)}`
    if (digits.length > 4)
      display = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
    setBirthDateDisplay(display)

    // Validate when full date is entered
    if (digits.length === 8) {
      const dd = parseInt(digits.slice(0, 2))
      const mm = parseInt(digits.slice(2, 4))
      const yyyy = parseInt(digits.slice(4, 8))
      const date = new Date(yyyy, mm - 1, dd)
      const today = new Date()
      const minDate = new Date()
      minDate.setFullYear(today.getFullYear() - 130)

      if (date > today) {
        setBirthDateError("Data de nascimento nao pode ser no futuro")
      } else if (date < minDate) {
        setBirthDateError("Data de nascimento deve estar nos ultimos 130 anos")
      } else if (date.getDate() !== dd || date.getMonth() !== mm - 1 || date.getFullYear() !== yyyy) {
        setBirthDateError("Data invalida")
      } else {
        setBirthDateError("")
      }
    } else {
      setBirthDateError("")
    }
  }

  // Convert DD/MM/YYYY to ISO for the server
  const birthDateISO = (() => {
    const parts = birthDateDisplay.split("/")
    if (parts.length !== 3 || parts[2].length !== 4) return ""
    const [dd, mm, yyyy] = parts
    return `${yyyy}-${mm}-${dd}`
  })()

  const handleCustomFieldChange = (fieldId: string, value: unknown) => {
    setCustomData((prev) => ({ ...prev, [fieldId]: value }))
  }

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="rounded-lg border border-vox-error/30 bg-vox-error/5 p-3 text-sm text-vox-error">
          {state.error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Dados Pessoais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="Nome completo"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="document">CPF</Label>
              <Input
                id="document"
                name="document"
                value={cpf}
                onChange={(e) => handleCPFChange(e.target.value)}
                placeholder="000.000.000-00"
                aria-invalid={!!cpfError}
              />
              {cpfError && (
                <p className="text-xs text-vox-error">{cpfError}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                name="phone"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="+55 (11) 99999-9999"
                aria-invalid={!!phoneError}
              />
              {phoneError && (
                <p className="text-xs text-vox-error">{phoneError}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="paciente@email.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="birthDate">Data de Nascimento</Label>
              <Input
                id="birthDateDisplay"
                value={birthDateDisplay}
                onChange={(e) => handleBirthDateChange(e.target.value)}
                placeholder="DD/MM/AAAA"
              />
              {birthDateError && (
                <p className="text-xs text-vox-error">{birthDateError}</p>
              )}
              <input type="hidden" name="birthDate" value={birthDateISO} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gender">Sexo</Label>
              <select
                id="gender"
                name="gender"
                className="h-10 w-full rounded-xl border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Nao informado</option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
                <option value="outro">Outro</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rg">RG</Label>
              <Input id="rg" name="rg" placeholder="00.000.000-0" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="insurance">Convenio</Label>
              <Input id="insurance" name="insurance" placeholder="Ex: Unimed, Amil..." />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="guardian">Responsavel</Label>
              <Input id="guardian" name="guardian" placeholder="Nome do responsavel (menores)" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="source">Origem</Label>
              <select
                id="source"
                name="source"
                className="h-10 w-full rounded-xl border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Nao informado</option>
                <option value="instagram">Instagram</option>
                <option value="google">Google</option>
                <option value="facebook">Facebook</option>
                <option value="indicacao">Indicacao</option>
                <option value="convenio">Convenio</option>
                <option value="site">Site</option>
                <option value="outro">Outro</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Endereco</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="zipCode" className="inline-flex items-center gap-2">
                CEP
                {cepLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
              </Label>
              <Input id="zipCode" value={address.zipCode} onChange={(e) => setAddress({ ...address, zipCode: formatCep(e.target.value) })} placeholder="00000-000" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="street">Rua</Label>
              <Input id="street" value={address.street} onChange={(e) => setAddress(a => ({ ...a, street: e.target.value }))} placeholder="Rua, Av, Travessa..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="number">Numero</Label>
              <Input id="number" value={address.number} onChange={(e) => setAddress(a => ({ ...a, number: e.target.value }))} placeholder="123" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="complement">Complemento</Label>
              <Input id="complement" value={address.complement} onChange={(e) => setAddress(a => ({ ...a, complement: e.target.value }))} placeholder="Apto, Sala..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="neighborhood">Bairro</Label>
              <Input id="neighborhood" value={address.neighborhood} onChange={(e) => setAddress(a => ({ ...a, neighborhood: e.target.value }))} placeholder="Bairro" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">Cidade</Label>
              <Input id="city" value={address.city} onChange={(e) => setAddress(a => ({ ...a, city: e.target.value }))} placeholder="Cidade" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state">Estado</Label>
              <select
                id="state"
                value={address.state}
                onChange={(e) => setAddress(a => ({ ...a, state: e.target.value }))}
                className="h-10 w-full rounded-xl border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Selecione...</option>
                {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map(uf => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
          </div>
          <input type="hidden" name="address" value={JSON.stringify(address)} />
        </CardContent>
      </Card>

      {customFields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Campos Adicionais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {customFields.map((field) => (
                <div key={field.id} className="space-y-1.5">
                  <Label htmlFor={`custom-${field.id}`}>
                    {field.name}
                    {field.required && " *"}
                  </Label>
                  {field.type === "text" && (
                    <Input
                      id={`custom-${field.id}`}
                      value={(customData[field.id] as string) ?? ""}
                      onChange={(e) =>
                        handleCustomFieldChange(field.id, e.target.value)
                      }
                      required={field.required}
                    />
                  )}
                  {field.type === "number" && (
                    <Input
                      id={`custom-${field.id}`}
                      type="number"
                      value={(customData[field.id] as string) ?? ""}
                      onChange={(e) =>
                        handleCustomFieldChange(field.id, e.target.value)
                      }
                      required={field.required}
                    />
                  )}
                  {field.type === "date" && (
                    <Input
                      id={`custom-${field.id}`}
                      type="date"
                      value={(customData[field.id] as string) ?? ""}
                      onChange={(e) =>
                        handleCustomFieldChange(field.id, e.target.value)
                      }
                      required={field.required}
                    />
                  )}
                  {field.type === "boolean" && (
                    <div className="flex items-center gap-2 pt-1">
                      <Switch
                        checked={!!customData[field.id]}
                        onCheckedChange={(checked: boolean) =>
                          handleCustomFieldChange(field.id, checked)
                        }
                      />
                      <span className="text-sm text-muted-foreground">
                        {customData[field.id] ? "Sim" : "Nao"}
                      </span>
                    </div>
                  )}
                  {field.type === "select" && field.options && (
                    <select
                      id={`custom-${field.id}`}
                      className="h-10 w-full rounded-xl border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      value={(customData[field.id] as string) ?? ""}
                      onChange={(e) =>
                        handleCustomFieldChange(field.id, e.target.value)
                      }
                      required={field.required}
                    >
                      <option value="">Selecione...</option>
                      {field.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <input type="hidden" name="customData" value={JSON.stringify(customData)} />

      <div className="flex justify-end gap-3">
        <Button variant="outline" type="button" onClick={() => history.back()}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isPending || !!cpfError || !!phoneError || !!birthDateError}
          className="bg-vox-primary text-white hover:bg-vox-primary/90"
        >
          {isPending ? "Salvando..." : "Cadastrar Paciente"}
        </Button>
      </div>
    </form>
  )
}
