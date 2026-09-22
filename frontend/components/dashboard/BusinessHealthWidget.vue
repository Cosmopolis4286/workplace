<template>
  <div v-if="!loading && health" class="card p-4 sm:p-5 mb-5 sm:mb-6" :class="borderClass">
    <div class="flex items-center justify-between gap-3 sm:gap-4 flex-wrap">
      <div class="flex items-center gap-2.5 sm:gap-3">
        <span class="text-xl sm:text-2xl">{{ emoji }}</span>
        <div>
          <p class="text-[11px] sm:text-xs text-gray-400 uppercase tracking-wider font-semibold">Salud del negocio</p>
          <p class="text-base sm:text-lg font-bold" :class="textClass">
            {{ health.score !== null ? `${health.score}/100` : 'Sin datos suficientes' }}
            <span class="text-xs sm:text-sm font-medium text-gray-400 ml-1">{{ ratingLabel }}</span>
          </p>
        </div>
      </div>

      <button
        class="text-xs font-medium text-indigo-600 hover:text-indigo-800"
        @click="expanded = !expanded"
      >
        {{ expanded ? 'Ocultar detalle' : 'Ver detalle' }}
      </button>
    </div>

    <p v-if="health.confidence < 100" class="text-xs text-gray-400 mt-2">
      Basado en {{ health.confidence }}% de los indicadores — cuantas más compras y cuentas registres,
      más preciso será este número.
    </p>

    <div v-if="expanded" class="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div v-for="c in health.components" :key="c.key" class="text-center">
        <p class="text-xs text-gray-400">{{ c.label }}</p>
        <p class="text-sm font-semibold" :class="c.score === null ? 'text-gray-300' : 'text-gray-800'">
          {{ c.score !== null ? `${c.score}` : '—' }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useBusinessHealth } from '~/composables/commerce/useBusinessHealth'

const { health, loading, loadHealth } = useBusinessHealth()
const expanded = ref(false)

onMounted(loadHealth)

const RATING_LABELS: Record<string, string> = {
  SALUDABLE: 'Saludable',
  ACEPTABLE: 'Aceptable',
  EN_RIESGO: 'En riesgo',
  CRITICO: 'Crítico',
  SIN_DATOS: '',
}

const ratingLabel = computed(() => (health.value ? RATING_LABELS[health.value.rating] ?? '' : ''))

const emoji = computed(() => {
  switch (health.value?.rating) {
    case 'SALUDABLE': return '🟢'
    case 'ACEPTABLE': return '🟡'
    case 'EN_RIESGO': return '🟠'
    case 'CRITICO': return '🔴'
    default: return '⚪'
  }
})

const borderClass = computed(() => {
  switch (health.value?.rating) {
    case 'CRITICO': return 'border-l-4 border-l-red-400'
    case 'EN_RIESGO': return 'border-l-4 border-l-orange-400'
    default: return ''
  }
})

const textClass = computed(() => {
  switch (health.value?.rating) {
    case 'SALUDABLE': return 'text-green-700'
    case 'ACEPTABLE': return 'text-yellow-700'
    case 'EN_RIESGO': return 'text-orange-700'
    case 'CRITICO': return 'text-red-700'
    default: return 'text-gray-600'
  }
})
</script>
