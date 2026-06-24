import { ref, computed } from 'vue'
import { useApi } from './useApi'
import { useUserPreferences } from './useUserPreferences'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExpenseType = 'FIJO' | 'OPERATIVO' | 'EXTRAORDINARIO'
export type ExpenseStatus = 'PENDIENTE' | 'PAGADO' | 'VENCIDO' | 'CANCELADO'
export type ExpensePaymentMethod = 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'CHEQUE'

export interface ExpenseCategoryMin {
  id: string
  name: string
  color: string
}

export interface Expense {
  id: string
  description: string
  amount: number
  date: string
  type: ExpenseType
  status: ExpenseStatus
  paymentMethod: ExpensePaymentMethod
  supplier?: string
  receipt?: string
  notes?: string
  categoryId?: string
  category?: ExpenseCategoryMin
  commerceId: string
  createdAt: string
  updatedAt: string
}

export interface ExpenseCategory {
  id: string
  name: string
  color: string
  budget: number
  commerceId: string
  _count?: { expenses: number }
  createdAt: string
  updatedAt: string
}

export interface ExpenseStats {
  totalMonthly: number
  totalPrevMonth: number
  changeVsPrev: number
  pendingAmount: number
  paidAmount: number
  overdueAmount: number
  totalCount: number
  budgetTotal: number
  budgetUsed: number
  dailyAverage: number
}

export interface ExpenseFilters {
  status?: ExpenseStatus
  type?: ExpenseType
  categoryId?: string
  search?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}

export interface CreateExpensePayload {
  description: string
  amount: number
  date: string
  type?: ExpenseType
  status?: ExpenseStatus
  paymentMethod?: ExpensePaymentMethod
  supplier?: string
  receipt?: string
  notes?: string
  categoryId?: string
}

// ─── Label / style maps ───────────────────────────────────────────────────────

export const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  FIJO:           'Fijo',
  OPERATIVO:      'Operativo',
  EXTRAORDINARIO: 'Extraordinario',
}

export const EXPENSE_TYPE_CLASSES: Record<ExpenseType, string> = {
  FIJO:           'bg-blue-100 text-blue-800',
  OPERATIVO:      'bg-indigo-100 text-indigo-800',
  EXTRAORDINARIO: 'bg-orange-100 text-orange-800',
}

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  PENDIENTE: 'Pendiente',
  PAGADO:    'Pagado',
  VENCIDO:   'Vencido',
  CANCELADO: 'Cancelado',
}

export const EXPENSE_STATUS_CLASSES: Record<ExpenseStatus, string> = {
  PENDIENTE: 'bg-yellow-100 text-yellow-800',
  PAGADO:    'bg-green-100 text-green-800',
  VENCIDO:   'bg-red-100 text-red-800',
  CANCELADO: 'bg-gray-100 text-gray-600',
}

export const EXPENSE_PAYMENT_METHOD_LABELS: Record<ExpensePaymentMethod, string> = {
  EFECTIVO:      'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  TARJETA:       'Tarjeta',
  CHEQUE:        'Cheque',
}

// ─── Global reactive state ────────────────────────────────────────────────────

const expenses   = ref<Expense[]>([])
const categories = ref<ExpenseCategory[]>([])
const stats      = ref<ExpenseStats>({
  totalMonthly: 0,
  totalPrevMonth: 0,
  changeVsPrev: 0,
  pendingAmount: 0,
  paidAmount: 0,
  overdueAmount: 0,
  totalCount: 0,
  budgetTotal: 0,
  budgetUsed: 0,
  dailyAverage: 0,
})
const loading           = ref(false)
const loadingCategories = ref(false)
const loadingStats      = ref(false)
const error             = ref<string | null>(null)
const totalCount        = ref(0)
const currentPage       = ref(1)

// ─── Composable ───────────────────────────────────────────────────────────────

export function useExpenses() {
  const { get, post, put, patch, del } = useApi()

  // ── Computed ───────────────────────────────────────────────────────────────
  const pendingExpenses = computed(() => expenses.value.filter(e => e.status === 'PENDIENTE'))
  const overdueExpenses = computed(() => expenses.value.filter(e => e.status === 'VENCIDO'))

  const { formatCurrency: _fmt } = useUserPreferences()
  function formatCurrency(value: number) { return _fmt.value(value) }

  // ── Stats ──────────────────────────────────────────────────────────────────
  async function loadStats() {
    loadingStats.value = true
    try {
      stats.value = await get<ExpenseStats>('/expenses/stats')
    } catch (e: any) {
      error.value = e?.message
    } finally {
      loadingStats.value = false
    }
  }

  // ── Categories ─────────────────────────────────────────────────────────────
  async function loadCategories() {
    loadingCategories.value = true
    try {
      categories.value = await get<ExpenseCategory[]>('/expenses/categories')
    } catch (e: any) {
      error.value = e?.message
    } finally {
      loadingCategories.value = false
    }
  }

  async function createCategory(payload: { name: string; color?: string; budget?: number }) {
    const cat = await post<ExpenseCategory>('/expenses/categories', payload)
    categories.value.push(cat)
    return cat
  }

  async function updateCategory(id: string, payload: { name?: string; color?: string; budget?: number }) {
    const updated = await put<ExpenseCategory>(`/expenses/categories/${id}`, payload)
    const idx = categories.value.findIndex(c => c.id === id)
    if (idx !== -1) categories.value[idx] = updated
    return updated
  }

  async function deleteCategory(id: string) {
    await del(`/expenses/categories/${id}`)
    categories.value = categories.value.filter(c => c.id !== id)
  }

  // ── Expenses ───────────────────────────────────────────────────────────────
  async function loadExpenses(filters: ExpenseFilters = {}) {
    loading.value = true
    error.value   = null
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.set(k, String(v))
      })
      const qs  = params.toString()
      const res = await get<{ data: Expense[]; total: number; page: number }>(`/expenses${qs ? '?' + qs : ''}`)
      expenses.value    = res.data
      totalCount.value  = res.total
      currentPage.value = res.page
    } catch (e: any) {
      error.value = e?.message
    } finally {
      loading.value = false
    }
  }

  async function createExpense(payload: CreateExpensePayload): Promise<Expense | null> {
    loading.value = true
    error.value   = null
    try {
      const expense = await post<Expense>('/expenses', payload)
      expenses.value.unshift(expense)
      totalCount.value++
      await loadStats()
      return expense
    } catch (e: any) {
      error.value = e?.message
      return null
    } finally {
      loading.value = false
    }
  }

  async function updateExpense(id: string, payload: Partial<CreateExpensePayload>): Promise<Expense | null> {
    error.value = null
    try {
      const updated = await put<Expense>(`/expenses/${id}`, payload)
      const idx = expenses.value.findIndex(e => e.id === id)
      if (idx !== -1) expenses.value[idx] = updated
      await loadStats()
      return updated
    } catch (e: any) {
      error.value = e?.message
      return null
    }
  }

  async function updateExpenseStatus(id: string, status: ExpenseStatus): Promise<boolean> {
    error.value = null
    try {
      const updated = await patch<Expense>(`/expenses/${id}/status`, { status })
      const idx = expenses.value.findIndex(e => e.id === id)
      if (idx !== -1) expenses.value[idx] = { ...expenses.value[idx], status: updated.status }
      await loadStats()
      return true
    } catch (e: any) {
      error.value = e?.message
      return false
    }
  }

  async function deleteExpense(id: string): Promise<boolean> {
    error.value = null
    try {
      await del(`/expenses/${id}`)
      expenses.value = expenses.value.filter(e => e.id !== id)
      totalCount.value--
      await loadStats()
      return true
    } catch (e: any) {
      error.value = e?.message
      return false
    }
  }

  async function uploadReceipt(id: string, file: File): Promise<Expense | null> {
    error.value = null
    try {
      const formData = new FormData()
      formData.append('receipt', file)
      const updated = await post<Expense>(`/expenses/${id}/receipt`, formData)
      const idx = expenses.value.findIndex(e => e.id === id)
      if (idx !== -1) expenses.value[idx] = updated
      return updated
    } catch (e: any) {
      error.value = e?.message
      return null
    }
  }

  return {
    // state
    expenses,
    categories,
    stats,
    loading,
    loadingCategories,
    loadingStats,
    error,
    totalCount,
    currentPage,
    // computed
    pendingExpenses,
    overdueExpenses,
    // helpers
    formatCurrency,
    // actions
    loadStats,
    loadCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    loadExpenses,
    createExpense,
    updateExpense,
    updateExpenseStatus,
    deleteExpense,
    uploadReceipt,
  }
}
