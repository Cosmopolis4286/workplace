<template>
  <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
    <h3 class="text-xs font-bold text-gray-800 uppercase tracking-wide mb-3">Ordenar por</h3>
    <div class="space-y-0.5">
      <button
        v-for="opt in options" :key="opt.value"
        class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors"
        :class="modelValue === opt.value ? activeClass : 'text-gray-600 hover:bg-gray-50'"
        @click="emit('update:modelValue', opt.value)"
      >{{ opt.label }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface SortOption {
  value: string
  label: string
}

type Accent = 'red' | 'blue' | 'emerald'

const props = withDefaults(defineProps<{
  modelValue: string
  options: SortOption[]
  accent?: Accent
}>(), {
  accent: 'red',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const activeClass = computed<string>(() => ({
  red: 'bg-red-600 text-white',
  blue: 'bg-blue-600 text-white',
  emerald: 'bg-emerald-600 text-white',
} satisfies Record<Accent, string>)[props.accent as Accent])
</script>
