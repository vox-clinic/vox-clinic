"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"

const navLinks = [
  { href: "#features", label: "Funcionalidades" },
  { href: "#how-it-works", label: "Como Funciona" },
  { href: "#pricing", label: "Precos" },
  { href: "#faq", label: "FAQ" },
]

export function NavBar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 bg-background/70 backdrop-blur-xl border-b border-border/40">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-vox-primary to-vox-primary/70 shadow-sm shadow-vox-primary/20">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight">
            Vox<span className="text-vox-primary">Clinic</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/sign-in"
            className="inline-flex h-9 items-center justify-center rounded-xl border border-border px-5 text-sm font-medium hover:bg-muted transition-colors active:scale-[0.98]"
          >
            Entrar
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex h-9 items-center justify-center rounded-xl bg-vox-primary px-5 text-sm font-medium text-white hover:bg-vox-primary/90 transition-colors active:scale-[0.98]"
          >
            Comecar Gratis
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden inline-flex size-9 items-center justify-center rounded-xl hover:bg-muted transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-xl">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="pt-3 border-t border-border/40 flex flex-col gap-2">
              <Link
                href="/sign-in"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-5 text-sm font-medium hover:bg-muted transition-colors"
              >
                Entrar
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-vox-primary px-5 text-sm font-medium text-white hover:bg-vox-primary/90 transition-colors"
              >
                Comecar Gratis
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
