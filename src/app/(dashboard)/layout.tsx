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
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold tracking-tight text-vox-primary">
              VoxClinic
            </span>
            {user.clinicName && (
              <>
                <span className="text-muted-foreground">/</span>
                <span className="text-sm text-muted-foreground">
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
          <div className="mx-auto max-w-5xl px-4 py-6 pb-20 md:pb-6">{children}</div>
        </main>
      </div>
      <NavBottom />
    </div>
  )
}
