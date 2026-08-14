<template>
  <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
    <div class="flex items-center justify-between mb-5">
      <h2 class="text-xl font-bold text-gray-800 flex items-center gap-2">
        <Zap class="w-5 h-5 text-yellow-500" />
        Pedidos Activos
      </h2>
      <span class="bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow">
        {{ orders.length }}
      </span>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div v-for="i in 3" :key="i" class="animate-pulse bg-gray-100 rounded-xl h-44" />
    </div>

    <div v-else-if="orders.length === 0" class="text-center py-12">
      <ShoppingBag class="w-14 h-14 text-gray-300 mx-auto mb-3" />
      <p class="text-gray-500 font-medium">No hay pedidos activos</p>
      <p class="text-gray-400 text-sm mt-1">Crea un nuevo pedido para empezar</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="order in orders"
        :key="order.id"
        class="bg-gradient-to-br from-white to-gray-50 p-4 rounded-xl shadow hover:shadow-lg transition-all duration-300 border border-gray-100"
      >
        <!-- Header row -->
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-2">
            <div class="w-9 h-9 bg-gradient-to-br from-green-400 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {{ order.customerName.charAt(0).toUpperCase() }}
            </div>
            <div>
              <p class="font-semibold text-gray-800 text-sm leading-tight">{{ order.orderNumber }}</p>
              <p class="text-xs text-gray-500">{{ order.customerName }}</p>
            </div>
          </div>
          <span :class="ORDER_STATUS_CLASSES[order.status]" class="px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0">
            {{ ORDER_STATUS_LABELS[order.status] }}
          </span>
        </div>

        <!-- Metrics -->
        <div class="grid grid-cols-3 gap-2 mb-3 text-center">
          <div class="bg-green-50 rounded-lg py-1.5">
            <p class="text-xs text-gray-500">Total</p>
            <p class="text-sm font-bold text-green-700">{{ formatCurrency(order.total) }}</p>
          </div>
          <div class="bg-blue-50 rounded-lg py-1.5">
            <p class="text-xs text-gray-500">Ítems</p>
            <p class="text-sm font-bold text-blue-700">{{ order.itemCount ?? order.items.length }}</p>
          </div>
          <div class="bg-purple-50 rounded-lg py-1.5">
            <p class="text-xs text-gray-500">Tipo</p>
            <p class="text-xs font-semibold text-purple-700 leading-tight">{{ ORDER_TYPE_LABELS[order.orderType] }}</p>
          </div>
        </div>

        <!-- Status progression buttons -->
        <div v-if="NEXT_STATUS[order.status]?.length" class="flex gap-1 mb-2">
          <button
            v-for="next in NEXT_STATUS[order.status]"
            :key="next"
            @click="$emit('update-status', order.id, next)"
            :class="next === 'CANCELLED'
              ? 'flex-1 bg-red-100 text-red-700 hover:bg-red-200'
              : 'flex-1 bg-green-100 text-green-700 hover:bg-green-200'"
            class="py-1 rounded-lg text-xs font-semibold transition-colors"
          >
            {{ ORDER_STATUS_LABELS[next] }}
          </button>
        </div>

        <button
          @click="$emit('view-details', order)"
          class="w-full border border-gray-200 text-gray-600 hover:border-green-400 hover:text-green-600 py-1.5 rounded-lg text-xs font-semibold transition-colors"
        >
          Ver Detalles
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ShoppingBag, Zap } from 'lucide-vue-next'
import {
  ORDER_STATUS_LABELS, ORDER_STATUS_CLASSES, ORDER_TYPE_LABELS, NEXT_STATUS,
  type Order, type OrderStatus,
} from '~/composables/catalog/useMerchantOrders'

defineProps<{
  orders: Order[]
  loading: boolean
  formatCurrency: (n: number) => string
}>()

defineEmits<{
  'view-details': [order: Order]
  'update-status': [id: string, status: OrderStatus]
}>()
</script>
