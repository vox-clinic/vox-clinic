"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RotateCcw, Home } from "lucide-react"
import Link from "next/link"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[GlobalError]", error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex size-20 items-center justify-center rounded-2xl bg-vox-error/10">
        <AlertTriangle className="size-10 text-vox-error" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Algo deu errado</h1>
        <p className="text-sm text-muted-foreground max-w-md">
          Ocorreu um erro inesperado. Tente novamente ou volte ao dashboard.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={reset} variant="outline" className="gap-2">
          <RotateCcw className="size-4" />
          Tentar novamente
        </Button>
        <Link href="/dashboard">
          <Button className="gap-2 bg-vox-primary text-white hover:bg-vox-primary/90">
            <Home className="size-4" />
            Voltar ao dashboard
          </Button>
        </Link>
      </div>
      {error.digest && (
        <p className="text-xs text-muted-foreground/50">
          Codigo do erro: {error.digest}
        </p>
      )}
    </div>
  )
}
