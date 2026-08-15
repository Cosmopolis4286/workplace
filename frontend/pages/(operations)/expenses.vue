<template>
  <div>
    <PageHeader
      title="Control de Gastos"
      description="Gestión completa de gastos y presupuestos empresariales"
      :icon="CurrencyDollarIcon"
      :breadcrumb="breadcrumbItems"
      :stats="headerStats"
    >
      <template #actions>
        <HeaderActionButton :icon="ArrowDownIcon" @click="exportJSON">
          Exportar
        </HeaderActionButton>
        <HeaderActionButton variant="primary" :icon="PlusIcon" @click="openCreate">
          Nuevo Gasto
        </HeaderActionButton>
      </template>
    </PageHeader>

    <!-- Error banner -->
    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
      <p class="text-red-700 text-sm">{{ error }}</p>
      <button class="text-red-500 hover:text-red-700" @click="error = null">
        <XMarkIcon class="h-4 w-4" />
      </button>
    </div>

    <ExpensesStatsCards :stats="stats" :loading-stats="loadingStats" :format-currency="formatCurrency" />

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Main expenses list -->
      <div class="lg:col-span-2 space-y-4">
        <ExpensesFiltersBar
          :filters="filters"
          :categories="categories"
          :status-labels="EXPENSE_STATUS_LABELS"
          :type-labels="EXPENSE_TYPE_LABELS"
          @search-input="debouncedLoad"
          @apply="applyFilters"
          @clear="clearFilters"
        />

        <ExpensesList
          :expenses="expenses"
          :loading="loading"
          :total-pages="totalPages"
          :total-count="totalCount"
          :current-page="currentPage"
          :status-labels="EXPENSE_STATUS_LABELS"
          :status-classes="EXPENSE_STATUS_CLASSES"
          :type-labels="EXPENSE_TYPE_LABELS"
          :type-classes="EXPENSE_TYPE_CLASSES"
          :payment-method-labels="PAYMENT_METHOD_LABELS"
          :format-currency="formatCurrency"
          :format-date="formatDate"
          @create="openCreate"
          @edit="openEdit"
          @delete="confirmDelete"
          @mark-paid="(exp) => expenseToMarkPaid = exp"
          @page="goToPage"
        />
      </div>

      <ExpensesSidebar
        :categories="categories"
        :loading-categories="loadingCategories"
        :overdue-expenses="overdueExpenses"
        :category-spend="categorySpend"
        :format-currency="formatCurrency"
        :format-date="formatDate"
        @create="openCreate"
        @open-categories="showCategoryModal = true"
      />
    </div>

    <!-- Expense Modal -->
    <ExpenseModal
      :is-open="showExpenseModal"
      :expense="selectedExpense"
      :categories="categories"
      :saving="loading"
      @close="closeModal"
      @save="handleSave"
    />

    <!-- Category Manager Modal -->
    <ExpenseCategoryModal
      :is-open="showCategoryModal"
      :categories="categories"
      :saving="loadingCategories"
      @close="showCategoryModal = false"
      @create="handleCreateCategory"
      @update="handleUpdateCategory"
      @delete="handleDeleteCategory"
    />

    <DeleteExpenseDialog
      :expense="expenseToDelete"
      @close="expenseToDelete = null"
      @confirm="doDelete"
    />

    <MarkPaidDialog
      :expense="expenseToMarkPaid"
      :saving="markingPaid"
      @close="expenseToMarkPaid = null"
      @confirm="doMarkPaid"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

import { ref, computed, onMounted } from 'vue'
import { CurrencyDollarIcon, ArrowDownIcon, PlusIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import HeaderActionButton from '~/components/ui/HeaderActionButton.vue'
import ExpenseModal from '~/components/modals/ExpenseModal.vue'
import ExpenseCategoryModal from '~/components/modals/ExpenseCategoryModal.vue'
import ExpensesStatsCards from '~/components/expenses/ExpensesStatsCards.vue'
import ExpensesFiltersBar from '~/components/expenses/ExpensesFiltersBar.vue'
import ExpensesList from '~/components/expenses/ExpensesList.vue'
import ExpensesSidebar from '~/components/expenses/ExpensesSidebar.vue'
import DeleteExpenseDialog from '~/components/expenses/DeleteExpenseDialog.vue'
import MarkPaidDialog from '~/components/expenses/MarkPaidDialog.vue'
import {
  useExpenses,
  EXPENSE_STATUS_LABELS,
  EXPENSE_STATUS_CLASSES,
  EXPENSE_TYPE_LABELS,
  EXPENSE_TYPE_CLASSES,
  EXPENSE_PAYMENT_METHOD_LABELS as PAYMENT_METHOD_LABELS,
  type Expense,
} from '~/composables/commerce/useExpenses'
import { useDateFormat } from '~/composables/core/useDateFormat'

const {
  expenses, categories, stats,
  loading, loadingCategories, loadingStats,
  error, totalCount, currentPage,
  overdueExpenses, formatCurrency,
  loadStats, loadCategories, loadExpenses,
  createExpense, updateExpense, updateExpenseStatus, deleteExpense,
  createCategory, updateCategory, deleteCategory,
} = useExpenses()

// ── Breadcrumb & header stats ─────────────────────────────────────────────────

const breadcrumbItems = [
  { label: 'Dashboard', to: '/' },
  { label: 'Control de Gastos' },
]

const headerStats = computed(() => [
  {
    label: 'Total Mensual',
    value: formatCurrency(stats.value.totalMonthly),
    change: `${stats.value.changeVsPrev >= 0 ? '+' : ''}${stats.value.changeVsPrev}%`,
    changeType: stats.value.changeVsPrev <= 0 ? 'decrease' : 'increase',
  },
  { label: 'Pendientes',     value: formatCurrency(stats.value.pendingAmount), change: '', changeType: 'neutral' },
  { label: 'Pagados',        value: formatCurrency(stats.value.paidAmount),    change: '', changeType: 'neutral' },
  { label: 'Promedio Diario', value: formatCurrency(stats.value.dailyAverage), change: '', changeType: 'neutral' },
])

// ── Filters ───────────────────────────────────────────────────────────────────

const filters = ref({
  search:     '',
  status:     '' as any,
  type:       '' as any,
  categoryId: '',
  dateFrom:   '',
  dateTo:     '',
})

const totalPages = computed(() => Math.ceil(totalCount.value / 20))

const { debounced: debouncedLoad } = useDebounce(() => applyFilters(), 350)

function applyFilters() {
  loadExpenses({ ...filters.value, page: 1 })
}

function clearFilters() {
  filters.value = { search: '', status: '' as any, type: '' as any, categoryId: '', dateFrom: '', dateTo: '' }
  loadExpenses({ page: 1 })
}

function goToPage(page: number) {
  loadExpenses({ ...filters.value, page })
}

// ── Category spend helper ─────────────────────────────────────────────────────

function categorySpend(categoryId: string) {
  return expenses.value
    .filter(e => e.categoryId === categoryId && e.status !== 'CANCELLED')
    .reduce((sum, e) => sum + e.amount, 0)
}

// ── Expense CRUD ──────────────────────────────────────────────────────────────

const showExpenseModal = ref(false)
const selectedExpense  = ref<Expense | null>(null)
const expenseToDelete  = ref<Expense | null>(null)
const expenseToMarkPaid = ref<Expense | null>(null)

function openCreate() {
  selectedExpense.value  = null
  showExpenseModal.value = true
}

function openEdit(expense: Expense) {
  selectedExpense.value  = expense
  showExpenseModal.value = true
}

function closeModal() {
  showExpenseModal.value = false
  selectedExpense.value  = null
}

async function handleSave(payload: any) {
  if (selectedExpense.value) {
    await updateExpense(selectedExpense.value.id, payload)
  } else {
    await createExpense(payload)
  }
  closeModal()
}

const markingPaid = ref(false)

async function doMarkPaid() {
  if (!expenseToMarkPaid.value || markingPaid.value) return
  markingPaid.value = true
  try {
    await updateExpenseStatus(expenseToMarkPaid.value.id, 'PAID')
    expenseToMarkPaid.value = null
  } finally {
    markingPaid.value = false
  }
}

function confirmDelete(expense: Expense) {
  expenseToDelete.value = expense
}

async function doDelete() {
  if (!expenseToDelete.value) return
  await deleteExpense(expenseToDelete.value.id)
  expenseToDelete.value = null
}

// ── Category CRUD ─────────────────────────────────────────────────────────────

const showCategoryModal = ref(false)

async function handleCreateCategory(payload: any) {
  await createCategory(payload)
}
async function handleUpdateCategory({ id, ...payload }: any) {
  await updateCategory(id, payload)
}
async function handleDeleteCategory(id: string) {
  await deleteCategory(id)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const { formatDate } = useDateFormat()

function exportJSON() {
  const blob = new Blob([JSON.stringify(expenses.value, null, 2)], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `gastos-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Init ──────────────────────────────────────────────────────────────────────

onMounted(async () => {
  await Promise.all([loadStats(), loadCategories(), loadExpenses()])
})
</script>
