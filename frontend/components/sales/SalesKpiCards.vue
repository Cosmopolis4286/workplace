<template>
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    <div class="card p-5">
      <p class="text-sm text-gray-500">Ingresos del Mes</p>
      <p class="text-2xl font-bold text-gray-900 mt-1">
        <span v-if="loadingStats" class="skeleton h-7 w-28 inline-block rounded" />
        <span v-else>{{ formatCurrency(stats.monthlyRevenue) }}</span>
      </p>
      <p class="text-xs text-gray-400 mt-1">{{ stats.completedOrders }} pedidos completados</p>
    </div>
    <div class="card p-5">
      <p class="text-sm text-gray-500">Pedidos Activos</p>
      <p class="text-2xl font-bold text-indigo-600 mt-1">
        <span v-if="loadingStats" class="skeleton h-7 w-16 inline-block rounded" />
        <span v-else>{{ stats.activeOrders }}</span>
      </p>
      <p class="text-xs text-gray-400 mt-1">{{ stats.pendingOrders }} pendientes</p>
    </div>
    <div class="card p-5">
      <p class="text-sm text-gray-500">Ticket Promedio</p>
      <p class="text-2xl font-bold text-gray-900 mt-1">
        <span v-if="loadingStats" class="skeleton h-7 w-24 inline-block rounded" />
        <span v-else>{{ formatCurrency(stats.avgTicket) }}</span>
      </p>
      <p class="text-xs text-gray-400 mt-1">por pedido</p>
    </div>
    <div class="card p-5">
      <p class="text-sm text-gray-500">Total Pedidos</p>
      <p class="text-2xl font-bold text-gray-900 mt-1">
        <span v-if="loadingStats" class="skeleton h-7 w-16 inline-block rounded" />
        <span v-else>{{ stats.totalOrders }}</span>
      </p>
      <p class="text-xs text-red-500 mt-1" v-if="stats.cancelledOrders > 0">
        {{ stats.cancelledOrders }} cancelados
      </p>
      <p class="text-xs text-gray-400 mt-1" v-else>Sin cancelaciones</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { OrderStats } from '~/composables/catalog/useMerchantOrders'

defineProps<{
  stats: OrderStats
  loadingStats: boolean
  formatCurrency: (n: number) => string
}>()
</script>

<style scoped>
.skeleton {
  @apply bg-gray-200 animate-pulse;
}
</style>
