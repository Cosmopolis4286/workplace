<template>
  <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
    <h3 class="text-xs font-bold text-gray-800 uppercase tracking-wide mb-3">Precio</h3>
    <div class="flex items-center gap-2">
      <div class="relative flex-1">
        <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
        <input
          v-model.number="minInput"
          type="number"
          min="0"
          placeholder="Mín"
          class="w-full pl-5 pr-2 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-current"
          :style="{ '--tw-ring-color': accentColor }"
          :class="accentFocusClass"
          @keyup.enter="apply"
        />
      </div>
      <span class="text-gray-300 text-xs">–</span>
      <div class="relative flex-1">
        <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
        <input
          v-model.number="maxInput"
          type="number"
          min="0"
          placeholder="Máx"
          class="w-full pl-5 pr-2 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-current"
          :class="accentFocusClass"
          @keyup.enter="apply"
        />
      </div>
    </div>
    <button
      class="w-full mt-2.5 text-xs font-bold py-2 rounded-xl transition-colors"
      :class="accentButtonClass"
      @click="apply"
    >
      Aplicar
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'

type Accent = 'red' | 'blue' | 'emerald'

const props = withDefaults(defineProps<{
  modelMin: number | null
  modelMax: number | null
  accent?: Accent
}>(), {
  accent: 'red',
})

const emit = defineEmits<{
  apply: [min: number | null, max: number | null]
}>()

const minInput = ref<number | null>(props.modelMin)
const maxInput = ref<number | null>(props.modelMax)

watch(() => props.modelMin, (v: number | null) => { minInput.value = v })
watch(() => props.modelMax, (v: number | null) => { maxInput.value = v })

const accentFocusClass = computed<string>(() => ({
  red: 'focus:border-red-400',
  blue: 'focus:border-blue-400',
  emerald: 'focus:border-emerald-400',
} satisfies Record<Accent, string>)[props.accent as Accent])

const accentButtonClass = computed<string>(() => ({
  red: 'bg-red-50 text-red-600 hover:bg-red-100',
  blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
  emerald: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100',
} satisfies Record<Accent, string>)[props.accent as Accent])

const accentColor = computed<string>(() => ({
  red: '#dc2626',
  blue: '#2563eb',
  emerald: '#059669',
} satisfies Record<Accent, string>)[props.accent as Accent])

function apply() {
  const min = typeof minInput.value === 'number' && !Number.isNaN(minInput.value) ? minInput.value : null
  const max = typeof maxInput.value === 'number' && !Number.isNaN(maxInput.value) ? maxInput.value : null
  emit('apply', min, max)
}
</script>
