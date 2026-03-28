import Link from "next/link"
import { FileQuestion } from "lucide-react"

export default function AuthNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
      <FileQuestion className="h-16 w-16 text-muted-foreground/50" />
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Pagina nao encontrada</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          A pagina que voce procura nao existe.
        </p>
      </div>
      <Link href="/sign-in" className="text-sm text-vox-primary hover:underline">
        Voltar para login
      </Link>
    </div>
  )
}
