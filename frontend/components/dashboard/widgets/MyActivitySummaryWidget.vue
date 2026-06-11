<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    <!-- Pedidos activos -->
    <div class="card-premium p-6">
      <div class="flex items-center justify-between mb-4">
        <div class="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
          <ShoppingBagIcon class="h-6 w-6 text-white" />
        </div>
      </div>
      <div v-if="loading" class="h-8 bg-gray-200 rounded animate-pulse mb-1 w-16" />
      <div v-else class="text-2xl font-black text-gray-900 mb-1">{{ activeOrdersCount }}</div>
      <p class="text-sm text-gray-500 font-medium">Pedidos en Proceso</p>
    </div>

    <!-- Total pedidos -->
    <div class="card-premium p-6">
      <div class="flex items-center justify-between mb-4">
        <div class="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
          <ArchiveBoxIcon class="h-6 w-6 text-white" />
        </div>
      </div>
      <div v-if="loading" class="h-8 bg-gray-200 rounded animate-pulse mb-1 w-16" />
      <div v-else class="text-2xl font-black text-gray-900 mb-1">{{ totalOrders }}</div>
      <p class="text-sm text-gray-500 font-medium">Pedidos Totales</p>
    </div>

    <!-- Total gastado -->
    <div class="card-premium p-6">
      <div class="flex items-center justify-between mb-4">
        <div class="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg">
          <CurrencyDollarIcon class="h-6 w-6 text-white" />
        </div>
      </div>
      <div v-if="loading" class="h-8 bg-gray-200 rounded animate-pulse mb-1 w-24" />
      <div v-else class="text-2xl font-black text-gray-900 mb-1">{{ formatCurrency(totalSpent) }}</div>
      <p class="text-sm text-gray-500 font-medium">Total Gastado</p>
    </div>

    <!-- Solicitudes activas -->
    <div class="card-premium p-6">
      <div class="flex items-center justify-between mb-4">
        <div class="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg">
          <ClipboardDocumentListIcon class="h-6 w-6 text-white" />
        </div>
      </div>
      <div v-if="loading" class="h-8 bg-gray-200 rounded animate-pulse mb-1 w-16" />
      <div v-else class="text-2xl font-black text-gray-900 mb-1">{{ activeRequestsCount }}</div>
      <p class="text-sm text-gray-500 font-medium">Solicitudes Activas</p>
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
