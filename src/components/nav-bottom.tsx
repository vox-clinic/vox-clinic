"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, CalendarDays, Mic, Settings } from "lucide-react"

const navItems = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/patients", label: "Pacientes", icon: Users },
  { href: "/appointments/new", label: "Consulta", icon: Mic, accent: true },
  { href: "/calendar", label: "Agenda", icon: CalendarDays },
  { href: "/settings", label: "Config", icon: Settings },
]

export function NavBottom() {
  const pathname = usePathname()

  return (
    <nav
      data-nav-bottom
      className="fixed bottom-0 left-0 w-full border-t border-border/50 bg-background/85 backdrop-blur-2xl z-50 md:hidden"
    >
      <div className="grid grid-cols-5 pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
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
      </div>
    </nav>
  )
}
