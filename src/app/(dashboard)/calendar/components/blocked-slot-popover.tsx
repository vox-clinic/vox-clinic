"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Ban, Pencil, Trash2, Repeat, X, Loader2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { BlockedSlotItem } from "@/server/actions/blocked-slot"

interface BlockedSlotPopoverProps {
  slot: BlockedSlotItem
  position: { top: number; left: number }
  onUpdate: (id: string, data: { title?: string; startDate?: string; endDate?: string; allDay?: boolean; recurring?: string | null }) => Promise<void>
  onDelete: (id: string) => void
  onClose: () => void
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
}

function toDateInputValue(iso: string) {
  return iso.slice(0, 10)
}

function toTimeInputValue(iso: string) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

export function BlockedSlotPopover({ slot, position, onUpdate, onDelete, onClose }: BlockedSlotPopoverProps) {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState(slot.title)
  const [startDate, setStartDate] = useState(toDateInputValue(slot.startDate))
  const [startTime, setStartTime] = useState(toTimeInputValue(slot.startDate))
  const [endDate, setEndDate] = useState(toDateInputValue(slot.endDate))
  const [endTime, setEndTime] = useState(toTimeInputValue(slot.endDate))
  const [allDay, setAllDay] = useState(slot.allDay)
  const [recurring, setRecurring] = useState(slot.recurring || "")

  const popoverRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [onClose])

  // Position popover within viewport
  const [adjustedPos, setAdjustedPos] = useState(position)
  useEffect(() => {
    if (!popoverRef.current) return
    const rect = popoverRef.current.getBoundingClientRect()
    const newPos = { ...position }
    if (rect.right > window.innerWidth - 16) {
      newPos.left = Math.max(16, position.left - rect.width)
    }
    if (rect.bottom > window.innerHeight - 16) {
      newPos.top = Math.max(16, position.top - rect.height)
    }
    setAdjustedPos(newPos)
  }, [position, editing])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const start = allDay ? `${startDate}T00:00:00` : `${startDate}T${startTime}:00`
      const end = allDay ? `${endDate}T23:59:59` : `${endDate}T${endTime}:00`
      await onUpdate(slot.id, {
        title: title.trim(),
        startDate: new Date(start).toISOString(),
        endDate: new Date(end).toISOString(),
        allDay,
        recurring: recurring || null,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }, [slot.id, title, startDate, startTime, endDate, endTime, allDay, recurring, onUpdate, onClose])

  const handleDelete = useCallback(async () => {
    setDeleting(true)
    onDelete(slot.id)
  }, [slot.id, onDelete])

  const isExpanded = slot.isExpanded

  return (
    <div
      ref={popoverRef}
      className="fixed z-50 w-72 rounded-xl border border-border/60 bg-popover shadow-lg animate-in fade-in-0 zoom-in-95"
      style={{ top: adjustedPos.top, left: adjustedPos.left }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/40">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Ban className="size-3.5" />
          Bloqueio
        </div>
        <div className="flex items-center gap-1">
          {!editing && !isExpanded && (
            <button
              onClick={() => setEditing(true)}
              className="p-1 rounded-md hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
              title="Editar"
            >
              <Pencil className="size-3.5" />
            </button>
          )}
          {!editing && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
              title={isExpanded ? "Excluir todas ocorrências" : "Excluir"}
            >
              {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            </button>
          )}
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted/60 text-muted-foreground">
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {!editing ? (
          /* View mode */
          <div className="space-y-2">
            <p className="text-sm font-semibold">{slot.title}</p>
            <div className="text-xs text-muted-foreground space-y-1">
              {slot.allDay ? (
                <p>Dia inteiro</p>
              ) : (
                <p>{formatDateTime(slot.startDate)} — {formatDateTime(slot.endDate)}</p>
              )}
              {slot.recurring && (
                <p className="flex items-center gap-1">
                  <Repeat className="size-3" /> Semanal
                </p>
              )}
              {isExpanded && (
                <p className="text-[10px] text-muted-foreground/60 italic mt-1">
                  Ocorrência de bloqueio recorrente. Edite o original para alterar.
                </p>
              )}
            </div>
          </div>
        ) : (
          /* Edit mode */
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Título</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-xl text-sm h-8"
                autoFocus
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="rounded border-border accent-vox-primary size-3.5"
              />
              <span className="text-xs">Dia inteiro</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px]">Início</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-xl text-xs h-8" />
              </div>
              {!allDay && (
                <div className="space-y-1">
                  <Label className="text-[10px]">Hora</Label>
                  <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="rounded-xl text-xs h-8" />
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-[10px]">Fim</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-xl text-xs h-8" />
              </div>
              {!allDay && (
                <div className="space-y-1">
                  <Label className="text-[10px]">Hora</Label>
                  <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="rounded-xl text-xs h-8" />
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Repetir</Label>
              <select
                value={recurring}
                onChange={(e) => setRecurring(e.target.value)}
                className="w-full h-8 rounded-xl border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-vox-primary/30"
              >
                <option value="">Nenhum</option>
                <option value="weekly">Semanal</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setEditing(false)} className="rounded-xl text-xs h-7">
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!title.trim() || !startDate || saving}
                className="bg-vox-primary hover:bg-vox-primary/90 text-white rounded-xl text-xs h-7 gap-1"
              >
                {saving ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                Salvar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
