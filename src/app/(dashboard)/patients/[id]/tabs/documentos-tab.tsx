"use client"

import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Loader2,
  Upload,
  FileImage,
  FileText,
  FileIcon,
  Eye,
  Trash2,
} from "lucide-react"
import {
  getPatientDocuments,
  uploadPatientDocument,
  getDocumentSignedUrl,
  deletePatientDocument,
} from "@/server/actions/document"
import { toast } from "sonner"
import { friendlyError } from "@/lib/error-messages"
import type { DocumentItem } from "./types"

export default function DocumentosTab({ patientId }: { patientId: string }) {
  const [docs, setDocs] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; description: string; onConfirm: () => void }>({ open: false, title: "", description: "", onConfirm: () => {} })
  const showConfirm = (title: string, description: string, onConfirm: () => void) => {
    setConfirmDialog({ open: true, title, description, onConfirm })
  }

  const loadDocs = React.useCallback(async () => {
    try {
      const data = await getPatientDocuments(patientId)
      setDocs(data)
    } catch { setDocs([]) }
    finally { setLoading(false) }
  }, [patientId])

  React.useEffect(() => { loadDocs() }, [loadDocs])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    const fileList = Array.from(files)
    for (const file of fileList) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Arquivo excede o limite de 10MB. Escolha um arquivo menor.")
        return
      }
    }
    setUploading(true)
    try {
      for (const file of fileList) {
        const fd = new FormData()
        fd.append("file", file)
        const result = await uploadPatientDocument(fd, patientId)
        if ('error' in result) { toast.error(result.error); return }
      }
      loadDocs()
      toast.success("Documento enviado com sucesso")
    } catch (err) {
      toast.error(friendlyError(err, "Erro ao fazer upload"))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function handleView(doc: DocumentItem) {
    try {
      const url = await getDocumentSignedUrl(doc.url)
      window.open(url, "_blank")
    } catch {
      toast.error("Erro ao abrir documento")
    }
  }

  async function handleDelete(docId: string) {
    showConfirm("Excluir documento", "Tem certeza que deseja excluir este documento? Esta acao nao pode ser desfeita.", async () => {
      setDeleting(docId)
      try {
        const result = await deletePatientDocument(docId)
        if ('error' in result) { toast.error(result.error); return }
        loadDocs()
        toast.success("Documento excluido")
      } catch (err) {
        toast.error(friendlyError(err, "Erro ao excluir documento"))
      } finally {
        setDeleting(null)
      }
    })
  }

  function formatSize(bytes: number | null) {
    if (!bytes) return "--"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-muted/30 animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx"
        onChange={handleUpload}
        className="hidden"
      />

      {docs.length === 0 ? (
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={cn(
            "group flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed py-12 text-center cursor-pointer transition-all",
            uploading
              ? "border-vox-primary/30 bg-vox-primary/5"
              : "border-border/50 hover:border-vox-primary/40 hover:bg-vox-primary/[0.02]"
          )}
        >
          {uploading ? (
            <Loader2 className="size-8 text-vox-primary animate-spin" />
          ) : (
            <div className="flex size-14 items-center justify-center rounded-full bg-muted/60 group-hover:bg-vox-primary/10 transition-colors">
              <Upload className="size-6 text-muted-foreground/50 group-hover:text-vox-primary transition-colors" />
            </div>
          )}
          <div>
            <p className="text-sm font-medium">{uploading ? "Enviando..." : "Enviar documento"}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Arraste ou clique — Imagens, PDF ou Word — max 10MB
            </p>
          </div>
        </div>
      ) : (
        <>
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() => !uploading && fileInputRef.current?.click()}
            disabled={uploading}
            className="gap-1.5 rounded-xl text-xs"
          >
            {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
            {uploading ? "Enviando..." : "Enviar documento"}
          </Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {docs.map((doc) => (
            <Card key={doc.id} className="group overflow-hidden">
              <CardContent className="flex items-center gap-3 py-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/60">
                  {doc.type === "image" ? (
                    <FileImage className="size-4 text-vox-primary" />
                  ) : doc.type === "pdf" ? (
                    <FileText className="size-4 text-vox-error" />
                  ) : (
                    <FileIcon className="size-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{doc.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatSize(doc.fileSize)} — {new Date(doc.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleView(doc)}
                    className="flex size-7 items-center justify-center rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                    title="Visualizar"
                  >
                    <Eye className="size-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    disabled={deleting === doc.id}
                    className="flex size-7 items-center justify-center rounded-lg hover:bg-vox-error/10 text-muted-foreground hover:text-vox-error transition-colors"
                    title="Excluir"
                  >
                    {deleting === doc.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        </>
      )}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={() => { confirmDialog.onConfirm(); setConfirmDialog(prev => ({ ...prev, open: false })) }}
      />
    </div>
  )
}
