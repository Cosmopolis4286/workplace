<template>
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
</template>

<script setup lang="ts">
import type { ExpenseStats } from '~/composables/commerce/useExpenses'

defineProps<{
  stats: ExpenseStats
  loadingStats: boolean
  formatCurrency: (value: number) => string
}>()
</script>

<style scoped>
.skeleton {
  @apply bg-gray-200 animate-pulse;
}
</style>
