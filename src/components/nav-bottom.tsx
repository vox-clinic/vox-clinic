"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Mic,
  MessageCircle,
  DollarSign,
  BarChart3,
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

const primaryNav = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/patients", label: "Pacientes", icon: Users },
  { href: "/appointments/new", label: "Consulta", icon: Mic, accent: true },
  { href: "/calendar", label: "Agenda", icon: CalendarDays },
]

const moreNav = [
  { href: "/mensagens", label: "Mensagens", icon: MessageCircle },
  { href: "/financial", label: "Financeiro", icon: DollarSign },
  { href: "/reports", label: "Relatorios", icon: BarChart3 },
  { href: "/settings", label: "Configuracoes", icon: Settings },
]

export function NavBottom() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isMoreActive = moreNav.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  )

  return (
    <nav
      data-nav-bottom
      aria-label="Navegacao principal"
      className="fixed bottom-0 left-0 w-full border-t border-border/50 bg-background/85 backdrop-blur-2xl z-50 md:hidden"
    >
      <div className="grid grid-cols-5 pb-[env(safe-area-inset-bottom)]">
        {primaryNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
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

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
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
              <SheetTitle className="text-left text-base">Mais opcoes</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-1">
              {moreNav.map((item) => {
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
      </div>
    </nav>
  )
}
