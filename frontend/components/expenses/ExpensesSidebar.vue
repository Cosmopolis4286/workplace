<template>
  <div class="space-y-4">
    <!-- Quick actions -->
    <div class="card p-5">
      <h3 class="text-sm font-semibold text-gray-700 mb-3">Acciones Rápidas</h3>
      <div class="space-y-2">
        <button class="w-full btn-primary text-sm" @click="$emit('create')">Nuevo Gasto</button>
        <button class="w-full btn-secondary text-sm" @click="$emit('open-categories')">Gestionar Categorías</button>
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
        <button class="text-indigo-600 underline" @click="$emit('open-categories')">Crear una</button>
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
</template>

<script setup lang="ts">
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import type { Expense, ExpenseCategory } from '~/composables/commerce/useExpenses'

defineProps<{
  categories: ExpenseCategory[]
  loadingCategories: boolean
  overdueExpenses: Expense[]
  categorySpend: (categoryId: string) => number
  formatCurrency: (value: number) => string
  formatDate: (date: string) => string
}>()

defineEmits<{
  create: []
  'open-categories': []
}>()
</script>

<style scoped>
.skeleton {
  @apply bg-gray-200 animate-pulse;
}
</style>
