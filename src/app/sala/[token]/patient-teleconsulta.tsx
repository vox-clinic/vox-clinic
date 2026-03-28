"use client"

import { useState } from "react"
import { Video } from "lucide-react"
import { recordTeleconsultaConsent } from "@/server/actions/teleconsulta"

interface PatientTeleconsultaProps {
  info: {
    roomUrl: string
    patientToken: string
    appointmentDate: string
    professionalName: string
    patientName: string
  }
  videoToken: string
}

export function PatientTeleconsulta({ info, videoToken }: PatientTeleconsultaProps) {
  const [joined, setJoined] = useState(false)
  const [consent, setConsent] = useState(false)
  const [joining, setJoining] = useState(false)

  const dateStr = new Date(info.appointmentDate).toLocaleString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  const iframeUrl = `${info.roomUrl}?t=${info.patientToken}`

  if (joined) {
    return (
      <div className="h-screen w-full">
        <iframe
          src={iframeUrl}
          allow="camera; microphone; fullscreen; display-capture"
          className="w-full h-full border-0"
        />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 space-y-6">
        {/* Logo / Branding */}
        <div className="text-center">
          <div className="mx-auto mb-3 size-14 rounded-2xl bg-[#14B8A6]/10 flex items-center justify-center">
            <Video className="size-7 text-[#14B8A6]" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">Teleconsulta</h1>
          <p className="text-sm text-[#14B8A6] font-medium mt-1">VoxClinic</p>
        </div>

        {/* Appointment info */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Profissional</span>
            <span className="text-sm font-medium text-gray-900">{info.professionalName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Paciente</span>
            <span className="text-sm font-medium text-gray-900">{info.patientName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Data/Hora</span>
            <span className="text-sm font-medium text-gray-900 text-right capitalize">{dateStr}</span>
          </div>
        </div>

        {/* LGPD consent */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 size-4 rounded border-gray-300 text-[#14B8A6] focus:ring-[#14B8A6]"
          />
          <span className="text-xs text-gray-600 leading-relaxed">
            Concordo com a gravacao e processamento dos dados desta teleconsulta, conforme a Lei Geral de Protecao de Dados (LGPD).
          </span>
        </label>

        {/* Join button */}
        <button
          onClick={async () => {
            setJoining(true)
            try {
              await recordTeleconsultaConsent(videoToken)
            } catch (err) {
              console.error("[Teleconsulta] consent save failed", err)
            }
            setJoined(true)
          }}
          disabled={!consent || joining}
          className="w-full h-11 rounded-xl bg-[#14B8A6] text-white font-medium text-sm transition-all hover:bg-[#0D9488] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Video className="size-4" />
          Entrar na Sala
        </button>

        <p className="text-[10px] text-center text-gray-300">
          Powered by VoxClinic
        </p>
      </div>
    </div>
  )
}
