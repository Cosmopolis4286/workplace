<template>
  <div class="card bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-purple-100 rounded-xl">
          <ClipboardDocumentListIcon class="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h3 class="font-bold text-gray-900">Mis Solicitudes</h3>
          <p class="text-xs text-gray-500">Servicios solicitados</p>
        </div>
      </div>
      <NuxtLink
        to="/solicitudes-servicio"
        class="text-xs font-semibold text-purple-600 hover:text-purple-700"
      >
        Ver todas
      </NuxtLink>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-3">
      <div v-for="n in 3" :key="n" class="animate-pulse bg-gray-100 rounded-xl h-14" />
    </div>

    <!-- Empty -->
    <div v-else-if="requests.length === 0" class="text-center py-6">
      <ClipboardDocumentListIcon class="w-10 h-10 text-gray-300 mx-auto mb-2" />
      <p class="text-sm text-gray-500">No has solicitado servicios</p>
      <NuxtLink
        to="/servicios"
        class="inline-block mt-2 text-xs font-semibold text-purple-600 hover:text-purple-700"
      >
        Explorar servicios
      </NuxtLink>
    </div>

    <!-- Requests List -->
    <div v-else class="space-y-2">
      <div
        v-for="req in requests.slice(0, 5)"
        :key="req.id"
        class="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
      >
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center text-purple-700 font-bold text-xs">
            {{ req.serviceName[0].toUpperCase() }}
          </div>
          <div>
            <p class="text-sm font-semibold text-gray-900 truncate max-w-[140px]">{{ req.serviceName }}</p>
            <p class="text-xs text-gray-500">{{ req.providerName }}</p>
          </div>
        </div>
        <div class="text-right">
          <p v-if="req.price" class="text-sm font-bold text-gray-900">${{ formatPrice(req.price) }}</p>
          <span
            class="text-[10px] font-medium px-2 py-0.5 rounded-full"
            :class="statusClass(req.status)"
          >
            {{ statusLabel(req.status) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ClipboardDocumentListIcon } from '@heroicons/vue/24/outline'

interface ServiceRequest {
  id: string
  serviceName: string
  providerName: string
  status: 'PENDIENTE' | 'VISTO' | 'CONTACTADO' | 'CERRADO'
  price?: number
}

const props = defineProps<{
  requests: ServiceRequest[]
  loading?: boolean
}>()

const statusLabels: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  VISTO: 'Visto',
  CONTACTADO: 'Contactado',
  CERRADO: 'Cerrado',
}

const statusClasses: Record<string, string> = {
  PENDIENTE: 'bg-yellow-100 text-yellow-700',
  VISTO: 'bg-gray-100 text-gray-700',
  CONTACTADO: 'bg-blue-100 text-blue-700',
  CERRADO: 'bg-green-100 text-green-700',
}

function statusLabel(status: string) {
  return statusLabels[status] || status
}

function statusClass(status: string) {
  return statusClasses[status] || 'bg-gray-100 text-gray-700'
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(price)
}
</script>
