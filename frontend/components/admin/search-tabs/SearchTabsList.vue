<template>
  <div>
    <!-- Skeleton -->
    <div v-if="loading" class="grid gap-4">
      <div v-for="n in 3" :key="n" class="card p-5 animate-pulse">
        <div class="flex items-center gap-4">
          <div class="skeleton w-12 h-12 rounded-xl" />
          <div class="flex-1 space-y-2">
            <div class="skeleton h-4 w-32 rounded" />
            <div class="skeleton h-3 w-20 rounded" />
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="tabs.length === 0 && totalTabs === 0" class="card p-12 text-center">
      <MagnifyingGlassIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
      <p class="text-gray-500 font-medium">Sin tabs configurados</p>
      <p class="text-sm text-gray-400 mt-1">Crea el primer tab de búsqueda</p>
      <button class="btn-primary mt-4" @click="$emit('create')">
        <PlusIcon class="h-4 w-4 inline mr-1.5" />Crear Tab
      </button>
    </div>

    <!-- Sin resultados de filtro -->
    <div v-else-if="tabs.length === 0" class="card p-12 text-center">
      <MagnifyingGlassIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
      <p class="text-gray-500 font-medium">Sin resultados</p>
      <p class="text-sm text-gray-400 mt-1">Ajusta tu búsqueda o filtros</p>
    </div>

    <!-- Tab list -->
    <div v-else class="grid gap-4">
      <div
        v-for="tab in tabs"
        :key="tab.id"
        class="card p-5 flex items-center gap-4 group"
        :class="!tab.isEnabled && 'opacity-60'"
      >
        <!-- Color swatch + icon preview -->
        <div
          class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          :style="{ backgroundColor: tab.color }"
        >
          <svg v-if="tab.icon" class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="tab.icon" />
          </svg>
          <span v-else class="text-white font-black text-base">{{ tab.label[0] }}</span>
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5 flex-wrap">
            <span class="font-bold text-gray-900 text-sm">{{ tab.label }}</span>
            <span class="text-xs text-gray-400 font-mono">{{ tab.key }}</span>
            <span v-if="systemKeys.includes(tab.key)" class="badge bg-blue-100 text-blue-700">Sistema</span>
            <span class="badge" :class="tab.isEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'">
              {{ tab.isEnabled ? 'Activo' : 'Inactivo' }}
            </span>
          </div>
          <div class="flex items-center gap-2 text-xs text-gray-400">
            <span>Orden: {{ tab.sortOrder + 1 }}</span>
            <span>·</span>
            <span :style="{ color: tab.color }" class="font-mono">{{ tab.color }}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2">
          <!-- Move up -->
          <button
            class="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            :disabled="isFirst(tab)"
            title="Subir"
            @click="$emit('move', tab, 'up')"
          >
            <ChevronUpIcon class="w-4 h-4" />
          </button>
          <!-- Move down -->
          <button
            class="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            :disabled="isLast(tab)"
            title="Bajar"
            @click="$emit('move', tab, 'down')"
          >
            <ChevronDownIcon class="w-4 h-4" />
          </button>
          <!-- Toggle -->
          <button
            class="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white transition-colors"
            :class="tab.isEnabled ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'"
            :title="tab.isEnabled ? 'Desactivar' : 'Activar'"
            @click="$emit('toggle', tab)"
          >
            <EyeIcon v-if="tab.isEnabled" class="w-4 h-4" />
            <EyeSlashIcon v-else class="w-4 h-4" />
          </button>
          <!-- Edit -->
          <button
            class="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
            title="Editar"
            @click="$emit('edit', tab)"
          >
            <PencilIcon class="w-4 h-4" />
          </button>
          <!-- Delete (only non-system keys) -->
          <button
            v-if="!systemKeys.includes(tab.key)"
            class="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
            title="Eliminar"
            @click="$emit('delete', tab)"
          >
            <TrashIcon class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  MagnifyingGlassIcon, PlusIcon, PencilIcon, TrashIcon,
  ChevronUpIcon, ChevronDownIcon, EyeIcon, EyeSlashIcon,
} from '@heroicons/vue/24/outline'
import type { SearchTab } from '~/composables/search/useSearchTabs'

defineProps<{
  tabs: SearchTab[]
  totalTabs: number
  loading: boolean
  systemKeys: string[]
  isFirst: (tab: SearchTab) => boolean
  isLast: (tab: SearchTab) => boolean
}>()

defineEmits<{
  create: []
  edit: [tab: SearchTab]
  delete: [tab: SearchTab]
  toggle: [tab: SearchTab]
  move: [tab: SearchTab, direction: 'up' | 'down']
}>()
</script>

<style scoped>
.badge {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold;
}
.skeleton {
  @apply bg-gray-200 animate-pulse;
}
</style>
