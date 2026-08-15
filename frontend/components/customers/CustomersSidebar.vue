<template>
  <div class="space-y-4">

    <!-- Distribución por segmento -->
    <div class="card p-5">
      <h3 class="text-sm font-semibold text-gray-700 mb-4">Por segmento</h3>
      <div class="space-y-3">
        <div v-for="s in segmentSummary" :key="s.key" class="flex items-center gap-3">
          <span class="text-base flex-shrink-0">{{ s.emoji }}</span>
          <div class="flex-1 min-w-0">
            <div class="flex justify-between text-xs mb-1">
              <span class="text-gray-600">{{ s.label }}</span>
              <span class="font-bold text-gray-900">{{ s.count }}</span>
            </div>
            <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-700"
                :class="s.bar"
                :style="{ width: totalClients ? `${Math.round((s.count / totalClients) * 100)}%` : '0%' }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Top clientes por gasto -->
    <div class="card p-5">
      <h3 class="text-sm font-semibold text-gray-700 mb-3">Top clientes</h3>
      <div v-if="loading" class="space-y-3">
        <div v-for="n in 3" :key="n" class="skeleton h-10 w-full rounded-lg" />
      </div>
      <div v-else class="space-y-2.5">
        <div
          v-for="(client, i) in topClients"
          :key="client.id"
          class="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-lg p-1 -mx-1 transition-colors"
          @click="$emit('select-client', client)"
        >
          <span
            class="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black"
            :class="i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-600' : 'bg-orange-50 text-orange-600'"
          >{{ i + 1 }}</span>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold text-gray-900 truncate">{{ client.name }}</p>
            <p class="text-[10px] text-gray-400">{{ client.totalOrders }} pedidos</p>
          </div>
          <span class="text-xs font-bold text-gray-900 flex-shrink-0">${{ client.totalSpent.toFixed(0) }}</span>
        </div>
        <p v-if="topClients.length === 0" class="text-xs text-gray-400 text-center py-2">Sin datos</p>
      </div>
    </div>

    <!-- Resumen rápido -->
    <div class="card p-5 border-l-4 border-l-red-400">
      <h3 class="text-sm font-semibold text-gray-700 mb-3">Resumen</h3>
      <div class="space-y-2.5">
        <div class="flex justify-between text-sm">
          <span class="text-gray-500">Activos</span>
          <span class="font-bold text-green-600">{{ activeClients }}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-gray-500">Inactivos</span>
          <span class="font-bold text-gray-400">{{ totalClients - activeClients }}</span>
        </div>
        <div class="h-px bg-gray-100" />
        <div class="flex justify-between text-sm">
          <span class="text-gray-500">Gasto promedio</span>
          <span class="font-bold text-gray-900">${{ avgSpent.toFixed(2) }}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-gray-500">Clientes VIP</span>
          <span class="font-bold text-purple-600">{{ vipClients }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Customer } from '~/composables/customers/useCustomers'

defineProps<{
  segmentSummary: { key: string; label: string; emoji: string; count: number; bar: string }[]
  totalClients: number
  loading: boolean
  topClients: Customer[]
  activeClients: number
  avgSpent: number
  vipClients: number
}>()

defineEmits<{
  'select-client': [client: Customer]
}>()
</script>
