<template>
  <div>
    <PageHeader
      title="Seguimiento de entrega"
      description="Ubicación en tiempo real de tu pedido"
      :icon="MapPinIcon"
      :breadcrumb="[{ label: 'Mis Pedidos', to: '/my-orders' }, { label: 'Seguimiento' }]"
    />

    <div v-if="loading" class="card p-8 text-center text-gray-500">Cargando seguimiento…</div>

    <div v-else-if="error" class="card p-8 text-center text-red-600">{{ error }}</div>

    <template v-else-if="snapshot">
      <div class="card p-4 mb-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p class="text-sm text-gray-500">Estado</p>
          <p class="font-semibold text-gray-900">{{ statusLabel }}</p>
        </div>

        <div v-if="snapshot.driver" class="flex items-center gap-2">
          <span class="text-2xl">{{ vehicleEmoji }}</span>
          <div>
            <p class="font-semibold text-gray-900">{{ snapshot.driver.name }}</p>
            <p class="text-xs text-gray-500">{{ vehicleLabel }}</p>
          </div>
        </div>

        <div v-if="snapshot.route" class="text-right">
          <p class="text-sm text-gray-500">ETA</p>
          <p class="font-semibold text-gray-900">{{ etaLabel }}</p>
          <p class="text-xs text-gray-500">{{ distanceLabel }}</p>
        </div>
      </div>

      <div v-if="snapshot.deliveryCode && !['DELIVERED', 'CANCELLED', 'FAILED'].includes(snapshot.status)" class="card p-4 mb-4 flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-200">
        <p class="text-sm text-emerald-900">
          <strong>Tu código de entrega.</strong> Dáselo al repartidor solo cuando recibas tu pedido.
        </p>
        <span class="font-mono text-2xl font-black tracking-[0.3em] text-emerald-900">{{ snapshot.deliveryCode }}</span>
      </div>

      <div v-if="!isTrackable" class="card p-4 mb-4 bg-amber-50 border border-amber-200 text-amber-800 text-sm">
        El seguimiento en vivo no está disponible para esta entrega en este momento.
      </div>

      <div class="card p-0 h-[420px]">
        <ClientOnly>
          <DeliveryTrackingMap
            :pickup="snapshot.pickup"
            :destination="snapshot.destination"
            :location="snapshot.location"
            :route="snapshot.route"
            :trail="trail"
          />
          <template #fallback>
            <div class="h-full flex items-center justify-center text-gray-400">Cargando mapa…</div>
          </template>
        </ClientOnly>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { MapPinIcon } from '@heroicons/vue/24/outline'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const deliveryId = route.params.id as string

const { snapshot, loading, error, isTrackable, trail, init } = useDeliveryTracking(deliveryId)

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Preparando pedido',
  ASSIGNED: 'Repartidor asignado',
  PICKING_UP: 'En camino a recoger',
  IN_TRANSIT: 'En camino',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelada',
  FAILED: 'Entrega fallida',
}

const VEHICLE_LABELS: Record<string, { label: string; emoji: string }> = {
  MOTORCYCLE: { label: 'Moto', emoji: '🏍️' },
  CAR: { label: 'Auto', emoji: '🚗' },
  BICYCLE: { label: 'Bicicleta', emoji: '🚲' },
  ELECTRIC_BICYCLE: { label: 'Bicicleta eléctrica', emoji: '🚲' },
  SCOOTER: { label: 'Scooter', emoji: '🛵' },
  ON_FOOT: { label: 'A pie', emoji: '🚶' },
}

const statusLabel = computed(() => STATUS_LABELS[snapshot.value?.status ?? ''] ?? snapshot.value?.status)
const vehicleInfo = computed(() => VEHICLE_LABELS[snapshot.value?.driver?.vehicleType ?? ''] ?? { label: '', emoji: '📦' })
const vehicleLabel = computed(() => vehicleInfo.value.label)
const vehicleEmoji = computed(() => vehicleInfo.value.emoji)

const etaLabel = computed(() => {
  const seconds = snapshot.value?.route?.durationSeconds
  if (!seconds) return '—'
  const minutes = Math.round(seconds / 60)
  return minutes <= 1 ? '< 1 min' : `${minutes} min`
})

const distanceLabel = computed(() => {
  const meters = snapshot.value?.route?.distanceMeters
  if (!meters) return ''
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`
})

onMounted(() => init())
</script>
