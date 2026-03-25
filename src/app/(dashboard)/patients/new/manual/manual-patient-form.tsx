"use client"

import { useActionState, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createPatient } from "@/server/actions/patient"
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

async function submitForm(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  try {
    await createPatient(formData)
    return undefined
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao cadastrar paciente" }
  }
}

export function ManualPatientForm({
  customFields,
}: {
  customFields: CustomField[]
}) {
  const [state, formAction, isPending] = useActionState(submitForm, undefined)

  const [cpf, setCPF] = useState("")
  const [cpfError, setCPFError] = useState("")
  const [phone, setPhone] = useState("+55 ")
  const [customData, setCustomData] = useState<Record<string, unknown>>({})
  const [birthDateDisplay, setBirthDateDisplay] = useState("")

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

  const handleBirthDateChange = (value: string) => {
    // Mask DD/MM/AAAA
    const digits = value.replace(/\D/g, "").slice(0, 8)
    let display = digits
    if (digits.length > 2) display = `${digits.slice(0, 2)}/${digits.slice(2)}`
    if (digits.length > 4)
      display = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
    setBirthDateDisplay(display)
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
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="+55 (11) 99999-9999"
              />
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
              <input type="hidden" name="birthDate" value={birthDateISO} />
            </div>
          </div>
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
                      className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
          disabled={isPending || !!cpfError}
          className="bg-vox-primary text-white hover:bg-vox-primary/90"
        >
          {isPending ? "Salvando..." : "Cadastrar Paciente"}
        </Button>
      </div>
    </form>
  )
}
