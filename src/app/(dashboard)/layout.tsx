import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { UserButton } from "@clerk/nextjs"
import { NavSidebar } from "@/components/nav-sidebar"
import { NavBottom } from "@/components/nav-bottom"
import { ThemeToggle } from "@/components/theme-toggle"

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
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-vox-primary to-vox-primary/70 shadow-sm shadow-vox-primary/20">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
              </div>
              <span className="text-base font-bold tracking-tight">
                Vox<span className="text-vox-primary">Clinic</span>
              </span>
            </div>
            {user.clinicName && (
              <>
                <div className="h-4 w-px bg-border/60" />
                <span className="text-sm text-muted-foreground hidden sm:block">
                  {user.clinicName}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <UserButton
              signInUrl="/sign-in"
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8",
                },
              }}
            />
          </div>
        </div>
      </header>
      <div className="flex flex-1">
        <NavSidebar clinicName={user.clinicName} />
        <main className="flex-1 overflow-auto">
          <div className="px-4 py-5 pb-24 md:px-6 md:pb-6 lg:px-8">{children}</div>
        </main>
      </div>
      <NavBottom />
    </div>
  )
}
