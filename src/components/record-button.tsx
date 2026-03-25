"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Mic, Square, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface RecordButtonProps {
  onRecordingComplete: (audioBlob: Blob) => void
  maxDuration?: number
  size?: "sm" | "md" | "lg"
  floating?: boolean
  disabled?: boolean
  requireConsent?: boolean
}

const sizeMap = { sm: "w-12 h-12", md: "w-16 h-16", lg: "w-20 h-20" }
const iconSizeMap = { sm: 20, md: 24, lg: 32 }

export function RecordButton({
  onRecordingComplete,
  maxDuration = 300,
  size = "md",
  floating = false,
  disabled = false,
  requireConsent = true,
}: RecordButtonProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [levels, setLevels] = useState<number[]>([0, 0, 0, 0, 0])
  const [consentGiven, setConsentGiven] = useState(!requireConsent)
  const [showConsent, setShowConsent] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close()
      audioCtxRef.current = null
    }
    analyserRef.current = null
    mediaRecorderRef.current = null
  }, [])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  // Auto-stop at maxDuration
  useEffect(() => {
    if (isRecording && elapsed >= maxDuration) {
      stopRecording()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, maxDuration, isRecording])

  const updateLevels = useCallback(() => {
    if (!analyserRef.current) return
    const data = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(data)
    const avg = data.reduce((sum, v) => sum + v, 0) / data.length
    const normalized = Math.min(avg / 128, 1)
    setLevels((prev) => {
      const next = [...prev.slice(1), normalized]
      return next
    })
    animFrameRef.current = requestAnimationFrame(updateLevels)
  }, [])

  const startRecording = async () => {
    setError(null)
    chunksRef.current = []
    setElapsed(0)

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError("Permissao de microfone negada. Habilite o microfone nas configuracoes do navegador.")
      return
    }
    streamRef.current = stream

    // Setup analyser for waveform
    try {
      const audioCtx = new AudioContext()
      audioCtxRef.current = audioCtx
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser
      animFrameRef.current = requestAnimationFrame(updateLevels)
    } catch {
      // Waveform is non-critical, continue without it
    }

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : ""

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    mediaRecorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: mimeType || "audio/webm",
      })
      chunksRef.current = []
      if (blob.size > 0) {
        onRecordingComplete(blob)
      }
    }

    recorder.start(1000)
    setIsRecording(true)

    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1)
    }, 1000)
  }

  const stopRecording = useCallback(() => {
    setIsRecording(false)
    setLevels([0, 0, 0, 0, 0])
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close()
      audioCtxRef.current = null
    }
    analyserRef.current = null
  }, [])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0")
    const s = (seconds % 60).toString().padStart(2, "0")
    return `${m}:${s}`
  }

  const handleClick = () => {
    if (isRecording) {
      stopRecording()
    } else if (requireConsent && !consentGiven) {
      setShowConsent(true)
    } else {
      startRecording()
    }
  }

  const handleConsentAccept = () => {
    setConsentGiven(true)
    setShowConsent(false)
    startRecording()
  }

  const handleConsentDecline = () => {
    setShowConsent(false)
  }

  const iconSize = iconSizeMap[size]

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3",
        floating && "fixed bottom-6 right-6 z-50"
      )}
    >
      {/* LGPD Consent Modal */}
      {showConsent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-xl bg-background p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-semibold">Consentimento para Gravacao</h3>
            <p className="text-sm text-muted-foreground">
              De acordo com a LGPD (Lei 13.709/2018), este audio sera gravado,
              transcrito e processado por inteligencia artificial para extrair dados
              clinicos. O audio sera armazenado de forma segura e nao sera
              compartilhado com terceiros.
            </p>
            <p className="text-sm text-muted-foreground">
              Ao prosseguir, voce confirma que obteve o consentimento do paciente
              para esta gravacao.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleConsentDecline}
                className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConsentAccept}
                className="flex-1 rounded-lg bg-vox-primary px-4 py-2 text-sm font-medium text-white hover:bg-vox-primary/90 transition-colors"
              >
                Concordo e Gravar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Waveform bars */}
      {isRecording && (
        <div className="flex items-end gap-1 h-8">
          {levels.map((level, i) => (
            <div
              key={i}
              className="w-1.5 rounded-full bg-vox-error transition-all duration-150"
              style={{ height: `${Math.max(4, level * 32)}px` }}
            />
          ))}
        </div>
      )}

      {/* Timer */}
      {isRecording && (
        <span className="text-sm font-mono text-muted-foreground tabular-nums">
          {formatTime(elapsed)} / {formatTime(maxDuration)}
        </span>
      )}

      {/* Record button */}
      <button
        onClick={handleClick}
        disabled={disabled}
        className={cn(
          "rounded-full flex items-center justify-center transition-all shadow-lg",
          sizeMap[size],
          isRecording
            ? "bg-vox-error animate-pulse hover:bg-vox-error/90"
            : "bg-vox-primary hover:bg-vox-primary/90",
          disabled && "opacity-50 cursor-not-allowed",
          "text-white"
        )}
        aria-label={isRecording ? "Parar gravacao" : "Iniciar gravacao"}
      >
        {isRecording ? (
          <Square size={iconSize} fill="currentColor" />
        ) : (
          <Mic size={iconSize} />
        )}
      </button>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-vox-error max-w-xs text-center">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
