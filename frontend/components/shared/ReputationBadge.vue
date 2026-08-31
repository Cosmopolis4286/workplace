<template>
  <span v-if="loading" class="inline-flex items-center gap-1 text-gray-300 animate-pulse">
    <ShieldCheckIcon class="h-4 w-4" />
  </span>
  <span
    v-else-if="score !== null && sampleSize >= 10"
    class="inline-flex items-center gap-1 font-semibold"
    :class="colorClass"
    :title="`WorkPlace Score: ${score}/100 (${sampleSize} operaciones)`"
  >
    <ShieldCheckIcon class="h-4 w-4" />
    {{ score }}
  </span>
  <span
    v-else-if="score !== null"
    class="inline-flex items-center gap-1 text-gray-400 font-medium"
    title="Todavía no tiene suficiente historial de operaciones para un score confiable"
  >
    <SparklesIcon class="h-4 w-4" />
    Nuevo
  </span>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { ShieldCheckIcon, SparklesIcon } from '@heroicons/vue/24/outline'
import { useApi } from '~/composables/core/useApi'

// Muestra el WorkPlace Score público de una entidad (comercio/profesional/
// repartidor). Con menos de 10 operaciones muestra "Nuevo" en vez de un
// número — un score con muestra chica no es confiable para comparar (ver
// ReputationService.CONFIDENCE_FLOOR en el backend).
const props = defineProps<{
  entityType: 'COMMERCE' | 'PROFESSIONAL' | 'DRIVER'
  entityId: string
}>()

const { get } = useApi()
const loading = ref(true)
const score = ref<number | null>(null)
const sampleSize = ref(0)

const colorClass = computed(() => {
  const s = score.value ?? 0
  if (s >= 80) return 'text-emerald-600'
  if (s >= 50) return 'text-amber-500'
  return 'text-red-500'
})

async function fetchScore() {
  if (!props.entityId) return
  loading.value = true
  try {
    const result = await get<{ score: number; sampleSize: number } | null>(
      `/reputation/${props.entityType}/${props.entityId}`
    )
    score.value = result?.score ?? null
    sampleSize.value = result?.sampleSize ?? 0
  } catch {
    score.value = null
  } finally {
    loading.value = false
  }
}

onMounted(fetchScore)
watch(() => props.entityId, fetchScore)
</script>
