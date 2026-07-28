<template>
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-6">
    <!-- Pedidos activos -->
    <div class="bg-white rounded-xl border border-gray-100 p-3.5 flex items-center gap-3">
      <div class="flex items-center justify-center w-9 h-9 rounded-full bg-blue-50 shrink-0">
        <ShoppingBagIcon class="h-4.5 w-4.5 text-blue-600" />
      </div>
      <div class="min-w-0">
        <div v-if="loading" class="h-5 bg-gray-100 rounded animate-pulse w-10" />
        <div v-else class="text-base font-bold text-gray-900 leading-tight">{{ activeOrdersCount }}</div>
        <p class="text-[11px] text-gray-400 font-medium truncate">Pedidos en proceso</p>
      </div>
    </div>

    <!-- Total pedidos -->
    <div class="bg-white rounded-xl border border-gray-100 p-3.5 flex items-center gap-3">
      <div class="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-50 shrink-0">
        <ArchiveBoxIcon class="h-4.5 w-4.5 text-emerald-600" />
      </div>
      <div class="min-w-0">
        <div v-if="loading" class="h-5 bg-gray-100 rounded animate-pulse w-10" />
        <div v-else class="text-base font-bold text-gray-900 leading-tight">{{ totalOrders }}</div>
        <p class="text-[11px] text-gray-400 font-medium truncate">Pedidos totales</p>
      </div>
    </div>

    <!-- Total gastado -->
    <div class="bg-white rounded-xl border border-gray-100 p-3.5 flex items-center gap-3">
      <div class="flex items-center justify-center w-9 h-9 rounded-full bg-amber-50 shrink-0">
        <CurrencyDollarIcon class="h-4.5 w-4.5 text-amber-600" />
      </div>
      <div class="min-w-0">
        <div v-if="loading" class="h-5 bg-gray-100 rounded animate-pulse w-16" />
        <div v-else class="text-base font-bold text-gray-900 leading-tight truncate">{{ formatCurrency(totalSpent) }}</div>
        <p class="text-[11px] text-gray-400 font-medium truncate">Total gastado</p>
      </div>
    </div>

    <!-- Solicitudes activas -->
    <div class="bg-white rounded-xl border border-gray-100 p-3.5 flex items-center gap-3">
      <div class="flex items-center justify-center w-9 h-9 rounded-full bg-purple-50 shrink-0">
        <ClipboardDocumentListIcon class="h-4.5 w-4.5 text-purple-600" />
      </div>
      <div class="min-w-0">
        <div v-if="loading" class="h-5 bg-gray-100 rounded animate-pulse w-10" />
        <div v-else class="text-base font-bold text-gray-900 leading-tight">{{ activeRequestsCount }}</div>
        <p class="text-[11px] text-gray-400 font-medium truncate">Solicitudes activas</p>
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

const ACTIVE_ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY']
const ACTIVE_REQUEST_STATUSES = ['PENDING', 'SEEN', 'CONTACTED']

const totalOrders = computed(() => props.orders.length)

const activeOrdersCount = computed(() =>
  props.orders.filter(o => ACTIVE_ORDER_STATUSES.includes(o.status)).length
)

const totalSpent = computed(() =>
  props.orders
    .filter(o => o.status === 'DELIVERED')
    .reduce((sum, o) => sum + (o.total ?? 0), 0)
)

const activeRequestsCount = computed(() =>
  props.requests.filter(r => ACTIVE_REQUEST_STATUSES.includes(r.status)).length
)

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)
}
</script>
