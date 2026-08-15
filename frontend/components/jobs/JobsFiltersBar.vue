<template>
  <div class="card p-4 mb-6 flex flex-col sm:flex-row gap-3">
    <div class="relative flex-1">
      <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <input
        :value="search"
        type="text"
        placeholder="Buscar en tus empleos..."
        class="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
        @input="$emit('update:search', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <select
      :value="filterStatus"
      class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 bg-white"
      @change="$emit('update:filterStatus', ($event.target as HTMLSelectElement).value)"
    >
      <option value="">Todos los estados</option>
      <option value="ACTIVE">Activos</option>
      <option value="PAUSED">Pausados</option>
      <option value="INACTIVE">Inactivos</option>
      <option value="CLOSED">Cerrados</option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { MagnifyingGlassIcon } from '@heroicons/vue/24/outline'

defineProps<{
  search: string
  filterStatus: string
}>()

defineEmits<{
  'update:search': [value: string]
  'update:filterStatus': [value: string]
}>()
</script>
