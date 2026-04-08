<template>
  <div class="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 p-4">
    <!-- Header -->
    <div class="flex justify-between items-start mb-3">
      <div>
        <h3 class="text-sm font-semibold text-gray-900">{{ order.customerName }}</h3>
        <p class="text-xs text-gray-400 mt-0.5">#{{ order.orderNumber }} · {{ formatTime(order.createdAt) }}</p>
      </div>
      <span
        class="inline-flex px-2 py-0.5 text-xs font-medium rounded-full"
        :class="ORDER_STATUS_CLASSES[order.status]"
      >
        {{ ORDER_STATUS_LABELS[order.status] }}
      </span>
    </div>

    <!-- Items summary -->
    <div class="space-y-1 mb-3">
      <div
        v-for="item in order.items"
        :key="item.id"
        class="flex justify-between items-start text-xs"
      >
        <span class="text-gray-600 flex-1">
          <span class="font-semibold text-gray-800">{{ item.quantity }}×</span>
          {{ item.productName }}
        </span>
        <div class="text-right">
          <span class="text-gray-700 font-medium">{{ formatCurrency(item.subtotal) }}</span>
          <div v-if="defaultRate && item.subtotal" class="text-[10px] text-gray-400">
            {{ defaultRate.symbol }} {{ (item.subtotal * defaultRate.rateToUsd).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Total + type -->
    <div class="flex items-center justify-between border-t border-gray-100 pt-2 mb-3">
      <span class="text-xs text-gray-500">{{ ORDER_TYPE_LABELS[order.orderType] }}</span>
      <div class="text-right">
        <span class="text-sm font-bold text-gray-900">{{ formatCurrency(order.total) }}</span>
        <div v-if="defaultRate && order.total" class="text-[10px] text-gray-400">
          {{ defaultRate.symbol }} {{ (order.total * defaultRate.rateToUsd).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
        </div>
      </div>
    </div>

    <!-- Delivery address -->
    <div v-if="order.deliveryAddress" class="flex items-start gap-1.5 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mb-3">
      <MapPinIcon class="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-gray-400" />
      <span class="line-clamp-1">{{ order.deliveryAddress }}</span>
    </div>

    <!-- Actions -->
    <div class="flex items-center justify-between">
      <div class="flex gap-1.5 flex-wrap">
        <button
          v-for="next in (NEXT_STATUS[order.status] ?? [])"
          :key="next"
          class="text-xs px-2.5 py-1 rounded-lg font-medium transition-colors"
          :class="next === 'CANCELADO'
            ? 'bg-red-50 text-red-700 hover:bg-red-100'
            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'"
          @click="handleAction(next)"
        >
          {{ next === 'CANCELADO' ? 'Cancelar' : ORDER_STATUS_LABELS[next] }}
        </button>
      </div>

      <button
        class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        @click="$emit('view-details', order)"
      >
        <EyeIcon class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { MapPinIcon, EyeIcon } from '@heroicons/vue/24/outline'
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_CLASSES,
  ORDER_TYPE_LABELS,
  NEXT_STATUS,
  type Order,
  type OrderStatus,
} from '~/composables/useClienteDashboard'
import { useExchangeRates } from '~/composables/useExchangeRates'

const props = defineProps<{ order: Order }>()
const { defaultRate } = useExchangeRates()

const emit = defineEmits<{
  'view-details': [order: Order]
  'status-change': [id: string, status: OrderStatus]
}>()

function handleAction(status: OrderStatus) {
  emit('status-change', props.order.id, status)
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}
</script>
