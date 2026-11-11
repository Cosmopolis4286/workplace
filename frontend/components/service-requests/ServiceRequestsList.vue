<template>
  <div class="lg:col-span-2 space-y-4">

    <!-- Filtros de estado -->
    <div class="card p-1 flex gap-1 overflow-x-auto scrollbar-none">
      <button
        v-for="f in filters"
        :key="f.value"
        class="flex-shrink-0 flex-1 text-sm py-2 px-3 rounded-lg font-medium transition-colors whitespace-nowrap"
        :class="activeFilter === f.value
          ? 'bg-red-600 text-white shadow-sm'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'"
        @click="$emit('update:activeFilter', f.value)"
      >
        {{ f.label }}
        <span
          v-if="f.value !== 'ALL' && countByStatus(f.value) > 0"
          class="ml-1.5 text-xs px-1.5 py-0.5 rounded-full"
          :class="activeFilter === f.value ? 'bg-red-500/30 text-red-100' : 'bg-gray-100 text-gray-500'"
        >
          {{ countByStatus(f.value) }}
        </span>
      </button>
    </div>

    <!-- Card con la lista — swipe horizontal cambia entre Recibidas/Enviadas en mobile -->
    <div ref="listRef" class="card divide-y divide-gray-100" @swipe="handleListSwipe">

      <!-- Skeleton -->
      <template v-if="loading">
        <div v-for="n in 4" :key="n" class="p-4 flex items-center gap-4">
          <div class="skeleton h-10 w-10 rounded-full flex-shrink-0" />
          <div class="flex-1 space-y-2">
            <div class="skeleton h-4 w-40 rounded" />
            <div class="skeleton h-3 w-56 rounded" />
          </div>
          <div class="skeleton h-6 w-20 rounded" />
        </div>
      </template>

      <!-- Empty state -->
      <div v-else-if="filtered.length === 0" class="p-12 text-center">
        <ClipboardDocumentListIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p class="text-gray-500 font-medium">
          {{ viewAs === 'provider' ? 'No hay solicitudes recibidas' : 'No has enviado solicitudes' }}
        </p>
        <p class="text-sm text-gray-400 mt-1">
          {{ viewAs === 'provider'
            ? 'Cuando alguien contacte tus servicios, aparecerá aquí.'
            : 'Explora el catálogo y solicita servicios de otros proveedores.' }}
        </p>
      </div>

      <!-- Filas -->
      <template v-else>
        <div
          v-for="req in filtered"
          :key="req.id"
          class="p-4 flex items-start gap-4 hover:bg-gray-50 transition-colors group cursor-pointer"
          @click="$emit('open-detail', req)"
        >
          <!-- Avatar -->
          <img
            v-if="contactAvatarUrl(req)"
            :src="contactAvatarUrl(req)!"
            class="h-10 w-10 rounded-full object-cover flex-shrink-0 ring-1 ring-gray-100"
          />
          <div
            v-else
            class="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
            :class="viewAs === 'provider' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'"
          >
            {{ (viewAs === 'provider' ? req.clientName : req.providerName)?.[0]?.toUpperCase() ?? '?' }}
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <p class="font-semibold text-gray-900 text-sm">
                {{ viewAs === 'provider' ? req.clientName : req.providerName }}
              </p>
              <span class="text-gray-300">·</span>
              <p class="text-sm text-red-600 font-medium truncate">{{ req.serviceName }}</p>
            </div>
            <p class="text-xs text-gray-400 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
              <span>{{ MODALITY_LABELS[req.modality] ?? req.modality }}</span>
              <span class="flex items-center gap-1">
                <CalendarIcon class="h-3 w-3" />
                {{ formatDate(req.preferredDate) }}
              </span>
              <span v-if="req.address" class="flex items-center gap-1">
                <MapPinIcon class="h-3 w-3" />
                {{ req.address }}{{ req.city ? `, ${req.city}` : '' }}
              </span>
              <span v-if="viewAs === 'provider' && req.clientPhone" class="flex items-center gap-1">
                <PhoneIcon class="h-3 w-3" />
                {{ req.clientPhone }}
              </span>
            </p>
            <p v-if="req.description" class="text-xs text-gray-500 mt-1.5 line-clamp-1 italic">"{{ req.description }}"</p>
            <!-- Indicador de nota del proveedor -->
            <div v-if="req.providerNotes" class="flex items-center gap-1 mt-1.5">
              <DocumentTextIcon class="h-3 w-3 text-gray-400 flex-shrink-0" />
              <span class="text-xs text-gray-400 line-clamp-1 italic">{{ req.providerNotes }}</span>
            </div>
            <!-- Tiempo relativo de la solicitud -->
            <p class="text-[11px] text-gray-300 mt-1.5 flex items-center gap-1" :title="formatDateTime(req.createdAt)">
              <ClockIcon class="h-3 w-3" />
              {{ timeAgo(req.createdAt) }}
            </p>
          </div>

          <!-- Badge estado + precio -->
          <div class="flex-shrink-0 text-right space-y-1.5">
            <div class="flex items-center justify-end gap-1.5">
              <span v-if="req.unreadCount" class="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-workplace-red text-white text-[10px] font-bold">
                {{ req.unreadCount > 99 ? '99+' : req.unreadCount }}
              </span>
              <span class="inline-flex items-center gap-1 justify-center px-2.5 py-1 rounded-full text-xs font-semibold" :class="STATUS_CLASSES[req.status]">
                <component :is="STATUS_ICONS[req.status]" class="h-3 w-3" />
                {{ STATUS_LABELS[req.status] }}
              </span>
            </div>
            <div v-if="req.price">
              <p class="text-sm font-bold text-gray-900">
                ${{ formatPrice(req.price) }}
                <span v-if="req.priceUnit" class="text-xs font-normal text-gray-400">/ {{ req.priceUnit }}</span>
              </p>
              <p v-if="defaultRate" class="text-xs font-medium text-gray-400">
                {{ formatConversion(req.price, defaultRate) }}{{ req.priceUnit ? ` / ${req.priceUnit}` : '' }}
              </p>
            </div>
          </div>

          <!-- Flecha de detalle -->
          <div class="flex-shrink-0 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRightIcon class="h-4 w-4 text-gray-400" />
          </div>
        </div>
      </template>
    </div>

    <!-- Total -->
    <p v-if="!loading && filtered.length > 0" class="text-xs text-gray-400 text-right px-1">
      {{ total }} solicitud{{ total !== 1 ? 'es' : '' }} en total · Haz clic para ver detalles
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  ClipboardDocumentListIcon, ClockIcon, ChevronRightIcon,
  DocumentTextIcon, CalendarIcon, MapPinIcon, PhoneIcon,
} from '@heroicons/vue/24/outline'
import {
  SERVICE_REQUEST_STATUS_LABELS,
  SERVICE_REQUEST_STATUS_CLASSES,
  SERVICE_REQUEST_STATUS_ICONS,
  type ServiceRequestStatus,
} from '~/config/serviceRequestStatus.config'
import type { ExchangeRate } from '~/composables/wallets/useExchangeRates'

export interface ServiceRequestItem {
  id: string
  fields: Record<string, string>
  notes?: string
  photos: string[]
  videos: string[]
}

export interface ServiceRequest {
  id: string
  serviceName: string
  providerId?: string
  providerName: string
  requesterId?: string | null
  modality: string
  preferredDate: string
  address?: string
  city?: string
  clientName: string
  clientPhone: string | null
  clientEmail?: string | null
  description?: string
  price?: number
  priceUnit?: string
  providerNotes?: string
  status: ServiceRequestStatus
  createdAt: string
  statusUpdatedAt?: string
  items?: ServiceRequestItem[]
  providerAvatar?: string | null
  clientAvatar?: string | null
  unreadCount?: number
}

const props = defineProps<{
  filtered: ServiceRequest[]
  filters: { value: string; label: string }[]
  activeFilter: string
  countByStatus: (status: string) => number
  loading: boolean
  total: number
  viewAs: 'provider' | 'client'
  isNormal: boolean
  contactAvatarUrl: (req: ServiceRequest) => string | null
  defaultRate: ExchangeRate | null
  formatConversion: (amount: number, rate: ExchangeRate) => string
  formatDate: (date: string) => string
  formatDateTime: (date: string) => string
  formatPrice: (price: number) => string
  timeAgo: (date: string) => string
}>()

const emit = defineEmits<{
  'update:activeFilter': [value: string]
  'open-detail': [req: ServiceRequest]
  'switch-view': [view: 'provider' | 'client']
}>()

const STATUS_LABELS = SERVICE_REQUEST_STATUS_LABELS
const STATUS_CLASSES = SERVICE_REQUEST_STATUS_CLASSES
const STATUS_ICONS = SERVICE_REQUEST_STATUS_ICONS

const MODALITY_LABELS: Record<string, string> = {
  IN_PERSON: '📍 Presencial',
  REMOTE:    '💻 Remoto',
  ANY:       '🤝 Cualquiera',
}

// Swipe horizontal sobre la lista alterna entre Recibidas/Enviadas (solo para proveedores).
const listRef = ref<HTMLElement | null>(null)
useTouchGestures(listRef)
function handleListSwipe(e: Event) {
  if (props.isNormal) return
  const direction = (e as CustomEvent).detail?.direction
  if (direction === 'left') emit('switch-view', 'client')
  else if (direction === 'right') emit('switch-view', 'provider')
}
</script>

<style scoped>
.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
</style>
