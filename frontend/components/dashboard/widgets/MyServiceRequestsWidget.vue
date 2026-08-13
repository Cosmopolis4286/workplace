<template>
  <div class="card bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col min-h-[420px] h-full">
    <div class="flex items-center justify-between mb-4 flex-shrink-0">
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
        to="/service-requests"
        class="text-xs font-semibold text-purple-600 hover:text-purple-700"
      >
        Ver todas
      </NuxtLink>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-3">
      <div v-for="n in 3" :key="n" class="animate-pulse bg-gray-100 rounded-xl h-16" />
    </div>

    <!-- Empty -->
    <div v-else-if="requests.length === 0" class="flex-1 flex flex-col items-center justify-center text-center">
      <ClipboardDocumentListIcon class="w-10 h-10 text-gray-300 mb-2" />
      <p class="text-sm font-medium text-gray-700">No has solicitado servicios</p>
      <p class="text-xs text-gray-400 mt-1">Tus solicitudes a proveedores aparecerán aquí</p>
      <NuxtLink
        to="/search?tab=servicios"
        class="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-purple-600 hover:text-purple-700"
      >
        <WrenchIcon class="w-3.5 h-3.5" />
        Explorar servicios
      </NuxtLink>
    </div>

    <!-- Requests List -->
    <div v-else class="space-y-2 flex-1">
      <NuxtLink
        v-for="req in requests.slice(0, 5)"
        :key="req.id"
        :to="`/service-requests?open=${req.id}`"
        class="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
      >
        <img
          v-if="getAssetUrl(req.providerAvatar)"
          :src="getAssetUrl(req.providerAvatar)!"
          class="w-11 h-11 rounded-xl object-cover flex-shrink-0 ring-1 ring-gray-100"
        />
        <div v-else class="w-11 h-11 bg-purple-100 rounded-xl flex items-center justify-center text-purple-700 font-bold text-sm flex-shrink-0">
          {{ req.serviceName[0]?.toUpperCase() }}
        </div>

        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-gray-900 truncate">{{ req.serviceName }}</p>
          <p class="text-xs text-gray-400 truncate">{{ req.providerName }}</p>
          <div class="flex items-center gap-2 mt-1">
            <span class="text-[10px] text-gray-400 flex items-center gap-1">
              <ClockIcon class="w-3 h-3" />
              {{ timeAgo(req.createdAt) }}
            </span>
            <span v-if="req.modality" class="text-[10px] text-gray-400">
              {{ MODALITY_LABELS[req.modality] ?? req.modality }}
            </span>
          </div>
        </div>

        <div class="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
          <span
            class="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
            :class="statusClass(req.status)"
          >
            <component :is="STATUS_ICONS[req.status]" class="w-3 h-3" />
            {{ statusLabel(req.status) }}
          </span>
          <div v-if="req.price" class="text-right">
            <p class="text-sm font-bold text-gray-900">
              ${{ formatPrice(req.price) }}<span v-if="req.priceUnit" class="text-xs font-normal text-gray-400"> /{{ req.priceUnit }}</span>
            </p>
            <p v-if="defaultRate" class="text-[11px] font-medium text-gray-400">
              {{ formatConversion(req.price, defaultRate) }}{{ req.priceUnit ? ` /${req.priceUnit}` : '' }}
            </p>
          </div>
        </div>
      </NuxtLink>
    </div>

    <!-- Footer summary -->
    <div v-if="!loading && requests.length > 0" class="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs flex-shrink-0">
      <span class="text-gray-400">{{ requests.length }} solicitud{{ requests.length !== 1 ? 'es' : '' }}</span>
      <span v-if="pendingCount > 0" class="font-semibold text-yellow-600">{{ pendingCount }} pendiente{{ pendingCount !== 1 ? 's' : '' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ClipboardDocumentListIcon,
  WrenchIcon,
  ClockIcon,
} from '@heroicons/vue/24/outline'
import { useRelativeTime } from '~/composables/core/useRelativeTime'
import { useAssetUrl } from '~/composables/core/useAssetUrl'
import { useExchangeRates } from '~/composables/wallets/useExchangeRates'
import {
  type ServiceRequestStatus,
  SERVICE_REQUEST_STATUS_LABELS,
  SERVICE_REQUEST_STATUS_CLASSES,
  SERVICE_REQUEST_STATUS_ICONS,
} from '~/config/serviceRequestStatus.config'

interface ServiceRequest {
  id: string
  serviceName: string
  providerName: string
  providerAvatar?: string | null
  status: ServiceRequestStatus
  price?: number
  priceUnit?: string
  modality?: string
  createdAt: string
}

const { getAssetUrl } = useAssetUrl()
const { defaultRate, formatConversion, fetchRates } = useExchangeRates()
if (!defaultRate.value) fetchRates(false, true)

const props = defineProps<{
  requests: ServiceRequest[]
  loading?: boolean
}>()

const pendingCount = computed(() =>
  props.requests.filter(r => r.status === 'PENDING' || r.status === 'SEEN').length
)

const statusLabels = SERVICE_REQUEST_STATUS_LABELS
const statusClasses = SERVICE_REQUEST_STATUS_CLASSES
const STATUS_ICONS = SERVICE_REQUEST_STATUS_ICONS

const MODALITY_LABELS: Record<string, string> = {
  IN_PERSON: '📍 Presencial',
  REMOTE: '💻 Remoto',
  ANY: '🤝 Cualquiera',
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

const { timeAgo } = useRelativeTime()
</script>
