"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"

export default function NpsSurveyPage() {
  const { token } = useParams<{ token: string }>()
  const [score, setScore] = useState<number | null>(null)
  const [comment, setComment] = useState("")
  const [status, setStatus] = useState<"loading" | "ready" | "submitting" | "done" | "already" | "error">("loading")

  useEffect(() => {
    fetch(`/api/nps?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.answered) setStatus("already")
        else setStatus("ready")
      })
      .catch(() => setStatus("error"))
  }, [token])

  const submit = async () => {
    if (score === null) return
    setStatus("submitting")
    try {
      const res = await fetch("/api/nps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, score, comment }),
      })
      if (res.ok) setStatus("done")
      else setStatus("error")
    } catch {
      setStatus("error")
    }
  }

  const npsLabel = score === null ? "" : score >= 9 ? "Promotor" : score >= 7 ? "Neutro" : "Detrator"
  const npsColor = score === null ? "" : score >= 9 ? "#10B981" : score >= 7 ? "#F59E0B" : "#EF4444"

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-lg font-semibold text-gray-900">Pesquisa de Satisfacao</h1>
          <p className="text-sm text-gray-500 mt-1">Sua opiniao e muito importante para nos</p>
        </div>

        {status === "loading" && (
          <div className="text-center py-8 text-sm text-gray-400">Carregando...</div>
        )}

        {status === "already" && (
          <div className="text-center py-8">
            <div className="text-3xl mb-2">✅</div>
            <p className="text-sm text-gray-600">Obrigado! Voce ja respondeu esta pesquisa.</p>
          </div>
        )}

        {status === "done" && (
          <div className="text-center py-8">
            <div className="text-3xl mb-2">🎉</div>
            <p className="text-sm text-gray-600">Obrigado pelo seu feedback!</p>
          </div>
        )}

        {status === "error" && (
          <div className="text-center py-8">
            <div className="text-3xl mb-2">😔</div>
            <p className="text-sm text-red-500">Erro ao carregar pesquisa. Tente novamente.</p>
          </div>
        )}

        {(status === "ready" || status === "submitting") && (
          <>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">
                De 0 a 10, qual a probabilidade de voce recomendar nosso atendimento?
              </p>
              <div className="grid grid-cols-11 gap-1">
                {Array.from({ length: 11 }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setScore(i)}
                    className={`h-10 rounded-lg text-sm font-medium transition-all ${
                      score === i
                        ? "bg-teal-500 text-white shadow-md scale-110"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-gray-400">Nada provavel</span>
                <span className="text-[10px] text-gray-400">Muito provavel</span>
              </div>
              {score !== null && (
                <p className="text-center text-xs mt-2 font-medium" style={{ color: npsColor }}>
                  {npsLabel}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Comentario (opcional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Conte-nos mais sobre sua experiencia..."
                rows={3}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 resize-none"
              />
            </div>

            <button
              onClick={submit}
              disabled={score === null || status === "submitting"}
              className="w-full h-10 rounded-xl bg-teal-500 text-white font-medium text-sm transition-all hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "submitting" ? "Enviando..." : "Enviar Avaliacao"}
            </button>
          </>
        )}

        <p className="text-[10px] text-center text-gray-300">Powered by VoxClinic</p>
      </div>
    </div>
  )
}
