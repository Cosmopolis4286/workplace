<template>
  <div class="flex items-center justify-between pt-2 mt-2 border-t border-gray-100" @click.stop>
    <button
      v-if="canToggle"
      @click="$emit('toggle-status')"
      class="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
      :class="isActive
        ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
        : 'bg-green-50 text-green-700 hover:bg-green-100'"
    >
      {{ isActive ? 'Pausar' : 'Activar' }}
    </button>
    <span v-else />
    <div class="flex gap-1">
      <button
        v-if="showMetrics"
        @click="$emit('metrics')"
        class="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
        title="Ver métricas"
      >
        <ChartBarIcon class="h-4 w-4" />
      </button>
      <button
        @click="$emit('edit')"
        class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        title="Editar"
      >
        <PencilIcon class="h-4 w-4" />
      </button>
      <button
        @click="$emit('delete')"
        class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        title="Eliminar"
      >
        <TrashIcon class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChartBarIcon, PencilIcon, TrashIcon } from '@heroicons/vue/24/outline'

withDefaults(defineProps<{
  isActive: boolean
  canToggle?: boolean
  showMetrics?: boolean
}>(), {
  canToggle: true,
  showMetrics: false,
})

defineEmits<{
  'toggle-status': []
  metrics: []
  edit: []
  delete: []
}>()
</script>
