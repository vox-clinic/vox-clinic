"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"

// ────────────────────── Types ──────────────────────

interface ProcedureOption {
  id: string
  name: string
  category: string
  duration: number
  price?: number
}

interface AgendaOption {
  id: string
  name: string
  color: string
}

interface BookingConfig {
  clinicName: string
  professionType: string
  welcomeMessage: string | null
  maxDaysAhead: number
  startHour: number
  endHour: number
  procedures: ProcedureOption[]
  agendas: AgendaOption[]
}

interface SlotData {
  time: string
  available: boolean
}

type Step = "loading" | "not-found" | "select-procedure" | "select-datetime" | "patient-info" | "confirming" | "done" | "error"

// ────────────────────── Helpers ──────────────────────

const WEEKDAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"]
const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

function formatDateBR(date: Date): string {
  return `${date.getDate()} de ${MONTH_NAMES[date.getMonth()]} de ${date.getFullYear()}`
}

function generateDates(maxDays: number): Date[] {
  const dates: Date[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = 0; i < maxDays; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    // Skip Sundays
    if (d.getDay() !== 0) dates.push(d)
  }
  return dates
}

// ────────────────────── Main Component ──────────────────────

export default function BookingPage() {
  const { token } = useParams<{ token: string }>()
  const [step, setStep] = useState<Step>("loading")
  const [config, setConfig] = useState<BookingConfig | null>(null)
  const [errorMessage, setErrorMessage] = useState("")

  // Selections
  const [selectedProcedure, setSelectedProcedure] = useState<ProcedureOption | null>(null)
  const [selectedAgenda, setSelectedAgenda] = useState<AgendaOption | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [slots, setSlots] = useState<SlotData[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  // Patient info
  const [patientName, setPatientName] = useState("")
  const [patientPhone, setPatientPhone] = useState("")
  const [patientEmail, setPatientEmail] = useState("")

  // Result
  const [bookingResult, setBookingResult] = useState<{ date: string; procedure: string | null } | null>(null)

  // Load config
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/booking?token=${token}`)
        if (!res.ok) {
          setStep("not-found")
          return
        }
        const data = await res.json()
        setConfig(data)
        // Auto-select agenda if only one
        if (data.agendas.length === 1) {
          setSelectedAgenda(data.agendas[0])
        }
        setStep("select-procedure")
      } catch {
        setStep("not-found")
      }
    }
    load()
  }, [token])

  // Load slots when date changes
  const loadSlots = useCallback(async () => {
    if (!selectedDate || !selectedAgenda || !selectedProcedure) return
    setLoadingSlots(true)
    setSlots([])
    setSelectedTime(null)
    try {
      const dateStr = selectedDate.toISOString().slice(0, 10)
      const res = await fetch(
        `/api/booking/slots?token=${token}&date=${dateStr}&agendaId=${selectedAgenda.id}&duration=${selectedProcedure.duration}`
      )
      if (res.ok) {
        const data = await res.json()
        setSlots(data.slots)
      }
    } catch {
      setSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }, [selectedDate, selectedAgenda, selectedProcedure, token])

  useEffect(() => {
    loadSlots()
  }, [loadSlots])

  // Submit booking
  async function handleSubmit() {
    if (!selectedProcedure || !selectedAgenda || !selectedDate || !selectedTime) return
    if (patientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patientEmail.trim())) {
      setErrorMessage("Email invalido. Verifique e tente novamente.")
      setStep("error")
      return
    }
    setStep("confirming")
    try {
      const [hours, minutes] = selectedTime.split(":").map(Number)
      const dateTime = new Date(selectedDate)
      dateTime.setHours(hours, minutes, 0, 0)

      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          procedureId: selectedProcedure.id,
          agendaId: selectedAgenda.id,
          date: dateTime.toISOString(),
          patient: {
            name: patientName.trim(),
            phone: patientPhone.trim(),
            email: patientEmail.trim() || undefined,
          },
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setErrorMessage(data.error || "Erro ao agendar")
        setStep("error")
        return
      }

      const data = await res.json()
      setBookingResult({ date: data.date, procedure: data.procedure })
      setStep("done")
    } catch {
      setErrorMessage("Erro de conexao. Tente novamente.")
      setStep("error")
    }
  }

  // Format phone mask
  function handlePhoneChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 11)
    if (digits.length <= 2) setPatientPhone(digits)
    else if (digits.length <= 7) setPatientPhone(`(${digits.slice(0, 2)}) ${digits.slice(2)}`)
    else setPatientPhone(`(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`)
  }

  const availableDates = config ? generateDates(config.maxDaysAhead) : []
  const stepNumber = step === "select-procedure" ? 1 : step === "select-datetime" ? 2 : step === "patient-info" ? 3 : 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* ─── Loading ─── */}
        {step === "loading" && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="size-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-500 mt-3">Carregando...</p>
          </div>
        )}

        {/* ─── Not Found ─── */}
        {step === "not-found" && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-4xl mb-3">🔒</div>
            <h1 className="text-lg font-semibold text-slate-800">Agendamento nao disponivel</h1>
            <p className="text-sm text-slate-500 mt-2">Este link de agendamento esta inativo ou nao existe.</p>
          </div>
        )}

        {/* ─── Step Header ─── */}
        {config && stepNumber > 0 && (
          <div className="mb-4">
            <h1 className="text-lg font-semibold text-slate-800">{config.clinicName}</h1>
            {config.welcomeMessage && (
              <p className="text-sm text-slate-500 mt-0.5">{config.welcomeMessage}</p>
            )}
            <div className="flex items-center gap-2 mt-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex items-center gap-2">
                  <div className={`size-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    n <= stepNumber ? "bg-teal-500 text-white" : "bg-slate-200 text-slate-400"
                  }`}>
                    {n}
                  </div>
                  {n < 3 && <div className={`w-8 h-0.5 ${n < stepNumber ? "bg-teal-500" : "bg-slate-200"}`} />}
                </div>
              ))}
              <span className="text-xs text-slate-400 ml-2">
                {stepNumber === 1 ? "Procedimento" : stepNumber === 2 ? "Data e hora" : "Seus dados"}
              </span>
            </div>
          </div>
        )}

        {/* ─── Step 1: Select Procedure ─── */}
        {step === "select-procedure" && config && (
          <div className="bg-white rounded-2xl shadow-lg p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">Escolha o procedimento</h2>
            <div className="space-y-2">
              {config.procedures.map((proc) => (
                <button
                  key={proc.id}
                  onClick={() => {
                    setSelectedProcedure(proc)
                    setStep("select-datetime")
                  }}
                  className="w-full flex items-center justify-between rounded-xl border border-slate-200 p-3 text-left hover:border-teal-300 hover:bg-teal-50/50 transition-all"
                >
                  <div>
                    <div className="text-sm font-medium text-slate-800">{proc.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400">{proc.duration} min</span>
                      {proc.category && (
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{proc.category}</span>
                      )}
                    </div>
                  </div>
                  {proc.price != null && (
                    <span className="text-sm font-medium text-teal-600">
                      R$ {proc.price.toFixed(2).replace(".", ",")}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── Step 2: Select Date & Time ─── */}
        {step === "select-datetime" && config && (
          <div className="bg-white rounded-2xl shadow-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">Escolha a data e horario</h2>
              <button onClick={() => { setStep("select-procedure"); setSelectedDate(null); setSelectedTime(null) }} className="text-xs text-teal-600 hover:underline">
                Voltar
              </button>
            </div>

            {/* Selected procedure badge */}
            <div className="flex items-center gap-2 bg-teal-50 rounded-lg px-3 py-2 text-xs">
              <span className="font-medium text-teal-700">{selectedProcedure?.name}</span>
              <span className="text-teal-500">{selectedProcedure?.duration} min</span>
            </div>

            {/* Agenda selector (if multiple) */}
            {config.agendas.length > 1 && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">Profissional / Agenda</label>
                <div className="flex flex-wrap gap-1.5">
                  {config.agendas.map((ag) => (
                    <button
                      key={ag.id}
                      onClick={() => { setSelectedAgenda(ag); setSelectedDate(null); setSelectedTime(null) }}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        selectedAgenda?.id === ag.id
                          ? "border-teal-300 bg-teal-50 text-teal-700"
                          : "border-slate-200 text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      <span className="size-2 rounded-full" style={{ backgroundColor: ag.color }} />
                      {ag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Date picker */}
            {selectedAgenda && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">Data</label>
                <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                  {availableDates.slice(0, 14).map((d) => {
                    const isSelected = selectedDate?.toDateString() === d.toDateString()
                    const isToday = d.toDateString() === new Date().toDateString()
                    return (
                      <button
                        key={d.toISOString()}
                        onClick={() => setSelectedDate(d)}
                        className={`flex flex-col items-center min-w-[48px] py-2 px-1.5 rounded-xl text-xs transition-all shrink-0 ${
                          isSelected
                            ? "bg-teal-500 text-white shadow-sm"
                            : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <span className="text-[10px] font-medium uppercase">{WEEKDAY_NAMES[d.getDay()]}</span>
                        <span className="text-base font-semibold">{d.getDate()}</span>
                        <span className="text-[10px]">{MONTH_NAMES[d.getMonth()]}</span>
                        {isToday && !isSelected && <span className="text-[9px] text-teal-500 font-medium">Hoje</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Time slots */}
            {selectedDate && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">
                  Horario — {formatDateBR(selectedDate)}
                </label>
                {loadingSlots ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="size-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : slots.filter((s) => s.available).length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Nenhum horario disponivel neste dia</p>
                ) : (
                  <div className="grid grid-cols-4 gap-1.5">
                    {slots.filter((s) => s.available).map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() => setSelectedTime(slot.time)}
                        className={`py-2 rounded-lg text-xs font-medium transition-all ${
                          selectedTime === slot.time
                            ? "bg-teal-500 text-white shadow-sm"
                            : "bg-slate-50 text-slate-700 hover:bg-teal-50 hover:text-teal-700"
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Next button */}
            {selectedTime && (
              <button
                onClick={() => setStep("patient-info")}
                className="w-full bg-teal-500 hover:bg-teal-600 text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
              >
                Continuar
              </button>
            )}
          </div>
        )}

        {/* ─── Step 3: Patient Info ─── */}
        {step === "patient-info" && (
          <div className="bg-white rounded-2xl shadow-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">Seus dados</h2>
              <button onClick={() => setStep("select-datetime")} className="text-xs text-teal-600 hover:underline">
                Voltar
              </button>
            </div>

            {/* Summary */}
            <div className="bg-slate-50 rounded-xl p-3 space-y-1 text-xs text-slate-600">
              <div><span className="font-medium">Procedimento:</span> {selectedProcedure?.name}</div>
              <div><span className="font-medium">Data:</span> {selectedDate && formatDateBR(selectedDate)} as {selectedTime}</div>
              {config && config.agendas.length > 1 && selectedAgenda && (
                <div><span className="font-medium">Agenda:</span> {selectedAgenda.name}</div>
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Nome completo *</label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Telefone *</label>
                <input
                  type="tel"
                  value={patientPhone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Email (opcional)</label>
                <input
                  type="email"
                  value={patientEmail}
                  onChange={(e) => setPatientEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
                />
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!patientName.trim() || patientPhone.replace(/\D/g, "").length < 10}
              className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
            >
              Confirmar Agendamento
            </button>
          </div>
        )}

        {/* ─── Confirming ─── */}
        {step === "confirming" && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="size-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-500 mt-3">Agendando...</p>
          </div>
        )}

        {/* ─── Done ─── */}
        {step === "done" && bookingResult && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center space-y-3">
            <div className="size-14 bg-teal-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="size-7 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-800">Agendamento confirmado!</h2>
            <div className="bg-slate-50 rounded-xl p-3 space-y-1 text-xs text-slate-600">
              {bookingResult.procedure && (
                <div><span className="font-medium">Procedimento:</span> {bookingResult.procedure}</div>
              )}
              <div>
                <span className="font-medium">Data:</span>{" "}
                {new Date(bookingResult.date).toLocaleDateString("pt-BR", {
                  weekday: "long", day: "2-digit", month: "long", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </div>
            </div>
            <p className="text-xs text-slate-400">Voce pode fechar esta pagina.</p>
          </div>
        )}

        {/* ─── Error ─── */}
        {step === "error" && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center space-y-3">
            <div className="text-3xl">⚠️</div>
            <h2 className="text-lg font-semibold text-slate-800">Erro ao agendar</h2>
            <p className="text-sm text-slate-500">{errorMessage}</p>
            <button
              onClick={() => setStep("select-datetime")}
              className="bg-teal-500 hover:bg-teal-600 text-white rounded-xl px-6 py-2 text-sm font-medium transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-[10px] text-slate-300 mt-4">
          Powered by VoxClinic
        </p>
      </div>
    </div>
  )
}
