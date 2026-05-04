<template>
  <div class="card-premium p-6">
    <div class="flex items-center justify-between mb-4">
      <div class="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg">
        <ExclamationTriangleIcon class="h-6 w-6 text-white" />
      </div>
      <!-- Para bajo stock: más productos = peor → invertir colores -->
      <span
        v-if="change !== null"
        class="text-xs font-semibold px-2 py-0.5 rounded-full"
        :class="change > 0 ? 'bg-red-100 text-red-700' : change < 0 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'"
      >
        {{ formattedChange }}
      </span>
      <span v-else-if="count > 0" class="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
        Atención
      </span>
    </div>
    <div v-if="loading" class="h-8 bg-gray-200 rounded animate-pulse mb-1" />
    <div v-else class="text-2xl font-black text-gray-900 mb-1">{{ count }}</div>
    <p class="text-sm text-gray-500 font-medium">Productos Bajo Stock</p>
    <div class="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        class="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-700"
        :style="{ width: progressWidth }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'

interface Props {
  count: number
  change?: number | null
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  change: null,
  loading: false,
})

const formattedChange = computed(() => {
  if (props.change === null) return ''
  const sign = props.change >= 0 ? '+' : ''
  return `${sign}${props.change.toFixed(1)}%`
})

const progressWidth = computed(() => {
  return `${Math.min(100, props.count * 10)}%`
})
</script>
