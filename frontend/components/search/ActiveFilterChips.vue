<template>
  <div v-if="chips.length > 0" class="flex flex-wrap items-center gap-2 mb-4">
    <span
      v-for="chip in chips"
      :key="chip.id"
      class="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-xs font-semibold"
      :class="accentChipClass"
    >
      {{ chip.label }}
      <button
        class="flex items-center justify-center w-4 h-4 rounded-full hover:bg-black/10 transition-colors"
        :aria-label="`Quitar filtro ${chip.label}`"
        @click="chip.onRemove()"
      >
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </span>
    <button
      class="text-xs font-semibold text-gray-400 hover:text-gray-600 underline transition-colors"
      @click="emit('clear-all')"
    >
      Limpiar todo
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FilterChip } from '~/composables/useCatalogFilters'

type Accent = 'red' | 'blue' | 'emerald'

const props = withDefaults(defineProps<{
  chips: FilterChip[]
  accent?: Accent
}>(), {
  accent: 'red',
})

const emit = defineEmits<{
  'clear-all': []
}>()

const accentChipClass = computed<string>(() => ({
  red: 'bg-red-50 text-red-600',
  blue: 'bg-blue-50 text-blue-600',
  emerald: 'bg-emerald-50 text-emerald-600',
} satisfies Record<Accent, string>)[props.accent as Accent])
</script>
