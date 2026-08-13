<template>
  <div class="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
    <div class="flex items-center justify-between mb-5">
      <h3 class="text-sm font-semibold text-gray-900 tracking-tight">Resumen de rendimiento</h3>
      <div class="text-xs text-gray-400 font-medium">
        {{ lastUpdated ? `Actualizado ${timeAgo(lastUpdated)}` : 'Cargando…' }}
      </div>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <!-- Prep time -->
      <div class="rounded-xl bg-red-50/60 p-4 text-center">
        <div v-if="loading" class="h-8 bg-red-100 rounded animate-pulse mx-auto w-20 mb-1.5" />
        <div v-else class="text-2xl font-bold text-red-600 mb-0.5">
          {{ kpis.avgPrepTime > 0 ? kpis.avgPrepTime + ' min' : '—' }}
        </div>
        <div class="text-xs font-medium text-gray-500">Preparación promedio</div>
      </div>

      <!-- Customer satisfaction -->
      <div class="rounded-xl bg-emerald-50/60 p-4 text-center">
        <div v-if="loading" class="h-8 bg-emerald-100 rounded animate-pulse mx-auto w-20 mb-1.5" />
        <div v-else class="text-2xl font-bold text-emerald-600 mb-0.5">
          {{ kpis.customerSatisfaction > 0 ? kpis.customerSatisfaction.toFixed(1) + '%' : '—' }}
        </div>
        <div class="text-xs font-medium text-gray-500">Tasa de retención</div>
      </div>

      <!-- Delivery time -->
      <div class="rounded-xl bg-orange-50/60 p-4 text-center">
        <div v-if="loading" class="h-8 bg-orange-100 rounded animate-pulse mx-auto w-20 mb-1.5" />
        <div v-else class="text-2xl font-bold text-orange-600 mb-0.5">
          {{ kpis.avgDeliveryTime > 0 ? kpis.avgDeliveryTime + ' min' : '—' }}
        </div>
        <div class="text-xs font-medium text-gray-500">Entrega promedio</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRelativeTime } from '~/composables/core/useRelativeTime'

interface KPIs {
  avgPrepTime: number
  customerSatisfaction: number
  avgDeliveryTime: number
}

interface Props {
  kpis: KPIs
  loading?: boolean
  lastUpdated?: Date | null
}

withDefaults(defineProps<Props>(), {
  loading: false,
  lastUpdated: null,
})

const { timeAgo } = useRelativeTime()
</script>
