<template>
  <div class="card overflow-hidden">
    <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center">
          <BanknotesIcon class="h-5 w-5 text-orange-600" />
        </div>
        <div>
          <h2 class="text-sm font-semibold text-gray-900">Gastos & Presupuesto</h2>
          <p class="text-xs text-gray-400">Costos y control de presupuesto</p>
        </div>
      </div>
      <button
        class="text-xs text-gray-400 hover:text-orange-600 flex items-center gap-1 transition-colors"
        :disabled="loading"
        @click="$emit('export')"
      >
        <ArrowDownTrayIcon class="h-3.5 w-3.5" />
        JSON
      </button>
    </div>

    <div class="p-6">
      <!-- Skeleton -->
      <div v-if="loading" class="space-y-4 animate-pulse">
        <div class="grid grid-cols-2 gap-4">
          <div v-for="n in 4" :key="n" class="h-16 bg-gray-100 rounded-xl" />
        </div>
        <div class="h-4 bg-gray-100 rounded w-full" />
      </div>

      <template v-else-if="stats">
        <!-- KPI grid -->
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <div class="bg-gray-50 rounded-xl p-4 text-center">
            <p class="text-xl font-black text-gray-900">{{ formatCurrency(stats.totalMonthly) }}</p>
            <p class="text-xs text-gray-500 mt-1">Total mensual</p>
          </div>
          <div class="bg-yellow-50 rounded-xl p-4 text-center">
            <p class="text-xl font-black text-yellow-600">{{ formatCurrency(stats.pendingAmount) }}</p>
            <p class="text-xs text-gray-500 mt-1">Pendientes</p>
          </div>
          <div class="bg-green-50 rounded-xl p-4 text-center">
            <p class="text-xl font-black text-green-600">{{ formatCurrency(stats.paidAmount) }}</p>
            <p class="text-xs text-gray-500 mt-1">Pagados</p>
          </div>
        </div>

        <!-- Barra presupuesto -->
        <div class="mb-4">
          <div class="flex justify-between text-xs mb-1.5">
            <span class="text-gray-500 font-medium">Presupuesto usado</span>
            <span
              class="font-bold"
              :class="budgetUsed > 90 ? 'text-red-600' : budgetUsed > 70 ? 'text-yellow-600' : 'text-green-600'"
            >
              {{ budgetUsed }}%
            </span>
          </div>
          <div class="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-700"
              :class="budgetUsed > 90 ? 'bg-red-500' : budgetUsed > 70 ? 'bg-yellow-500' : 'bg-green-500'"
              :style="{ width: `${Math.min(budgetUsed, 100)}%` }"
            />
          </div>
          <div class="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>0%</span>
            <span
              class="font-medium"
              :class="budgetUsed > 90 ? 'text-red-500' : budgetUsed > 70 ? 'text-yellow-500' : 'text-green-500'"
            >
              {{ budgetUsed > 90 ? '⚠️ Presupuesto crítico' : budgetUsed > 70 ? 'Presupuesto elevado' : 'Presupuesto saludable' }}
            </span>
            <span>100%</span>
          </div>
        </div>

        <!-- Promedio diario -->
        <div class="flex items-center justify-between p-3 bg-orange-50 rounded-xl border border-orange-100">
          <span class="text-xs text-orange-700 font-medium">Promedio diario</span>
          <span class="text-sm font-black text-orange-800">{{ formatCurrency(stats.dailyAverage) }}</span>
        </div>
      </template>

      <div v-else class="py-8 text-center text-gray-400 text-sm">
        No se pudieron cargar los datos de gastos
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { BanknotesIcon, ArrowDownTrayIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  loading: boolean
  stats: any
  formatCurrency: (value: number | undefined | null) => string
}>()

defineEmits<{
  export: []
}>()

const budgetUsed = computed(() => props.stats?.budgetUsed ?? 0)
</script>
