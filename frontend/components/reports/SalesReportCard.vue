<template>
  <div class="card overflow-hidden">
    <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
          <ShoppingCartIcon class="h-5 w-5 text-green-600" />
        </div>
        <div>
          <h2 class="text-sm font-semibold text-gray-900">{{ isFreelancer ? 'Solicitudes de Servicio' : 'Ventas & Órdenes' }}</h2>
          <p class="text-xs text-gray-400">{{ isFreelancer ? 'Solicitudes recibidas e ingresos' : 'Pedidos e ingresos del negocio' }}</p>
        </div>
      </div>
      <button
        class="text-xs text-gray-400 hover:text-green-600 flex items-center gap-1 transition-colors"
        :disabled="loading"
        @click="$emit('export')"
      >
        <ArrowDownTrayIcon class="h-3.5 w-3.5" />
        JSON
      </button>
    </div>

    <div class="p-6">
      <!-- Skeleton -->
      <div v-if="loading" class="space-y-4 animate-pulse">
        <div class="grid grid-cols-2 gap-4">
          <div v-for="n in 4" :key="n" class="h-16 bg-gray-100 rounded-xl" />
        </div>
        <div class="h-3 bg-gray-100 rounded w-full" />
        <div class="h-3 bg-gray-100 rounded w-3/4" />
      </div>

      <template v-else-if="stats">
        <!-- KPI grid -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div class="bg-gray-50 rounded-xl p-4 text-center">
            <p class="text-2xl font-black text-gray-900">{{ stats.total ?? '—' }}</p>
            <p class="text-xs text-gray-500 mt-1">{{ isFreelancer ? 'Total solicitudes' : 'Total pedidos' }}</p>
          </div>
          <div class="bg-blue-50 rounded-xl p-4 text-center">
            <p class="text-2xl font-black text-blue-600">{{ stats.active ?? '—' }}</p>
            <p class="text-xs text-gray-500 mt-1">Activos</p>
          </div>
          <div class="bg-green-50 rounded-xl p-4 text-center">
            <p class="text-2xl font-black text-green-600">{{ stats.completedToday ?? '—' }}</p>
            <p class="text-xs text-gray-500 mt-1">Completados hoy</p>
          </div>
          <div class="bg-red-50 rounded-xl p-4 text-center">
            <p class="text-2xl font-black text-red-500">{{ stats.cancelled ?? '—' }}</p>
            <p class="text-xs text-gray-500 mt-1">Cancelados</p>
          </div>
        </div>

        <!-- Ingreso destacado -->
        <div class="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
          <div>
            <p class="text-xs font-medium text-green-700">Ingresos totales</p>
            <p class="text-2xl font-black text-green-800 mt-0.5">{{ formatCurrency(stats.totalRevenue) }}</p>
          </div>
          <div class="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <CurrencyDollarIcon class="h-6 w-6 text-green-600" />
          </div>
        </div>

        <!-- Tasa de cancelación -->
        <div class="mt-4">
          <div class="flex justify-between text-xs text-gray-500 mb-1">
            <span>Tasa de cancelación</span>
            <span :class="cancellationRate > 20 ? 'text-red-600 font-semibold' : 'text-gray-600'">
              {{ cancellationRate }}%
            </span>
          </div>
          <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-700"
              :class="cancellationRate > 20 ? 'bg-red-500' : cancellationRate > 10 ? 'bg-yellow-500' : 'bg-green-500'"
              :style="{ width: `${Math.min(cancellationRate, 100)}%` }"
            />
          </div>
        </div>
      </template>

      <div v-else class="py-8 text-center text-gray-400 text-sm">
        No se pudieron cargar los datos de ventas
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ShoppingCartIcon, ArrowDownTrayIcon, CurrencyDollarIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  isFreelancer: boolean
  loading: boolean
  stats: any
  formatCurrency: (value: number | undefined | null) => string
}>()

defineEmits<{
  export: []
}>()

const cancellationRate = computed(() => {
  const total = props.stats?.total ?? 0
  const cancelled = props.stats?.cancelled ?? 0
  if (!total) return 0
  return Math.round((cancelled / total) * 100)
})
</script>
