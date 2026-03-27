"use client"

export default function BookingError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4 text-center">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Algo deu errado</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          {error.message || "Ocorreu um erro inesperado. Tente novamente."}
        </p>
      </div>
      <button
        onClick={reset}
        className="px-4 py-2 text-sm font-medium rounded-xl border border-border hover:bg-vox-primary/10 hover:text-vox-primary transition-colors"
      >
        Tentar novamente
      </button>
    </div>
  )
}
