import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import Link from "next/link"

export default async function Home() {
  const { userId } = await auth()

  if (userId) {
    const user = await db.user.findUnique({
      where: { clerkId: userId },
    })

    if (user?.onboardingComplete) {
      redirect("/dashboard")
    } else {
      redirect("/onboarding")
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <h1 className="text-4xl font-bold tracking-tight">
          <span className="text-vox-primary">Vox</span>Clinic
        </h1>
        <p className="text-lg text-muted-foreground">
          CRM inteligente com voz para profissionais de saude.
          Fale, e nos organizamos para voce.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/sign-in"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-vox-primary px-6 text-sm font-medium text-white hover:bg-vox-primary/90 transition-colors"
          >
            Entrar
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex h-10 items-center justify-center rounded-lg border px-6 text-sm font-medium hover:bg-muted transition-colors"
          >
            Criar conta
          </Link>
        </div>
      </div>
    </div>
  )
}
