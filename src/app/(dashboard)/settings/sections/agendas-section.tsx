"use client"

import { useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { CalendarDays, Plus, Check, Loader2, Palette, Trash2, ChevronDown, Clock, Settings2 } from "lucide-react"
import { toast } from "sonner"
import { friendlyError } from "@/lib/error-messages"
import { VALID_SLOT_DURATIONS, VALID_BUFFER_VALUES, VALID_CONFLICT_WINDOWS } from "@/lib/scheduling-rules"
import {
  getAgendas,
  createAgenda,
  updateAgenda,
  deleteAgenda,
} from "@/server/actions/agenda"

const AGENDA_COLORS = [
  "#14B8A6", "#3B82F6", "#8B5CF6", "#EC4899",
  "#F59E0B", "#10B981", "#EF4444", "#6366F1",
]

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

const MIN_NOTICE_OPTIONS = [
  { value: 0, label: "Sem mínimo" },
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hora" },
  { value: 120, label: "2 horas" },
  { value: 240, label: "4 horas" },
  { value: 720, label: "12 horas" },
  { value: 1440, label: "24 horas" },
]

type AgendaData = {
  id: string; name: string; color: string; isDefault: boolean; isActive: boolean; appointmentCount: number
  slotDuration: number; bufferBefore: number; bufferAfter: number; conflictWindow: number
  operatingHours: Record<number, { start: string; end: string } | null> | null
  maxBookingsPerDay: number | null; minNoticeMinutes: number
}

export function AgendasSection() {
  const [loading, setLoading] = useState(true)
  const [agendas, setAgendas] = useState<AgendaData[]>([])
  const [newName, setNewName] = useState("")
  const [newColor, setNewColor] = useState("#3B82F6")
  const [showNewForm, setShowNewForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editColor, setEditColor] = useState("")
  const [editSlotDuration, setEditSlotDuration] = useState(30)
  const [editBufferBefore, setEditBufferBefore] = useState(0)
  const [editBufferAfter, setEditBufferAfter] = useState(0)
  const [editConflictWindow, setEditConflictWindow] = useState(30)
  const [editOperatingHours, setEditOperatingHours] = useState<Record<number, { start: string; end: string } | null> | null>(null)
  const [editMaxBookingsPerDay, setEditMaxBookingsPerDay] = useState<number | null>(null)
  const [editMinNotice, setEditMinNotice] = useState(0)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showSchedulingRules, setShowSchedulingRules] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; description: string; onConfirm: () => void }>({ open: false, title: "", description: "", onConfirm: () => {} })
  const showConfirm = (title: string, description: string, onConfirm: () => void) => {
    setConfirmDialog({ open: true, title, description, onConfirm })
  }

  const loadAgendas = useCallback(async () => {
    try {
      const data = await getAgendas()
      setAgendas(data)
    } catch {
      toast.error("Erro ao carregar agendas")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAgendas() }, [loadAgendas])

  function startEditing(agenda: AgendaData) {
    setEditingId(agenda.id)
    setEditName(agenda.name)
    setEditColor(agenda.color)
    setEditSlotDuration(agenda.slotDuration)
    setEditBufferBefore(agenda.bufferBefore)
    setEditBufferAfter(agenda.bufferAfter)
    setEditConflictWindow(agenda.conflictWindow)
    setEditOperatingHours(agenda.operatingHours)
    setEditMaxBookingsPerDay(agenda.maxBookingsPerDay)
    setEditMinNotice(agenda.minNoticeMinutes)
    setShowSchedulingRules(false)
    setShowAdvanced(false)
  }

  async function handleCreate() {
    if (!newName.trim()) return
    setActionLoading("create")
    try {
      const result = await createAgenda({ name: newName.trim(), color: newColor })
      if ('error' in result) { toast.error(result.error); return }
      setNewName("")
      setNewColor("#3B82F6")
      setShowNewForm(false)
      await loadAgendas()
      toast.success("Agenda criada")
    } catch (err) {
      toast.error(friendlyError(err, "Erro ao criar agenda"))
    } finally {
      setActionLoading(null)
    }
  }

  async function handleUpdate(id: string) {
    setActionLoading(id)
    try {
      const result = await updateAgenda(id, {
        name: editName.trim(),
        color: editColor,
        slotDuration: editSlotDuration,
        bufferBefore: editBufferBefore,
        bufferAfter: editBufferAfter,
        conflictWindow: editConflictWindow,
        operatingHours: editOperatingHours,
        maxBookingsPerDay: editMaxBookingsPerDay,
        minNoticeMinutes: editMinNotice,
      })
      if ('error' in result) { toast.error(result.error); return }
      setEditingId(null)
      await loadAgendas()
      toast.success("Agenda atualizada")
    } catch (err) {
      toast.error(friendlyError(err, "Erro ao atualizar"))
    } finally {
      setActionLoading(null)
    }
  }

  async function handleToggleActive(id: string, isActive: boolean) {
    setActionLoading(id)
    try {
      const result = await updateAgenda(id, { isActive: !isActive })
      if ('error' in result) { toast.error(result.error); return }
      await loadAgendas()
    } catch (err) {
      toast.error(friendlyError(err, "Erro ao alterar status"))
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDelete(id: string) {
    showConfirm("Excluir agenda", "Tem certeza que deseja excluir esta agenda? Todas as consultas vinculadas serao desvinculadas.", async () => {
      setActionLoading(id)
      try {
        const result = await deleteAgenda(id)
        if ('error' in result) { toast.error(result.error); return }
        await loadAgendas()
        toast.success("Agenda excluida")
      } catch (err) {
        toast.error(friendlyError(err, "Erro ao excluir"))
      } finally {
        setActionLoading(null)
      }
    })
  }

  function updateOperatingDay(day: number, enabled: boolean) {
    const hours = editOperatingHours ? { ...editOperatingHours } : {}
    if (enabled) {
      hours[day] = hours[day] || { start: "08:00", end: "18:00" }
    } else {
      hours[day] = null
    }
    setEditOperatingHours(hours)
  }

  function updateOperatingTime(day: number, field: "start" | "end", value: string) {
    const hours = editOperatingHours ? { ...editOperatingHours } : {}
    const existing = hours[day]
    if (existing) {
      hours[day] = { ...existing, [field]: value }
      setEditOperatingHours(hours)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="size-4 text-vox-primary" />
            Agendas
          </CardTitle>
          <Button
            size="sm"
            onClick={() => setShowNewForm(true)}
            className="bg-vox-primary hover:bg-vox-primary/90 text-white rounded-xl text-xs gap-1.5"
          >
            <Plus className="size-3.5" />
            Nova Agenda
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Gerencie as agendas do seu workspace. Cada profissional ou sala pode ter sua propria agenda.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* New agenda form */}
        {showNewForm && (
          <div className="rounded-xl border border-vox-primary/30 bg-vox-primary/5 p-4 space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Nome da agenda</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Dr. Silva, Sala 1..."
                className="rounded-xl text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Cor</Label>
              <div className="flex gap-2">
                {AGENDA_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={`size-7 rounded-full border-2 transition-all ${
                      newColor === c ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={!newName.trim() || actionLoading === "create"}
                className="bg-vox-primary hover:bg-vox-primary/90 text-white rounded-xl text-xs gap-1.5"
              >
                {actionLoading === "create" ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                Criar
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setShowNewForm(false); setNewName("") }} className="rounded-xl text-xs">
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Agenda list */}
        {agendas.map((agenda) => (
          <div
            key={agenda.id}
            className={`rounded-xl border transition-all ${
              agenda.isActive ? "border-border/40" : "border-border/20 opacity-50"
            } ${editingId === agenda.id ? "p-4 space-y-4" : "flex items-center gap-3 p-3"}`}
          >
            {editingId === agenda.id ? (
              /* Edit mode */
              <div className="space-y-4">
                {/* Name + Color */}
                <div className="space-y-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="rounded-xl text-sm"
                    onKeyDown={(e) => e.key === "Enter" && handleUpdate(agenda.id)}
                  />
                  <div className="flex gap-2">
                    {AGENDA_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setEditColor(c)}
                        className={`size-6 rounded-full border-2 transition-all ${
                          editColor === c ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                {/* Scheduling Rules Toggle */}
                <button
                  onClick={() => setShowSchedulingRules(!showSchedulingRules)}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
                >
                  <Settings2 className="size-3.5" />
                  <span className="font-medium">Regras de agendamento</span>
                  <ChevronDown className={`size-3.5 ml-auto transition-transform ${showSchedulingRules ? "rotate-180" : ""}`} />
                </button>

                {showSchedulingRules && (
                  <div className="space-y-4 pl-1 border-l-2 border-vox-primary/20 ml-1.5">
                    {/* Slot Duration */}
                    <div className="space-y-1.5 pl-3">
                      <Label className="text-xs text-muted-foreground">Duração do slot</Label>
                      <div className="flex gap-1.5">
                        {VALID_SLOT_DURATIONS.map((d) => (
                          <button
                            key={d}
                            onClick={() => setEditSlotDuration(d)}
                            className={`h-8 px-3 rounded-lg text-xs font-medium transition-all ${
                              editSlotDuration === d
                                ? "bg-vox-primary text-white"
                                : "bg-muted/60 text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            {d}min
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Buffer Before/After */}
                    <div className="grid grid-cols-2 gap-3 pl-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Intervalo antes</Label>
                        <select
                          value={editBufferBefore}
                          onChange={(e) => setEditBufferBefore(Number(e.target.value))}
                          className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs"
                        >
                          {VALID_BUFFER_VALUES.map((v) => (
                            <option key={v} value={v}>{v === 0 ? "Nenhum" : `${v} min`}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Intervalo depois</Label>
                        <select
                          value={editBufferAfter}
                          onChange={(e) => setEditBufferAfter(Number(e.target.value))}
                          className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs"
                        >
                          {VALID_BUFFER_VALUES.map((v) => (
                            <option key={v} value={v}>{v === 0 ? "Nenhum" : `${v} min`}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Conflict Window */}
                    <div className="space-y-1.5 pl-3">
                      <Label className="text-xs text-muted-foreground">Janela de conflito</Label>
                      <select
                        value={editConflictWindow}
                        onChange={(e) => setEditConflictWindow(Number(e.target.value))}
                        className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs"
                      >
                        {VALID_CONFLICT_WINDOWS.map((v) => (
                          <option key={v} value={v}>{v === 0 ? "Sem alerta" : `${v} min`}</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-muted-foreground/60">
                        Alerta ao agendar dentro deste intervalo de outra consulta
                      </p>
                    </div>

                    {/* Operating Hours */}
                    <div className="space-y-2 pl-3">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Clock className="size-3" />
                        Horários de funcionamento
                      </Label>
                      <p className="text-[10px] text-muted-foreground/60">
                        Deixe desativado para usar os horários globais
                      </p>
                      <div className="space-y-1.5">
                        {DAY_LABELS.map((label, dayIdx) => {
                          const dayConfig = editOperatingHours?.[dayIdx]
                          const isEnabled = dayConfig !== null && dayConfig !== undefined
                          return (
                            <div key={dayIdx} className="flex items-center gap-2">
                              <span className="text-[11px] font-medium w-8 text-muted-foreground">{label}</span>
                              <Switch
                                checked={isEnabled}
                                onCheckedChange={(checked) => updateOperatingDay(dayIdx, checked)}
                                className="scale-75"
                              />
                              {isEnabled ? (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="time"
                                    value={dayConfig?.start || "08:00"}
                                    onChange={(e) => updateOperatingTime(dayIdx, "start", e.target.value)}
                                    className="h-7 w-[90px] rounded-lg border border-input bg-background px-2 text-[11px]"
                                  />
                                  <span className="text-[10px] text-muted-foreground">até</span>
                                  <input
                                    type="time"
                                    value={dayConfig?.end || "18:00"}
                                    onChange={(e) => updateOperatingTime(dayIdx, "end", e.target.value)}
                                    className="h-7 w-[90px] rounded-lg border border-input bg-background px-2 text-[11px]"
                                  />
                                </div>
                              ) : (
                                <span className="text-[11px] text-muted-foreground/40">Fechado</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Advanced */}
                    <button
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors pl-3"
                    >
                      Avançado
                      <ChevronDown className={`size-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                    </button>

                    {showAdvanced && (
                      <div className="grid grid-cols-2 gap-3 pl-3">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] text-muted-foreground">Máx agendamentos/dia</Label>
                          <Input
                            type="number"
                            value={editMaxBookingsPerDay ?? ""}
                            onChange={(e) => setEditMaxBookingsPerDay(e.target.value ? Number(e.target.value) : null)}
                            placeholder="Ilimitado"
                            className="rounded-xl text-xs h-8"
                            min={1}
                            max={100}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] text-muted-foreground">Antecedência mínima</Label>
                          <select
                            value={editMinNotice}
                            onChange={(e) => setEditMinNotice(Number(e.target.value))}
                            className="w-full h-8 rounded-xl border border-input bg-background px-2 text-xs"
                          >
                            {MIN_NOTICE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Save / Cancel */}
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleUpdate(agenda.id)} disabled={actionLoading === agenda.id} className="bg-vox-primary hover:bg-vox-primary/90 text-white rounded-xl text-xs gap-1">
                    {actionLoading === agenda.id ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                    Salvar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="rounded-xl text-xs">Cancelar</Button>
                </div>
              </div>
            ) : (
              /* View mode */
              <>
                <span className="size-3 rounded-full shrink-0" style={{ backgroundColor: agenda.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{agenda.name}</span>
                    {agenda.isDefault && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Padrao</Badge>}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {agenda.appointmentCount} consulta(s)
                    {agenda.slotDuration !== 30 && ` · ${agenda.slotDuration}min`}
                    {(agenda.bufferBefore > 0 || agenda.bufferAfter > 0) && ` · buffer ${agenda.bufferBefore}/${agenda.bufferAfter}`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {!agenda.isDefault && (
                    <Switch
                      checked={agenda.isActive}
                      onCheckedChange={() => handleToggleActive(agenda.id, agenda.isActive)}
                      disabled={actionLoading === agenda.id}
                    />
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEditing(agenda)}
                    className="size-8 p-0 rounded-lg"
                  >
                    <Palette className="size-3.5 text-muted-foreground" />
                  </Button>
                  {!agenda.isDefault && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(agenda.id)}
                      disabled={actionLoading === agenda.id}
                      className="size-8 p-0 rounded-lg text-muted-foreground hover:text-vox-error"
                    >
                      {actionLoading === agenda.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}

        {agendas.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <CalendarDays className="size-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhuma agenda encontrada</p>
          </div>
        )}
      </CardContent>
    </Card>
    <ConfirmDialog
      open={confirmDialog.open}
      onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
      title={confirmDialog.title}
      description={confirmDialog.description}
      onConfirm={() => { confirmDialog.onConfirm(); setConfirmDialog(prev => ({ ...prev, open: false })) }}
    />
    </>
  )
}
