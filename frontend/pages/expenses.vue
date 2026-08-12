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

    <!-- Stats cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div class="card p-5">
        <p class="text-sm text-gray-500">Total Mensual</p>
        <p class="text-2xl font-bold text-gray-900 mt-1">
          <span v-if="loadingStats" class="skeleton h-7 w-28 inline-block rounded" />
          <span v-else>{{ formatCurrency(stats.totalMonthly) }}</span>
        </p>
        <p v-if="!loadingStats" class="text-xs mt-1" :class="stats.changeVsPrev >= 0 ? 'text-red-600' : 'text-green-600'">
          {{ stats.changeVsPrev >= 0 ? '▲' : '▼' }} {{ Math.abs(stats.changeVsPrev) }}% vs mes anterior
        </p>
      </div>
      <div class="card p-5">
        <p class="text-sm text-gray-500">Pendientes</p>
        <p class="text-2xl font-bold text-yellow-600 mt-1">
          <span v-if="loadingStats" class="skeleton h-7 w-24 inline-block rounded" />
          <span v-else>{{ formatCurrency(stats.pendingAmount) }}</span>
        </p>
        <p class="text-xs text-gray-400 mt-1">por pagar</p>
      </div>
      <div class="card p-5">
        <p class="text-sm text-gray-500">Pagados</p>
        <p class="text-2xl font-bold text-green-600 mt-1">
          <span v-if="loadingStats" class="skeleton h-7 w-24 inline-block rounded" />
          <span v-else>{{ formatCurrency(stats.paidAmount) }}</span>
        </p>
        <p class="text-xs text-gray-400 mt-1">este mes</p>
      </div>
      <div class="card p-5">
        <p class="text-sm text-gray-500">Presupuesto Usado</p>
        <p class="text-2xl font-bold mt-1" :class="stats.budgetUsed > 90 ? 'text-red-600' : stats.budgetUsed > 70 ? 'text-yellow-600' : 'text-gray-900'">
          <span v-if="loadingStats" class="skeleton h-7 w-20 inline-block rounded" />
          <span v-else>{{ stats.budgetUsed }}%</span>
        </p>
        <div class="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="stats.budgetUsed > 90 ? 'bg-red-500' : stats.budgetUsed > 70 ? 'bg-yellow-500' : 'bg-green-500'"
            :style="{ width: Math.min(stats.budgetUsed, 100) + '%' }"
          />
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Main expenses list -->
      <div class="lg:col-span-2 space-y-4">
        <!-- Filters -->
        <div class="card p-4">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <input
              v-model="filters.search"
              type="text"
              placeholder="Buscar..."
              class="input-field col-span-2 sm:col-span-1"
              @input="debouncedLoad"
            />
            <select v-model="filters.status" class="input-field" @change="applyFilters">
              <option value="">Todos los estados</option>
              <option v-for="(label, val) in EXPENSE_STATUS_LABELS" :key="val" :value="val">{{ label }}</option>
            </select>
            <select v-model="filters.type" class="input-field" @change="applyFilters">
              <option value="">Todos los tipos</option>
              <option v-for="(label, val) in EXPENSE_TYPE_LABELS" :key="val" :value="val">{{ label }}</option>
            </select>
            <select v-model="filters.categoryId" class="input-field" @change="applyFilters">
              <option value="">Todas las categorías</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
            </select>
          </div>
          <div class="flex gap-3 mt-3">
            <input v-model="filters.dateFrom" type="date" class="input-field flex-1" @change="applyFilters" />
            <input v-model="filters.dateTo" type="date" class="input-field flex-1" @change="applyFilters" />
            <button class="btn-secondary text-sm" @click="clearFilters">Limpiar</button>
          </div>
        </div>

        <!-- Expense list -->
        <div class="card divide-y divide-gray-100">
          <!-- Loading skeleton -->
          <template v-if="loading">
            <div v-for="i in 5" :key="i" class="p-4 flex items-center gap-4">
              <div class="skeleton h-10 w-10 rounded-full" />
              <div class="flex-1 space-y-2">
                <div class="skeleton h-4 w-48 rounded" />
                <div class="skeleton h-3 w-32 rounded" />
              </div>
              <div class="skeleton h-6 w-20 rounded" />
            </div>
          </template>

          <!-- Empty state -->
          <div v-else-if="expenses.length === 0" class="p-12 text-center">
            <CurrencyDollarIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p class="text-gray-500">No hay gastos registrados</p>
            <button class="btn-primary mt-4 text-sm" @click="openCreate">Registrar primer gasto</button>
          </div>

          <!-- Expense rows -->
          <template v-else>
            <div
              v-for="expense in expenses"
              :key="expense.id"
              class="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors group"
            >
              <div
                class="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0"
                :style="{ backgroundColor: (expense.category?.color ?? '#6b7280') + '20' }"
              >
                <div class="h-4 w-4 rounded-full" :style="{ backgroundColor: expense.category?.color ?? '#6b7280' }" />
              </div>

              <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-900 truncate">{{ expense.description }}</p>
                <p class="text-sm text-gray-500">
                  {{ formatDate(expense.date) }}
                  <span v-if="expense.supplier"> · {{ expense.supplier }}</span>
                  <span v-if="expense.category"> · {{ expense.category.name }}</span>
                </p>
              </div>

              <div class="hidden sm:flex items-center gap-2">
                <span class="badge" :class="EXPENSE_TYPE_CLASSES[expense.type]">
                  {{ EXPENSE_TYPE_LABELS[expense.type] }}
                </span>
                <span class="badge" :class="EXPENSE_STATUS_CLASSES[expense.status]">
                  {{ EXPENSE_STATUS_LABELS[expense.status] }}
                </span>
              </div>

              <div class="text-right flex-shrink-0">
                <p class="font-semibold text-gray-900">{{ formatCurrency(expense.amount) }}</p>
                <p class="text-xs text-gray-400">{{ PAYMENT_METHOD_LABELS[expense.paymentMethod] }}</p>
              </div>

              <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button class="p-1.5 rounded hover:bg-gray-100 text-gray-500" title="Editar" @click="openEdit(expense)">
                  <PencilIcon class="h-4 w-4" />
                </button>
                <button
                  v-if="expense.status === 'PENDING'"
                  class="p-1.5 rounded hover:bg-green-50 text-green-600"
                  title="Marcar como pagado"
                  @click="expenseToMarkPaid = expense"
                >
                  <CheckIcon class="h-4 w-4" />
                </button>
                <button class="p-1.5 rounded hover:bg-red-50 text-red-500" title="Eliminar" @click="confirmDelete(expense)">
                  <TrashIcon class="h-4 w-4" />
                </button>
              </div>
            </div>
          </template>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="flex items-center justify-between">
          <p class="text-sm text-gray-500">{{ totalCount }} gastos totales</p>
          <div class="flex gap-2">
            <button class="btn-secondary text-sm px-3 py-1" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">
              Anterior
            </button>
            <span class="text-sm text-gray-600 px-2 py-1">{{ currentPage }} / {{ totalPages }}</span>
            <button class="btn-secondary text-sm px-3 py-1" :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)">
              Siguiente
            </button>
          </div>
        </div>
      </div>

      <!-- Sidebar -->
      <div class="space-y-4">
        <!-- Quick actions -->
        <div class="card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Acciones Rápidas</h3>
          <div class="space-y-2">
            <button class="w-full btn-primary text-sm" @click="openCreate">Nuevo Gasto</button>
            <button class="w-full btn-secondary text-sm" @click="showCategoryModal = true">Gestionar Categorías</button>
          </div>
        </div>

        <!-- Budget by category -->
        <div class="card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-4">Presupuesto por Categoría</h3>
          <div v-if="loadingCategories" class="space-y-3">
            <div v-for="i in 4" :key="i" class="skeleton h-8 rounded" />
          </div>
          <div v-else-if="categories.length === 0" class="text-center text-gray-400 py-4 text-sm">
            Sin categorías.
            <button class="text-indigo-600 underline" @click="showCategoryModal = true">Crear una</button>
          </div>
          <div v-else class="space-y-3">
            <div v-for="cat in categories" :key="cat.id">
              <div class="flex justify-between text-xs mb-1">
                <span class="flex items-center gap-1.5">
                  <span class="inline-block h-2 w-2 rounded-full" :style="{ backgroundColor: cat.color }" />
                  {{ cat.name }}
                </span>
                <span class="text-gray-500">
                  {{ formatCurrency(categorySpend(cat.id)) }} / {{ formatCurrency(cat.budget) }}
                </span>
              </div>
              <div class="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all"
                  :style="{
                    width: Math.min(cat.budget > 0 ? (categorySpend(cat.id) / cat.budget) * 100 : 0, 100) + '%',
                    backgroundColor: cat.color,
                  }"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Overdue alert -->
        <div v-if="overdueExpenses.length > 0" class="card p-5 border border-red-200 bg-red-50">
          <h3 class="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1.5">
            <ExclamationTriangleIcon class="h-4 w-4" />
            Gastos Vencidos ({{ overdueExpenses.length }})
          </h3>
          <div class="space-y-2">
            <div v-for="exp in overdueExpenses.slice(0, 3)" :key="exp.id" class="text-xs">
              <p class="text-red-800 font-medium">{{ exp.description }}</p>
              <p class="text-red-600">{{ formatCurrency(exp.amount) }} · {{ formatDate(exp.date) }}</p>
            </div>
          </div>
        </div>
      </div>
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

    <!-- Delete confirmation -->
    <TransitionRoot appear :show="!!expenseToDelete" as="template">
      <Dialog as="div" class="relative z-50" @close="expenseToDelete = null">
        <div class="fixed inset-0 bg-black/25" />
        <div class="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel class="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <DialogTitle class="text-lg font-semibold text-gray-900 mb-2">Eliminar gasto</DialogTitle>
            <p class="text-sm text-gray-600 mb-5">
              ¿Eliminar "<strong>{{ expenseToDelete?.description }}</strong>"? Esta acción no se puede deshacer.
            </p>
            <div class="flex justify-end gap-3">
              <button class="btn-secondary" @click="expenseToDelete = null">Cancelar</button>
              <button class="btn-danger" @click="doDelete">Eliminar</button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </TransitionRoot>

    <!-- Mark as paid confirmation -->
    <TransitionRoot appear :show="!!expenseToMarkPaid" as="template">
      <Dialog as="div" class="relative z-50" @close="expenseToMarkPaid = null">
        <div class="fixed inset-0 bg-black/25" />
        <div class="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel class="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <DialogTitle class="text-lg font-semibold text-gray-900 mb-2">Marcar como pagado</DialogTitle>
            <p class="text-sm text-gray-600 mb-5">
              ¿Marcar "<strong>{{ expenseToMarkPaid?.description }}</strong>" como pagado? Afecta los
              reportes financieros del período.
            </p>
            <div class="flex justify-end gap-3">
              <button class="btn-secondary" :disabled="markingPaid" @click="expenseToMarkPaid = null">Cancelar</button>
              <button class="btn-primary" :disabled="markingPaid" @click="doMarkPaid">
                {{ markingPaid ? 'Guardando…' : 'Marcar como pagado' }}
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </TransitionRoot>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

import { ref, computed, onMounted } from 'vue'
import {
  CurrencyDollarIcon,
  ArrowDownIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from '@heroicons/vue/24/outline'
import { Dialog, DialogPanel, DialogTitle, TransitionRoot } from '@headlessui/vue'
import PageHeader from '~/components/ui/PageHeader.vue'
import HeaderActionButton from '~/components/ui/HeaderActionButton.vue'
import ExpenseModal from '~/components/modals/ExpenseModal.vue'
import ExpenseCategoryModal from '~/components/modals/ExpenseCategoryModal.vue'
import {
  useExpenses,
  EXPENSE_STATUS_LABELS,
  EXPENSE_STATUS_CLASSES,
  EXPENSE_TYPE_LABELS,
  EXPENSE_TYPE_CLASSES,
  EXPENSE_PAYMENT_METHOD_LABELS as PAYMENT_METHOD_LABELS,
  type Expense,
} from '~/composables/useExpenses'

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

let debounceTimer: ReturnType<typeof setTimeout> | null = null
function debouncedLoad() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => applyFilters(), 350)
}

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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

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

<style scoped>
.badge {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
}
.btn-danger {
  @apply px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors;
}
.skeleton {
  @apply bg-gray-200 animate-pulse;
}
</style>
