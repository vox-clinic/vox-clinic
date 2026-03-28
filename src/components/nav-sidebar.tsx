"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Mic,
  CalendarDays,
  MessageCircle,
  DollarSign,
  BarChart3,
  Settings,
  Sparkles,
} from "lucide-react"
import { hasPermission, type WorkspaceRole, type Permission } from "@/lib/permissions"

type NavItem = {
  href: string
  label: string
  icon: any
  accent?: boolean
  /** Permission required to see this nav item. null = always visible. */
  permission: Permission | null
  /** data-tour attribute for onboarding tour */
  tourId?: string
}

const mainNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: null, tourId: "nav-dashboard" },
  { href: "/patients", label: "Pacientes", icon: Users, permission: "patients.list", tourId: "nav-pacientes" },
  { href: "/calendar", label: "Agenda", icon: CalendarDays, permission: "appointments.view", tourId: "nav-agenda" },
  { href: "/mensagens", label: "Mensagens", icon: MessageCircle, permission: "messaging.view", tourId: "nav-mensagens" },
  { href: "/financial", label: "Financeiro", icon: DollarSign, permission: "financial.view", tourId: "nav-financeiro" },
  { href: "/reports", label: "Relatorios", icon: BarChart3, permission: "reports.view", tourId: "nav-relatorios" },
  { href: "/settings", label: "Configuracoes", icon: Settings, permission: "settings.view", tourId: "nav-configuracoes" },
]

const actionNav: NavItem[] = [
  { href: "/appointments/new", label: "Nova Consulta", icon: Mic, accent: true, permission: "clinical.recordings", tourId: "nav-nova-consulta" },
]

export function NavSidebar({ clinicName, role = "owner" }: { clinicName?: string | null; role?: WorkspaceRole }) {
  const pathname = usePathname()

  function isVisible(item: NavItem): boolean {
    if (!item.permission) return true
    return hasPermission(role, item.permission)
  }

  function renderLink(item: NavItem) {
    const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={isActive ? "page" : undefined}
        data-tour={item.tourId}
        className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
          item.accent && !isActive
            ? "bg-vox-primary/[0.07] text-vox-primary hover:bg-vox-primary/[0.12]"
            : isActive
              ? "bg-vox-primary/[0.10] text-vox-primary font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
        }`}
      >
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-vox-primary" />
        )}
        <item.icon className={`size-[18px] shrink-0 transition-colors ${
          isActive || item.accent ? "text-vox-primary" : "group-hover:text-foreground"
        }`} />
        {item.label}
        {item.accent && !isActive && (
          <Sparkles className="size-3 ml-auto text-vox-primary/50" />
        )}
      </Link>
    )
  }

  const visibleMainNav = mainNav.filter(isVisible)
  const visibleActionNav = actionNav.filter(isVisible)

  return (
    <aside data-testid="nav-sidebar" aria-label="Navegacao principal" className="hidden md:flex w-56 flex-col border-r border-border/40 bg-sidebar">
      <nav className="flex flex-col gap-0.5 px-3 pt-5">
        <p className="px-3 pb-2.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
          Menu
        </p>
        {visibleMainNav.map(renderLink)}
      </nav>

      {visibleActionNav.length > 0 && (
        <nav className="flex flex-col gap-0.5 px-3 pt-5">
          <p className="px-3 pb-2.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            Acoes
          </p>
          {visibleActionNav.map(renderLink)}
        </nav>
      )}
    </aside>
  )
}
