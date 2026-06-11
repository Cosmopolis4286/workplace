<template>
  <div class="card-premium p-6 flex flex-col h-[600px]">
    <div class="flex items-center justify-between mb-6 flex-shrink-0">
      <div class="flex items-center">
        <div class="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg mr-3">
          <ShoppingCartIcon class="h-6 w-6 text-white" />
        </div>
        <h3 class="text-xl font-bold text-gray-900">Pedidos Activos</h3>
      </div>
      <div class="flex items-center gap-2">
        <span class="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
          {{ orders.length }}
        </span>
        <button
          class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          :class="{ 'animate-spin': loading }"
          @click="$emit('refresh')"
          title="Actualizar"
        >
          <ArrowPathIcon class="h-4 w-4" />
        </button>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading && orders.length === 0" class="space-y-3 flex-1">
      <div v-for="i in 3" :key="i" class="h-32 bg-gray-100 rounded-xl animate-pulse" />
    </div>

    <!-- Empty state -->
    <div v-else-if="!loading && orders.length === 0" class="flex-1 flex flex-col items-center justify-center text-center text-gray-400">
      <ShoppingCartIcon class="h-12 w-12 mb-3 opacity-30" />
      <p class="font-medium">No hay pedidos activos</p>
      <p class="text-sm mt-1">Los pedidos nuevos aparecerán aquí</p>
    </div>

    <!-- Order cards -->
    <div v-else class="space-y-3 overflow-y-auto flex-1 pr-1 custom-scrollbar">
      <OrderCard
        v-for="order in orders"
        :key="order.id"
        :order="order"
        @view-details="$emit('view-details', $event)"
        @status-change="$emit('status-change', $event)"
      />
    </div>

    <p v-if="lastUpdated" class="text-xs text-gray-400 text-right mt-2 flex-shrink-0">
      Actualizado {{ formattedLastUpdated }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ShoppingCartIcon, ArrowPathIcon } from '@heroicons/vue/24/outline'
import OrderCard from '~/components/OrderCard.vue'
import type { Order } from '~/composables/useClienteDashboard'

interface Props {
  orders: Order[]
  loading?: boolean
  lastUpdated?: Date | null
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  lastUpdated: null,
})

defineEmits<{
  refresh: []
  'view-details': [order: Order]
  'status-change': [payload: { id: string; status: string }]
}>()

const formattedLastUpdated = computed(() => {
  if (!props.lastUpdated) return ''
  const now = new Date()
  const diff = Math.floor((now.getTime() - props.lastUpdated.getTime()) / 1000)

  if (diff < 60) return 'hace un momento'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  return props.lastUpdated.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
})
</script>
