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
      <div v-for="n in 3" :key="n" class="animate-pulse bg-gray-100 rounded-xl h-14" />
    </div>

    <!-- Empty -->
    <div v-else-if="orders.length === 0" class="text-center py-6">
      <ShoppingBagIcon class="w-10 h-10 text-gray-300 mx-auto mb-2" />
      <p class="text-sm text-gray-500">No tienes pedidos aún</p>
      <NuxtLink
        to="/search"
        class="inline-block mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700"
      >
        Explorar productos
      </NuxtLink>
    </div>

    <!-- Orders List -->
    <div v-else class="space-y-2">
      <div
        v-for="order in orders.slice(0, 5)"
        :key="order.id"
        class="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
      >
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center text-blue-700 font-bold text-xs">
            {{ order.commerce?.name?.[0]?.toUpperCase() ?? 'C' }}
          </div>
          <div>
            <p class="text-sm font-semibold text-gray-900 truncate max-w-[140px]">
              {{ order.commerce?.name ?? 'Comercio' }}
            </p>
            <p class="text-xs text-gray-500">{{ order.orderNumber }}</p>
          </div>
        </div>
        <div class="text-right">
          <p class="text-sm font-bold text-gray-900">{{ formatCurrency(order.total) }}</p>
          <span
            class="text-[10px] font-medium px-2 py-0.5 rounded-full"
            :class="statusClass(order.status)"
          >
            {{ statusLabel(order.status) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ShoppingBagIcon } from '@heroicons/vue/24/outline'

interface Order {
  id: string
  orderNumber: string
  status: string
  total: number
  commerce?: { name: string }
}

const props = defineProps<{
  orders: Order[]
  loading?: boolean
}>()

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

function statusLabel(status: string) {
  return statusLabels[status] || status
}

function statusClass(status: string) {
  return statusClasses[status] || 'bg-gray-100 text-gray-700'
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)
}
</script>
