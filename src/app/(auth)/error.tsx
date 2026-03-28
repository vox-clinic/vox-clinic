"use client"

import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"
import * as Sentry from "@sentry/nextjs"

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[ErrorBoundary] Auth", error)
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
      <AlertTriangle className="size-10 text-vox-error" />
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Algo deu errado</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          {error.message || "Ocorreu um erro inesperado. Tente novamente."}
        </p>
      </div>
      <button
        onClick={reset}
        className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted/50"
      >
        Tentar novamente
      </button>
    </div>
  )
}
