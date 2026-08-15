<template>
  <div class="card p-5">
    <h3 class="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
      <HeartIcon class="h-4 w-4 text-red-500" />
      Salud Financiera
    </h3>
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <span class="text-xs text-gray-500">Margen neto</span>
        <span
          class="text-sm font-bold"
          :class="netMargin >= 0 ? 'text-green-600' : 'text-red-600'"
        >
          {{ netMargin >= 0 ? '+' : '' }}{{ formatCurrency(netMargin) }}
        </span>
      </div>
      <div class="h-px bg-gray-100" />
      <div class="flex items-center justify-between">
        <span class="text-xs text-gray-500">Ratio gastos/ingresos</span>
        <span
          class="text-sm font-bold"
          :class="expenseRatio > 80 ? 'text-red-600' : expenseRatio > 60 ? 'text-yellow-600' : 'text-green-600'"
        >
          {{ expenseRatio }}%
        </span>
      </div>
      <div class="h-px bg-gray-100" />
      <div class="flex items-center gap-2 pt-1">
        <div
          class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm"
          :class="healthColor"
        >
          {{ healthEmoji }}
        </div>
        <p class="text-xs text-gray-500">{{ healthMessage }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { HeartIcon } from '@heroicons/vue/24/outline'

defineProps<{
  netMargin: number
  expenseRatio: number
  healthEmoji: string
  healthColor: string
  healthMessage: string
  formatCurrency: (value: number | undefined | null) => string
}>()
</script>
