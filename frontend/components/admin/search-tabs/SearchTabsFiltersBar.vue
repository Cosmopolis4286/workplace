<template>
  <div class="card p-4 mb-6 flex flex-col sm:flex-row gap-3">
    <div class="relative flex-1">
      <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <input :value="searchQuery" type="text" placeholder="Buscar por etiqueta o key..." class="input-field pl-9" @input="$emit('update:searchQuery', ($event.target as HTMLInputElement).value)" />
    </div>
    <select :value="filterStatus" class="input-field w-auto" @change="$emit('update:filterStatus', ($event.target as HTMLSelectElement).value)">
      <option value="">Todos los estados</option>
      <option value="enabled">Activos</option>
      <option value="disabled">Inactivos</option>
    </select>
    <button v-if="searchQuery || filterStatus" class="text-sm text-gray-400 hover:text-gray-600" @click="$emit('clear')">Limpiar</button>
  </div>
</template>

<script setup lang="ts">
import { MagnifyingGlassIcon } from '@heroicons/vue/24/outline'

defineProps<{
  searchQuery: string
  filterStatus: string
}>()

defineEmits<{
  'update:searchQuery': [value: string]
  'update:filterStatus': [value: string]
  clear: []
}>()
</script>
