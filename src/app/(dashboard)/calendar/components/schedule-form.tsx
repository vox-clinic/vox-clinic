"use client"

import { useState, useEffect, memo } from "react"
import { X, Search, Loader2, Repeat, Video, Building2, CalendarDays, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { searchPatients } from "@/server/actions/patient"
import type { AgendaItem, PatientOption } from "../types"

// ─── Time slots grouped by period ───

const TIME_PERIODS = [
  {
    label: "Manhã",
    slots: ["07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30"],
  },
  {
    label: "Tarde",
    slots: ["12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"],
  },
  {
    label: "Noite",
    slots: ["18:00", "18:30", "19:00", "19:30", "20:00"],
  },
]

function getDateShortcuts() {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const format = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

  const dayName = (d: Date) =>
    d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")

  // Next 5 weekdays
  const days: { label: string; value: string; isToday?: boolean }[] = []
  const cursor = new Date(today)
  for (let i = 0; i < 7 && days.length < 5; i++) {
    const d = new Date(cursor)
    d.setDate(cursor.getDate() + i)
    const dow = d.getDay()
    if (dow === 0) continue // skip Sunday
    days.push({
      label: i === 0 ? "Hoje" : i === 1 ? "Amanhã" : `${dayName(d)} ${d.getDate()}`,
      value: format(d),
      isToday: i === 0,
    })
  }
  return days
}

// ─── Component ───

function ScheduleFormInner({
  agendas,
  defaultAgendaId,
  defaultDate,
  defaultTime,
  onSchedule,
  onCancel,
}: {
  agendas: AgendaItem[]
  defaultAgendaId: string
  defaultDate?: string
  defaultTime?: string
  onSchedule: (data: {
    patientId: string
    date: string
    agendaId: string
    notes?: string
    procedures?: string[]
    type?: "presencial" | "teleconsulta"
    price?: number
    recurringEnabled: boolean
    recurrence: "weekly" | "biweekly"
    occurrences: number
  }) => void
  onCancel: () => void
}) {
  const [patientQuery, setPatientQuery] = useState("")
  const [patientResults, setPatientResults] = useState<PatientOption[]>([])
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null)
  const [searchingPatients, setSearchingPatients] = useState(false)
  const [scheduleDate, setScheduleDate] = useState(defaultDate || "")
  const [scheduleTime, setScheduleTime] = useState(defaultTime || "")
  const [scheduleNotes, setScheduleNotes] = useState("")
  const [scheduleAgendaId, setScheduleAgendaId] = useState(defaultAgendaId)
  const [appointmentType, setAppointmentType] = useState<"presencial" | "teleconsulta">("presencial")
  const [recurringEnabled, setRecurringEnabled] = useState(false)
  const [recurrence, setRecurrence] = useState<"weekly" | "biweekly">("weekly")
  const [occurrences, setOccurrences] = useState(4)
  const [price, setPrice] = useState("")

  const dateShortcuts = getDateShortcuts()

  // Patient search with debounce
  useEffect(() => {
    if (!patientQuery.trim() || patientQuery.length < 2) { setPatientResults([]); return }
    const timeout = setTimeout(async () => {
      setSearchingPatients(true)
      try { setPatientResults(await searchPatients(patientQuery)) } catch { setPatientResults([]) }
      finally { setSearchingPatients(false) }
    }, 300)
    return () => clearTimeout(timeout)
  }, [patientQuery])

  function handleSubmit() {
    if (!selectedPatient || !scheduleDate || !scheduleTime) return
    const dateTime = `${scheduleDate}T${scheduleTime}:00`
    const priceReais = price ? parseFloat(price.replace(",", ".")) : undefined
    const priceCentavos = priceReais && !isNaN(priceReais) && priceReais > 0 ? Math.round(priceReais * 100) : undefined
    onSchedule({
      patientId: selectedPatient.id,
      date: new Date(dateTime).toISOString(),
      agendaId: scheduleAgendaId,
      notes: scheduleNotes || undefined,
      type: appointmentType,
      price: priceCentavos,
      recurringEnabled,
      recurrence,
      occurrences,
    })
  }

  const canSubmit = !!selectedPatient && !!scheduleDate && !!scheduleTime

  // Step indicators
  const step1Done = !!selectedPatient
  const step2Done = !!scheduleDate && !!scheduleTime

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel() }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" showCloseButton>
        <DialogHeader>
          <DialogTitle>Agendar Nova Consulta</DialogTitle>
          <DialogDescription>Preencha os dados para agendar</DialogDescription>
        </DialogHeader>

      <div className="space-y-5">
        {/* ─── Step 1: Patient ─── */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className={`flex size-5 items-center justify-center rounded-full text-[10px] font-bold ${step1Done ? "bg-vox-primary text-white" : "bg-muted text-muted-foreground"}`}>1</div>
            <Label className="text-xs font-semibold">Paciente <span className="text-vox-primary">*</span></Label>
          </div>
          {selectedPatient ? (
            <div className="flex items-center gap-3 rounded-xl bg-vox-primary/5 border border-vox-primary/20 px-3 py-2.5">
              <div className="flex size-8 items-center justify-center rounded-full bg-vox-primary/10 text-[11px] font-bold text-vox-primary shrink-0">
                {selectedPatient.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium block truncate">{selectedPatient.name}</span>
                {selectedPatient.phone && <span className="text-[11px] text-muted-foreground">{selectedPatient.phone}</span>}
              </div>
              <button onClick={() => { setSelectedPatient(null); setPatientQuery("") }} className="p-1 rounded-lg hover:bg-muted/60 transition-colors" aria-label="Remover paciente">
                <X className="size-3.5 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input placeholder="Buscar paciente por nome..." aria-label="Buscar paciente por nome" value={patientQuery} onChange={(e) => setPatientQuery(e.target.value)} className="pl-9 rounded-xl text-sm" autoFocus />
              {(patientResults.length > 0 || searchingPatients) && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border/60 rounded-xl shadow-lg z-10 overflow-hidden max-h-[200px] overflow-y-auto">
                  {searchingPatients ? (
                    <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin" />Buscando...</div>
                  ) : (
                    patientResults.map((p) => (
                      <button key={p.id} onClick={() => { setSelectedPatient(p); setPatientQuery(""); setPatientResults([]) }}
                        className="w-full flex items-center gap-3 text-left px-3 py-2.5 hover:bg-accent transition-colors border-b border-border/20 last:border-0 cursor-pointer">
                        <div className="flex size-7 items-center justify-center rounded-full bg-vox-primary/10 text-[10px] font-bold text-vox-primary shrink-0">{p.name.charAt(0)}</div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{p.name}</div>
                          {p.phone && <div className="text-[11px] text-muted-foreground">{p.phone}</div>}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Step 2: Date & Time ─── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className={`flex size-5 items-center justify-center rounded-full text-[10px] font-bold ${step2Done ? "bg-vox-primary text-white" : "bg-muted text-muted-foreground"}`}>2</div>
            <Label className="text-xs font-semibold">Data e Horário <span className="text-vox-primary">*</span></Label>
          </div>

          {/* Date: shortcuts + input */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {dateShortcuts.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setScheduleDate(d.value)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                    scheduleDate === d.value
                      ? "bg-vox-primary text-white shadow-sm"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {d.label}
                </button>
              ))}
              <div className="relative ml-auto">
                <CalendarDays className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground pointer-events-none" />
                <Input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="h-7 rounded-lg text-[11px] pl-7 w-[140px]"
                />
              </div>
            </div>
          </div>

          {/* Time: grouped by period */}
          <div className="space-y-2">
            {TIME_PERIODS.map((period) => (
              <div key={period.label}>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Clock className="size-2.5" />
                  {period.label}
                </p>
                <div className="flex flex-wrap gap-1">
                  {period.slots.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setScheduleTime(val)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-medium tabular-nums transition-all ${
                        scheduleTime === val
                          ? "bg-vox-primary text-white shadow-sm"
                          : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Step 3: Details (collapsible feel) ─── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">3</div>
            <Label className="text-xs font-semibold">Detalhes</Label>
            <span className="text-[10px] text-muted-foreground">(opcional)</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* Agenda selector */}
            {agendas.length > 1 && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-[11px] text-muted-foreground">Agenda</Label>
                <div className="flex flex-wrap gap-1.5">
                  {agendas.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setScheduleAgendaId(a.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                        scheduleAgendaId === a.id
                          ? "border-border/60 bg-background shadow-sm text-foreground"
                          : "border-transparent bg-muted/40 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                      {a.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Type: Presencial / Teleconsulta */}
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Tipo</Label>
              <div className="flex rounded-xl bg-muted/50 p-0.5 w-fit">
                <button
                  type="button"
                  onClick={() => setAppointmentType("presencial")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    appointmentType === "presencial"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Building2 className="size-3" />
                  Presencial
                </button>
                <button
                  type="button"
                  onClick={() => setAppointmentType("teleconsulta")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    appointmentType === "teleconsulta"
                      ? "bg-vox-primary/10 shadow-sm text-vox-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Video className="size-3" />
                  Teleconsulta
                </button>
              </div>
            </div>

            {/* Price */}
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Valor (R$)</Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^\d,]/g, ""))}
                className="h-8 rounded-lg text-sm"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-[11px] text-muted-foreground">Observações</Label>
              <Textarea value={scheduleNotes} onChange={(e) => setScheduleNotes(e.target.value)} placeholder="Notas sobre a consulta..." className="rounded-xl text-sm min-h-[60px] resize-none" />
            </div>
          </div>

          {/* Recurring section */}
          <div className="pt-2 border-t border-border/30">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={recurringEnabled}
                onChange={(e) => setRecurringEnabled(e.target.checked)}
                className="rounded border-border accent-vox-primary size-3.5"
              />
              <span className="text-[11px] font-medium flex items-center gap-1.5">
                <Repeat className="size-3 text-muted-foreground" />
                Agendar recorrente
              </span>
            </label>
            {recurringEnabled && (
              <div className="grid gap-3 sm:grid-cols-2 mt-3 pl-5">
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Repetir</Label>
                  <div className="flex rounded-lg bg-muted/50 p-0.5 w-fit">
                    <button type="button" onClick={() => setRecurrence("weekly")}
                      className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${recurrence === "weekly" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>
                      Semanal
                    </button>
                    <button type="button" onClick={() => setRecurrence("biweekly")}
                      className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${recurrence === "biweekly" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>
                      Quinzenal
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Quantidade</Label>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setOccurrences((o) => Math.max(2, o - 1))}
                      className="flex size-7 items-center justify-center rounded-lg bg-muted/50 text-sm font-medium hover:bg-muted transition-colors">−</button>
                    <span className="text-sm font-semibold tabular-nums w-6 text-center">{occurrences}</span>
                    <button type="button" onClick={() => setOccurrences((o) => Math.min(52, o + 1))}
                      className="flex size-7 items-center justify-center rounded-lg bg-muted/50 text-sm font-medium hover:bg-muted transition-colors">+</button>
                    <span className="text-[11px] text-muted-foreground">consultas</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border/30">
        <div className="text-[11px] text-muted-foreground">
          {!selectedPatient && "Selecione um paciente"}
          {selectedPatient && !scheduleDate && "Escolha uma data"}
          {selectedPatient && scheduleDate && !scheduleTime && "Escolha um horário"}
          {canSubmit && (
            <span className="text-vox-primary font-medium">
              Pronto para agendar
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} className="rounded-xl text-xs h-8">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}
            className="bg-vox-primary hover:bg-vox-primary/90 text-white rounded-xl text-xs h-8 shadow-sm shadow-vox-primary/20">
            {recurringEnabled ? `Agendar ${occurrences}x` : "Agendar"}
          </Button>
        </div>
      </div>
      </DialogContent>
    </Dialog>
  )
}

export const ScheduleForm = memo(ScheduleFormInner)
