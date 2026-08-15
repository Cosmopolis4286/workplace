<template>
  <div class="space-y-4">
    <!-- Quick actions -->
    <div class="card p-5">
      <h3 class="text-sm font-semibold text-gray-700 mb-3">Acciones Rápidas</h3>
      <div class="space-y-2">
        <button class="w-full btn-primary text-sm" @click="$emit('create')">
          <PlusIcon class="h-4 w-4 inline mr-1.5" />
          Nueva Venta
        </button>
        <button class="w-full btn-secondary text-sm" @click="navigateTo('/reports')">
          <ChartBarIcon class="h-4 w-4 inline mr-1.5" />
          Ver Reportes
        </button>
      </div>
    </div>

    <!-- Active orders by status -->
    <div class="card p-5">
      <h3 class="text-sm font-semibold text-gray-700 mb-4">Pipeline de Pedidos</h3>
      <div class="space-y-2.5">
        <div
          v-for="status in pipelineStatuses"
          :key="status"
          class="flex items-center justify-between cursor-pointer group"
          @click="$emit('filter-by-status', status)"
        >
          <div class="flex items-center gap-2">
            <div class="h-2.5 w-2.5 rounded-full" :class="pipelineDot(status)" />
            <span class="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
              {{ ORDER_STATUS_LABELS[status] }}
            </span>
          </div>
          <span class="text-sm font-semibold text-gray-900">
            {{ countByStatus(status) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Payment breakdown -->
    <div class="card p-5">
      <h3 class="text-sm font-semibold text-gray-700 mb-4">Métodos de Pago</h3>
      <div class="space-y-2">
        <div
          v-for="method in paymentBreakdown"
          :key="method.key"
          class="flex items-center justify-between text-sm"
        >
          <span class="text-gray-600">{{ method.label }}</span>
          <span class="font-medium text-gray-800">{{ method.count }}</span>
        </div>
        <div v-if="paymentBreakdown.length === 0" class="text-xs text-gray-400 text-center py-2">Sin datos</div>
      </div>
    </div>

    <!-- Recent alert: unpaid orders -->
    <div v-if="unpaidCount > 0" class="card p-5 bg-yellow-50 border border-yellow-200">
      <h3 class="text-sm font-semibold text-yellow-800 flex items-center gap-1.5 mb-1">
        <ExclamationTriangleIcon class="h-4 w-4" />
        Cobros Pendientes
      </h3>
      <p class="text-sm text-yellow-700">
        {{ unpaidCount }} pedido{{ unpaidCount !== 1 ? 's' : '' }} sin cobrar
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { PlusIcon, ChartBarIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, type Order, type OrderStatus } from '~/composables/catalog/useMerchantOrders'

const props = defineProps<{
  orders: Order[]
}>()

defineEmits<{
  create: []
  'filter-by-status': [status: OrderStatus]
}>()

const pipelineStatuses: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY']

function countByStatus(status: OrderStatus) {
  return props.orders.filter(o => o.status === status).length
}

const pipelineDots: Record<OrderStatus, string> = {
  PENDING:          'bg-yellow-400',
  CONFIRMED:        'bg-blue-400',
  PREPARING:        'bg-indigo-500',
  READY:            'bg-green-500',
  OUT_FOR_DELIVERY: 'bg-purple-500',
  DELIVERED:        'bg-gray-400',
  CANCELLED:        'bg-red-400',
}

function pipelineDot(status: OrderStatus) {
  return pipelineDots[status]
}

const paymentBreakdown = computed(() => {
  const counts: Record<string, number> = {}
  props.orders.forEach(o => { counts[o.paymentMethod] = (counts[o.paymentMethod] ?? 0) + 1 })
  return Object.entries(counts)
    .map(([key, count]) => ({ key, label: PAYMENT_METHOD_LABELS[key as any] ?? key, count }))
    .sort((a, b) => b.count - a.count)
})

const unpaidCount = computed(() =>
  props.orders.filter(o => o.paymentStatus === 'PENDING' && o.status !== 'CANCELLED').length,
)
</script>
