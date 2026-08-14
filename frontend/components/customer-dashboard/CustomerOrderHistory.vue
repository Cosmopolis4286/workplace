<template>
  <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
    <div class="flex items-center justify-between mb-5">
      <h2 class="text-xl font-bold text-gray-800 flex items-center gap-2">
        <History class="w-5 h-5 text-blue-500" />
        Historial de Pedidos
      </h2>
    </div>

    <div v-if="loading" class="space-y-2">
      <div v-for="i in 4" :key="i" class="animate-pulse bg-gray-100 rounded-lg h-14" />
    </div>

    <div v-else-if="orders.length === 0" class="text-center py-8 text-gray-400">
      <p>Sin historial aún</p>
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="order in orders"
        :key="order.id"
        class="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer border border-transparent hover:border-gray-200"
        @click="$emit('view-details', order)"
      >
        <div :class="orderTypeDot(order.orderType)" class="w-2.5 h-2.5 rounded-full flex-shrink-0" />
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-gray-800 text-sm truncate">{{ order.orderNumber }}</p>
          <p class="text-xs text-gray-400">{{ formatDate(order.completedAt ?? order.cancelledAt ?? order.createdAt) }}</p>
        </div>
        <div class="text-right flex-shrink-0">
          <p class="font-bold text-gray-800 text-sm">{{ formatCurrency(order.total) }}</p>
          <span :class="ORDER_STATUS_CLASSES[order.status]" class="text-xs font-semibold px-2 py-0.5 rounded-full">
            {{ ORDER_STATUS_LABELS[order.status] }}
          </span>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 mt-6">
      <button
        @click="$emit('change-page', currentPage - 1)"
        :disabled="currentPage <= 1"
        class="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-100 transition-colors"
      >
        ‹ Anterior
      </button>
      <span class="text-sm text-gray-600">{{ currentPage }} / {{ totalPages }}</span>
      <button
        @click="$emit('change-page', currentPage + 1)"
        :disabled="currentPage >= totalPages"
        class="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-100 transition-colors"
      >
        Siguiente ›
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { History } from 'lucide-vue-next'
import { ORDER_STATUS_LABELS, ORDER_STATUS_CLASSES, type Order, type OrderType } from '~/composables/catalog/useMerchantOrders'

defineProps<{
  orders: Order[]
  loading: boolean
  currentPage: number
  totalPages: number
  formatCurrency: (n: number) => string
  formatDate: (d: string) => string
}>()

defineEmits<{
  'view-details': [order: Order]
  'change-page': [page: number]
}>()

function orderTypeDot(type: OrderType) {
  const map: Record<OrderType, string> = {
    IMMEDIATE: 'bg-green-400',
    SCHEDULED: 'bg-blue-400',
    TAKEAWAY:  'bg-purple-400',
    DINE_IN:   'bg-orange-400',
  }
  return map[type] ?? 'bg-gray-400'
}
</script>
