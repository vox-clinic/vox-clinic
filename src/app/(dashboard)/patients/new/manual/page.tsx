import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { ManualPatientForm } from "./manual-patient-form"
import type { CustomField } from "@/types"

export default async function ManualPatientPage() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true },
  })

  if (!user?.workspace) redirect("/onboarding")

  const customFields = user.workspace.customFields as unknown as CustomField[]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <a
          href="/patients/new"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Novo Paciente
        </a>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm">Cadastro Manual</span>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">
        Cadastrar Paciente
      </h1>

      <ManualPatientForm customFields={customFields} />
    </div>
  )
}
