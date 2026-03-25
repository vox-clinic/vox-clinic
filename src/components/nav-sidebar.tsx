"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, Mic, Settings } from "lucide-react"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Pacientes", icon: Users },
  { href: "/appointments/new", label: "Nova Consulta", icon: Mic },
  { href: "/settings", label: "Configurações", icon: Settings },
]

export function NavSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex w-56 flex-col border-r py-4">
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mx-2 flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-vox-primary/10 text-vox-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
