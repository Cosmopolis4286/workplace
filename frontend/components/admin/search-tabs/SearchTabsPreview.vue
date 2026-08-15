<template>
  <div class="card p-5 mb-6">
    <p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Vista previa</p>
    <div class="flex flex-wrap gap-2 bg-gradient-to-r from-workplace-red to-red-600 rounded-2xl p-2">
      <div
        v-for="tab in tabs"
        :key="tab.id"
        class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors"
        :class="tab.isEnabled ? 'bg-white shadow-sm' : 'text-white/50 line-through'"
        :style="tab.isEnabled ? `color: ${tab.color}` : ''"
      >
        <svg v-if="tab.icon" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="tab.icon" />
        </svg>
        {{ tab.label }}
      </div>
      <p v-if="tabs.length === 0" class="text-white/70 text-sm py-2 px-2">Sin tabs configurados</p>
    </div>
    <p class="text-xs text-gray-400 mt-2">Así se verán los tabs en la barra de búsqueda. Los tabs inactivos no se muestran a los usuarios.</p>
  </div>
</template>

<script setup lang="ts">
import type { SearchTab } from '~/composables/search/useSearchTabs'

defineProps<{
  tabs: SearchTab[]
}>()
</script>
