<template>
  <div class="card overflow-hidden">
    <div class="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <ClockIcon class="h-4 w-4 text-gray-400" />
        <h2 class="text-sm font-semibold text-gray-900">Historial Reciente</h2>
      </div>
      <div class="flex gap-2">
        <button class="btn-secondary text-xs px-2 py-1" :disabled="currentPage <= 1" @click="$emit('change-page', currentPage - 1)">‹</button>
        <span class="text-xs text-gray-500 px-1 py-1">{{ currentPage }} / {{ totalPages }}</span>
        <button class="btn-secondary text-xs px-2 py-1" :disabled="currentPage >= totalPages" @click="$emit('change-page', currentPage + 1)">›</button>
      </div>
    </div>

    <div v-if="loading" class="divide-y divide-gray-100">
      <div v-for="i in 5" :key="i" class="p-4 flex items-center gap-4">
        <div class="skeleton h-4 w-24 rounded" />
        <div class="skeleton h-4 w-32 rounded" />
        <div class="flex-1" />
        <div class="skeleton h-6 w-16 rounded-full" />
      </div>
    </div>

    <div v-else-if="!orders.length" class="p-10 text-center text-sm text-gray-400">Sin historial reciente</div>

    <div v-else class="divide-y divide-gray-100">
      <div
        v-for="order in orders"
        :key="order.id"
        class="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors cursor-pointer"
        @click="$emit('view-details', order)"
      >
        <span class="text-xs font-bold text-red-600 flex-shrink-0">{{ order.orderNumber }}</span>
        <span class="text-sm text-gray-700 truncate flex-1">{{ order.customerName }}</span>
        <span class="text-xs text-gray-400 hidden sm:block">{{ ORDER_TYPE_LABELS[order.orderType] }}</span>
        <span class="text-sm font-semibold text-gray-900 flex-shrink-0">{{ formatCurrency(order.total) }}</span>
        <span class="badge flex-shrink-0" :class="ORDER_STATUS_CLASSES[order.status]">{{ ORDER_STATUS_LABELS[order.status] }}</span>
        <span class="text-xs text-gray-400 hidden sm:block flex-shrink-0">{{ formatDate(order.createdAt) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ClockIcon } from '@heroicons/vue/24/outline'
import {
  ORDER_STATUS_LABELS, ORDER_STATUS_CLASSES, ORDER_TYPE_LABELS,
  type Order,
} from '~/composables/catalog/useMerchantOrders'

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
</script>
