import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { UserButton } from "@clerk/nextjs"
import { NavSidebar } from "@/components/nav-sidebar"
import { NavBottom } from "@/components/nav-bottom"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true },
  })

  if (!user || !user.onboardingComplete || !user.workspace) {
    redirect("/onboarding")
  }

  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-vox-primary to-vox-primary/70 bg-clip-text text-transparent">
              VoxClinic
            </span>
            {user.clinicName && (
              <>
                <span className="text-border">/</span>
                <span className="text-sm font-medium text-muted-foreground">
                  {user.clinicName}
                </span>
              </>
            )}
          </div>
          <UserButton
            signInUrl="/sign-in"
            appearance={{
              elements: {
                avatarBox: "w-8 h-8",
              },
            }}
          />
        </div>
      </header>
      <div className="flex flex-1">
        <NavSidebar />
        <main className="flex-1">
          <div className="mx-auto max-w-5xl px-5 py-8 pb-24 md:pb-8">{children}</div>
        </main>
      </div>
      <NavBottom />
    </div>
  )
}
