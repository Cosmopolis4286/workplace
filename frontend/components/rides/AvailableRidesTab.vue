<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between mb-2">
      <p class="text-sm text-gray-500">Corridas disponibles cerca de ti</p>
      <button @click="$emit('refresh')" :disabled="loading" class="btn-secondary text-sm flex items-center gap-1.5">
        <ArrowPathIcon class="w-4 h-4" :class="{ 'animate-spin': loading }" />
        Actualizar
      </button>
    </div>

    <!-- Skeleton -->
    <div v-if="loading" class="grid gap-4 sm:grid-cols-2">
      <div v-for="n in 4" :key="n" class="card p-5 animate-pulse space-y-3">
        <div class="skeleton h-4 w-24 rounded" />
        <div class="skeleton h-3 w-full rounded" />
        <div class="skeleton h-3 w-3/4 rounded" />
        <div class="skeleton h-9 w-full rounded-xl" />
      </div>
    </div>

    <div v-else-if="rides.length === 0" class="card p-12 text-center">
      <TruckIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
      <p class="text-gray-500 font-medium">No hay corridas disponibles</p>
      <p class="text-sm text-gray-400 mt-1">Vuelve a intentar en unos minutos</p>
    </div>

    <div v-else class="grid gap-4 sm:grid-cols-2">
      <div v-for="corrida in rides" :key="corrida.id" class="card p-5 space-y-4">
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-2">
            <span v-if="corrida.serviceType === 'FREIGHT'" class="badge bg-amber-100 text-amber-800">📦 Flete</span>
            <span class="badge bg-gray-100 text-gray-700">{{ vehicleLabel(corrida.vehicleType) }}</span>
          </div>
          <div class="text-right">
            <p class="text-xl font-bold text-red-600">${{ corrida.price ?? '--' }}</p>
            <p class="text-xs text-gray-400">{{ timeAgo(corrida.createdAt) }}</p>
          </div>
        </div>

        <div class="relative pl-5 space-y-3">
          <div class="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-200"></div>
          <div class="flex items-start gap-3">
            <span class="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 relative z-10">A</span>
            <p class="text-sm text-gray-700 leading-snug">{{ corrida.origin }}</p>
          </div>
          <div class="flex items-start gap-3">
            <span class="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 relative z-10">B</span>
            <p class="text-sm text-gray-700 leading-snug">{{ corrida.destination }}</p>
          </div>
        </div>

        <div v-if="corrida.serviceType === 'FREIGHT' && corrida.cargoDescription" class="text-xs text-gray-500">
          <span class="font-medium text-gray-700">Carga:</span> {{ corrida.cargoDescription }} {{ corrida.cargoWeight ? `· ${corrida.cargoWeight} kg` : '' }}
        </div>

        <div v-if="corrida.distance || corrida.duration" class="flex gap-4 text-xs text-gray-500">
          <span v-if="corrida.distance" class="flex items-center gap-1">
            <ArrowTrendingUpIcon class="w-3.5 h-3.5" /> {{ corrida.distance }} km
          </span>
          <span v-if="corrida.duration" class="flex items-center gap-1">
            <ClockIcon class="w-3.5 h-3.5" /> ~{{ corrida.duration }} min
          </span>
        </div>

        <button
          @click="$emit('accept', corrida.id)"
          :disabled="acceptingId === corrida.id"
          class="btn-primary w-full disabled:opacity-50"
        >
          {{ acceptingId === corrida.id ? 'Aceptando...' : 'Aceptar Viaje' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { TruckIcon, ArrowPathIcon, ArrowTrendingUpIcon, ClockIcon } from '@heroicons/vue/24/outline'
import type { Ride } from '~/composables/delivery/useRides'
import { useRideHelpers } from '~/composables/delivery/useRideHelpers'

defineProps<{
  rides: Ride[]
  loading: boolean
  acceptingId: string | null
}>()

defineEmits<{
  refresh: []
  accept: [id: string]
}>()

const { vehicleLabel, timeAgo } = useRideHelpers()
</script>
