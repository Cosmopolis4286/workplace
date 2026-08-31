<template>
  <div>
    <PageHeader
      title="Mis Entregas"
      description="Entregas activas asignadas a ti"
      :icon="TruckIcon"
      :breadcrumb="[{ label: 'Mis Entregas' }]"
    />

    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div v-for="i in 2" :key="i" class="h-56 bg-gray-100 rounded-xl animate-pulse" />
    </div>

    <div v-else-if="error" class="card p-8 text-center text-red-600">{{ error }}</div>

    <div v-else-if="deliveries.length === 0" class="card p-12 text-center">
      <TruckIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
      <p class="text-gray-500 font-medium">No tienes entregas activas</p>
      <p class="text-sm text-gray-400 mt-1">Las entregas que te asignen aparecerán aquí</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <DriverTrackingPanel
        v-for="delivery in deliveries"
        :key="delivery.id"
        :delivery-id="delivery.id"
        :order-number="delivery.orderNumber"
        :tracking-active="!!delivery.trackingActive"
        :pickup="hasCoords(delivery.pickupLat, delivery.pickupLng) ? { lat: delivery.pickupLat!, lng: delivery.pickupLng! } : null"
        :destination="hasCoords(delivery.destLat, delivery.destLng) ? { lat: delivery.destLat!, lng: delivery.destLng! } : null"
        :pickup-label="delivery.deliveryAddress"
        :destination-label="delivery.customerName"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { TruckIcon } from '@heroicons/vue/24/outline'

definePageMeta({ middleware: 'auth' })

const { deliveries, loading, error, fetchMyDeliveries } = useDriverDeliveries()

function hasCoords(lat?: number | null, lng?: number | null): boolean {
  return lat != null && lng != null
}

onMounted(() => fetchMyDeliveries())
</script>
