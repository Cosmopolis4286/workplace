<template>
  <div class="card p-4">
    <div class="flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1">
        <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          :value="searchQuery"
          type="text"
          placeholder="Buscar por nombre, email o teléfono..."
          class="input-field pl-9"
          @input="$emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <select :value="selectedSegment" class="input-field w-auto" @change="$emit('update:selectedSegment', ($event.target as HTMLSelectElement).value)">
        <option value="">Todos los segmentos</option>
        <option value="VIP">VIP</option>
        <option value="PREMIUM">Premium</option>
        <option value="REGULAR">Regular</option>
        <option value="NEW">Nuevo</option>
      </select>
      <select :value="selectedStatus" class="input-field w-auto" @change="$emit('update:selectedStatus', ($event.target as HTMLSelectElement).value)">
        <option value="">Todos los estados</option>
        <option value="active">Activos</option>
        <option value="inactive">Inactivos</option>
      </select>
      <button
        v-if="searchQuery || selectedSegment || selectedStatus"
        class="text-sm text-gray-400 hover:text-gray-600 whitespace-nowrap"
        @click="$emit('clear')"
      >Limpiar</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { MagnifyingGlassIcon } from '@heroicons/vue/24/outline'

defineProps<{
  searchQuery: string
  selectedSegment: string
  selectedStatus: string
}>()

defineEmits<{
  'update:searchQuery': [value: string]
  'update:selectedSegment': [value: string]
  'update:selectedStatus': [value: string]
  clear: []
}>()
</script>
