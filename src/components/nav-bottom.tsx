"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, Mic, Settings } from "lucide-react"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Pacientes", icon: Users },
  { href: "/appointments/new", label: "Consulta", icon: Mic },
  { href: "/settings", label: "Config", icon: Settings },
]

export function NavBottom() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 w-full border-t bg-background z-50 md:hidden">
      <div className="grid grid-cols-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 py-2 transition-colors ${
                isActive ? "text-vox-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon className="size-5" />
              <span className="text-xs">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
