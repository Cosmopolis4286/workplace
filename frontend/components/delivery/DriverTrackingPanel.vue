<template>
  <div class="card p-4 space-y-3">
    <div class="flex items-center justify-between">
      <p class="font-semibold text-gray-900">📦 Entrega #{{ orderNumber }}</p>
      <span
        class="badge"
        :class="active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
      >
        {{ active ? '🟢 Tracking activo' : '⚪ Tracking inactivo' }}
      </span>
    </div>

    <div class="grid grid-cols-2 gap-3 text-sm">
      <div>
        <p class="text-gray-500">Recoger</p>
        <p class="font-medium text-gray-900 truncate">{{ pickupLabel }}</p>
      </div>
      <div>
        <p class="text-gray-500">Entregar</p>
        <p class="font-medium text-gray-900 truncate">{{ destinationLabel }}</p>
      </div>
    </div>

    <p v-if="permissionDenied" class="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
      ⚠️ Activa la ubicación para continuar con el tracking.
    </p>
    <p v-else-if="error" class="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
      {{ error }}
    </p>

    <div class="flex gap-2">
      <button
        v-if="!active"
        class="flex-1 btn-primary text-sm py-2"
        :disabled="!canTrack"
        @click="start"
      >
        Iniciar tracking
      </button>
      <button v-else class="flex-1 text-sm py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium" @click="stop">
        Detener tracking
      </button>

      <a
        :href="navigateUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="flex-1 text-center text-sm py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
      >
        🗺️ Navegar
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  deliveryId: string
  orderNumber: string
  trackingActive: boolean
  pickup: { lat: number; lng: number } | null
  destination: { lat: number; lng: number } | null
  pickupLabel: string
  destinationLabel: string
}>()

const { active, permissionDenied, error, start, stop } = useDriverLocationPublisher(props.deliveryId)

// El backend rechaza publicar si trackingActive es false (delivery no está
// en un estado trackeable) — evitamos ofrecer el botón en ese caso.
const canTrack = computed(() => props.trackingActive)

// Navegación externa: WorkPlace no implementa turn-by-turn propio, solo abre
// Google Maps con origen/destino — ver WORKPLACE_VISION / restricción de
// costos del módulo Express.
const navigateUrl = computed(() => {
  const dest = props.destination
  if (!dest) return '#'
  const params = new URLSearchParams({
    api: '1',
    destination: `${dest.lat},${dest.lng}`,
  })
  if (props.pickup) {
    params.set('origin', `${props.pickup.lat},${props.pickup.lng}`)
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`
})
</script>
