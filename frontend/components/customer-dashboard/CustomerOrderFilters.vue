<template>
  <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-5 border border-white/20">
    <div class="flex flex-wrap gap-3 items-center justify-between">
      <div class="flex gap-2 flex-wrap">
        <button
          v-for="f in filterTabs"
          :key="f.value ?? 'all'"
          @click="$emit('filter', f.value)"
          :class="activeStatus === f.value
            ? 'bg-green-500 text-white shadow-md'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
          class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150"
        >
          {{ f.label }}
          <span v-if="f.value && statusCount[f.value]" class="ml-1 text-xs opacity-80">({{ statusCount[f.value] }})</span>
        </button>
      </div>
      <div class="flex gap-2">
        <input
          :value="searchQuery"
          @input="$emit('update:search-query', ($event.target as HTMLInputElement).value)"
          type="text"
          placeholder="Buscar por número, cliente..."
          class="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent w-52"
        />
        <button
          @click="$emit('new-order')"
          class="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:scale-105 transition-transform shadow-md"
        >
          <Plus class="w-4 h-4" />
          Nuevo Pedido
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus } from 'lucide-vue-next'
import type { OrderStatus } from '~/composables/catalog/useMerchantOrders'

defineProps<{
  activeStatus: OrderStatus | undefined
  statusCount: Record<string, number>
  searchQuery: string
}>()

defineEmits<{
  filter: [status: OrderStatus | undefined]
  'update:search-query': [value: string]
  'new-order': []
}>()

const filterTabs: { label: string; value: OrderStatus | undefined }[] = [
  { label: 'Todos',      value: undefined },
  { label: 'Pendientes', value: 'PENDING' },
  { label: 'Activos',    value: 'PREPARING' },
  { label: 'Entregados', value: 'DELIVERED' },
  { label: 'Cancelados', value: 'CANCELLED' },
]
</script>
