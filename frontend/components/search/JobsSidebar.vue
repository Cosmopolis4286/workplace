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

      <div class="bg-gray-50 rounded-2xl p-4">
        <h3 class="text-xs font-bold text-gray-800 uppercase tracking-wide mb-3">Tipo de Empleo</h3>
        <div class="space-y-0.5">
          <button
            class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors"
            :class="!activeType ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-100'"
            @click="$emit('clear-type')"
          >Todos</button>
          <button
            v-for="opt in typeOptions" :key="opt.value"
            class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors"
            :class="activeType === opt.value ? 'bg-emerald-100 text-emerald-600 font-semibold' : 'text-gray-600 hover:bg-gray-100'"
            @click="$emit('filter-by-type', opt.value)"
          >{{ opt.label }}</button>
        </div>
      </div>
      <div class="bg-gray-50 rounded-2xl p-4">
        <h3 class="text-xs font-bold text-gray-800 uppercase tracking-wide mb-3">Modalidad</h3>
        <div class="space-y-0.5">
          <button
            class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors"
            :class="!activeModality ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-100'"
            @click="$emit('clear-modality')"
          >Todas</button>
          <button
            v-for="opt in modalityOptions" :key="opt.value"
            class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors"
            :class="activeModality === opt.value ? 'bg-emerald-100 text-emerald-600 font-semibold' : 'text-gray-600 hover:bg-gray-100'"
            @click="$emit('filter-by-modality', opt.value)"
          >{{ opt.label }}</button>
        </div>
      </div>
      <SortDropdown :model-value="selectedSort" :options="sortOptions" accent="emerald" @update:model-value="$emit('apply-sort', $event)" />
      <button
        v-if="activeCategoryId || activeType || activeModality || searchInput"
        class="w-full text-xs font-semibold text-emerald-600 py-2.5 px-4 rounded-xl border border-emerald-200 hover:bg-emerald-50 transition-colors"
        @click="$emit('reset-filters')"
      >
        ✕ Limpiar filtros
      </button>

      <button
        class="w-full text-sm font-bold text-white bg-emerald-600 py-3 rounded-xl hover:bg-emerald-700 transition-colors mt-1"
        @click="open = false"
      >
        Ver resultados
      </button>
    </aside>
  </Transition>

  <!-- Sidebar desktop -->
  <aside class="hidden lg:flex flex-col gap-4 w-60 flex-shrink-0 sticky top-[120px]">
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <h3 class="text-xs font-bold text-gray-800 uppercase tracking-wide mb-3">Tipo de Empleo</h3>
      <div class="space-y-0.5">
        <button
          class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors"
          :class="!activeType ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'"
          @click="$emit('clear-type')"
        >Todos</button>
        <button
          v-for="opt in typeOptions" :key="opt.value"
          class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors"
          :class="activeType === opt.value ? 'bg-emerald-50 text-emerald-600 font-semibold' : 'text-gray-600 hover:bg-gray-50'"
          @click="$emit('filter-by-type', opt.value)"
        >{{ opt.label }}</button>
      </div>
    </div>
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <h3 class="text-xs font-bold text-gray-800 uppercase tracking-wide mb-3">Modalidad</h3>
      <div class="space-y-0.5">
        <button
          class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors"
          :class="!activeModality ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'"
          @click="$emit('clear-modality')"
        >Todas</button>
        <button
          v-for="opt in modalityOptions" :key="opt.value"
          class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors"
          :class="activeModality === opt.value ? 'bg-emerald-50 text-emerald-600 font-semibold' : 'text-gray-600 hover:bg-gray-50'"
          @click="$emit('filter-by-modality', opt.value)"
        >{{ opt.label }}</button>
      </div>
    </div>
    <SortDropdown :model-value="selectedSort" :options="sortOptions" accent="emerald" @update:model-value="$emit('apply-sort', $event)" />
    <button
      v-if="activeCategoryId || activeType || activeModality || searchInput"
      class="w-full text-xs font-semibold text-emerald-600 py-2.5 px-4 rounded-xl border border-emerald-200 hover:bg-emerald-50 transition-colors"
      @click="$emit('reset-filters')"
    >
      ✕ Limpiar filtros
    </button>
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SortDropdown from '~/components/search/SortDropdown.vue'
import type { JobSortBy } from '~/composables/jobs/useJobs'

defineProps<{
  activeCategoryId: string | null
  activeType: string | null
  activeModality: string | null
  selectedSort: JobSortBy
  sortOptions: { value: JobSortBy; label: string }[]
  searchInput: string
}>()

defineEmits<{
  'clear-type': []
  'filter-by-type': [type: string]
  'clear-modality': []
  'filter-by-modality': [modality: string]
  'apply-sort': [value: string]
  'reset-filters': []
}>()

const open = ref(false)
defineExpose({ open })

const typeOptions = [
  { value: 'FULL_TIME', label: 'Tiempo Completo' },
  { value: 'PART_TIME', label: 'Medio Tiempo' },
  { value: 'FREELANCE', label: 'Freelance' },
  { value: 'TEMPORARY', label: 'Temporal' },
  { value: 'INTERNSHIP', label: 'Prácticas' },
]

const modalityOptions = [
  { value: 'IN_PERSON', label: 'Presencial' },
  { value: 'REMOTE', label: 'Remoto' },
  { value: 'HYBRID', label: 'Híbrido' },
]
</script>
