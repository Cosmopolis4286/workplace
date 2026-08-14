<template>
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <div v-for="card in statCards" :key="card.label"
         class="bg-white/80 backdrop-blur-sm p-5 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-white/20">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-gray-500 text-xs font-medium uppercase tracking-wide">{{ card.label }}</p>
          <p class="text-3xl font-bold text-gray-800 mt-1">
            <span v-if="loadingStats" class="inline-block w-12 h-7 bg-gray-200 rounded animate-pulse" />
            <template v-else>{{ card.value }}</template>
          </p>
          <p :class="card.subClass" class="text-xs flex items-center gap-1 mt-1">
            <component :is="card.icon" class="w-3.5 h-3.5" />
            {{ card.sub }}
          </p>
        </div>
        <div :class="card.bgClass" class="p-3 rounded-xl shadow-lg">
          <component :is="card.bigIcon" class="w-7 h-7 text-white" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ShoppingBag, DollarSign, Clock, CheckCircle, TrendingUp } from 'lucide-vue-next'
import type { OrderStats } from '~/composables/catalog/useMerchantOrders'

const props = defineProps<{
  stats: OrderStats
  loadingStats: boolean
  formatCurrency: (n: number) => string
}>()

const statCards = computed(() => [
  {
    label:   'Mis Pedidos',
    value:   props.stats.totalOrders,
    sub:     `Activos: ${props.stats.activeOrders}`,
    subClass:'text-green-500',
    icon:    TrendingUp,
    bigIcon: ShoppingBag,
    bgClass: 'bg-gradient-to-br from-green-400 to-green-600',
  },
  {
    label:   'Ingresos del Mes',
    value:   props.formatCurrency(props.stats.monthlyRevenue),
    sub:     `Ticket promedio: ${props.formatCurrency(props.stats.avgTicket)}`,
    subClass:'text-blue-500',
    icon:    DollarSign,
    bigIcon: DollarSign,
    bgClass: 'bg-gradient-to-br from-blue-400 to-blue-600',
  },
  {
    label:   'Pendientes',
    value:   props.stats.pendingOrders,
    sub:     'En espera',
    subClass:'text-yellow-500',
    icon:    Clock,
    bigIcon: Clock,
    bgClass: 'bg-gradient-to-br from-yellow-400 to-yellow-600',
  },
  {
    label:   'Completados',
    value:   props.stats.completedOrders,
    sub:     `Cancelados: ${props.stats.cancelledOrders}`,
    subClass:'text-emerald-500',
    icon:    CheckCircle,
    bigIcon: CheckCircle,
    bgClass: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
  },
])
</script>
