<template>
  <Teleport to="body">
    <Transition
      enter-active-class="duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="target"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        @click.self="$emit('close')"
      >
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="$emit('close')" />

        <Transition
          enter-active-class="duration-300 ease-out"
          enter-from-class="opacity-0 translate-y-full sm:translate-y-4 sm:scale-95"
          enter-to-class="opacity-100 translate-y-0 sm:scale-100"
          leave-active-class="duration-200 ease-in"
          leave-from-class="opacity-100 translate-y-0 sm:scale-100"
          leave-to-class="opacity-0 translate-y-full sm:translate-y-4 sm:scale-95"
        >
          <div v-if="target" class="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto">

            <!-- Handle mobile -->
            <div class="flex justify-center pt-3 pb-1 sm:hidden">
              <div class="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            <!-- Header -->
            <div class="px-5 pt-4 pb-3 border-b border-gray-100">
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <ChartBarIcon class="h-5 w-5 text-purple-600" />
                  </div>
                  <div class="min-w-0">
                    <h3 class="text-sm font-bold text-gray-900 truncate">{{ target.name }}</h3>
                    <div class="flex items-center gap-2 mt-0.5">
                      <span class="text-xs font-medium px-2 py-0.5 rounded-full" :class="SERVICE_STATUS_CLASSES[target.status]">
                        {{ SERVICE_STATUS_LABELS[target.status] }}
                      </span>
                      <span v-if="target.category" class="text-xs text-gray-400 flex items-center gap-1">
                        <span class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: target.category.color }"></span>
                        {{ target.category.name }}
                      </span>
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-1 flex-shrink-0">
                  <button
                    @click="$emit('refresh')"
                    :disabled="loading"
                    title="Actualizar métricas"
                    class="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-40"
                  >
                    <ArrowPathIcon class="h-4 w-4" :class="{ 'animate-spin': loading }" />
                  </button>
                  <button @click="$emit('close')" class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    <XMarkIcon class="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Cuerpo -->
            <div class="px-5 py-4 space-y-4">

              <!-- Skeleton (solo en la carga inicial; un refresh mantiene los datos visibles) -->
              <div v-if="loading && !data" class="space-y-3 animate-pulse">
                <div class="grid grid-cols-2 gap-3">
                  <div v-for="n in 6" :key="n" class="h-20 bg-gray-100 rounded-xl" />
                </div>
                <div class="h-28 bg-gray-100 rounded-xl" />
                <div class="h-16 bg-gray-100 rounded-xl" />
              </div>

              <!-- Error -->
              <div v-else-if="error" class="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                <div class="flex items-center gap-2 mb-3">
                  <ExclamationCircleIcon class="h-4 w-4 flex-shrink-0" />
                  {{ error }}
                </div>
                <button
                  @click="$emit('refresh')"
                  class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-800 transition-colors"
                >
                  Reintentar
                </button>
              </div>

              <template v-else-if="data">

                <!-- KPI grid 3×2 -->
                <div class="grid grid-cols-3 gap-2.5">
                  <!-- Visualizaciones -->
                  <div class="bg-blue-50 rounded-2xl p-3.5 col-span-1">
                    <div class="flex items-center gap-1 mb-2">
                      <EyeIcon class="h-3.5 w-3.5 text-blue-500" />
                      <p class="text-[10px] text-blue-600 font-semibold uppercase tracking-wide">Vistas</p>
                    </div>
                    <p class="text-2xl font-black text-blue-900 leading-none">{{ data.views }}</p>
                    <p class="text-[10px] text-blue-400 mt-1">históricas totales</p>
                  </div>

                  <!-- Visitas al perfil -->
                  <div class="bg-indigo-50 rounded-2xl p-3.5 col-span-1">
                    <div class="flex items-center gap-1 mb-2">
                      <UserIcon class="h-3.5 w-3.5 text-indigo-500" />
                      <p class="text-[10px] text-indigo-600 font-semibold uppercase tracking-wide">Perfil</p>
                    </div>
                    <p class="text-2xl font-black text-indigo-900 leading-none">{{ data.profileVisits }}</p>
                    <p class="text-[10px] text-indigo-400 mt-1">visitas al perfil</p>
                  </div>

                  <!-- Solicitudes totales -->
                  <div class="bg-green-50 rounded-2xl p-3.5 col-span-1">
                    <div class="flex items-center gap-1 mb-2">
                      <ClipboardDocumentListIcon class="h-3.5 w-3.5 text-green-500" />
                      <p class="text-[10px] text-green-600 font-semibold uppercase tracking-wide">Solicitudes</p>
                    </div>
                    <p class="text-2xl font-black text-green-900 leading-none">{{ data.requests }}</p>
                    <p class="text-[10px] text-green-400 mt-1">totales recibidas</p>
                  </div>

                  <!-- Conversión -->
                  <div class="bg-orange-50 rounded-2xl p-3.5 col-span-1">
                    <div class="flex items-center gap-1 mb-2">
                      <ArrowTrendingUpIcon class="h-3.5 w-3.5 text-orange-500" />
                      <p class="text-[10px] text-orange-600 font-semibold uppercase tracking-wide">Conversión</p>
                    </div>
                    <p class="text-2xl font-black text-orange-900 leading-none">{{ data.conversionRate }}%</p>
                    <p class="text-[10px] text-orange-400 mt-1">vistas → solicitudes</p>
                  </div>

                  <!-- Interés -->
                  <div class="bg-violet-50 rounded-2xl p-3.5 col-span-1">
                    <div class="flex items-center gap-1 mb-2">
                      <SparklesIcon class="h-3.5 w-3.5 text-violet-500" />
                      <p class="text-[10px] text-violet-600 font-semibold uppercase tracking-wide">Interés</p>
                    </div>
                    <p class="text-2xl font-black text-violet-900 leading-none">{{ data.interestRate ?? 0 }}%</p>
                    <p class="text-[10px] text-violet-400 mt-1">vistas → perfil</p>
                  </div>

                  <!-- Solicitudes 30 días -->
                  <div class="bg-rose-50 rounded-2xl p-3.5 col-span-1">
                    <div class="flex items-center gap-1 mb-2">
                      <CalendarDaysIcon class="h-3.5 w-3.5 text-rose-500" />
                      <p class="text-[10px] text-rose-600 font-semibold uppercase tracking-wide">30 días</p>
                    </div>
                    <p class="text-2xl font-black text-rose-900 leading-none">{{ data.requestsLast30 ?? 0 }}</p>
                    <p class="text-[10px] text-rose-400 mt-1">solicitudes recientes</p>
                  </div>
                </div>

                <!-- Gráfico de barras — últimos 7 días con tendencia -->
                <div class="bg-gray-50 rounded-2xl p-4">
                  <div class="flex items-center justify-between mb-3">
                    <p class="text-xs font-semibold text-gray-700">Vistas — últimos 7 días</p>
                    <!-- Badge tendencia -->
                    <div
                      v-if="data.viewsTrend !== undefined"
                      class="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
                      :class="data.viewsTrend > 0
                        ? 'bg-green-100 text-green-700'
                        : data.viewsTrend < 0
                          ? 'bg-red-100 text-red-600'
                          : 'bg-gray-100 text-gray-500'"
                    >
                      <ArrowTrendingUpIcon v-if="data.viewsTrend > 0" class="h-3 w-3" />
                      <ArrowTrendingDownIcon v-else-if="data.viewsTrend < 0" class="h-3 w-3" />
                      <span>{{ data.viewsTrend > 0 ? '+' : '' }}{{ data.viewsTrend }}%</span>
                      <span class="font-normal opacity-70">vs semana anterior</span>
                    </div>
                  </div>

                  <!-- Barras -->
                  <div class="flex items-end gap-1.5 h-16">
                    <template v-for="day in data.viewsByDay" :key="day.date">
                      <div class="flex-1 flex flex-col items-center gap-1 group/bar relative">
                        <!-- Tooltip -->
                        <div class="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none z-10">
                          {{ day.count }} vista{{ day.count !== 1 ? 's' : '' }}
                        </div>
                        <div
                          class="w-full rounded-t-md transition-all duration-500"
                          :class="day.count > 0 ? 'bg-blue-400 hover:bg-blue-500' : 'bg-gray-200'"
                          :style="{ height: maxDayViews > 0 ? `${Math.max(4, (day.count / maxDayViews) * 52)}px` : '4px' }"
                        />
                        <span class="text-[9px] text-gray-400 leading-none">{{ day.date.slice(5) }}</span>
                      </div>
                    </template>
                  </div>

                  <!-- Alcance semanal -->
                  <p v-if="(data.weeklyReach ?? 0) > 0" class="text-[10px] text-gray-400 text-right mt-2">
                    {{ data.weeklyReach }} vista{{ data.weeklyReach !== 1 ? 's' : '' }} esta semana
                  </p>
                </div>

                <!-- Última solicitud recibida -->
                <div v-if="data.lastRequest" class="flex items-start gap-3 p-3.5 bg-green-50 border border-green-100 rounded-xl">
                  <div class="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 text-sm font-bold text-green-700">
                    {{ data.lastRequest.clientName[0].toUpperCase() }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-semibold text-gray-800">{{ data.lastRequest.clientName }}</p>
                    <p class="text-[10px] text-gray-500 mt-0.5">
                      Última solicitud · {{ formatDateTimeShort(data.lastRequest.date) }}
                      <span v-if="data.lastRequest.modality" class="ml-1">
                        · {{ MODALITY_LABELS[data.lastRequest.modality] ?? data.lastRequest.modality }}
                      </span>
                    </p>
                  </div>
                </div>
                <div v-else class="text-center py-3 text-[11px] text-gray-400">
                  Aún no has recibido solicitudes para este servicio
                </div>

                <!-- Consejo contextual -->
                <div
                  v-if="data.views > 0"
                  class="p-3.5 rounded-xl border text-xs leading-relaxed"
                  :class="data.conversionRate >= 10
                    ? 'bg-green-50 border-green-100 text-green-700'
                    : data.conversionRate >= 3
                      ? 'bg-yellow-50 border-yellow-100 text-yellow-700'
                      : 'bg-orange-50 border-orange-100 text-orange-700'"
                >
                  <span class="font-semibold block mb-1">
                    {{ data.conversionRate >= 10 ? '🎉 Excelente rendimiento' : data.conversionRate >= 3 ? '📈 Buen avance' : '💡 Oportunidad de mejora' }}
                  </span>
                  {{ data.conversionRate >= 10
                    ? 'Tu anuncio convierte muy bien. Considera subir el precio o añadir más servicios.'
                    : data.conversionRate >= 3
                      ? 'Tu tasa de conversión es razonable. Mejorar las fotos o la descripción puede aumentarla.'
                      : 'Tienes vistas pero pocas solicitudes. Revisa el precio, añade descripción detallada y elige buenas fotos.' }}
                </div>
                <div v-else-if="target?.status === 'PAUSED'" class="p-3.5 rounded-xl border border-gray-200 bg-gray-50 text-xs leading-relaxed text-gray-600">
                  <span class="font-semibold block mb-1">⏸️ Servicio pausado</span>
                  Mientras esté pausado no aparece en el catálogo y no puede recibir vistas ni solicitudes. Actívalo desde la lista para empezar a medir su desempeño.
                </div>
                <div v-else class="p-3.5 rounded-xl border border-blue-100 bg-blue-50 text-xs leading-relaxed text-blue-700">
                  <span class="font-semibold block mb-1">👀 Todavía sin vistas</span>
                  Aún no hay datos suficientes. Comparte el enlace de tu perfil o revisa que la categoría, etiquetas y descripción sean claras para aparecer en más búsquedas.
                </div>

              </template>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  ChartBarIcon,
  ArrowPathIcon,
  XMarkIcon,
  ExclamationCircleIcon,
  EyeIcon,
  UserIcon,
  ClipboardDocumentListIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  SparklesIcon,
  CalendarDaysIcon,
} from '@heroicons/vue/24/outline'
import { SERVICE_STATUS_LABELS, SERVICE_STATUS_CLASSES, type Service } from '~/composables/services/useMyServices'
import { useDateFormat } from '~/composables/core/useDateFormat'

export interface ServiceMetricsData {
  views: number
  profileVisits: number
  requests: number
  conversionRate: number
  interestRate: number
  weeklyReach: number
  viewsTrend: number
  requestsLast30: number
  lastRequest: { date: string; clientName: string; modality: string } | null
  viewsByDay: { date: string; count: number }[]
}

const props = defineProps<{
  target: Service | null
  data: ServiceMetricsData | null
  loading: boolean
  error: string | null
}>()

defineEmits<{
  close: []
  refresh: []
}>()

const { formatDateTimeShort } = useDateFormat()

const MODALITY_LABELS: Record<string, string> = {
  IN_PERSON: '📍 Presencial', REMOTE: '💻 Remoto', ANY: '🤝 Cualquiera',
}

const maxDayViews = computed(() => {
  if (!props.data?.viewsByDay.length) return 1
  return Math.max(1, ...props.data.viewsByDay.map(d => d.count))
})
</script>
