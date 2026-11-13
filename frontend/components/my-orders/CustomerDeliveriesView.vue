<template>
  <div>
    <div v-if="loading && !deliveries.length" class="space-y-3">
      <div v-for="i in 2" :key="i" class="h-20 bg-gray-100 rounded-xl animate-pulse" />
    </div>

    <div v-else-if="!deliveries.length" class="card p-10 text-center">
      <TruckIcon class="h-10 w-10 text-gray-300 mx-auto mb-2" />
      <p class="text-gray-500 font-medium">No tienes entregas recientes</p>
      <p class="text-sm text-gray-400 mt-1">
        Cuando un comercio te envíe un pedido a domicilio a tu cuenta, lo verás aquí y podrás seguirlo en el mapa.
      </p>
    </div>

    <div v-else class="space-y-3">
      <NuxtLink
        v-for="d in deliveries"
        :key="d.id"
        :to="`/delivery-tracking/${d.id}`"
        class="card p-4 flex items-center justify-between gap-3 hover:shadow-md transition-shadow"
      >
        <div class="min-w-0">
          <p class="font-semibold text-gray-900 truncate">
            {{ d.commerce.name }} · #{{ d.orderNumber }}
          </p>
          <p class="text-xs text-gray-500 truncate">{{ d.deliveryAddress }}</p>
          <p v-if="d.driver" class="text-xs text-gray-400 mt-0.5">Repartidor: {{ d.driver.name }}</p>
        </div>
        <div class="text-right flex-shrink-0">
          <span class="badge" :class="DELIVERY_STATUS_CLASSES[d.status]">{{ CUSTOMER_STATUS_LABELS[d.status] ?? d.status }}</span>
          <p v-if="d.status === 'DELIVERED' && !d.rating" class="text-xs text-amber-600 font-semibold mt-1">⭐ Califica al repartidor</p>
          <p v-else-if="d.rating" class="text-xs text-gray-400 mt-1">{{ '★'.repeat(d.rating.stars) }}</p>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { TruckIcon } from '@heroicons/vue/24/outline'
import { useApi } from '~/composables/core/useApi'
import { DELIVERY_STATUS_CLASSES, type DeliveryStatus } from '~/composables/delivery/useDelivery'

interface CustomerDelivery {
  id: string
  orderNumber: string
  status: DeliveryStatus
  deliveryAddress: string
  createdAt: string
  deliveredAt: string | null
  active: boolean
  commerce: { name: string }
  driver: { name: string; vehicleType: string } | null
  rating: { stars: number } | null
}

const props = defineProps<{ active: boolean }>()

// Textos pensados para quien recibe (no para el comercio).
const CUSTOMER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Preparando',
  ASSIGNED: 'Repartidor asignado',
  PICKING_UP: 'Recogiendo tu pedido',
  IN_TRANSIT: 'En camino',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
  FAILED: 'No se pudo entregar',
}

const { get } = useApi()
const deliveries = ref<CustomerDelivery[]>([])
const loading = ref(false)
let loaded = false

async function load() {
  loading.value = true
  try {
    deliveries.value = await get<CustomerDelivery[]>('/delivery/customer/mine')
    loaded = true
  } catch {
    deliveries.value = []
  } finally {
    loading.value = false
  }
}

watch(() => props.active, (isActive) => { if (isActive && !loaded) load() }, { immediate: true })
</script>
