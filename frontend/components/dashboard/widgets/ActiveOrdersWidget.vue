<template>
  <div class="bg-white rounded-2xl border border-gray-100 p-5">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center justify-center w-10 h-10 rounded-full bg-blue-50">
        <ShoppingCartIcon class="h-5 w-5 text-blue-600" />
      </div>
      <span
        v-if="change !== null"
        class="text-xs font-semibold px-2 py-0.5 rounded-full"
        :class="change >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'"
      >
        {{ formattedChange }}
      </span>
    </div>
    <div v-if="loading" class="h-7 bg-gray-100 rounded animate-pulse mb-1 w-12" />
    <div v-else class="text-xl font-bold text-gray-900 mb-0.5">{{ count }}</div>
    <p class="text-xs text-gray-400 font-medium">Pedidos activos</p>
    <div class="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        class="h-full bg-blue-500 rounded-full transition-all duration-700"
        :style="{ width: progressWidth }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ShoppingCartIcon } from '@heroicons/vue/24/outline'

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
  return `${Math.min(100, props.count * 5)}%`
})
</script>
