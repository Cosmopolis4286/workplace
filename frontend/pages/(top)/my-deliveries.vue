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
      <div v-for="delivery in deliveries" :key="delivery.id" class="space-y-3">
      <DriverDeliveryActions :delivery="delivery" @updated="onUpdated" />
      <ConversationChat
        v-if="delivery.chatAvailable && user"
        thread-type="DELIVERY"
        :thread-id="delivery.id"
        :current-user-id="user.id"
        :title="`Chat con ${delivery.customerName}`"
        hint="Por seguridad, no compartas teléfonos ni correos: todo queda aquí."
        :quick-replies="DRIVER_QUICK_REPLIES"
        show-sender-names
      />
      <button class="text-xs text-gray-400 hover:text-red-600 hover:underline" @click="reportingId = delivery.id">
        Reportar un problema con esta entrega
      </button>
      <DriverTrackingPanel
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

    <ReportProblemModal
      v-if="reportingId"
      :model-value="true"
      entity-type="DELIVERY"
      :entity-id="reportingId"
      @update:model-value="reportingId = null"
    />
  </div>
</template>

<script setup lang="ts">
import { TruckIcon } from '@heroicons/vue/24/outline'
import DriverDeliveryActions from '~/components/delivery/DriverDeliveryActions.vue'
import ConversationChat from '~/components/conversations/ConversationChat.vue'
import ReportProblemModal from '~/components/modals/ReportProblemModal.vue'
import { useAuth } from '~/composables/auth/useAuth'
import type { Delivery } from '~/composables/delivery/useDelivery'

definePageMeta({ middleware: 'auth' })

const { user } = useAuth()
const reportingId = ref<string | null>(null)

// En la calle, con el casco puesto: mensajes de un toque.
const DRIVER_QUICK_REPLIES = [
  'Ya recogí tu pedido',
  'Voy en camino',
  'Llego en 5 minutos',
  'Llegué, estoy afuera',
  'No encuentro la dirección, ¿me das una referencia?',
]

const { deliveries, loading, error, fetchMyDeliveries } = useDriverDeliveries()

// Entregada o fallida sale de la lista; si sigue activa se actualiza.
function onUpdated(updated: Delivery) {
  const active = ['ASSIGNED', 'PICKING_UP', 'IN_TRANSIT']
  deliveries.value = active.includes(updated.status)
    ? deliveries.value.map(d => (d.id === updated.id ? { ...d, ...updated } : d))
    : deliveries.value.filter(d => d.id !== updated.id)
}

function hasCoords(lat?: number | null, lng?: number | null): boolean {
  return lat != null && lng != null
}

onMounted(() => fetchMyDeliveries())
</script>
