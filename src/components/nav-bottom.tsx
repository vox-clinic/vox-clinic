"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Mic,
  ClipboardList,
  DollarSign,
  Settings,
  MoreHorizontal,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { hasPermission, type WorkspaceRole, type Permission } from "@/lib/permissions"

type NavItem = {
  href: string
  label: string
  icon: any
  accent?: boolean
  permission: Permission | null
  tourId?: string
}

const primaryNav: NavItem[] = [
  { href: "/dashboard", label: "Início", icon: LayoutDashboard, permission: null, tourId: "nav-bottom-inicio" },
  { href: "/patients", label: "Pacientes", icon: Users, permission: "patients.list", tourId: "nav-bottom-pacientes" },
  { href: "/appointments/new", label: "Consulta", icon: Mic, accent: true, permission: "clinical.recordings", tourId: "nav-bottom-nova-consulta" },
  { href: "/calendar", label: "Agenda", icon: CalendarDays, permission: "appointments.view", tourId: "nav-bottom-agenda" },
]

const moreNav: NavItem[] = [
  { href: "/appointments", label: "Atendimentos", icon: ClipboardList, permission: "appointments.view" },
  { href: "/financial", label: "Financeiro", icon: DollarSign, permission: "financial.view" },
  { href: "/settings", label: "Configurações", icon: Settings, permission: "settings.view", tourId: "nav-bottom-config" },
]

export function NavBottom({ role = "owner" }: { role?: WorkspaceRole }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  function isVisible(item: NavItem): boolean {
    if (!item.permission) return true
    return hasPermission(role, item.permission)
  }

  const visiblePrimaryNav = primaryNav.filter(isVisible)
  const visibleMoreNav = moreNav.filter(isVisible)

  const isMoreActive = visibleMoreNav.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  )

  // Total columns: visible primary items + 1 for "Mais" button (if there are more items)
  const showMore = visibleMoreNav.length > 0
  const totalCols = visiblePrimaryNav.length + (showMore ? 1 : 0)

  return (
    <nav
      data-nav-bottom
      data-testid="nav-bottom"
      aria-label="Navegação principal"
      className="fixed bottom-0 left-0 w-full border-t border-border/50 bg-background/85 backdrop-blur-2xl z-50 md:hidden"
    >
      <div className="grid pb-[env(safe-area-inset-bottom)]" style={{ gridTemplateColumns: `repeat(${totalCols}, minmax(0, 1fr))` }}>
        {visiblePrimaryNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              data-tour={item.tourId}
              className={`relative flex flex-col items-center justify-center gap-0.5 py-2.5 transition-all duration-200 active:scale-95 ${
                isActive ? "text-vox-primary" : "text-muted-foreground"
              }`}
            >
              {item.accent ? (
                <div className={`flex size-10 items-center justify-center rounded-2xl transition-all duration-200 ${
                  isActive
                    ? "bg-vox-primary text-white shadow-lg shadow-vox-primary/30"
                    : "bg-vox-primary/10 text-vox-primary"
                }`}>
                  <item.icon className="size-5" />
                </div>
              ) : (
                <>
                  {isActive && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-[2px] rounded-b-full bg-vox-primary" />
                  )}
                  <item.icon className={`size-[22px] transition-all duration-200 ${
                    isActive ? "text-vox-primary" : ""
                  }`} />
                </>
              )}
              <span className={`text-[10px] font-medium truncate max-w-full transition-colors ${
                isActive ? "text-vox-primary" : ""
              } ${item.accent ? "mt-0.5" : ""}`}>
                {item.label}
              </span>
            </Link>
          )
        })}

        {showMore && (
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              aria-label="Mais opções"
              className={`relative flex flex-col items-center justify-center gap-0.5 py-2.5 transition-all duration-200 active:scale-95 ${
                isMoreActive ? "text-vox-primary" : "text-muted-foreground"
              }`}
            >
              {isMoreActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-[2px] rounded-b-full bg-vox-primary" />
              )}
              <MoreHorizontal className={`size-[22px] transition-all duration-200 ${
                isMoreActive ? "text-vox-primary" : ""
              }`} />
              <span className={`text-[10px] font-medium transition-colors ${
                isMoreActive ? "text-vox-primary" : ""
              }`}>
                Mais
              </span>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <SheetHeader className="pb-2">
                <SheetTitle className="text-left text-base">Mais opções</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-1">
                {visibleMoreNav.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-vox-primary/10 text-vox-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      }`}
                    >
                      <item.icon className={`size-5 shrink-0 ${
                        isActive ? "text-vox-primary" : ""
                      }`} />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </nav>
  )
}
