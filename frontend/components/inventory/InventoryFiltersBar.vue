<template>
  <div class="card p-4 flex flex-wrap gap-3 items-center">
    <div class="relative flex-1 min-w-48">
      <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <input
        :value="search"
        type="text"
        placeholder="Buscar producto..."
        class="input-field pl-9 py-2 text-sm"
        @input="$emit('update:search', $event.target.value)"
      />
    </div>

    <select :value="filterCategory" class="input-field py-2 text-sm min-w-40" @change="$emit('update:filterCategory', $event.target.value)">
      <option value="">Todas las categorías</option>
      <option v-for="cat in categories" :key="cat.id" :value="cat.id">
        {{ cat.name }}
      </option>
    </select>

    <select :value="filterStatus" class="input-field py-2 text-sm min-w-36" @change="$emit('update:filterStatus', $event.target.value)">
      <option value="">Todos los estados</option>
      <option value="AVAILABLE">Disponible</option>
      <option value="LOW_STOCK">Bajo Stock</option>
      <option value="OUT_OF_STOCK">Agotado</option>
      <option value="UNAVAILABLE">No disponible</option>
    </select>

    <div class="flex rounded-lg border overflow-hidden">
      <button
        @click="$emit('update:viewMode', 'grid')"
        :class="viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'"
        class="px-3 py-2 transition-colors"
        title="Vista cuadrícula"
      >
        <Squares2X2Icon class="h-4 w-4" />
      </button>
      <button
        @click="$emit('update:viewMode', 'table')"
        :class="viewMode === 'table' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'"
        class="px-3 py-2 border-l transition-colors"
        title="Vista tabla"
      >
        <TableCellsIcon class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { MagnifyingGlassIcon, Squares2X2Icon, TableCellsIcon } from '@heroicons/vue/24/outline'

defineProps({
  search: String,
  filterCategory: String,
  filterStatus: String,
  viewMode: String,
  categories: { type: Array, default: () => [] },
})

defineEmits(['update:search', 'update:filterCategory', 'update:filterStatus', 'update:viewMode'])
</script>
