"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { acceptInvite } from "@/server/actions/team"
import { friendlyError } from "@/lib/error-messages"
import { toast } from "sonner"

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleAccept = async () => {
    setLoading(true)
    try {
      await acceptInvite(token)
      toast.success("Convite aceito! Bem-vindo a equipe.")
      router.push("/dashboard")
    } catch (err) {
      toast.error(friendlyError(err, "Erro ao aceitar convite"))
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 space-y-6">
        <div className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-xl bg-teal-500 flex items-center justify-center">
            <span className="text-white font-bold text-xl">V</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Convite para Equipe</h1>
            <p className="text-sm text-gray-500 mt-1">
              Voce foi convidado para participar de um workspace no VoxClinic.
            </p>
          </div>
        </div>

        <button
          onClick={handleAccept}
          disabled={loading}
          className="w-full h-10 rounded-xl bg-teal-500 text-white font-medium text-sm transition-all hover:bg-teal-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Aceitando..." : "Aceitar Convite"}
        </button>

        <div className="text-center">
          <a
            href="/dashboard"
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Voltar ao painel
          </a>
        </div>

        <p className="text-[10px] text-center text-gray-300">Powered by VoxClinic</p>
      </div>
    </div>
  )
}
