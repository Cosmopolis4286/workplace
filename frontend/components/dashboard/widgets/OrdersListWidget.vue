<template>
  <div class="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col h-[600px]">
    <div class="flex items-center justify-between mb-5 flex-shrink-0">
      <div class="flex items-center gap-2.5">
        <h3 class="text-sm font-semibold text-gray-900 tracking-tight">Pedidos activos</h3>
        <span class="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">
          {{ orders.length }}
        </span>
      </div>
      <button
        class="p-1.5 text-gray-300 hover:text-gray-500 hover:bg-gray-50 rounded-lg transition-colors"
        :class="{ 'animate-spin': loading }"
        @click="$emit('refresh')"
        title="Actualizar"
      >
        <ArrowPathIcon class="h-4 w-4" />
      </button>
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
      Actualizado {{ timeAgo(lastUpdated) }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ShoppingCartIcon, ArrowPathIcon } from '@heroicons/vue/24/outline'
import OrderCard from '~/components/OrderCard.vue'
import type { Order } from '~/composables/useMerchantOrders'
import { useRelativeTime } from '~/composables/useRelativeTime'

interface Props {
  orders: Order[]
  loading?: boolean
  lastUpdated?: Date | null
}

withDefaults(defineProps<Props>(), {
  loading: false,
  lastUpdated: null,
})

defineEmits<{
  refresh: []
  'view-details': [order: Order]
  'status-change': [payload: { id: string; status: string }]
}>()

const { timeAgo } = useRelativeTime()
</script>
