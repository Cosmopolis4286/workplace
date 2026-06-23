<template>
  <div class="card bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col h-[420px]">
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
        to="/solicitudes-servicio"
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
        to="/servicios"
        class="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-purple-600 hover:text-purple-700"
      >
        <WrenchIcon class="w-3.5 h-3.5" />
        Explorar servicios
      </NuxtLink>
    </div>

    <!-- Requests List -->
    <div v-else class="space-y-2 flex-1 overflow-y-auto pr-1">
      <NuxtLink
        v-for="req in requests.slice(0, 5)"
        :key="req.id"
        :to="`/solicitudes-servicio?open=${req.id}`"
        class="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
      >
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-700 font-bold text-xs flex-shrink-0">
            {{ req.serviceName[0]?.toUpperCase() }}
          </div>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-gray-900 truncate max-w-[160px]">{{ req.serviceName }}</p>
            <p class="text-xs text-gray-400 truncate max-w-[180px]">{{ req.providerName }}</p>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-[10px] text-gray-400 flex items-center gap-1">
                <ClockIcon class="w-3 h-3" />
                {{ timeAgo(req.createdAt) }}
              </span>
              <span v-if="req.modality" class="text-[10px] text-gray-400">
                {{ MODALITY_LABELS[req.modality] ?? req.modality }}
              </span>
            </div>
          </div>
        </div>
        <div class="text-right flex-shrink-0 ml-2">
          <p v-if="req.price" class="text-sm font-bold text-gray-900">{{ formatPrice(req.price) }}{{ req.priceUnit ? ` /${req.priceUnit}` : '' }}</p>
          <span
            class="inline-flex items-center gap-1 mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
            :class="statusClass(req.status)"
          >
            <component :is="STATUS_ICONS[req.status]" class="w-3 h-3" />
            {{ statusLabel(req.status) }}
          </span>
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
  EyeIcon,
  PhoneArrowUpRightIcon,
  CheckCircleIcon,
} from '@heroicons/vue/24/outline'
import { useRelativeTime } from '~/composables/useRelativeTime'

interface ServiceRequest {
  id: string
  serviceName: string
  providerName: string
  status: 'PENDIENTE' | 'VISTO' | 'CONTACTADO' | 'CERRADO'
  price?: number
  priceUnit?: string
  modality?: string
  createdAt: string
}

const props = defineProps<{
  requests: ServiceRequest[]
  loading?: boolean
}>()

const pendingCount = computed(() =>
  props.requests.filter(r => r.status === 'PENDIENTE' || r.status === 'VISTO').length
)

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

const STATUS_ICONS: Record<string, any> = {
  PENDIENTE: ClockIcon,
  VISTO: EyeIcon,
  CONTACTADO: PhoneArrowUpRightIcon,
  CERRADO: CheckCircleIcon,
}

const MODALITY_LABELS: Record<string, string> = {
  PRESENCIAL: '📍 Presencial',
  REMOTO: '💻 Remoto',
  CUALQUIERA: '🤝 Cualquiera',
}

function statusLabel(status: string) {
  return statusLabels[status] || status
}

function statusClass(status: string) {
  return statusClasses[status] || 'bg-gray-100 text-gray-700'
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price)
}

const { timeAgo } = useRelativeTime()
</script>
