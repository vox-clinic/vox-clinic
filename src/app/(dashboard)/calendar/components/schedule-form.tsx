"use client"

import { useState, useEffect, memo } from "react"
import { X, Search, Loader2, Repeat, Video, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { searchPatients } from "@/server/actions/patient"
import type { AgendaItem, PatientOption } from "../types"

function ScheduleFormInner({
  agendas,
  defaultAgendaId,
  defaultDate,
  onSchedule,
  onCancel,
}: {
  agendas: AgendaItem[]
  defaultAgendaId: string
  defaultDate?: string
  onSchedule: (data: {
    patientId: string
    date: string
    agendaId: string
    notes?: string
    procedures?: string[]
    type?: "presencial" | "teleconsulta"
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
  const [scheduleTime, setScheduleTime] = useState("")
  const [scheduleNotes, setScheduleNotes] = useState("")
  const [scheduleAgendaId, setScheduleAgendaId] = useState(defaultAgendaId)
  const [appointmentType, setAppointmentType] = useState<"presencial" | "teleconsulta">("presencial")
  const [recurringEnabled, setRecurringEnabled] = useState(false)
  const [recurrence, setRecurrence] = useState<"weekly" | "biweekly">("weekly")
  const [occurrences, setOccurrences] = useState(4)

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
    onSchedule({
      patientId: selectedPatient.id,
      date: new Date(dateTime).toISOString(),
      agendaId: scheduleAgendaId,
      notes: scheduleNotes || undefined,
      type: appointmentType,
      recurringEnabled,
      recurrence,
      occurrences,
    })
  }

  return (
    <Card className="rounded-2xl border border-border/40 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold">Agendar Nova Consulta</h2>
        <button onClick={onCancel} className="p-1 rounded-lg hover:bg-muted/60 text-muted-foreground">
          <X className="size-4" />
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label className="text-xs">Paciente</Label>
          {selectedPatient ? (
            <div className="flex items-center gap-2 rounded-xl bg-vox-primary/5 border border-vox-primary/20 px-3 py-2">
              <span className="text-sm font-medium">{selectedPatient.name}</span>
              <button onClick={() => { setSelectedPatient(null); setPatientQuery("") }} className="ml-auto p-0.5 rounded hover:bg-muted/60">
                <X className="size-3.5 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input placeholder="Buscar paciente por nome..." aria-label="Buscar paciente por nome" value={patientQuery} onChange={(e) => setPatientQuery(e.target.value)} className="pl-9 rounded-xl text-sm" />
              {(patientResults.length > 0 || searchingPatients) && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border/60 rounded-xl shadow-lg z-10 overflow-hidden">
                  {searchingPatients ? (
                    <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin" />Buscando...</div>
                  ) : (
                    patientResults.map((p) => (
                      <button key={p.id} onClick={() => { setSelectedPatient(p); setPatientQuery(""); setPatientResults([]) }}
                        className="w-full text-left px-3 py-2.5 hover:bg-muted/60 transition-colors border-b border-border/30 last:border-0">
                        <div className="text-sm font-medium">{p.name}</div>
                        {p.phone && <div className="text-[11px] text-muted-foreground">{p.phone}</div>}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        {agendas.length > 1 && (
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-xs">Agenda</Label>
            <select
              value={scheduleAgendaId}
              onChange={(e) => setScheduleAgendaId(e.target.value)}
              className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-vox-primary/30"
            >
              {agendas.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        )}
        {/* Tipo: Presencial / Teleconsulta */}
        <div className="space-y-2 sm:col-span-2">
          <Label className="text-xs">Tipo de Consulta</Label>
          <div className="flex rounded-xl bg-muted/50 p-0.5 w-fit">
            <button
              type="button"
              onClick={() => setAppointmentType("presencial")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                appointmentType === "presencial"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Building2 className="size-3.5" />
              Presencial
            </button>
            <button
              type="button"
              onClick={() => setAppointmentType("teleconsulta")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                appointmentType === "teleconsulta"
                  ? "bg-vox-primary/10 shadow-sm text-vox-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Video className="size-3.5" />
              Teleconsulta
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Data</Label>
          <Input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="rounded-xl text-sm" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Horario</Label>
          <div className="grid grid-cols-5 gap-1 max-h-[120px] overflow-y-auto rounded-xl border border-input p-2">
            {Array.from({ length: 27 }, (_, i) => {
              const h = Math.floor(i / 2) + 7
              const m = i % 2 === 0 ? "00" : "30"
              if (h > 20) return null
              const val = `${String(h).padStart(2, "0")}:${m}`
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => setScheduleTime(val)}
                  className={`py-1.5 rounded-lg text-xs font-medium transition-all ${
                    scheduleTime === val
                      ? "bg-vox-primary text-white shadow-sm"
                      : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {val}
                </button>
              )
            })}
          </div>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label className="text-xs">Observacoes (opcional)</Label>
          <Textarea value={scheduleNotes} onChange={(e) => setScheduleNotes(e.target.value)} placeholder="Notas sobre a consulta..." className="rounded-xl text-sm min-h-[80px]" />
        </div>

        {/* Recurring section */}
        <div className="space-y-3 sm:col-span-2 pt-2 border-t border-border/30">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={recurringEnabled}
              onChange={(e) => setRecurringEnabled(e.target.checked)}
              className="rounded border-border accent-vox-primary size-4"
            />
            <span className="text-xs font-medium flex items-center gap-1.5">
              <Repeat className="size-3.5 text-muted-foreground" />
              Agendar recorrente
            </span>
          </label>
          {recurringEnabled && (
            <div className="grid gap-3 sm:grid-cols-2 pl-6">
              <div className="space-y-1.5">
                <Label className="text-xs">Repetir</Label>
                <select
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value as "weekly" | "biweekly")}
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-vox-primary/30"
                >
                  <option value="weekly">Semanal</option>
                  <option value="biweekly">Quinzenal</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Quantidade (2-52)</Label>
                <Input
                  type="number"
                  min={2}
                  max={52}
                  value={occurrences}
                  onChange={(e) => setOccurrences(Math.min(52, Math.max(2, parseInt(e.target.value) || 2)))}
                  className="rounded-xl text-sm"
                />
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={onCancel} className="rounded-xl text-xs">Cancelar</Button>
        <Button onClick={handleSubmit} disabled={!selectedPatient || !scheduleDate || !scheduleTime}
          className="bg-vox-primary hover:bg-vox-primary/90 text-white rounded-xl text-xs">
          {recurringEnabled ? `Agendar ${occurrences}x` : "Agendar"}
        </Button>
      </div>
    </Card>
  )
}

export const ScheduleForm = memo(ScheduleFormInner)
