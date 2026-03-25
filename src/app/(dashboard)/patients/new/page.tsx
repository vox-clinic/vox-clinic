import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Mic, FileText } from "lucide-react"
import Link from "next/link"

export default function NewPatientPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Novo Paciente
      </h1>
      <p className="text-sm text-muted-foreground">
        Escolha como deseja cadastrar o paciente.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/patients/new/voice">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex size-10 items-center justify-center rounded-full bg-vox-primary/10 mb-2">
                <Mic className="size-5 text-vox-primary" />
              </div>
              <CardTitle>Cadastrar por Voz</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Fale os dados do paciente e a IA extraira as informacoes automaticamente.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/patients/new/manual">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex size-10 items-center justify-center rounded-full bg-vox-primary/10 mb-2">
                <FileText className="size-5 text-vox-primary" />
              </div>
              <CardTitle>Cadastrar Manualmente</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Preencha os dados do paciente no formulario.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
