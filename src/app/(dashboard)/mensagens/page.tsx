"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { MessageCircle, ArrowLeft, Send, Search, Loader2, MessageSquare } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import {
  getWhatsAppConfig,
  fetchConversations,
  fetchMessages,
  sendTextMessage,
  markConversationAsRead,
} from "@/server/actions/whatsapp"

// ---------------------------------------------------------------------------
// Types (mirrors Prisma models)
// ---------------------------------------------------------------------------

interface Conversation {
  id: string
  contactPhone: string
  contactName: string
  lastMessageAt: string | Date
  lastMessagePreview: string
  unreadCount: number
  status: string
}

interface Message {
  id: string
  waMessageId: string
  direction: string
  type: string
  content: string
  status: string
  createdAt: string | Date
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(date: string | Date) {
  return new Date(date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

function formatDate(date: string | Date) {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const oneDay = 86400000

  if (diff < oneDay && d.getDate() === now.getDate()) return formatTime(date)
  if (diff < oneDay * 2) return "Ontem"
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function MensagensPage() {
  const [configLoaded, setConfigLoaded] = useState(false)
  const [hasConfig, setHasConfig] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  // Check WhatsApp config on mount
  useEffect(() => {
    getWhatsAppConfig().then((config) => {
      setHasConfig(!!config)
      setConfigLoaded(true)
      if (config) loadConversations()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadConversations = useCallback(async () => {
    setLoadingConversations(true)
    try {
      const { conversations: convs } = await fetchConversations()
      setConversations(convs as unknown as Conversation[])
    } finally {
      setLoadingConversations(false)
    }
  }, [])

  // Poll conversations every 15s
  useEffect(() => {
    if (!hasConfig) return
    const interval = setInterval(async () => {
      try {
        const { conversations: convs } = await fetchConversations()
        setConversations(convs as unknown as Conversation[])
      } catch { /* silent */ }
    }, 15000)
    return () => clearInterval(interval)
  }, [hasConfig])

  // Not configured state
  if (configLoaded && !hasConfig) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] gap-4 px-4">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-vox-primary/10">
          <MessageCircle className="size-8 text-vox-primary" />
        </div>
        <h2 className="text-lg font-semibold">WhatsApp nao configurado</h2>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Configure sua conta do WhatsApp Business para enviar e receber mensagens diretamente pelo VoxClinic.
        </p>
        <Link
          href="/settings/whatsapp"
          className="inline-flex items-center justify-center h-9 px-4 rounded-xl bg-vox-primary text-white text-sm font-medium hover:bg-vox-primary/90 transition-colors"
        >
          Configurar WhatsApp
        </Link>
      </div>
    )
  }

  // Loading config
  if (!configLoaded) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const filtered = search
    ? conversations.filter(
        (c) =>
          c.contactName.toLowerCase().includes(search.toLowerCase()) ||
          c.contactPhone.includes(search)
      )
    : conversations

  const selected = conversations.find((c) => c.id === selectedId) ?? null

  return (
    <div className="flex h-[calc(100vh-4rem)] md:h-[calc(100vh-2rem)] overflow-hidden">
      {/* Left panel — conversation list */}
      <div
        className={`w-full md:w-[340px] lg:w-[380px] flex-shrink-0 border-r border-border/40 flex flex-col bg-background ${
          selectedId ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Header */}
        <div className="flex flex-col gap-3 p-4 border-b border-border/40">
          <h1 className="text-lg font-semibold">Mensagens</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 rounded-xl text-sm"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {loadingConversations ? (
            <div className="flex flex-col gap-1 p-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="size-10 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
              <MessageSquare className="size-8" />
              <p className="text-sm">
                {search ? "Nenhuma conversa encontrada" : "Nenhuma conversa ainda"}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5 p-1">
              {filtered.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  className={`flex items-center gap-3 w-full text-left px-3 py-3 rounded-xl transition-colors ${
                    selectedId === conv.id
                      ? "bg-vox-primary/10"
                      : "hover:bg-accent"
                  }`}
                >
                  {/* Avatar */}
                  <div className="flex size-10 items-center justify-center rounded-full bg-vox-primary/10 text-vox-primary text-xs font-semibold flex-shrink-0">
                    {getInitials(conv.contactName)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{conv.contactName}</span>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {formatDate(conv.lastMessageAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground truncate">
                        {conv.lastMessagePreview || conv.contactPhone}
                      </span>
                      {conv.unreadCount > 0 && (
                        <span className="flex items-center justify-center size-5 rounded-full bg-vox-primary text-white text-[10px] font-bold flex-shrink-0">
                          {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right panel — chat view */}
      <div
        className={`flex-1 flex flex-col bg-background ${
          selectedId ? "flex" : "hidden md:flex"
        }`}
      >
        {selected ? (
          <ChatView
            conversation={selected}
            onBack={() => setSelectedId(null)}
            onMessageSent={loadConversations}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-muted/50">
              <MessageCircle className="size-8" />
            </div>
            <p className="text-sm">Selecione uma conversa para comecar</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Chat View
// ---------------------------------------------------------------------------

function ChatView({
  conversation,
  onBack,
  onMessageSent,
}: {
  conversation: Conversation
  onBack: () => void
  onMessageSent: () => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Load messages when conversation changes
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setMessages([])

    fetchMessages(conversation.id).then((msgs) => {
      if (cancelled) return
      // Messages come in desc order from API, reverse for chronological display
      const sorted = (msgs as unknown as Message[]).slice().reverse()
      setMessages(sorted)
      setLoading(false)

      // Mark as read
      if (conversation.unreadCount > 0 && sorted.length > 0) {
        const lastInbound = sorted.filter((m) => m.direction === "inbound").pop()
        if (lastInbound) {
          markConversationAsRead(conversation.id, lastInbound.waMessageId).catch(() => {})
        }
      }
    })

    return () => { cancelled = true }
  }, [conversation.id, conversation.unreadCount])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Poll messages every 10s
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const msgs = await fetchMessages(conversation.id)
        setMessages((msgs as unknown as Message[]).slice().reverse())
      } catch { /* silent */ }
    }, 10000)
    return () => clearInterval(interval)
  }, [conversation.id])

  async function handleSend() {
    const trimmed = text.trim()
    if (!trimmed || sending) return

    setSending(true)
    try {
      const result = await sendTextMessage(conversation.id, conversation.contactPhone, trimmed)
      if (!('error' in result)) {
        setText("")
        // Refresh messages
        const msgs = await fetchMessages(conversation.id)
        setMessages((msgs as unknown as Message[]).slice().reverse())
        onMessageSent()
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Chat header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 bg-background">
        <button
          onClick={onBack}
          className="md:hidden flex items-center justify-center size-8 rounded-lg hover:bg-accent transition-colors"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="flex size-9 items-center justify-center rounded-full bg-vox-primary/10 text-vox-primary text-xs font-semibold">
          {getInitials(conversation.contactName)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{conversation.contactName}</p>
          <p className="text-[11px] text-muted-foreground">{conversation.contactPhone}</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                <Skeleton className={`h-10 rounded-2xl ${i % 2 === 0 ? "w-48" : "w-36"}`} />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Nenhuma mensagem ainda
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isOutbound = msg.direction === "outbound"
              return (
                <div key={msg.id} className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm ${
                      isOutbound
                        ? "bg-vox-primary text-white rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    <div
                      className={`flex items-center gap-1 mt-1 ${
                        isOutbound ? "justify-end" : "justify-start"
                      }`}
                    >
                      <span
                        className={`text-[10px] ${
                          isOutbound ? "text-white/70" : "text-muted-foreground"
                        }`}
                      >
                        {formatTime(msg.createdAt)}
                      </span>
                      {isOutbound && (
                        <StatusIcon status={msg.status} />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border/40 p-3 bg-background">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="flex items-center gap-2"
        >
          <Input
            placeholder="Digite uma mensagem..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 h-10 rounded-xl text-sm"
            disabled={sending}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!text.trim() || sending}
            className="size-10 rounded-xl bg-vox-primary hover:bg-vox-primary/90 flex-shrink-0"
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </form>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Status Icon (delivery status)
// ---------------------------------------------------------------------------

function StatusIcon({ status }: { status: string }) {
  const cls = "size-3"
  switch (status) {
    case "read":
      return (
        <svg viewBox="0 0 16 16" className={`${cls} text-white`} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M1 8.5l3.5 3.5L11 5" /><path d="M5 8.5l3.5 3.5L15 5" />
        </svg>
      )
    case "delivered":
      return (
        <svg viewBox="0 0 16 16" className={`${cls} text-white/70`} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M1 8.5l3.5 3.5L11 5" /><path d="M5 8.5l3.5 3.5L15 5" />
        </svg>
      )
    case "sent":
      return (
        <svg viewBox="0 0 16 16" className={`${cls} text-white/70`} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 8.5l4 4L14 5" />
        </svg>
      )
    default:
      return null
  }
}
