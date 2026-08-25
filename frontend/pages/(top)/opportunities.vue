<template>
  <div>
    <PageHeader
      title="Oportunidades"
      description="Demanda real de servicios en tu zona — decide qué ofrecer"
      :icon="ArrowTrendingUpIcon"
      :breadcrumb="[{ label: 'Oportunidades' }]"
    />

    <!-- Error banner -->
    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
      <p class="text-sm text-red-700">{{ error }}</p>
      <button @click="error = null"><XMarkIcon class="h-5 w-5 text-red-400" /></button>
    </div>

    <!-- Filtro de ciudad -->
    <div class="card p-4 mb-6 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      <div class="relative flex-1 max-w-xs">
        <MapPinIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          v-model="cityFilter"
          @keyup.enter="applyCityFilter"
          type="text"
          placeholder="Filtrar por ciudad..."
          class="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
        >
      </div>
      <button
        class="px-4 py-2 text-sm font-semibold text-white bg-workplace-red rounded-lg hover:bg-red-700 transition-colors"
        @click="applyCityFilter"
      >
        Aplicar
      </button>
      <button
        v-if="cityFilter"
        class="text-sm text-gray-500 hover:text-gray-700"
        @click="clearCityFilter"
      >
        Limpiar
      </button>
      <p class="text-xs text-gray-400 sm:ml-auto">Últimos {{ periodDays }} días</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="i in 6" :key="i" class="card p-4 animate-pulse">
        <div class="h-4 bg-gray-200 rounded w-2/3 mb-3" />
        <div class="h-8 bg-gray-200 rounded w-1/3 mb-2" />
        <div class="h-3 bg-gray-200 rounded w-1/2" />
      </div>
    </div>

    <template v-else>
      <!-- Demanda confirmada por categoría -->
      <div v-if="opportunities.length === 0" class="card p-10 text-center text-gray-400 mb-6">
        <div class="text-4xl mb-3">📊</div>
        <p class="font-medium">Sin solicitudes de servicio en este período{{ cityFilter ? ` para "${cityFilter}"` : '' }}</p>
      </div>
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div
          v-for="opp in opportunities"
          :key="opp.categoryId"
          class="card p-4 border-l-4"
          :style="{ borderLeftColor: opp.categoryColor }"
        >
          <p class="text-sm font-semibold text-gray-700 mb-1">{{ opp.categoryName }}</p>
          <p class="text-2xl font-bold text-gray-900">{{ opp.requestCount }}
            <span class="text-sm font-normal text-gray-400">solicitudes</span>
          </p>
          <p v-if="opp.avgPrice != null" class="text-sm text-gray-500 mt-1">
            promedio ${{ new Intl.NumberFormat('es-CO').format(opp.avgPrice) }}
          </p>
        </div>
      </div>

      <!-- Búsquedas sin resultado -->
      <div v-if="unmetQueries.length > 0" class="card p-5">
        <h3 class="text-sm font-bold text-gray-800 mb-1">La gente está buscando y no lo encuentra</h3>
        <p class="text-xs text-gray-400 mb-4">Búsquedas recientes sin resultados en ningún producto, servicio o empleo</p>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="uq in unmetQueries"
            :key="uq.query"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 text-sm font-medium rounded-full"
          >
            "{{ uq.query }}"
            <span class="text-xs font-normal text-amber-500">×{{ uq.count }}</span>
          </span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

import { ref, onMounted } from 'vue'
import { ArrowTrendingUpIcon, XMarkIcon, MapPinIcon } from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import { useOpportunities } from '~/composables/services/useOpportunities'
import { useAuth } from '~/composables/auth/useAuth'

const { opportunities, unmetQueries, periodDays, loading, error, loadOpportunities } = useOpportunities()
const { user } = useAuth()

const cityFilter = ref(user.value?.city ?? '')

function applyCityFilter() {
  loadOpportunities(cityFilter.value.trim() || undefined)
}

function clearCityFilter() {
  cityFilter.value = ''
  loadOpportunities()
}

onMounted(() => {
  loadOpportunities(cityFilter.value.trim() || undefined)
})
</script>
