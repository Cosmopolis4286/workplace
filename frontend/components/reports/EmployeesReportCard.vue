<template>
  <div class="card overflow-hidden">
    <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
          <UsersIcon class="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h2 class="text-sm font-semibold text-gray-900">Equipo</h2>
          <p class="text-xs text-gray-400">Empleados & recursos</p>
        </div>
      </div>
      <button
        class="text-xs text-gray-400 hover:text-indigo-600 flex items-center gap-1 transition-colors"
        :disabled="loading"
        @click="$emit('export')"
      >
        <ArrowDownTrayIcon class="h-3.5 w-3.5" />
        JSON
      </button>
    </div>

    <div class="p-5">
      <!-- Skeleton -->
      <div v-if="loading" class="space-y-3 animate-pulse">
        <div v-for="n in 5" :key="n" class="h-8 bg-gray-100 rounded-lg" />
      </div>

      <template v-else-if="stats">
        <!-- Total destacado -->
        <div class="text-center py-4 mb-4 bg-indigo-50 rounded-xl">
          <p class="text-4xl font-black text-indigo-700">{{ stats.total ?? '—' }}</p>
          <p class="text-xs text-indigo-500 mt-1 font-medium">empleados en total</p>
        </div>

        <!-- Lista de estados -->
        <div class="space-y-2.5">
          <div v-for="s in summary" :key="s.label" class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full flex-shrink-0" :class="s.dot" />
              <span class="text-sm text-gray-600">{{ s.label }}</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full"
                  :class="s.bar"
                  :style="{ width: stats.total ? `${Math.round((s.value / stats.total) * 100)}%` : '0%' }"
                />
              </div>
              <span class="text-sm font-bold text-gray-900 w-5 text-right">{{ s.value ?? '—' }}</span>
            </div>
          </div>
        </div>

        <!-- Nuevos este mes -->
        <div v-if="(stats.newThisMonth ?? 0) > 0" class="mt-4 p-3 bg-indigo-50 rounded-xl flex items-center justify-between">
          <span class="text-xs text-indigo-700 font-medium">Nuevos este mes</span>
          <span class="text-sm font-black text-indigo-600">+{{ stats.newThisMonth }}</span>
        </div>
      </template>

      <!-- Sin permiso -->
      <div v-else-if="forbidden" class="py-6 text-center">
        <LockClosedIcon class="h-8 w-8 text-gray-300 mx-auto mb-2" />
        <p class="text-sm font-medium text-gray-500">Sin acceso</p>
        <p class="text-xs text-gray-400 mt-1">No tienes permiso para ver el reporte de empleados</p>
      </div>

      <div v-else class="py-8 text-center text-gray-400 text-sm">
        No se pudieron cargar los datos
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UsersIcon, ArrowDownTrayIcon, LockClosedIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  loading: boolean
  stats: any
  forbidden: boolean
}>()

defineEmits<{
  export: []
}>()

const summary = computed(() => [
  { label: 'Activos',    value: props.stats?.active     ?? 0, dot: 'bg-green-400',  bar: 'bg-green-400'  },
  { label: 'Vacaciones', value: props.stats?.onVacation  ?? 0, dot: 'bg-yellow-400', bar: 'bg-yellow-400' },
  { label: 'Inactivos',  value: props.stats?.inactive    ?? 0, dot: 'bg-gray-400',   bar: 'bg-gray-400'   },
])
</script>
