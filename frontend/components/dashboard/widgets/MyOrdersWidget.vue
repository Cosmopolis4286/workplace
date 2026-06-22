<template>
  <div class="card bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
    <div class="flex items-center justify-between mb-4">
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
        to="/mis-pedidos"
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
    <div v-else-if="orders.length === 0" class="text-center py-8">
      <ShoppingBagIcon class="w-10 h-10 text-gray-300 mx-auto mb-2" />
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
    <div v-else class="space-y-2 max-h-80 overflow-y-auto pr-1">
      <NuxtLink
        v-for="order in orders.slice(0, 5)"
        :key="order.id"
        to="/mis-pedidos"
        class="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
      >
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0" :class="avatarClass(order.status)">
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
    <div v-if="!loading && orders.length > 0" class="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
      <span class="text-gray-400">{{ orders.length }} pedido{{ orders.length !== 1 ? 's' : '' }} reciente{{ orders.length !== 1 ? 's' : '' }}</span>
      <span v-if="activeCount > 0" class="font-semibold text-blue-600">{{ activeCount }} en proceso</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ShoppingBagIcon, MagnifyingGlassIcon, ClockIcon } from '@heroicons/vue/24/outline'

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
  commerce?: { name: string }
}

const props = defineProps<{
  orders: Order[]
  loading?: boolean
}>()

const ACTIVE_STATUSES = ['PENDIENTE', 'CONFIRMADO', 'PREPARANDO', 'LISTO', 'EN_ENTREGA']

const activeCount = computed(() =>
  props.orders.filter(o => ACTIVE_STATUSES.includes(o.status)).length
)

const statusLabels: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  CONFIRMADO: 'Confirmado',
  PREPARANDO: 'Preparando',
  LISTO: 'Listo',
  EN_ENTREGA: 'En camino',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
}

const statusClasses: Record<string, string> = {
  PENDIENTE: 'bg-yellow-100 text-yellow-700',
  CONFIRMADO: 'bg-blue-100 text-blue-700',
  PREPARANDO: 'bg-orange-100 text-orange-700',
  LISTO: 'bg-purple-100 text-purple-700',
  EN_ENTREGA: 'bg-indigo-100 text-indigo-700',
  ENTREGADO: 'bg-green-100 text-green-700',
  CANCELADO: 'bg-red-100 text-red-700',
}

const avatarClasses: Record<string, string> = {
  PENDIENTE: 'bg-yellow-100 text-yellow-700',
  CONFIRMADO: 'bg-blue-100 text-blue-700',
  PREPARANDO: 'bg-orange-100 text-orange-700',
  LISTO: 'bg-purple-100 text-purple-700',
  EN_ENTREGA: 'bg-indigo-100 text-indigo-700',
  ENTREGADO: 'bg-green-100 text-green-700',
  CANCELADO: 'bg-red-100 text-red-600',
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

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'justo ahora'
  if (mins < 60) return `hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `hace ${days}d`
  return new Date(dateStr).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}
</script>
