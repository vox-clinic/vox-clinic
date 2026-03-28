"use client"
import { useEffect } from "react"

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('[ErrorBoundary] Teleconsulta', error) }, [error])
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-lg font-semibold">Algo deu errado</h2>
        <p className="text-sm text-muted-foreground">{error.digest ? `Erro: ${error.digest}` : "Ocorreu um erro inesperado."}</p>
        <button onClick={reset} className="rounded-xl bg-teal-500 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600">
          Tentar novamente
        </button>
      </div>
    </div>
  )
}
