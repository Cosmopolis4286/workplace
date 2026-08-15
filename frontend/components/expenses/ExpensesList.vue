<template>
  <div class="space-y-4">
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
        <button class="btn-primary mt-4 text-sm" @click="$emit('create')">Registrar primer gasto</button>
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
            <span class="badge" :class="typeClasses[expense.type]">
              {{ typeLabels[expense.type] }}
            </span>
            <span class="badge" :class="statusClasses[expense.status]">
              {{ statusLabels[expense.status] }}
            </span>
          </div>

          <div class="text-right flex-shrink-0">
            <p class="font-semibold text-gray-900">{{ formatCurrency(expense.amount) }}</p>
            <p class="text-xs text-gray-400">{{ paymentMethodLabels[expense.paymentMethod] }}</p>
          </div>

          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button class="p-1.5 rounded hover:bg-gray-100 text-gray-500" title="Editar" @click="$emit('edit', expense)">
              <PencilIcon class="h-4 w-4" />
            </button>
            <button
              v-if="expense.status === 'PENDING'"
              class="p-1.5 rounded hover:bg-green-50 text-green-600"
              title="Marcar como pagado"
              @click="$emit('mark-paid', expense)"
            >
              <CheckIcon class="h-4 w-4" />
            </button>
            <button class="p-1.5 rounded hover:bg-red-50 text-red-500" title="Eliminar" @click="$emit('delete', expense)">
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
        <button class="btn-secondary text-sm px-3 py-1" :disabled="currentPage <= 1" @click="$emit('page', currentPage - 1)">
          Anterior
        </button>
        <span class="text-sm text-gray-600 px-2 py-1">{{ currentPage }} / {{ totalPages }}</span>
        <button class="btn-secondary text-sm px-3 py-1" :disabled="currentPage >= totalPages" @click="$emit('page', currentPage + 1)">
          Siguiente
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CurrencyDollarIcon, PencilIcon, TrashIcon, CheckIcon } from '@heroicons/vue/24/outline'
import type { Expense, ExpenseStatus, ExpenseType, ExpensePaymentMethod } from '~/composables/commerce/useExpenses'

defineProps<{
  expenses: Expense[]
  loading: boolean
  totalPages: number
  totalCount: number
  currentPage: number
  statusLabels: Record<ExpenseStatus, string>
  statusClasses: Record<ExpenseStatus, string>
  typeLabels: Record<ExpenseType, string>
  typeClasses: Record<ExpenseType, string>
  paymentMethodLabels: Record<ExpensePaymentMethod, string>
  formatCurrency: (value: number) => string
  formatDate: (date: string) => string
}>()

defineEmits<{
  create: []
  edit: [expense: Expense]
  delete: [expense: Expense]
  'mark-paid': [expense: Expense]
  page: [page: number]
}>()
</script>

<style scoped>
.badge {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
}
.skeleton {
  @apply bg-gray-200 animate-pulse;
}
</style>
