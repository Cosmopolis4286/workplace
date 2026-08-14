<template>
  <div class="space-y-4">
    <!-- Acciones rápidas -->
    <div class="card p-5">
      <h3 class="text-sm font-semibold text-gray-700 mb-3">Acciones rápidas</h3>
      <div class="space-y-2">
        <button class="w-full btn-primary text-sm flex items-center gap-2" @click="$emit('new-order')">
          <ShoppingCartIcon class="h-4 w-4" />Nuevo Pedido
        </button>
        <button class="w-full btn-secondary text-sm flex items-center gap-2" @click="$emit('schedule')">
          <CalendarIcon class="h-4 w-4" />Programar Servicio
        </button>
        <NuxtLink to="/customers" class="w-full btn-secondary text-sm flex items-center gap-2">
          <UsersIcon class="h-4 w-4" />Gestionar Clientes
        </NuxtLink>
        <NuxtLink to="/analytics" class="w-full btn-secondary text-sm flex items-center gap-2">
          <ChartBarIcon class="h-4 w-4" />Ver Reportes
        </NuxtLink>
      </div>
    </div>

    <!-- Resumen de estados -->
    <div class="card p-5">
      <h3 class="text-sm font-semibold text-gray-700 mb-4">Resumen</h3>
      <div class="space-y-2.5">
        <div v-for="s in summary" :key="s.label" class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full flex-shrink-0" :class="s.dot" />
            <span class="text-sm text-gray-600">{{ s.label }}</span>
          </div>
          <span class="text-sm font-bold text-gray-900">{{ s.value }}</span>
        </div>
      </div>
    </div>

    <!-- Ingresos -->
    <div v-if="!loadingStats && stats" class="card p-5 border-l-4 border-l-red-400">
      <p class="text-xs text-gray-500 mb-1">Ingresos del mes</p>
      <p class="text-2xl font-black text-red-600">{{ formatCurrency(stats.monthlyRevenue) }}</p>
      <p class="text-xs text-gray-400 mt-1">Ticket prom: {{ formatCurrency(stats.avgTicket) }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ShoppingCartIcon, CalendarIcon, UsersIcon, ChartBarIcon } from '@heroicons/vue/24/outline'
import type { OrderStats } from '~/composables/catalog/useMerchantOrders'

const props = defineProps<{
  stats: OrderStats | null
  loadingStats: boolean
  formatCurrency: (n: number) => string
}>()

defineEmits<{
  'new-order': []
  schedule: []
}>()

const summary = computed(() => [
  { label: 'Activos',     value: props.stats?.activeOrders  ?? 0, dot: 'bg-blue-400'  },
  { label: 'Pendientes',  value: props.stats?.pendingOrders ?? 0, dot: 'bg-yellow-400' },
  { label: 'Completados', value: props.stats?.completedOrders ?? 0, dot: 'bg-green-400' },
  { label: 'Cancelados',  value: props.stats?.cancelledOrders ?? 0, dot: 'bg-red-400'   },
])
</script>
