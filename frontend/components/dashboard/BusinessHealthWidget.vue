<template>
  <!-- Vista de plataforma (SUPERADMIN/ADMIN): conteo de comercios por rating -->
  <div v-if="isPlatformAdmin && !loading && platformSummary" class="card p-4 sm:p-5 mb-5 sm:mb-6" :class="platformBorderClass">
    <div class="flex items-center justify-between gap-3 sm:gap-4 flex-wrap">
      <div class="flex items-center gap-2.5 sm:gap-3">
        <span class="text-xl sm:text-2xl">{{ platformAtRiskCount > 0 ? '🟠' : '🟢' }}</span>
        <div>
          <p class="text-[11px] sm:text-xs text-gray-400 uppercase tracking-wider font-semibold">Salud financiera de la plataforma</p>
          <p class="text-base sm:text-lg font-bold text-gray-800">
            {{ platformSummary.totalCommerces }} comercios
            <span v-if="platformAtRiskCount > 0" class="text-xs sm:text-sm font-medium text-orange-600 ml-1">
              · {{ platformAtRiskCount }} en riesgo/crítico
            </span>
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

    <div v-if="expanded" class="mt-4 pt-4 border-t border-gray-100">
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        <div v-for="rating in RATING_ORDER" :key="rating" class="text-center">
          <p class="text-xs text-gray-400">{{ RATING_LABELS[rating] }}</p>
          <p class="text-sm font-semibold text-gray-800">{{ platformSummary.counts[rating] ?? 0 }}</p>
        </div>
      </div>

      <div v-if="platformSummary.atRiskCommerces.length > 0">
        <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Comercios a priorizar</p>
        <div class="space-y-1.5">
          <div v-for="c in platformSummary.atRiskCommerces" :key="c.commerceId" class="flex items-center justify-between text-xs">
            <span class="text-gray-700 truncate mr-2">{{ c.name }}</span>
            <span :class="c.rating === 'CRITICO' ? 'text-red-600' : 'text-orange-600'" class="font-semibold flex-shrink-0">
              {{ c.score !== null ? `${c.score}/100` : 'Sin datos' }}
            </span>
          </div>
        </div>
      </div>

      <p v-if="platformSummary.truncated" class="text-[11px] text-gray-400 mt-3">
        Mostrando los {{ platformSummary.totalCommerces }} comercios más recientes.
      </p>
    </div>
  </div>

  <!-- Vista de comercio propio -->
  <div v-else-if="!isPlatformAdmin && !loading && health" class="card p-4 sm:p-5 mb-5 sm:mb-6" :class="borderClass">
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
import { useBusinessHealth, type BusinessHealthRating } from '~/composables/commerce/useBusinessHealth'

const { health, platformSummary, loading, loadHealth, loadPlatformSummary } = useBusinessHealth()
const expanded = ref(false)

const { user } = useAuth()
const isPlatformAdmin = computed(() => user.value?.role === 'SUPERADMIN' || user.value?.role === 'ADMIN')

onMounted(() => {
  if (isPlatformAdmin.value) loadPlatformSummary()
  else loadHealth()
})

const RATING_ORDER: BusinessHealthRating[] = ['SALUDABLE', 'ACEPTABLE', 'EN_RIESGO', 'CRITICO', 'SIN_DATOS']

const RATING_LABELS: Record<string, string> = {
  SALUDABLE: 'Saludable',
  ACEPTABLE: 'Aceptable',
  EN_RIESGO: 'En riesgo',
  CRITICO: 'Crítico',
  SIN_DATOS: 'Sin datos',
}

const ratingLabel = computed(() => (health.value ? RATING_LABELS[health.value.rating] ?? '' : ''))

const platformAtRiskCount = computed(() => {
  if (!platformSummary.value) return 0
  return (platformSummary.value.counts.EN_RIESGO ?? 0) + (platformSummary.value.counts.CRITICO ?? 0)
})

const platformBorderClass = computed(() => {
  if (!platformSummary.value) return ''
  if ((platformSummary.value.counts.CRITICO ?? 0) > 0) return 'border-l-4 border-l-red-400'
  if ((platformSummary.value.counts.EN_RIESGO ?? 0) > 0) return 'border-l-4 border-l-orange-400'
  return ''
})

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
