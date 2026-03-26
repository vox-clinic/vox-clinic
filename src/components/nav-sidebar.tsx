"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Mic,
  CalendarDays,
  DollarSign,
  BarChart3,
  Settings,
  Sparkles,
} from "lucide-react"

const mainNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Pacientes", icon: Users },
  { href: "/calendar", label: "Agenda", icon: CalendarDays },
  { href: "/financial", label: "Financeiro", icon: DollarSign },
  { href: "/reports", label: "Relatorios", icon: BarChart3 },
  { href: "/settings", label: "Configuracoes", icon: Settings },
]

const actionNav = [
  { href: "/appointments/new", label: "Nova Consulta", icon: Mic, accent: true },
]

export function NavSidebar({ clinicName }: { clinicName?: string | null }) {
  const pathname = usePathname()

  function renderLink(item: { href: string; label: string; icon: any; accent?: boolean }) {
    const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
    return (
      <Link
        key={item.href}
        href={item.href}
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

  return (
    <aside className="hidden md:flex w-56 flex-col border-r border-border/40 bg-sidebar">
      <nav className="flex flex-col gap-0.5 px-3 pt-5">
        <p className="px-3 pb-2.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
          Menu
        </p>
        {mainNav.map(renderLink)}
      </nav>

      <nav className="flex flex-col gap-0.5 px-3 pt-5">
        <p className="px-3 pb-2.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
          Acoes
        </p>
        {actionNav.map(renderLink)}
      </nav>
    </aside>
  )
}
