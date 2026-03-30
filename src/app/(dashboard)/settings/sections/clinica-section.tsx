"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Building2, Stethoscope, Upload } from "lucide-react"
import Link from "next/link"

interface ClinicaSectionProps {
  clinicName: string
  onClinicNameChange: (value: string) => void
  profLabel: string
}

export function ClinicaSection({ clinicName, onClinicNameChange, profLabel }: ClinicaSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="size-4 text-vox-primary" />
          Dados da Clínica
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Nome da Clínica
            </Label>
            <Input
              value={clinicName}
              onChange={(e) => onClinicNameChange(e.target.value)}
              placeholder="Ex: Clínica Sorriso"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Profissao
            </Label>
            <div className="flex h-10 items-center gap-2.5 rounded-xl border bg-muted/40 px-3">
              <Stethoscope className="size-4 text-muted-foreground" />
              <span className="text-sm">{profLabel}</span>
              <Badge variant="secondary" className="ml-auto text-[10px] whitespace-nowrap">
                Via onboarding
              </Badge>
            </div>
          </div>
        </div>

        <Separator className="my-2" />

        <div className="rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-vox-primary/10">
                <Upload className="size-4 text-vox-primary" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Migrar Dados</p>
                <p className="text-xs text-muted-foreground">
                  Importe pacientes de CSV, Excel ou outro sistema
                </p>
              </div>
            </div>
            <Link href="/settings/migration">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
              >
                <Upload className="size-3.5" />
                Migrar
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
