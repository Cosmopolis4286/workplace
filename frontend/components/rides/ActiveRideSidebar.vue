<template>
  <div v-if="ride" class="card overflow-hidden">
    <!-- Banner de estado -->
    <div
      class="px-5 py-4 text-white"
      :class="{
        'bg-gradient-to-r from-red-600 to-orange-500': ride.status === 'PENDING',
        'bg-gradient-to-r from-blue-600 to-blue-500': ride.status === 'ACCEPTED',
        'bg-gradient-to-r from-green-600 to-green-500': ride.status === 'IN_PROGRESS',
      }"
    >
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
          <MagnifyingGlassIcon v-if="ride.status === 'PENDING'" class="w-5 h-5 animate-pulse" />
          <CheckCircleIcon v-else-if="ride.status === 'ACCEPTED'" class="w-5 h-5" />
          <BoltIcon v-else class="w-5 h-5 animate-bounce" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-sm">
            {{ ride.status === 'PENDING' ? 'Buscando motorista...' : ride.status === 'ACCEPTED' ? '¡Conductor en camino!' : '¡En curso!' }}
          </p>
          <p class="text-white/75 text-xs mt-0.5">{{ elapsedTime }} transcurrido</p>
        </div>
      </div>
      <div v-if="ride.status === 'PENDING'" class="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
        <div class="h-full bg-white/60 rounded-full w-3/5" style="animation: searching 2s ease-in-out infinite"></div>
      </div>
    </div>

    <div class="p-5 space-y-4">
      <span v-if="ride.serviceType === 'FREIGHT'" class="badge bg-amber-100 text-amber-800">📦 Flete</span>

      <!-- Ruta -->
      <div class="relative pl-5 space-y-3">
        <div class="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-200"></div>
        <div class="flex items-start gap-3">
          <span class="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 relative z-10">A</span>
          <div>
            <p class="text-[10px] text-gray-400">{{ ride.serviceType === 'FREIGHT' ? 'Recogida' : 'Origen' }}</p>
            <p class="text-sm font-medium text-gray-900">{{ ride.origin }}</p>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <span class="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 relative z-10">B</span>
          <div>
            <p class="text-[10px] text-gray-400">{{ ride.serviceType === 'FREIGHT' ? 'Entrega' : 'Destino' }}</p>
            <p class="text-sm font-medium text-gray-900">{{ ride.destination }}</p>
          </div>
        </div>
      </div>

      <!-- Datos de carga (flete) -->
      <div v-if="ride.serviceType === 'FREIGHT' && (ride.recipientName || ride.cargoDescription)" class="p-3 bg-amber-50 rounded-xl text-xs text-gray-600 space-y-1">
        <p v-if="ride.recipientName"><span class="font-medium text-gray-700">Destinatario:</span> {{ ride.recipientName }} {{ ride.recipientPhone ? `· ${ride.recipientPhone}` : '' }}</p>
        <p v-if="ride.cargoDescription"><span class="font-medium text-gray-700">Carga:</span> {{ ride.cargoDescription }} {{ ride.cargoWeight ? `· ${ride.cargoWeight} kg` : '' }}</p>
      </div>

      <!-- Conductor -->
      <div v-if="ride.driverName" class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
        <div class="w-9 h-9 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
          <UserIcon class="w-5 h-5 text-red-500" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-gray-900 truncate">{{ ride.driverName }}</p>
          <p class="text-xs text-gray-500">{{ ride.driverPhone }}</p>
        </div>
        <p class="text-lg font-bold text-red-600 flex-shrink-0">${{ ride.price }}</p>
      </div>
      <div v-else class="flex justify-between items-center text-sm text-gray-500">
        <span>Precio estimado</span>
        <span class="text-xl font-bold text-red-600">${{ ride.price }}</span>
      </div>

      <div v-if="ride.deliveryCode" class="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
        Código de entrega: <span class="font-mono text-base font-black tracking-widest">{{ ride.deliveryCode }}</span>
        <p class="mt-0.5">Pásaselo a quien recibe: el conductor se lo pedirá al entregar.</p>
      </div>

      <button
        v-if="ride.status === 'PENDING' || ride.status === 'ACCEPTED'"
        @click="$emit('cancel', ride.id)"
        :disabled="cancelling"
        class="w-full px-4 py-2.5 border border-red-300 text-red-700 rounded-xl hover:bg-red-50 disabled:opacity-50 text-sm font-medium transition-colors"
      >
        {{ cancelling ? 'Cancelando...' : 'Cancelar Viaje' }}
      </button>
    </div>
  </div>

  <!-- Sin viaje activo -->
  <div v-else class="card p-5 text-center text-gray-400">
    <TruckIcon class="h-10 w-10 mx-auto mb-2 text-gray-200" />
    <p class="text-sm font-medium">Sin viaje activo</p>
    <p class="text-xs mt-1">Solicita un viaje para verlo aquí</p>
  </div>
</template>

<script setup lang="ts">
import { TruckIcon, MagnifyingGlassIcon, CheckCircleIcon, BoltIcon, UserIcon } from '@heroicons/vue/24/outline'
import type { Ride } from '~/composables/delivery/useRides'

defineProps<{
  ride: Ride | null
  elapsedTime: string
  cancelling: boolean
}>()

defineEmits<{
  cancel: [id: string]
}>()
</script>

<style scoped>
@keyframes searching {
  0%, 100% { transform: translateX(-100%); }
  50% { transform: translateX(200%); }
}
</style>
