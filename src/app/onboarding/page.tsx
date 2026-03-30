"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import {
  Check,
  Loader2,
  Stethoscope,
  Building2,
  CheckCircle2,
  Phone,
  Clock,
  Timer,
  AlertCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { professions, professionConfigs } from "./professions"
import { generateWorkspace } from "@/server/actions/workspace"
import { friendlyError } from "@/lib/error-messages"

const STEP_META = [
  { label: "Profissão", icon: Stethoscope },
  { label: "Clínica", icon: Building2 },
  { label: "Pronto!", icon: CheckCircle2 },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [selectedProfession, setSelectedProfession] = useState<keyof typeof professionConfigs | null>(null)
  const [clinicName, setClinicName] = useState("")
  const [clinicPhone, setClinicPhone] = useState("")
  const [startHour, setStartHour] = useState("8")
  const [endHour, setEndHour] = useState("18")
  const [appointmentDuration, setAppointmentDuration] = useState("30")
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const selectedProfessionData = professions.find((p) => p.id === selectedProfession)

  async function handleConfirmAndSave() {
    if (!selectedProfession) return
    const config = professionConfigs[selectedProfession]
    if (!config) return

    setIsSaving(true)
    setSaveError(null)
    try {
      await generateWorkspace(selectedProfession, clinicName, {
        procedures: config.procedures,
        customFields: config.customFields,
        anamnesisTemplate: config.anamnesisTemplate,
        categories: config.categories,
      })
      setStep(3)
    } catch (err) {
      setSaveError(friendlyError(err, "Erro ao salvar. Tente novamente."))
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 border-b border-border/40 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-vox-primary">VoxClinic</span>
            {step <= 2 && (
              <span className="text-sm text-muted-foreground">
                Passo {step} de 2
              </span>
            )}
          </div>
          {step <= 2 && (
            <div className="mt-3 flex items-center gap-2">
              {STEP_META.slice(0, 2).map((meta, i) => {
                const stepNum = i + 1
                const Icon = meta.icon
                const isActive = step === stepNum
                const isComplete = step > stepNum
                return (
                  <div key={stepNum} className="flex flex-1 flex-col items-center gap-1">
                    <motion.div
                      className={`h-1.5 w-full rounded-full transition-colors ${
                        isComplete || isActive ? "bg-vox-primary" : "bg-muted"
                      }`}
                      initial={false}
                      animate={{ opacity: isComplete || isActive ? 1 : 0.5 }}
                      transition={{ duration: 0.3 }}
                    />
                    <div className="flex items-center gap-1">
                      <Icon
                        className={`size-3 ${
                          isActive ? "text-vox-primary" : isComplete ? "text-vox-primary/70" : "text-muted-foreground/50"
                        }`}
                      />
                      <span
                        className={`hidden text-xs sm:inline ${
                          isActive ? "font-medium text-vox-primary" : isComplete ? "text-vox-primary/70" : "text-muted-foreground/50"
                        }`}
                      >
                        {meta.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {step === 1 && (
              <div>
                <div className="mb-8">
                  <div className="mb-2 flex items-center gap-2">
                    <Stethoscope className="size-6 text-vox-primary" />
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                      Qual é sua profissão?
                    </h1>
                  </div>
                  <p className="text-muted-foreground">
                    Selecione sua área de atuação para configurarmos seu workspace.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {professions.map((prof) => {
                    const Icon = prof.icon
                    const isSelected = selectedProfession === prof.id
                    return (
                      <motion.div key={prof.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Card
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedProfession(prof.id as keyof typeof professionConfigs)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              setSelectedProfession(prof.id as keyof typeof professionConfigs)
                            }
                          }}
                          className={`relative flex cursor-pointer flex-col items-center gap-3 rounded-2xl p-8 transition-all hover:shadow-md ${
                            isSelected
                              ? "border-2 border-vox-primary bg-vox-primary/10 shadow-md"
                              : "border border-border/40 bg-card hover:border-vox-primary/30"
                          }`}
                        >
                          <div
                            className={`flex size-16 items-center justify-center rounded-xl transition-colors ${
                              isSelected ? "bg-vox-primary/20" : "bg-muted"
                            }`}
                          >
                            <Icon className={`size-8 ${isSelected ? "text-vox-primary" : "text-muted-foreground"}`} />
                          </div>
                          <span className={`text-base font-medium ${isSelected ? "text-vox-primary" : "text-foreground"}`}>
                            {prof.name}
                          </span>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-vox-primary"
                            >
                              <Check className="size-3.5 text-white" />
                            </motion.div>
                          )}
                        </Card>
                      </motion.div>
                    )
                  })}
                </div>

                <div className="mt-8">
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!selectedProfession}
                    className="w-full rounded-xl bg-vox-primary text-white hover:bg-vox-primary/90"
                    size="lg"
                  >
                    Continuar
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="mb-8">
                  <div className="mb-2 flex items-center gap-2">
                    <Building2 className="size-6 text-vox-primary" />
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                      Dados da sua clínica
                    </h1>
                  </div>
                  <p className="text-muted-foreground">
                    Informe os dados básicos do seu consultório.
                  </p>
                </div>

                <div className="space-y-5">
                  <div>
                    <Label htmlFor="clinicName" className="mb-2 block text-sm font-medium">
                      Nome da clínica / consultório *
                    </Label>
                    <Input
                      id="clinicName"
                      value={clinicName}
                      onChange={(e) => setClinicName(e.target.value)}
                      placeholder="Ex: Clínica Sorriso"
                      className="h-10 rounded-xl"
                      autoFocus
                    />
                  </div>

                  <div>
                    <Label htmlFor="clinicPhone" className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                      <Phone className="size-3.5 text-muted-foreground" />
                      Telefone (opcional)
                    </Label>
                    <Input
                      id="clinicPhone"
                      value={clinicPhone}
                      onChange={(e) => setClinicPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="h-10 rounded-xl"
                    />
                  </div>

                  <div>
                    <Label className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                      <Clock className="size-3.5 text-muted-foreground" />
                      Horário de funcionamento
                    </Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="mb-1 block text-xs text-muted-foreground">Início</span>
                        <Select value={startHour} onValueChange={(v) => v && setStartHour(v)}>
                          <SelectTrigger className="h-10 w-full rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[6, 7, 8, 9, 10, 11, 12, 13, 14].map((h) => (
                              <SelectItem key={h} value={String(h)}>
                                {`${String(h).padStart(2, "0")}:00`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <span className="mb-1 block text-xs text-muted-foreground">Término</span>
                        <Select value={endHour} onValueChange={(v) => v && setEndHour(v)}>
                          <SelectTrigger className="h-10 w-full rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[14, 15, 16, 17, 18, 19, 20, 21, 22].map((h) => (
                              <SelectItem key={h} value={String(h)}>
                                {`${String(h).padStart(2, "0")}:00`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                      <Timer className="size-3.5 text-muted-foreground" />
                      Duração padrão da consulta
                    </Label>
                    <Select value={appointmentDuration} onValueChange={(v) => v && setAppointmentDuration(v)}>
                      <SelectTrigger className="h-10 w-full rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutos</SelectItem>
                        <SelectItem value="20">20 minutos</SelectItem>
                        <SelectItem value="30">30 minutos</SelectItem>
                        <SelectItem value="45">45 minutos</SelectItem>
                        <SelectItem value="60">60 minutos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {saveError && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    <AlertCircle className="size-4 shrink-0" />
                    {saveError}
                  </div>
                )}

                <div className="mt-8 flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)} className="rounded-xl" size="lg">
                    Voltar
                  </Button>
                  <Button
                    onClick={handleConfirmAndSave}
                    disabled={!clinicName.trim() || isSaving}
                    className="flex-1 rounded-xl bg-vox-primary text-white hover:bg-vox-primary/90"
                    size="lg"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      "Criar meu workspace"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="flex flex-col items-center py-12 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                  className="mb-6 flex size-20 items-center justify-center rounded-full bg-vox-primary/10"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.3 }}
                  >
                    <CheckCircle2 className="size-10 text-vox-primary" />
                  </motion.div>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mb-2 text-2xl font-bold tracking-tight text-foreground"
                >
                  Tudo pronto!
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mb-8 text-muted-foreground"
                >
                  Seu workspace foi configurado com sucesso.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="mb-8 grid w-full max-w-md grid-cols-2 gap-3"
                >
                  <Card className="rounded-2xl border-border/40 bg-card p-4">
                    <div className="text-xs text-muted-foreground">Profissão</div>
                    <div className="text-sm font-medium text-foreground">
                      {selectedProfessionData?.name ?? "---"}
                    </div>
                  </Card>
                  <Card className="rounded-2xl border-border/40 bg-card p-4">
                    <div className="text-xs text-muted-foreground">Clínica</div>
                    <div className="truncate text-sm font-medium text-foreground">
                      {clinicName || "---"}
                    </div>
                  </Card>
                  <Card className="rounded-2xl border-border/40 bg-card p-4">
                    <div className="text-xs text-muted-foreground">Procedimentos</div>
                    <div className="text-sm font-medium text-foreground">
                      {selectedProfession ? professionConfigs[selectedProfession]?.procedures.length ?? 0 : 0} cadastrados
                    </div>
                  </Card>
                  <Card className="rounded-2xl border-border/40 bg-card p-4">
                    <div className="text-xs text-muted-foreground">Consultas</div>
                    <div className="text-sm font-medium text-foreground">
                      {appointmentDuration} min cada
                    </div>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="w-full max-w-md"
                >
                  <Button
                    onClick={() => router.push("/dashboard")}
                    className="w-full rounded-xl bg-vox-primary text-white hover:bg-vox-primary/90"
                    size="lg"
                  >
                    Ir para o painel
                  </Button>
                </motion.div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
