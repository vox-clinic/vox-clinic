import { Button } from "@/components/ui/button"
import { FileQuestion, Home, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex size-20 items-center justify-center rounded-2xl bg-vox-primary/10">
        <FileQuestion className="size-10 text-vox-primary" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Pagina nao encontrada</h1>
        <p className="text-sm text-muted-foreground max-w-md">
          A pagina que voce esta procurando nao existe ou foi movida.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/dashboard">
          <Button className="gap-2 bg-vox-primary text-white hover:bg-vox-primary/90">
            <Home className="size-4" />
            Voltar ao dashboard
          </Button>
        </Link>
      </div>
    </div>
  )
}
