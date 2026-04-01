<template>
  <div class="card-premium p-6">
    <div class="flex items-center justify-between mb-4">
      <div class="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg">
        <ExclamationTriangleIcon class="h-6 w-6 text-white" />
      </div>
      <span v-if="count > 0" class="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
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
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
})

const progressWidth = computed(() => {
  // Máximo de 10 productos para la barra
  return `${Math.min(100, props.count * 10)}%`
})
</script>
