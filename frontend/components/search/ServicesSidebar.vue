<template>
  <!-- Overlay + bottom sheet (mobile) -->
  <Transition enter-active-class="transition-opacity duration-200" leave-active-class="transition-opacity duration-150"
    enter-from-class="opacity-0" leave-to-class="opacity-0">
    <div v-if="open" class="fixed inset-0 bg-black/40 z-40 lg:hidden" @click="open = false" />
  </Transition>

  <Transition
    enter-active-class="transition-transform duration-250 ease-out" leave-active-class="transition-transform duration-200 ease-in"
    enter-from-class="translate-y-full" leave-to-class="translate-y-full"
  >
    <aside
      v-if="open"
      class="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-4 pb-6 flex flex-col gap-4 shadow-2xl lg:hidden"
    >
      <div class="flex items-center justify-between mb-1">
        <h2 class="text-sm font-black text-gray-900">Filtros</h2>
        <button class="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500" @click="open = false">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div v-if="providers.length > 0" class="bg-gray-50 rounded-2xl p-4">
        <h3 class="text-xs font-bold text-gray-800 uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
          Proveedores
        </h3>
        <div class="space-y-0.5">
          <button
            class="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors"
            :class="!activeProviderId ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'"
            @click="$emit('clear-provider')"
          >
            <span>Todos</span>
            <span class="opacity-60 text-[11px]">{{ total }}</span>
          </button>
          <button
            v-for="p in providers" :key="p.id"
            class="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors"
            :class="activeProviderId === p.id ? 'bg-blue-100 text-blue-600 font-semibold' : 'text-gray-600 hover:bg-gray-100'"
            @click="$emit('filter-by-provider', p.id)"
          >
            <span class="truncate mr-2">{{ p.name }}</span>
            <span class="text-[11px] opacity-60 flex-shrink-0">{{ p.serviceCount }}</span>
          </button>
        </div>
      </div>
      <SortDropdown :model-value="selectedSort" :options="sortOptions" accent="blue" @update:model-value="$emit('apply-sort', $event)" />
      <button
        v-if="activeCategoryId || activeProviderId || searchInput"
        class="w-full text-xs font-semibold text-blue-600 py-2.5 px-4 rounded-xl border border-blue-200 hover:bg-blue-50 transition-colors"
        @click="$emit('reset-filters')"
      >
        ✕ Limpiar filtros
      </button>

      <button
        class="w-full text-sm font-bold text-white bg-blue-600 py-3 rounded-xl hover:bg-blue-700 transition-colors mt-1"
        @click="open = false"
      >
        Ver resultados
      </button>
    </aside>
  </Transition>

  <!-- Sidebar desktop -->
  <aside class="hidden lg:flex flex-col gap-4 w-60 flex-shrink-0 sticky top-[120px]">
    <div v-if="providers.length > 0" class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <h3 class="text-xs font-bold text-gray-800 uppercase tracking-wide mb-3 flex items-center gap-1.5">
        <svg class="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
        </svg>
        Proveedores
      </h3>
      <div class="space-y-0.5">
        <button
          class="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors"
          :class="!activeProviderId ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'"
          @click="$emit('clear-provider')"
        >
          <span>Todos</span>
          <span class="opacity-60 text-[11px]">{{ total }}</span>
        </button>
        <button
          v-for="p in providers" :key="p.id"
          class="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors"
          :class="activeProviderId === p.id ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-600 hover:bg-gray-50'"
          @click="$emit('filter-by-provider', p.id)"
        >
          <span class="truncate mr-2">{{ p.name }}</span>
          <span class="text-[11px] opacity-60 flex-shrink-0">{{ p.serviceCount }}</span>
        </button>
      </div>
    </div>
    <SortDropdown :model-value="selectedSort" :options="sortOptions" accent="blue" @update:model-value="$emit('apply-sort', $event)" />
    <button
      v-if="activeCategoryId || activeProviderId || searchInput"
      class="w-full text-xs font-semibold text-blue-600 py-2.5 px-4 rounded-xl border border-blue-200 hover:bg-blue-50 transition-colors"
      @click="$emit('reset-filters')"
    >
      ✕ Limpiar filtros
    </button>
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SortDropdown from '~/components/search/SortDropdown.vue'
import type { ServiceProvider, ServiceSortBy } from '~/composables/services/useServices'

defineProps<{
  providers: ServiceProvider[]
  activeProviderId: string | null
  activeCategoryId: string | null
  total: number
  selectedSort: ServiceSortBy
  sortOptions: { value: ServiceSortBy; label: string }[]
  searchInput: string
}>()

defineEmits<{
  'clear-provider': []
  'filter-by-provider': [id: string]
  'apply-sort': [value: string]
  'reset-filters': []
}>()

const open = ref(false)
defineExpose({ open })
</script>
