"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { ERR_UNAUTHORIZED, ERR_WORKSPACE_NOT_CONFIGURED, ERR_EXPENSE_NOT_FOUND, ActionError } from "@/lib/error-messages"

// ─── Auth helper (inline, not shared — Vercel bundler constraint) ────────────

async function getWorkspaceContext() {
  const { userId } = await auth()
  if (!userId) throw new Error(ERR_UNAUTHORIZED)

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true, memberships: { select: { workspaceId: true }, take: 1 } },
  })
  const workspaceId = user?.workspace?.id ?? user?.memberships?.[0]?.workspaceId
  if (!workspaceId) throw new Error(ERR_WORKSPACE_NOT_CONFIGURED)

  return { userId, workspaceId }
}

// ─── Expense Categories ──────────────────────────────────────────────────────

const DEFAULT_CATEGORIES = [
  { name: "Aluguel", icon: "building", color: "#6366F1" },
  { name: "Material e Insumos", icon: "package", color: "#F59E0B" },
  { name: "Salarios e Encargos", icon: "users", color: "#EF4444" },
  { name: "Equipamentos", icon: "wrench", color: "#8B5CF6" },
  { name: "Marketing", icon: "megaphone", color: "#EC4899" },
  { name: "Servicos", icon: "briefcase", color: "#06B6D4" },
  { name: "Impostos e Taxas", icon: "landmark", color: "#64748B" },
  { name: "Outros", icon: "circle-dot", color: "#94A3B8" },
]

export async function seedDefaultCategories(workspaceId: string) {
  const existing = await db.expenseCategory.count({ where: { workspaceId } })
  if (existing > 0) return

  await db.expenseCategory.createMany({
    data: DEFAULT_CATEGORIES.map((cat) => ({
      workspaceId,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      isDefault: true,
    })),
  })
}

export async function getExpenseCategories() {
  const { workspaceId } = await getWorkspaceContext()

  // Seed default categories on first access
  await seedDefaultCategories(workspaceId)

  return db.expenseCategory.findMany({
    where: { workspaceId },
    orderBy: { name: "asc" },
  })
}

export async function createExpenseCategory(data: {
  name: string
  icon?: string
  color?: string
}) {
  const { workspaceId } = await getWorkspaceContext()

  return db.expenseCategory.create({
    data: {
      workspaceId,
      name: data.name,
      icon: data.icon ?? null,
      color: data.color ?? null,
    },
  })
}

// ─── Expenses ────────────────────────────────────────────────────────────────

export async function createExpense(data: {
  description: string
  amount: number // centavos
  categoryId?: string
  dueDate: string // ISO string
  paymentMethod?: string
  recurrence?: "monthly" | "weekly" | "yearly" | null
  recurrenceEnd?: string | null // ISO string
  notes?: string
}) {
  const { userId, workspaceId } = await getWorkspaceContext()

  if (!data.description?.trim()) throw new ActionError("Descricao da despesa e obrigatoria.")
  if (!data.amount || data.amount <= 0) throw new ActionError("Valor da despesa deve ser maior que zero.")
  if (!data.dueDate) throw new ActionError("Data de vencimento e obrigatoria.")

  const isPaidImmediately = !!data.paymentMethod
  const now = new Date()

  return db.$transaction(async (tx) => {
    // Create the parent expense
    const parent = await tx.expense.create({
      data: {
        workspaceId,
        description: data.description,
        amount: data.amount,
        categoryId: data.categoryId || null,
        dueDate: new Date(data.dueDate),
        paymentMethod: isPaidImmediately ? data.paymentMethod : null,
        paidAt: isPaidImmediately ? now : null,
        paidAmount: isPaidImmediately ? data.amount : null,
        status: isPaidImmediately ? "paid" : "pending",
        recurrence: data.recurrence || null,
        recurrenceEnd: data.recurrenceEnd ? new Date(data.recurrenceEnd) : null,
        notes: data.notes || null,
        createdBy: userId,
      },
      include: { category: true },
    })

    // Generate recurring children if applicable
    if (data.recurrence) {
      const children: Array<{
        workspaceId: string
        description: string
        amount: number
        categoryId: string | null
        dueDate: Date
        status: string
        recurrence: string
        recurrenceEnd: Date | null
        parentId: string
        notes: string | null
        createdBy: string
      }> = []

      const baseDate = new Date(data.dueDate)
      const endDate = data.recurrenceEnd
        ? new Date(data.recurrenceEnd)
        : new Date(baseDate.getFullYear() + 1, baseDate.getMonth(), baseDate.getDate()) // 12 months max

      let current = getNextRecurrenceDate(baseDate, data.recurrence)

      while (current <= endDate && children.length < 52) {
        children.push({
          workspaceId,
          description: data.description,
          amount: data.amount,
          categoryId: data.categoryId || null,
          dueDate: current,
          status: "pending",
          recurrence: data.recurrence,
          recurrenceEnd: data.recurrenceEnd ? new Date(data.recurrenceEnd) : null,
          parentId: parent.id,
          notes: data.notes || null,
          createdBy: userId,
        })
        current = getNextRecurrenceDate(current, data.recurrence)
      }

      if (children.length > 0) {
        await tx.expense.createMany({ data: children })
      }
    }

    return parent
  })
}

function getNextRecurrenceDate(
  date: Date,
  recurrence: "monthly" | "weekly" | "yearly"
): Date {
  const next = new Date(date)
  switch (recurrence) {
    case "weekly":
      next.setDate(next.getDate() + 7)
      break
    case "monthly": {
      const expectedMonth = (next.getMonth() + 1) % 12
      next.setMonth(next.getMonth() + 1)
      // Clamp to last day of target month if overflow occurred
      if (next.getMonth() !== expectedMonth) {
        next.setDate(0)
      }
      break
    }
    case "yearly": {
      const expectedMonth = next.getMonth()
      next.setFullYear(next.getFullYear() + 1)
      // Clamp to last day of target month if overflow occurred (e.g. Feb 29 → Mar 1)
      if (next.getMonth() !== expectedMonth) {
        next.setDate(0)
      }
      break
    }
  }
  return next
}

export async function updateExpense(
  id: string,
  data: {
    description?: string
    amount?: number
    categoryId?: string | null
    dueDate?: string
    paymentMethod?: string | null
    notes?: string | null
    status?: string
  }
) {
  const { workspaceId } = await getWorkspaceContext()

  if (data.description !== undefined && !data.description.trim()) throw new ActionError("Descricao da despesa e obrigatoria.")
  if (data.amount !== undefined && data.amount <= 0) throw new ActionError("Valor da despesa deve ser maior que zero.")

  const expense = await db.expense.findUnique({ where: { id } })
  if (!expense || expense.workspaceId !== workspaceId) {
    throw new Error(ERR_EXPENSE_NOT_FOUND)
  }

  return db.expense.update({
    where: { id },
    data: {
      ...(data.description !== undefined && { description: data.description }),
      ...(data.amount !== undefined && { amount: data.amount }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
      ...(data.dueDate !== undefined && { dueDate: new Date(data.dueDate) }),
      ...(data.paymentMethod !== undefined && { paymentMethod: data.paymentMethod }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.status !== undefined && { status: data.status }),
    },
    include: { category: true },
  })
}

export async function deleteExpense(id: string, deleteRecurrence = false) {
  const { workspaceId } = await getWorkspaceContext()

  const expense = await db.expense.findUnique({ where: { id } })
  if (!expense || expense.workspaceId !== workspaceId) {
    throw new Error(ERR_EXPENSE_NOT_FOUND)
  }

  if (deleteRecurrence) {
    // Delete all future children (not yet paid) + this expense
    const rootId = expense.parentId ?? expense.id

    await db.expense.deleteMany({
      where: {
        workspaceId,
        OR: [
          { id: rootId },
          { parentId: rootId },
        ],
        // Only delete future unpaid ones + the selected one
        AND: [
          {
            OR: [
              { id },
              { dueDate: { gte: new Date() }, status: { not: "paid" } },
            ],
          },
        ],
      },
    })
  } else {
    await db.expense.delete({ where: { id } })
  }

  return { success: true }
}

export async function payExpense(
  id: string,
  data: {
    paidAmount: number // centavos
    paymentMethod: string
    paidAt?: string // ISO string
  }
) {
  const { workspaceId } = await getWorkspaceContext()

  if (!data.paidAmount || data.paidAmount <= 0) throw new ActionError("Valor do pagamento deve ser maior que zero.")

  const expense = await db.expense.findUnique({ where: { id } })
  if (!expense || expense.workspaceId !== workspaceId) {
    throw new Error(ERR_EXPENSE_NOT_FOUND)
  }

  return db.expense.update({
    where: { id },
    data: {
      paidAmount: data.paidAmount,
      paymentMethod: data.paymentMethod,
      paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
      status: "paid",
    },
    include: { category: true },
  })
}

export async function getExpenses(params?: {
  status?: string
  categoryId?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}) {
  const { workspaceId } = await getWorkspaceContext()

  const page = params?.page ?? 1
  const pageSize = params?.pageSize ?? 50
  const skip = (page - 1) * pageSize

  // Build where clause
  const where: Record<string, unknown> = { workspaceId }

  if (params?.status) {
    where.status = params.status
  }
  if (params?.categoryId) {
    where.categoryId = params.categoryId
  }
  if (params?.startDate || params?.endDate) {
    where.dueDate = {
      ...(params?.startDate && { gte: new Date(params.startDate) }),
      ...(params?.endDate && { lte: new Date(params.endDate) }),
    }
  }

  // Update overdue status for pending expenses
  const now = new Date()
  await db.expense.updateMany({
    where: {
      workspaceId,
      status: "pending",
      dueDate: { lt: now },
    },
    data: { status: "overdue" },
  })

  const [expenses, total] = await Promise.all([
    db.expense.findMany({
      where,
      include: { category: true },
      orderBy: { dueDate: "desc" },
      skip,
      take: pageSize,
    }),
    db.expense.count({ where }),
  ])

  return {
    expenses,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}
