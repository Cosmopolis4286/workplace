<template>
  <div class="card-premium p-6">
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center">
        <div class="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg mr-3">
          <ChartPieIcon class="h-6 w-6 text-white" />
        </div>
        <h3 class="text-xl font-bold text-gray-900">Resumen de Rendimiento</h3>
      </div>
      <div class="text-sm text-gray-500 font-medium">
        {{ lastUpdated ? `Actualizado ${formatTime(lastUpdated)}` : 'Cargando…' }}
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <!-- Prep time -->
      <div class="text-center group">
        <div class="relative mb-4">
          <div class="absolute inset-0 bg-gradient-to-r from-workplace-red to-red-600 rounded-full blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
          <div class="relative bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-6 transform group-hover:scale-105 transition-transform duration-300">
            <div v-if="loading" class="h-10 bg-red-200 rounded animate-pulse mx-auto w-24 mb-2" />
            <div v-else class="text-4xl font-black text-workplace-red mb-2">
              {{ kpis.avgPrepTime > 0 ? kpis.avgPrepTime + ' min' : '—' }}
            </div>
            <div class="text-sm font-semibold text-gray-600">Tiempo Promedio Preparación</div>
          </div>
        </div>
      </div>

      <!-- Customer satisfaction -->
      <div class="text-center group">
        <div class="relative mb-4">
          <div class="absolute inset-0 bg-gradient-to-r from-green-500 to-green-600 rounded-full blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
          <div class="relative bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 transform group-hover:scale-105 transition-transform duration-300">
            <div v-if="loading" class="h-10 bg-green-200 rounded animate-pulse mx-auto w-24 mb-2" />
            <div v-else class="text-4xl font-black text-workplace-green mb-2">
              {{ kpis.customerSatisfaction > 0 ? kpis.customerSatisfaction.toFixed(1) + '%' : '—' }}
            </div>
            <div class="text-sm font-semibold text-gray-600">Tasa de Retención</div>
          </div>
        </div>
      </div>

      <!-- Delivery time -->
      <div class="text-center group">
        <div class="relative mb-4">
          <div class="absolute inset-0 bg-gradient-to-r from-workplace-orange to-orange-600 rounded-full blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
          <div class="relative bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 transform group-hover:scale-105 transition-transform duration-300">
            <div v-if="loading" class="h-10 bg-orange-200 rounded animate-pulse mx-auto w-24 mb-2" />
            <div v-else class="text-4xl font-black text-workplace-orange mb-2">
              {{ kpis.avgDeliveryTime > 0 ? kpis.avgDeliveryTime + ' min' : '—' }}
            </div>
            <div class="text-sm font-semibold text-gray-600">Tiempo Promedio Entrega</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChartPieIcon } from '@heroicons/vue/24/outline'

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

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  lastUpdated: null,
})

function formatTime(date: Date): string {
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diff < 60) return 'hace un momento'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}
</script>
