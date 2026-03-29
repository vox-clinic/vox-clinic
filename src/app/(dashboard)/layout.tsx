// Allow up to 5 minutes for server actions (audio processing: FFmpeg + Whisper + Claude)
export const maxDuration = 300

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { UserButton } from "@clerk/nextjs"
import Link from "next/link"
import { NavSidebar } from "@/components/nav-sidebar"
import { NavBottom } from "@/components/nav-bottom"
import { ThemeToggle } from "@/components/theme-toggle"
import { CommandPalette } from "@/components/command-palette"
import { NotificationBell } from "@/components/notification-bell"
import { TourProvider } from "@/components/tour/tour-provider"
import { normalizeRole, type WorkspaceRole } from "@/lib/permissions"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: {
      workspace: true,
      memberships: { select: { workspaceId: true, role: true }, take: 1 },
    },
  })

  if (!user || !user.onboardingComplete) {
    redirect("/onboarding")
  }

  // User must have a workspace (either as owner or member)
  const isOwner = !!user.workspace
  const workspaceId = user.workspace?.id ?? user.memberships?.[0]?.workspaceId
  if (!workspaceId) {
    redirect("/onboarding")
  }

  // Resolve workspace role
  const role: WorkspaceRole = isOwner
    ? "owner"
    : normalizeRole(user.memberships?.[0]?.role ?? "doctor")

  return (
    <div className="min-h-full flex flex-col">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-xl focus:bg-vox-primary focus:px-4 focus:py-2 focus:text-white focus:text-sm focus:font-medium focus:shadow-lg">
        Pular para conteudo
      </a>
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="group flex items-center gap-2.5 transition-opacity hover:opacity-80">
              <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-vox-primary to-teal-600 shadow-md shadow-vox-primary/25 transition-shadow group-hover:shadow-lg group-hover:shadow-vox-primary/30">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
              </div>
              <span className="text-[15px] font-bold tracking-tight">
                Vox<span className="text-vox-primary">Clinic</span>
              </span>
            </Link>
            {user.clinicName && (
              <>
                <div className="h-5 w-px bg-border/50 hidden sm:block" />
                <span className="text-[13px] text-muted-foreground/80 hidden sm:block font-medium">
                  {user.clinicName}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            <CommandPalette />
            <NotificationBell />
            <ThemeToggle />
            <div className="ml-1.5 pl-1.5 border-l border-border/40">
              <UserButton
                signInUrl="/sign-in"
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8 rounded-xl",
                  },
                }}
              />
            </div>
          </div>
        </div>
      </header>
      <div className="flex flex-1">
        <NavSidebar clinicName={user.clinicName} role={role} />
        <main id="main-content" className="flex-1 overflow-auto">
          <div className="px-4 py-5 pb-24 md:px-6 md:py-6 md:pb-8 lg:px-8">
            <TourProvider
              initialTourCompleted={user.tourCompleted}
              initialTourStep={user.tourStep}
            >
              {children}
            </TourProvider>
          </div>
        </main>
      </div>
      <NavBottom role={role} />
    </div>
  )
}
