<template>
  <div class="card-premium p-6">
    <div class="flex items-center justify-between mb-4">
      <div class="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
        <ShoppingCartIcon class="h-6 w-6 text-white" />
      </div>
    </div>
    <div v-if="loading" class="h-8 bg-gray-200 rounded animate-pulse mb-1" />
    <div v-else class="text-2xl font-black text-gray-900 mb-1">{{ count }}</div>
    <p class="text-sm text-gray-500 font-medium">Pedidos Activos</p>
    <div class="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        class="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-700"
        :style="{ width: progressWidth }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ShoppingCartIcon } from '@heroicons/vue/24/outline'

interface Props {
  count: number
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
})

const progressWidth = computed(() => {
  // Máximo de 20 pedidos para la barra
  return `${Math.min(100, props.count * 5)}%`
})
</script>
