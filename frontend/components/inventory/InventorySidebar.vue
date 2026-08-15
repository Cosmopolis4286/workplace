<template>
  <div class="space-y-4">
    <!-- Quick actions -->
    <div class="card p-5">
      <h3 class="text-sm font-medium text-gray-900 mb-3">Acciones Rápidas</h3>
      <div class="space-y-2">
        <button @click="$emit('create-product')" class="w-full btn-primary text-sm py-2">
          Agregar Producto
        </button>
        <button @click="$emit('open-categories')" class="w-full btn-secondary text-sm py-2">
          Gestionar Categorías
        </button>
        <button @click="$emit('open-stock-report')" class="w-full btn-secondary text-sm py-2">
          Reporte de Stock
        </button>
      </div>
    </div>

    <!-- Alerts -->
    <div v-if="outOfStockCount > 0 || lowStockCount > 0" class="card p-5">
      <h3 class="text-sm font-medium text-gray-900 mb-3">Alertas</h3>
      <div class="space-y-2">
        <button
          v-if="outOfStockCount > 0"
          @click="$emit('update:filterStatus', 'OUT_OF_STOCK')"
          class="w-full flex items-center justify-between p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 hover:bg-red-100 transition-colors"
        >
          <span>{{ outOfStockCount }} producto(s) agotado(s)</span>
          <ChevronRightIcon class="h-3.5 w-3.5" />
        </button>
        <button
          v-if="lowStockCount > 0"
          @click="$emit('update:filterStatus', 'LOW_STOCK')"
          class="w-full flex items-center justify-between p-2.5 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700 hover:bg-yellow-100 transition-colors"
        >
          <span>{{ lowStockCount }} producto(s) con bajo stock</span>
          <ChevronRightIcon class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>

    <!-- Category breakdown -->
    <div v-if="categoryBreakdown.length > 0 && !loading" class="card p-5">
      <h3 class="text-sm font-medium text-gray-900 mb-3">Por Categoría</h3>
      <div class="space-y-2">
        <button
          v-for="cat in categoryBreakdown"
          :key="cat.id"
          @click="$emit('update:filterCategory', filterCategory === cat.id ? '' : cat.id)"
          class="w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors"
          :class="filterCategory === cat.id ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'"
        >
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: cat.color }" />
            <span class="text-gray-700 truncate">{{ cat.name }}</span>
          </div>
          <span class="text-gray-400 ml-1 flex-shrink-0">{{ cat.count }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ChevronRightIcon } from '@heroicons/vue/24/outline'

defineProps({
  outOfStockCount: Number,
  lowStockCount: Number,
  categoryBreakdown: { type: Array, default: () => [] },
  filterCategory: String,
  loading: Boolean,
})

defineEmits(['create-product', 'open-categories', 'open-stock-report', 'update:filterStatus', 'update:filterCategory'])
</script>
