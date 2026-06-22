<template>
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
    <!-- Pedidos activos -->
    <div class="card-premium p-4 flex items-center gap-3">
      <div class="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm shrink-0">
        <ShoppingBagIcon class="h-4 w-4 text-white" />
      </div>
      <div class="min-w-0">
        <div v-if="loading" class="h-5 bg-gray-200 rounded animate-pulse w-10" />
        <div v-else class="text-lg font-bold text-gray-900 leading-tight">{{ activeOrdersCount }}</div>
        <p class="text-xs text-gray-500 font-medium truncate">Pedidos en Proceso</p>
      </div>
    </div>

    <!-- Total pedidos -->
    <div class="card-premium p-4 flex items-center gap-3">
      <div class="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-sm shrink-0">
        <ArchiveBoxIcon class="h-4 w-4 text-white" />
      </div>
      <div class="min-w-0">
        <div v-if="loading" class="h-5 bg-gray-200 rounded animate-pulse w-10" />
        <div v-else class="text-lg font-bold text-gray-900 leading-tight">{{ totalOrders }}</div>
        <p class="text-xs text-gray-500 font-medium truncate">Pedidos Totales</p>
      </div>
    </div>

    <!-- Total gastado -->
    <div class="card-premium p-4 flex items-center gap-3">
      <div class="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg shadow-sm shrink-0">
        <CurrencyDollarIcon class="h-4 w-4 text-white" />
      </div>
      <div class="min-w-0">
        <div v-if="loading" class="h-5 bg-gray-200 rounded animate-pulse w-16" />
        <div v-else class="text-lg font-bold text-gray-900 leading-tight truncate">{{ formatCurrency(totalSpent) }}</div>
        <p class="text-xs text-gray-500 font-medium truncate">Total Gastado</p>
      </div>
    </div>

    <!-- Solicitudes activas -->
    <div class="card-premium p-4 flex items-center gap-3">
      <div class="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-sm shrink-0">
        <ClipboardDocumentListIcon class="h-4 w-4 text-white" />
      </div>
      <div class="min-w-0">
        <div v-if="loading" class="h-5 bg-gray-200 rounded animate-pulse w-10" />
        <div v-else class="text-lg font-bold text-gray-900 leading-tight">{{ activeRequestsCount }}</div>
        <p class="text-xs text-gray-500 font-medium truncate">Solicitudes Activas</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ShoppingBagIcon,
  ArchiveBoxIcon,
  CurrencyDollarIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/vue/24/outline'

interface OrderLike {
  status: string
  total: number
}

interface RequestLike {
  status: string
}

const props = defineProps<{
  orders: OrderLike[]
  requests: RequestLike[]
  loading?: boolean
}>()

const ACTIVE_ORDER_STATUSES = ['PENDIENTE', 'CONFIRMADO', 'PREPARANDO', 'LISTO', 'EN_ENTREGA']
const ACTIVE_REQUEST_STATUSES = ['PENDIENTE', 'VISTO', 'CONTACTADO']

const totalOrders = computed(() => props.orders.length)

const activeOrdersCount = computed(() =>
  props.orders.filter(o => ACTIVE_ORDER_STATUSES.includes(o.status)).length
)

const totalSpent = computed(() =>
  props.orders
    .filter(o => o.status === 'ENTREGADO')
    .reduce((sum, o) => sum + (o.total ?? 0), 0)
)

const activeRequestsCount = computed(() =>
  props.requests.filter(r => ACTIVE_REQUEST_STATUSES.includes(r.status)).length
)

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)
}
</script>
