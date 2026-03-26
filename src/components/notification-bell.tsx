"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Bell, Check, CalendarClock, AlertTriangle, Info } from "lucide-react"
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  generateUpcomingNotifications,
} from "@/server/actions/notification"

type NotificationItem = {
  id: string
  type: string
  title: string
  body: string | null
  entityType: string | null
  entityId: string | null
  read: boolean
  createdAt: string
}

const TYPE_ICON: Record<string, typeof Bell> = {
  appointment_soon: CalendarClock,
  appointment_missed: AlertTriangle,
  treatment_complete: Check,
  system: Info,
}

const TYPE_COLOR: Record<string, string> = {
  appointment_soon: "text-vox-primary",
  appointment_missed: "text-vox-warning",
  treatment_complete: "text-vox-success",
  system: "text-muted-foreground",
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const refresh = useCallback(async () => {
    try {
      // Generate any pending notifications first
      await generateUpcomingNotifications()
      const [items, count] = await Promise.all([
        getNotifications(),
        getUnreadCount(),
      ])
      setNotifications(items)
      setUnreadCount(count)
    } catch {
      // silently handle
    }
  }, [])

  // Initial load + polling every 60s
  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 60_000)
    return () => clearInterval(interval)
  }, [refresh])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  async function handleMarkAsRead(id: string) {
    await markAsRead(id)
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
    setUnreadCount((c) => Math.max(0, c - 1))
  }

  async function handleMarkAllRead() {
    await markAllAsRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  function formatTime(iso: string) {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return "agora"
    if (diffMin < 60) return `${diffMin}min`
    const diffHours = Math.floor(diffMin / 60)
    if (diffHours < 24) return `${diffHours}h`
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative flex size-8 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vox-primary/50"
        aria-label="Notificacoes"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex size-[18px] items-center justify-center rounded-full bg-vox-primary text-[9px] font-bold text-white ring-2 ring-background">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[calc(100vw-1rem)] sm:w-80 max-w-80 rounded-xl border border-border/60 bg-popover shadow-lg z-50 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <h3 className="text-sm font-semibold">Notificacoes</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-vox-primary hover:text-vox-primary/80 transition-colors"
              >
                Marcar tudo como lido
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[320px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/50">
                  <Bell className="size-5 text-muted-foreground/40" />
                </div>
                <p className="text-xs text-muted-foreground">Nenhuma notificacao</p>
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = TYPE_ICON[n.type] ?? Bell
                const color = TYPE_COLOR[n.type] ?? "text-muted-foreground"
                return (
                  <button
                    key={n.id}
                    onClick={() => !n.read && handleMarkAsRead(n.id)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors border-b border-border/20 last:border-0 ${
                      n.read ? "opacity-60" : "bg-vox-primary/[0.02] hover:bg-accent"
                    }`}
                  >
                    <div className={`flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted/50 mt-0.5 ${color}`}>
                      <Icon className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium truncate">{n.title}</p>
                        {!n.read && <div className="size-2 rounded-full bg-vox-primary shrink-0" />}
                      </div>
                      {n.body && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{n.body}</p>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground/60 shrink-0 mt-0.5">
                      {formatTime(n.createdAt)}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
