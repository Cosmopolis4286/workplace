<template>
  <div class="card p-6 mb-6">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
        <div class="relative">
          <input 
            :value="filters.search"
            @input="$emit('update:filters', { ...filters, search: $event.target.value })"
            type="text" 
            placeholder="Buscar..."
            class="input-field pl-10"
          >
          <MagnifyingGlassIcon class="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
        </div>
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">{{ categoryLabel }}</label>
        <select 
          :value="filters.category"
          @change="$emit('update:filters', { ...filters, category: $event.target.value })"
          class="input-field"
        >
          <option value="">Todas las categorías</option>
          <option v-for="category in categories" :key="category.value" :value="category.value">
            {{ category.label }}
          </option>
        </select>
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">{{ statusLabel }}</label>
        <select 
          :value="filters.status"
          @change="$emit('update:filters', { ...filters, status: $event.target.value })"
          class="input-field"
        >
          <option value="">Todos</option>
          <option v-for="status in statuses" :key="status.value" :value="status.value">
            {{ status.label }}
          </option>
        </select>
      </div>
      
      <div class="flex items-end space-x-2">
        <button class="btn-primary flex-1" @click="$emit('apply-filters')">
          Filtrar
        </button>
        <button class="btn-secondary" @click="$emit('clear-filters')">
          Limpiar
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { MagnifyingGlassIcon } from '@heroicons/vue/24/outline'

defineProps({
  filters: Object,
  categories: Array,
  statuses: Array,
  categoryLabel: {
    type: String,
    default: 'Categoría'
  },
  statusLabel: {
    type: String,
    default: 'Estado'
  }
})

defineEmits(['update:filters', 'apply-filters', 'clear-filters'])
</script>