"use client"

import { useState, useEffect, useTransition } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, FileText, Trash2, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { getTemplates, deleteTemplate } from "@/server/actions/prescription-template"
import { toast } from "sonner"

interface TemplateItem {
  name: string
  dosage: string
  frequency: string
  duration: string
  instructions?: string
}

interface Template {
  id: string
  name: string
  description: string | null
  specialty: string | null
  items: TemplateItem[]
  notes: string | null
  isShared: boolean
  usageCount: number
  createdAt: string
}

export function PrescriptionTemplatePicker({
  onApply,
}: {
  onApply: (items: TemplateItem[], notes: string | null) => void
}) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [expanded, setExpanded] = useState(false)
  const [deleting, startDelete] = useTransition()

  useEffect(() => {
    if (!expanded) return
    setLoading(true)
    getTemplates()
      .then((result) => {
        if ("error" in result) {
          toast.error(result.error)
          return
        }
        setTemplates(result.templates)
      })
      .catch(() => toast.error("Erro ao carregar templates"))
      .finally(() => setLoading(false))
  }, [expanded])

  const filtered = templates.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.specialty?.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = (id: string) => {
    startDelete(async () => {
      const result = await deleteTemplate(id)
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      setTemplates((prev) => prev.filter((t) => t.id !== id))
      toast.success("Template removido")
    })
  }

  return (
    <div className="rounded-xl border border-border/60 bg-muted/10">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <FileText className="size-3.5" />
          Templates de prescrição
          {templates.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {templates.length}
            </Badge>
          )}
        </span>
        {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
      </button>

      {expanded && (
        <div className="border-t border-border/40 px-3 pb-3 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3 text-center">
              Nenhum template salvo. Crie uma prescrição e salve como template.
            </p>
          ) : (
            <>
              {templates.length > 3 && (
                <div className="relative pt-2">
                  <Search className="absolute left-2.5 top-1/2 mt-1 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar template..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>
              )}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pt-1">
                {filtered.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between rounded-lg border border-border/40 px-2.5 py-2 hover:bg-muted/40 transition-colors cursor-pointer group"
                    onClick={() => onApply(template.items, template.notes)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium truncate">{template.name}</span>
                        {template.specialty && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">
                            {template.specialty}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {template.items.length} medicamento{template.items.length !== 1 ? "s" : ""}
                        {template.usageCount > 0 && (
                          <> · usado {template.usageCount}x</>
                        )}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0 ml-1"
                      disabled={deleting}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(template.id)
                      }}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <p className="text-xs text-muted-foreground py-2 text-center">
                    Nenhum template encontrado.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
