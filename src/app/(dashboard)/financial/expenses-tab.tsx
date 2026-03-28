"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Plus,
  MoreHorizontal,
  CreditCard,
  Pencil,
  Trash2,
  Repeat,
} from "lucide-react"
import { toast } from "sonner"
import { friendlyError } from "@/lib/error-messages"
import { ConfirmDialog } from "@/components/confirm-dialog"
import {
  getExpenses,
  getExpenseCategories,
  deleteExpense,
  payExpense,
} from "@/server/actions/expense"
import CreateExpenseDialog from "./create-expense-dialog"
import EditExpenseDialog from "./edit-expense-dialog"

const formatBRL = (value: number) =>
  (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "secondary" },
  paid: { label: "Pago", variant: "default" },
  overdue: { label: "Vencido", variant: "destructive" },
  cancelled: { label: "Cancelado", variant: "outline" },
}

const PAYMENT_METHODS: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  credito: "Credito",
  debito: "Debito",
  boleto: "Boleto",
  transferencia: "Transferencia",
  outro: "Outro",
}

type ExpenseWithCategory = Awaited<ReturnType<typeof getExpenses>>["expenses"][number]
type Category = Awaited<ReturnType<typeof getExpenseCategories>>[number]

export default function ExpensesTab() {
  const [loading, setLoading] = useState(true)
  const [expenses, setExpenses] = useState<ExpenseWithCategory[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<ExpenseWithCategory | null>(null)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [payForm, setPayForm] = useState({
    amount: "",
    method: "pix",
  })
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; description: string; onConfirm: () => void }>({ open: false, title: "", description: "", onConfirm: () => {} })
  const showConfirm = (title: string, description: string, onConfirm: () => void) => {
    setConfirmDialog({ open: true, title, description, onConfirm })
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [expenseData, cats] = await Promise.all([
        getExpenses({
          status: statusFilter !== "all" ? statusFilter : undefined,
          categoryId: categoryFilter !== "all" ? categoryFilter : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          page,
          pageSize: 30,
        }),
        getExpenseCategories(),
      ])
      setExpenses(expenseData.expenses)
      setTotal(expenseData.total)
      setTotalPages(expenseData.totalPages)
      setCategories(cats)
    } catch {
      toast.error("Erro ao carregar despesas")
    } finally {
      setLoading(false)
    }
  }, [statusFilter, categoryFilter, startDate, endDate, page])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [statusFilter, categoryFilter, startDate, endDate])

  const executeDelete = async (id: string, deleteAll: boolean) => {
    try {
      await deleteExpense(id, deleteAll)
      toast.success("Despesa excluida")
      loadData()
    } catch (err) {
      toast.error(friendlyError(err, "Erro ao excluir despesa"))
    }
  }

  const handleDelete = (id: string, hasRecurrence: boolean) => {
    showConfirm(
      "Excluir despesa",
      hasRecurrence
        ? "Deseja excluir tambem as recorrencias futuras desta despesa?"
        : "Tem certeza que deseja excluir esta despesa? Esta acao nao pode ser desfeita.",
      () => executeDelete(id, hasRecurrence),
    )
  }

  const handlePay = async (id: string) => {
    const amount = Math.round(parseFloat(payForm.amount.replace(",", ".")) * 100)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Valor invalido")
      return
    }

    try {
      await payExpense(id, {
        paidAmount: amount,
        paymentMethod: payForm.method,
      })
      toast.success("Despesa marcada como paga")
      setPayingId(null)
      setPayForm({ amount: "", method: "pix" })
      loadData()
    } catch (err) {
      toast.error(friendlyError(err, "Erro ao registrar pagamento"))
    }
  }

  if (loading && expenses.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-9 w-36" />
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
            <SelectTrigger className="w-[140px] rounded-xl text-sm h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="overdue">Vencido</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "all")}>
            <SelectTrigger className="w-[180px] rounded-xl text-sm h-9">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <span className="flex items-center gap-2">
                    {cat.color && (
                      <span
                        className="inline-block size-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                    )}
                    {cat.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-[140px] rounded-xl text-sm h-9"
            placeholder="De"
          />
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-[140px] rounded-xl text-sm h-9"
            placeholder="Ate"
          />
        </div>

        <Button
          onClick={() => setCreateOpen(true)}
          className="rounded-xl h-9 bg-vox-primary hover:bg-vox-primary/90"
        >
          <Plus className="size-4 mr-1.5" />
          Nova Despesa
        </Button>
      </div>

      {/* Expenses Table */}
      <Card className="rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descricao</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Metodo</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    Nenhuma despesa encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {expense.description}
                        </span>
                        {expense.recurrence && (
                          <Repeat className="size-3.5 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {expense.category ? (
                        <span className="flex items-center gap-1.5 text-sm">
                          {expense.category.color && (
                            <span
                              className="inline-block size-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: expense.category.color }}
                            />
                          )}
                          {expense.category.name}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm font-semibold text-vox-error tabular-nums">
                        {formatBRL(expense.amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm tabular-nums">
                        {new Date(expense.dueDate).toLocaleDateString("pt-BR")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_LABELS[expense.status]?.variant ?? "secondary"}>
                        {STATUS_LABELS[expense.status]?.label ?? expense.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {expense.paymentMethod
                          ? (PAYMENT_METHODS[expense.paymentMethod] ?? expense.paymentMethod)
                          : "--"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {/* Inline pay form */}
                      {payingId === expense.id ? (
                        <div className="flex items-center gap-2 min-w-[280px]">
                          <Input
                            type="text"
                            placeholder="Valor (R$)"
                            value={payForm.amount}
                            onChange={(e) =>
                              setPayForm((prev) => ({ ...prev, amount: e.target.value }))
                            }
                            className="w-24 h-8 text-sm rounded-lg"
                          />
                          <Select
                            value={payForm.method}
                            onValueChange={(v) =>
                              setPayForm((prev) => ({ ...prev, method: v ?? "pix" }))
                            }
                          >
                            <SelectTrigger className="w-28 h-8 text-xs rounded-lg">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
                                <SelectItem key={k} value={k}>
                                  {v}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            className="h-8 rounded-lg text-xs"
                            onClick={() => handlePay(expense.id)}
                          >
                            OK
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 rounded-lg text-xs"
                            onClick={() => {
                              setPayingId(null)
                              setPayForm({ amount: "", method: "pix" })
                            }}
                          >
                            X
                          </Button>
                        </div>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={<Button variant="ghost" size="sm" className="size-8 p-0" />}
                          >
                            <MoreHorizontal className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {expense.status !== "paid" && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setPayingId(expense.id)
                                  setPayForm({
                                    amount: (expense.amount / 100).toFixed(2).replace(".", ","),
                                    method: "pix",
                                  })
                                }}
                              >
                                <CreditCard className="size-4 mr-2" />
                                Pagar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => setEditingExpense(expense)}>
                              <Pencil className="size-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-vox-error"
                              onClick={() =>
                                handleDelete(
                                  expense.id,
                                  !!(expense.recurrence && (expense.parentId || expense.id))
                                )
                              }
                            >
                              <Trash2 className="size-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {total} despesa{total !== 1 ? "s" : ""} encontrada{total !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-xl"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <span className="text-muted-foreground tabular-nums">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-xl"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Proximo
            </Button>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <CreateExpenseDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        categories={categories}
        onCreated={loadData}
      />
      <EditExpenseDialog
        open={!!editingExpense}
        onOpenChange={(open) => !open && setEditingExpense(null)}
        expense={editingExpense}
        categories={categories}
        onSaved={() => { setEditingExpense(null); loadData() }}
      />
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
