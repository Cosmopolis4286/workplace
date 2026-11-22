<template>
  <div
    v-if="!online || servingCacheFrom || pendingCount > 0"
    class="mx-4 mt-3 rounded-xl border px-3 py-2 text-xs flex items-center gap-2"
    :class="online ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-gray-800 border-gray-700 text-white'"
    role="status"
    aria-live="polite"
  >
    <SignalSlashIcon v-if="!online" class="h-4 w-4 flex-shrink-0" />
    <ArrowPathIcon v-else class="h-4 w-4 flex-shrink-0" />
    <span>
      <template v-if="!online">Sin conexión.</template>
      <template v-if="servingCacheFrom"> Mostrando datos guardados de {{ formatTime(servingCacheFrom) }}.</template>
      <template v-if="pendingCount > 0">
        {{ pendingCount }} {{ pendingCount === 1 ? 'acción espera' : 'acciones esperan' }} a que vuelva la señal.
      </template>
      <template v-if="online && servingCacheFrom && pendingCount === 0"> Actualiza la página para ver lo último.</template>
    </span>
  </div>
</template>

<script setup lang="ts">
import { ArrowPathIcon, SignalSlashIcon } from '@heroicons/vue/24/outline'
import { useOfflineStatus } from '~/composables/core/useOfflineStatus'

// Aviso de modo sin conexión (ver utils/offlineCache.ts): cuando no hay señal,
// cuando una pantalla muestra datos guardados o hay acciones en cola.
const { online, servingCacheFrom, pendingCount } = useOfflineStatus()

function formatTime(iso: string) {
  const d = new Date(iso)
  const today = new Date().toDateString() === d.toDateString()
  const time = d.toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit' })
  return today ? `hoy a las ${time}` : `${d.toLocaleDateString('es-VE')} ${time}`
}
</script>
