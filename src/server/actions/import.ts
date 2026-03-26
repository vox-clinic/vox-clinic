"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { logAudit } from "@/lib/audit"

async function getWorkspaceContext() {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true },
  })
  if (!user?.workspace) throw new Error("Workspace not configured")

  return { workspaceId: user.workspace.id, clerkId: userId }
}

function normalizeCPF(doc: string): string | null {
  const digits = doc.replace(/\D/g, "")
  if (digits.length !== 11) return null
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
}

type ImportRow = {
  name: string
  document?: string | null
  phone?: string | null
  email?: string | null
  birthDate?: string | null
}

export async function importPatients(rows: ImportRow[]) {
  const { workspaceId, clerkId } = await getWorkspaceContext()

  const validRows: {
    workspaceId: string
    name: string
    document: string | null
    phone: string | null
    email: string | null
    birthDate: Date | null
  }[] = []
  const errors: { row: number; reason: string }[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const name = row.name?.trim()
    if (!name) {
      errors.push({ row: i + 1, reason: "Nome obrigatorio" })
      continue
    }

    let document: string | null = null
    if (row.document?.trim()) {
      document = normalizeCPF(row.document.trim())
      if (!document) {
        errors.push({ row: i + 1, reason: `CPF invalido: ${row.document}` })
        continue
      }
    }

    let birthDate: Date | null = null
    if (row.birthDate?.trim()) {
      // Try DD/MM/YYYY first, then ISO
      const parts = row.birthDate.trim().match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/)
      if (parts) {
        birthDate = new Date(Number(parts[3]), Number(parts[2]) - 1, Number(parts[1]))
      } else {
        const parsed = new Date(row.birthDate.trim())
        if (!isNaN(parsed.getTime())) {
          birthDate = parsed
        }
      }
    }

    validRows.push({
      workspaceId,
      name,
      document,
      phone: row.phone?.trim() || null,
      email: row.email?.trim() || null,
      birthDate,
    })
  }

  if (validRows.length === 0) {
    return { created: 0, skipped: rows.length, errors }
  }

  const result = await db.patient.createMany({
    data: validRows,
    skipDuplicates: true,
  })

  const skipped = validRows.length - result.count

  await logAudit({
    workspaceId,
    userId: clerkId,
    action: "IMPORT_PATIENTS",
    entityType: "Patient",
    entityId: workspaceId,
    details: {
      totalRows: rows.length,
      validRows: validRows.length,
      created: result.count,
      skippedDuplicates: skipped,
      validationErrors: errors.length,
    },
  })

  return {
    created: result.count,
    skipped: skipped + errors.length,
    errors,
  }
}
