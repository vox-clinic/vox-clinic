import Link from "next/link"
import { FileQuestion } from "lucide-react"

export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
      <FileQuestion className="h-16 w-16 text-muted-foreground/50" />
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Pagina nao encontrada</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          O recurso que voce procura nao existe ou foi removido.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="inline-flex items-center rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted/50"
      >
        Voltar ao painel
      </Link>
    </div>
  )
}
