<template>
  <div v-if="tags.length > 0" class="flex flex-wrap items-center gap-2 mb-4">
    <span class="text-xs font-bold text-gray-400 uppercase tracking-wide mr-1">Populares:</span>
    <button
      v-for="t in tags"
      :key="t.tag"
      class="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
      :class="modelValue === t.tag ? activeChipClass : inactiveChipClass"
      @click="emit('update:modelValue', modelValue === t.tag ? '' : t.tag)"
    >
      {{ t.tag }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

type Accent = 'red' | 'blue' | 'emerald'

const props = withDefaults(defineProps<{
  /** Endpoint público que devuelve { data: [{ tag, count }] } */
  endpoint: string
  modelValue: string
  accent?: Accent
}>(), {
  accent: 'red',
})

const emit = defineEmits<{ 'update:modelValue': [string] }>()

const tags = ref<{ tag: string; count: number }[]>([])

const activeChipClass = computed<string>(() => ({
  red: 'bg-red-600 text-white',
  blue: 'bg-blue-600 text-white',
  emerald: 'bg-emerald-600 text-white',
} satisfies Record<Accent, string>)[props.accent as Accent])

const inactiveChipClass = computed<string>(() => ({
  red: 'bg-red-50 text-red-600 hover:bg-red-100',
  blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
  emerald: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100',
} satisfies Record<Accent, string>)[props.accent as Accent])

async function fetchTags() {
  const { get } = useApi()
  try {
    const res = await get<{ data: { tag: string; count: number }[] }>(props.endpoint)
    tags.value = res.data ?? []
  } catch {
    tags.value = []
  }
}

// El endpoint cambia al cambiar de tab (productos/servicios/empleos) — recarga
// los tags populares de ese módulo específico.
watch(() => props.endpoint, fetchTags)
onMounted(fetchTags)
</script>
