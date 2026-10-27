<template>
  <div class="card bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col min-h-[420px] h-full">
    <div class="flex items-center justify-between mb-4 flex-shrink-0">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-blue-100 rounded-xl">
          <ShoppingBagIcon class="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 class="font-bold text-gray-900">Mis Pedidos</h3>
          <p class="text-xs text-gray-500">Tus compras recientes</p>
        </div>
      </div>
      <NuxtLink
        to="/my-orders"
        class="text-xs font-semibold text-blue-600 hover:text-blue-700"
      >
        Ver todos
      </NuxtLink>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-3">
      <div v-for="n in 3" :key="n" class="animate-pulse bg-gray-100 rounded-xl h-16" />
    </div>

    <!-- Empty -->
    <div v-else-if="orders.length === 0" class="flex-1 flex flex-col items-center justify-center text-center">
      <ShoppingBagIcon class="w-10 h-10 text-gray-300 mb-2" />
      <p class="text-sm font-medium text-gray-700">No tienes pedidos aún</p>
      <p class="text-xs text-gray-400 mt-1">Cuando hagas un pedido, aparecerá aquí</p>
      <NuxtLink
        to="/search"
        class="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700"
      >
        <MagnifyingGlassIcon class="w-3.5 h-3.5" />
        Explorar productos
      </NuxtLink>
    </div>

    <!-- Orders List -->
    <div v-else class="space-y-2 flex-1">
      <NuxtLink
        v-for="order in orders.slice(0, 5)"
        :key="order.id"
        to="/my-orders"
        class="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
      >
        <div class="flex items-center gap-3 min-w-0">
          <img
            v-if="getAssetUrl(order.commerce?.avatar)"
            :src="getAssetUrl(order.commerce?.avatar)!"
            class="w-10 h-10 rounded-lg object-cover flex-shrink-0 ring-1 ring-gray-100"
          />
          <div v-else class="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0" :class="avatarClass(order.status)">
            {{ order.commerce?.name?.[0]?.toUpperCase() ?? 'C' }}
          </div>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-gray-900 truncate max-w-[160px]">
              {{ order.commerce?.name ?? 'Comercio' }}
            </p>
            <p class="text-xs text-gray-400 truncate max-w-[180px]">
              {{ itemsPreview(order) }}
            </p>
            <p class="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
              <ClockIcon class="w-3 h-3" />
              {{ timeAgo(order.createdAt) }}
            </p>
          </div>
        </div>
        <div class="text-right flex-shrink-0 ml-2">
          <p class="text-sm font-bold text-gray-900">{{ formatCurrency(order.total) }}</p>
          <span
            class="inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
            :class="statusClass(order.status)"
          >
            {{ statusLabel(order.status) }}
          </span>
        </div>
      </NuxtLink>
    </div>

    <!-- Footer summary -->
    <div v-if="!loading && orders.length > 0" class="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs flex-shrink-0">
      <span class="text-gray-400">{{ orders.length }} pedido{{ orders.length !== 1 ? 's' : '' }} reciente{{ orders.length !== 1 ? 's' : '' }}</span>
      <span v-if="activeCount > 0" class="font-semibold text-blue-600">{{ activeCount }} en proceso</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ShoppingBagIcon, MagnifyingGlassIcon, ClockIcon } from '@heroicons/vue/24/outline'
import { useRelativeTime } from '~/composables/core/useRelativeTime'
import { useAssetUrl } from '~/composables/core/useAssetUrl'

interface OrderItem {
  productName: string
  quantity: number
}

interface Order {
  id: string
  orderNumber: string
  status: string
  total: number
  createdAt: string
  items?: OrderItem[]
  itemCount?: number
  commerce?: { name: string; avatar?: string | null } | null
}

const { getAssetUrl } = useAssetUrl()

const props = defineProps<{
  orders: Order[]
  loading?: boolean
}>()

const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY']

const activeCount = computed(() =>
  props.orders.filter(o => ACTIVE_STATUSES.includes(o.status)).length
)

const statusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmado',
  PREPARING: 'Preparando',
  READY: 'Listo',
  OUT_FOR_DELIVERY: 'En camino',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
}

const statusClasses: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PREPARING: 'bg-orange-100 text-orange-700',
  READY: 'bg-purple-100 text-purple-700',
  OUT_FOR_DELIVERY: 'bg-indigo-100 text-indigo-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

const avatarClasses: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PREPARING: 'bg-orange-100 text-orange-700',
  READY: 'bg-purple-100 text-purple-700',
  OUT_FOR_DELIVERY: 'bg-indigo-100 text-indigo-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
}

function statusLabel(status: string) {
  return statusLabels[status] || status
}

function statusClass(status: string) {
  return statusClasses[status] || 'bg-gray-100 text-gray-700'
}

function avatarClass(status: string) {
  return avatarClasses[status] || 'bg-blue-100 text-blue-700'
}

function itemsPreview(order: Order) {
  const items = order.items ?? []
  if (items.length === 0) {
    return order.itemCount ? `${order.itemCount} ítem${order.itemCount !== 1 ? 's' : ''}` : order.orderNumber
  }
  const names = items.slice(0, 2).map(i => `${i.quantity}× ${i.productName}`).join(', ')
  const extra = items.length > 2 ? ` +${items.length - 2} más` : ''
  return `${names}${extra}`
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)
}

const { timeAgo } = useRelativeTime()
</script>
