<template>
  <div class="card overflow-hidden">
    <div class="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <ClockIcon class="h-4 w-4 text-green-500" />
        <h2 class="text-sm font-semibold text-gray-900">Pedidos Activos</h2>
      </div>
      <span class="badge bg-green-100 text-green-700">{{ orders.length }}</span>
    </div>

    <div v-if="loading" class="divide-y divide-gray-100">
      <div v-for="i in 3" :key="i" class="p-4 flex items-center gap-4">
        <div class="skeleton h-9 w-9 rounded-full flex-shrink-0" />
        <div class="flex-1 space-y-2"><div class="skeleton h-4 w-40 rounded" /><div class="skeleton h-3 w-56 rounded" /></div>
        <div class="skeleton h-6 w-20 rounded-full" />
      </div>
    </div>

    <div v-else-if="!orders.length" class="p-10 text-center">
      <ShoppingCartIcon class="h-10 w-10 text-gray-200 mx-auto mb-2" />
      <p class="text-sm text-gray-400">No hay pedidos activos</p>
    </div>

    <div v-else class="divide-y divide-gray-100">
      <div
        v-for="order in orders"
        :key="order.id"
        class="p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors group"
      >
        <div class="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 font-bold text-sm text-red-700">
          {{ order.customerName.charAt(0).toUpperCase() }}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <p class="text-sm font-semibold text-gray-900">{{ order.customerName }}</p>
            <span class="text-xs text-gray-400">{{ order.orderNumber }}</span>
            <span class="badge" :class="ORDER_STATUS_CLASSES[order.status]">{{ ORDER_STATUS_LABELS[order.status] }}</span>
          </div>
          <p class="text-xs text-gray-400 mt-0.5 flex flex-wrap gap-x-3">
            <span class="flex items-center gap-1"><ClockIcon class="h-3 w-3" />{{ formatDate(order.createdAt) }}</span>
            <span>{{ formatCurrency(order.total) }}</span>
            <span>{{ ORDER_TYPE_LABELS[order.orderType] }}</span>
            <span>{{ order.itemCount ?? order.items?.length ?? 0 }} ítems</span>
          </p>
        </div>
        <div class="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button class="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg font-medium" @click="$emit('view-details', order)">
            Detalles
          </button>
          <button
            v-for="ns in (NEXT_STATUS[order.status] ?? [])"
            :key="ns"
            class="text-xs px-2 py-1 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :class="ns === 'CANCELLED' ? 'bg-red-100 hover:bg-red-200 text-red-700' : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700'"
            :disabled="updatingOrderId === order.id"
            @click="$emit('update-status', order, ns)"
          >→ {{ ORDER_STATUS_LABELS[ns] }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ClockIcon, ShoppingCartIcon } from '@heroicons/vue/24/outline'
import {
  ORDER_STATUS_LABELS, ORDER_STATUS_CLASSES, ORDER_TYPE_LABELS, NEXT_STATUS,
  type Order, type OrderStatus,
} from '~/composables/catalog/useMerchantOrders'

defineProps<{
  orders: Order[]
  loading: boolean
  updatingOrderId: string | null
  formatCurrency: (n: number) => string
  formatDate: (d: string) => string
}>()

defineEmits<{
  'view-details': [order: Order]
  'update-status': [order: Order, nextStatus: OrderStatus]
}>()
</script>
