"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, CalendarDays, Mic, Settings } from "lucide-react"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Pacientes", icon: Users },
  { href: "/appointments/new", label: "Consulta", icon: Mic, accent: true },
  { href: "/calendar", label: "Agenda", icon: CalendarDays },
  { href: "/settings", label: "Config", icon: Settings },
]

export function NavBottom() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 w-full border-t border-border/50 bg-background/80 backdrop-blur-xl z-50 md:hidden">
      <div className="grid grid-cols-5 pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 py-3 transition-all duration-200 ${
                isActive ? "text-vox-primary" : "text-muted-foreground"
              }`}
            >
              {item.accent && !isActive ? (
                <div className="flex size-8 items-center justify-center rounded-full bg-vox-primary/10">
                  <item.icon className="size-4 text-vox-primary" />
                </div>
              ) : (
                <item.icon className={`size-5 ${isActive ? "scale-110" : ""} transition-transform duration-200`} />
              )}
              <span className={`text-[10px] font-medium ${isActive ? "text-vox-primary" : ""}`}>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
