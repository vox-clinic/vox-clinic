"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Mic,
  CalendarDays,
  DollarSign,
  Settings,
  Sparkles,
} from "lucide-react"

const mainNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Pacientes", icon: Users },
  { href: "/calendar", label: "Agenda", icon: CalendarDays },
  { href: "/financial", label: "Financeiro", icon: DollarSign },
]

const actionNav = [
  { href: "/appointments/new", label: "Nova Consulta", icon: Mic, accent: true },
]

const systemNav = [
  { href: "/settings", label: "Configuracoes", icon: Settings },
]

export function NavSidebar({ clinicName }: { clinicName?: string | null }) {
  const pathname = usePathname()

  function renderLink(item: { href: string; label: string; icon: any; accent?: boolean }) {
    const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`group flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 ${
          item.accent && !isActive
            ? "bg-vox-primary/[0.08] text-vox-primary hover:bg-vox-primary/15"
            : isActive
              ? "bg-vox-primary/10 text-vox-primary shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
        }`}
      >
        <item.icon className={`size-[18px] transition-colors ${
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
    <aside className="hidden md:flex w-52 flex-col border-r border-border/40 bg-card/30">
      <nav className="flex flex-col gap-px px-3 pt-4">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Menu
        </p>
        {mainNav.map(renderLink)}
      </nav>

      <nav className="flex flex-col gap-px px-3 pt-4">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Acoes
        </p>
        {actionNav.map(renderLink)}
      </nav>

      <div className="mt-auto px-3 pb-4 pt-4">
        <div className="border-t border-border/40 pt-3">
          {systemNav.map(renderLink)}
        </div>
      </div>
    </aside>
  )
}
