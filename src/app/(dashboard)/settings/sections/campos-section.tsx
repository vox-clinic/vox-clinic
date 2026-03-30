"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { FormInput, X } from "lucide-react"
import type { CustomField } from "@/types"

interface CamposSectionProps {
  customFields: CustomField[]
  onCustomFieldsChange: (fields: CustomField[]) => void
}

export function CamposSection({ customFields, onCustomFieldsChange }: CamposSectionProps) {
  function removeField(id: string) {
    onCustomFieldsChange(customFields.filter((f) => f.id !== id))
  }

  function toggleFieldRequired(id: string) {
    onCustomFieldsChange(
      customFields.map((f) => (f.id === id ? { ...f, required: !f.required } : f))
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FormInput className="size-4 text-vox-primary" />
            Campos Customizados
          </CardTitle>
          <Badge variant="secondary" className="tabular-nums">
            {customFields.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {customFields.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <FormInput className="size-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              Nenhum campo customizado configurado
            </p>
            <p className="text-xs text-muted-foreground/70">
              Campos sao criados automaticamente durante o onboarding pela IA
            </p>
          </div>
        )}
        {customFields.map((field) => (
          <div
            key={field.id}
            className="group flex items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-3 transition-all duration-200 hover:border-border hover:shadow-[0_1px_3px_0_rgb(0_0_0/0.04)]"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
              <FormInput className="size-3.5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium truncate block">{field.name}</span>
            </div>
            <Badge variant="outline" className="text-[10px] shrink-0 font-mono">
              {field.type}
            </Badge>
            <div className="flex items-center gap-2 shrink-0">
              <Switch
                checked={field.required}
                onCheckedChange={() => toggleFieldRequired(field.id)}
              />
              <span className="text-[10px] text-muted-foreground w-16">
                {field.required ? "Obrigatório" : "Opcional"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => removeField(field.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-vox-error shrink-0"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
