<template>
  <div class="card-premium p-6">
    <div class="flex items-center justify-between mb-4">
      <div class="p-3 bg-gradient-to-br from-workplace-red to-red-600 rounded-xl shadow-lg">
        <CurrencyDollarIcon class="h-6 w-6 text-white" />
      </div>
      <span
        v-if="change !== null"
        class="text-xs font-semibold px-2 py-0.5 rounded-full"
        :class="change >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
      >
        {{ formattedChange }}
      </span>
    </div>
    <div v-if="loading" class="h-8 bg-gray-200 rounded animate-pulse mb-1" />
    <div v-else class="text-2xl font-black text-gray-900 mb-1">{{ formattedSales }}</div>
    <p class="text-sm text-gray-500 font-medium">{{ label }}</p>
    <div class="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div class="h-full bg-gradient-to-r from-workplace-red to-red-500 rounded-full transition-all duration-700" :style="{ width: progressWidth }" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { CurrencyDollarIcon } from '@heroicons/vue/24/outline'

interface Props {
  sales: number
  change?: number | null
  loading?: boolean
  label?: string
}

const props = withDefaults(defineProps<Props>(), {
  change: null,
  loading: false,
  label: 'Ventas Hoy',
})

const formattedSales = computed(() => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(props.sales || 0)
})

const formattedChange = computed(() => {
  if (props.change === null) return ''
  const sign = props.change >= 0 ? '+' : ''
  return `${sign}${props.change.toFixed(1)}%`
})

const progressWidth = computed(() => {
  // Máximo objetivo de $100k para la barra de progreso
  const target = 100000
  const percentage = Math.min(100, ((props.sales || 0) / target) * 100)
  return `${percentage}%`
})
</script>
